// Newsletter côté serveur, pour les routes : retrait de la liste à la suppression d'un compte, programmation du mail de la
// semaine chez Resend. Aucune dépendance à Next (testé dans tests/newsletter.mjs avec un faux Resend).
import { PLACEHOLDER, afterSend, buildIssue, issueName } from "./newsletter.js";
import { newsletterConfig, resend } from "./resend.js";
import { memberEmail } from "./whop-email.js";

const LIMIT_MS = 10000; // la suppression d'un compte ne doit pas attendre la newsletter plus longtemps (la route a 30 s en tout)

// Retire l'adresse d'un compte supprimé de la liste d'envoi (si elle y était). Ne lève jamais d'erreur : la suppression du compte
// ne doit pas dépendre de la newsletter. Renvoie :
//   "off"      la newsletter n'est pas branchée (pas de clé Resend) : rien à retirer
//   "none"     l'adresse n'était pas dans la liste (ou Whop ne donne pas d'adresse : personne n'a pu s'inscrire)
//   "removed"  l'adresse est retirée
//   "failed"   Resend ou Whop n'a pas répondu à temps : à signaler au membre (lien de désinscription au bas du prochain e-mail)
// Les options (config, lookup, client) servent aux tests.
export async function forgetNewsletter(uid, { timeoutMs = LIMIT_MS, config = newsletterConfig(), lookup = memberEmail, client } = {}) {
  if (!config.ready) return "off";
  const work = (async () => {
    try {
      const email = await lookup(uid);
      const r = await (client || resend()).forget(email);
      return r.existed ? "removed" : "none";
    } catch (e) {
      console.warn(`[newsletter] retrait de la liste : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
      // Whop sans adresse lisible : personne n'a pu s'inscrire, rien à retirer. Whop injoignable, ou n'importe quelle erreur de
      // Resend (clé refusée, service en panne…) : l'adresse est peut-être encore dans la liste, le membre en est prévenu.
      return e?.name === "WhopEmailError" && e.kind !== "network" ? "none" : "failed";
    }
  })();
  let timer;
  const late = new Promise((resolve) => { timer = setTimeout(() => resolve("failed"), timeoutMs); });
  try {
    return await Promise.race([work, late]);
  } finally {
    clearTimeout(timer);
  }
}

const note = (e) => String(e?.message || e).slice(0, 240);

// Programme chez Resend le mail de la semaine, une diffusion par langue ouverte, pour l'instant exact `slot.iso` (dimanche 18 h à
// Paris). Jamais deux fois la même : la diffusion « Newsletter <semaine ISO> <langue> » déjà programmée est laissée telle quelle, et un
// brouillon resté d'une tentative interrompue est remplacé. Le contenu est figé à la programmation (13 h 11 à Paris) mais le mail part
// à 18 h : les matchs déjà commencés à `slot.iso` n'y figurent pas (afterSend). Renvoie un résultat par langue :
//   { lang, name, state: "programmée", id, subject } | { lang, name, state: "déjà programmée" } | { lang, name, state: "ignorée", reason }
//   | { lang, name, state: "erreur", error }
// Lève une erreur seulement si Resend ne répond pas à la lecture des diffusions (rien n'a alors été programmé). `client` : voir lib/resend.js.
export async function scheduleWeek({ client, langs, slot, data, from, replyTo }) {
  const existing = await client.broadcasts();
  const results = [];
  for (const lang of langs) {
    const name = issueName(slot.week.label, lang);
    try {
      const same = existing.filter((b) => b.name === name);
      if (same.some((b) => b.status && b.status !== "draft")) { results.push({ lang, name, state: "déjà programmée" }); continue; }
      if (!(await client.hasContacts())) { results.push({ lang, name, state: "ignorée", reason: "personne n'est inscrit" }); continue; }
      const issue = buildIssue(afterSend(data, slot.iso), lang); // préparé à 13 h 11, envoyé à 18 h : sans les matchs déjà commencés
      if (issue.empty) { results.push({ lang, name, state: "ignorée", reason: "rien à dire cette semaine" }); continue; }
      for (const d of same) await client.deleteBroadcast(d.id).catch(() => {}); // brouillon d'une tentative interrompue : remplacé
      const id = await client.createBroadcast({ name, subject: issue.subject, previewText: issue.preheader, html: issue.html, text: issue.text, from, replyTo, lang });
      try {
        await client.sendBroadcast(id, slot.iso);
      } catch (e) {
        await client.deleteBroadcast(id).catch(() => {}); // pas de brouillon qui traîne : la reprise repart de zéro
        throw e;
      }
      console.log(`[newsletter] ${name} programmée pour ${slot.iso}`);
      results.push({ lang, name, state: "programmée", id, subject: issue.subject });
    } catch (e) {
      console.warn(`[newsletter] ${name} : ${e?.kind || "?"} — ${note(e)}`);
      results.push({ lang, name, state: "erreur", error: note(e) });
    }
  }
  return results;
}

// Répétition de la diffusion (admin, ?rehearse=1) : vérifie en vrai, sans rien envoyer à personne, que le compte Resend accepte ce
// que la tâche du dimanche va lui demander. Lit les diffusions, crée un BROUILLON limité à la liste et au sujet de la langue (jamais
// programmé), le relit, le supprime et s'assure qu'il a disparu. Ne lève jamais d'erreur : chaque étape dit ok ou l'erreur rencontrée.
// Renvoie { ok, steps: { lecture, creation, relecture, suppression } }. `client` : voir lib/resend.js.
export async function rehearseBroadcast({ client, from, replyTo, lang = "fr", now = new Date() }) {
  const steps = {};
  let id = null;
  const run = async (name, fn) => {
    try {
      steps[name] = { ok: true, ...(await fn()) };
      return true;
    } catch (e) {
      steps[name] = { ok: false, kind: e?.kind || "?", error: note(e) };
      return false;
    }
  };
  const preview = "Brouillon supprimé aussitôt";
  await run("lecture", async () => ({ diffusions: (await client.broadcasts()).length }));
  const created = await run("creation", async () => {
    id = await client.createBroadcast({
      name: `Répétition ${now.toISOString()} (supprimée aussitôt)`,
      subject: "Répétition : ce brouillon n'est jamais envoyé",
      previewText: preview,
      html: `<p>Brouillon de répétition, supprimé aussitôt.</p><p>${PLACEHOLDER}</p>`,
      text: `Brouillon de répétition, supprimé aussitôt. ${PLACEHOLDER}`,
      from, replyTo, lang,
    });
    return { id };
  });
  if (created) {
    await run("relecture", async () => {
      const b = (await client.getBroadcast(id)) || {};
      return { status: b.status || null, liste: !!(b.segment_id || b.audience_id), sujet: !!b.topic_id, apercu: b.preview_text === preview, reponse: [].concat(b.reply_to || []).join(",") === replyTo };
    });
  }
  if (id) {
    await run("suppression", async () => {
      await client.deleteBroadcast(id);
      try {
        await client.getBroadcast(id);
      } catch (e) {
        if (e?.kind === "notfound") return { disparu: true };
        throw e;
      }
      return { disparu: false };
    });
  }
  const ok = Object.values(steps).every((s) => s.ok) && !!steps.relecture?.liste && !!steps.relecture?.sujet && steps.suppression?.disparu === true;
  return { ok, steps };
}
