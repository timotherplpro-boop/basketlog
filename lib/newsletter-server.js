// Newsletter côté serveur, pour les routes : retrait de la liste à la suppression d'un compte, programmation du mail de la
// semaine chez Resend. Aucune dépendance à Next (testé dans tests/newsletter.mjs avec un faux Resend).
import { buildIssue, issueName } from "./newsletter.js";
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
// brouillon resté d'une tentative interrompue est remplacé. Renvoie un résultat par langue :
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
      const issue = buildIssue(data, lang);
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
