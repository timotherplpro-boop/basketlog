// E-mails automatiques du parcours (choix de Tim, 18/11/2026) :
// - « Bienvenue » : envoyé une fois, juste après la création d'un compte Basketlog (e-mail ou Google), dans la langue du compte.
//   Il présente l'essai gratuit Pro de 3 jours et pose une question (« qu'est-ce qui t'a fait t'inscrire ? ») : la réponse arrive
//   sur contact@basketlog-app.com.
// - « Ton essai se termine demain » : envoyé une fois, moins de 24 h avant la fin d'un essai Pro (tâche quotidienne
//   /api/cron/essai), pour éviter les prélèvements surprise, les remboursements et les litiges.
// Tant que LIFECYCLE_EMAILS ne vaut pas 1 dans Vercel, rien n'est envoyé (la tâche montre seulement ce qu'elle enverrait).
// Aucune dépendance à Next : testé sans serveur.
import { CONTACT } from "./mail.js";
import { unsubHeaders, unsubUrl } from "./unsub.js";

export const lifecycleOn = (env = process.env) => String(env.LIFECYCLE_EMAILS || "").trim() === "1";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://basketlog-app.com").replace(/\/$/, "");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export const langOf = (l) => (l === "en" || l === "es" ? l : "fr");
const prefix = (l) => (l === "fr" ? "" : `/${l}`);

// Prénom présentable (ou null) : « carlos » -> « Carlos », pseudo avec chiffres ou trop court -> null.
export function firstName(n) {
  const s = String(n || "").trim().split(/\s+/)[0] || "";
  if (s.length < 2 || s.length > 30 || /[\d@_]/.test(s)) return null;
  return s === s.toUpperCase() || s === s.toLowerCase() ? s[0].toUpperCase() + s.slice(1).toLowerCase() : s;
}

// Mise en page commune : paragraphes, un bouton, signature, ligne de désinscription.
function layout(lang, { hello, paras, cta, link, after = [], foot, unsub = null, unsubLabel = "" }) {
  const html = `<!doctype html><html lang="${lang}"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14161c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:-.3px;padding-bottom:18px">🏀 Basketlog</td></tr>
<tr><td style="font-size:16px;line-height:1.55">
<p style="margin:0 0 14px">${esc(hello)}</p>
${paras.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("\n")}
<p style="margin:8px 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">${esc(cta)}</a></p>
${after.map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join("\n")}
<p style="margin:0 0 22px">Tim · Basketlog</p>
<p style="margin:0;color:#6b7180;font-size:12px">${esc(foot)}${unsub ? ` <a href="${esc(unsub)}" style="color:#6b7180">${esc(unsubLabel)}</a>` : ""}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${hello}\n\n${paras.join("\n\n")}\n\n${cta}${lang === "fr" ? " :" : ":"} ${link}\n\n${after.length ? after.join("\n\n") + "\n\n" : ""}Tim · Basketlog\n\n--\n${foot}${unsub ? `\n${unsubLabel}${lang === "fr" ? " :" : ":"} ${unsub}` : ""}`;
  return { html, text };
}

// « Bienvenue » : { subject, html, text }.
export function welcomeEmail({ lang = "fr", name = null, to = null } = {}) {
  const l = langOf(lang);
  const n = firstName(name);
  const pro = `${SITE}${prefix(l)}/pro`;
  const games = `${SITE}${prefix(l)}/app/matchs`;
  const T = {
    fr: {
      subject: "Bienvenue sur Basketlog 🏀",
      hello: n ? `Salut ${n},` : "Salut,",
      paras: [
        `Ton compte Basketlog est prêt. Chaque soir, tu as gratuitement la probabilité de victoire de chaque match NBA : ${games}`,
        "Tu veux l'analyse complète ? Probabilités exactes, tous les scénarios, les joueurs à suivre et les blessures en temps réel : essaie Basketlog Pro gratuitement pendant 3 jours. Rien à payer aujourd'hui, puis 9,99 €/mois + taxes (9,99 $ hors zone euro), résiliable à tout moment depuis ton compte.",
      ],
      cta: "Essayer Pro 3 jours gratuits",
      after: ["Petite question : qu'est-ce qui t'a donné envie de t'inscrire ? Réponds simplement à cet e-mail, je lis toutes les réponses."],
      foot: `Tu reçois cet e-mail parce que tu viens de créer un compte sur basketlog-app.com. Contact : ${CONTACT}`,
      unsubLabel: "Se désinscrire",
    },
    en: {
      subject: "Welcome to Basketlog 🏀",
      hello: n ? `Hi ${n},` : "Hi there,",
      paras: [
        `Your Basketlog account is ready. Every night, you get each NBA game's win probability for free: ${games}`,
        "Want the full analysis? Exact probabilities, every likely scenario, the players to watch and real-time injury news: try Basketlog Pro free for 3 days. Nothing to pay today, then $9.99/month + tax, cancel anytime from your account.",
      ],
      cta: "Start my 3-day free trial",
      after: ["Quick question: what made you sign up? Just hit reply, I read every answer."],
      foot: `You're getting this email because you just created an account on basketlog-app.com. Contact: ${CONTACT}`,
      unsubLabel: "Unsubscribe",
    },
    es: {
      subject: "Bienvenido a Basketlog 🏀",
      hello: n ? `¡Hola, ${n}!` : "¡Hola!",
      paras: [
        `Tu cuenta de Basketlog está lista. Cada noche tienes gratis la probabilidad de victoria de cada partido de la NBA: ${games}`,
        "¿Quieres el análisis completo? Probabilidades exactas, todos los escenarios, los jugadores a seguir y las lesiones en tiempo real: prueba Basketlog Pro gratis durante 3 días. Nada que pagar hoy, luego 9,99 €/mes + impuestos (9,99 $ fuera de la zona euro), cancela cuando quieras desde tu cuenta.",
      ],
      cta: "Probar Pro 3 días gratis",
      after: ["Una pregunta rápida: ¿qué te hizo registrarte? Responde a este correo, leo todas las respuestas."],
      foot: `Recibes este correo porque acabas de crear una cuenta en basketlog-app.com. Contacto: ${CONTACT}`,
      unsubLabel: "Darse de baja",
    },
  }[l];
  const unsub = to ? unsubUrl(to, l) : null;
  return { subject: T.subject, ...layout(l, { ...T, link: pro, unsub }), ...(to ? { headers: unsubHeaders(to, l) } : {}) };
}

// Date de fin d'essai lisible dans la langue (heure de New York pour l'anglais, de Paris sinon).
function endLabel(ms, l) {
  const tz = l === "en" ? "America/New_York" : "Europe/Paris";
  const loc = { fr: "fr-FR", en: "en-US", es: "es-ES" }[l];
  return new Intl.DateTimeFormat(loc, { timeZone: tz, weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }).format(new Date(ms))
    + (l === "en" ? " ET" : "");
}

// « Ton essai se termine demain » : { subject, html, text }. cur : "EUR" ou "USD" (devise du plan Pro de l'abonnement).
export function trialEndEmail({ lang = "en", name = null, endsAt, cur = "USD", to = null } = {}) {
  const l = langOf(lang);
  const n = firstName(name);
  const acct = `${SITE}${prefix(l)}/app/compte`;
  const price = cur === "EUR" ? (l === "en" ? "€9.99" : "9,99 €") : (l === "en" ? "$9.99" : "9,99 $");
  const when = endsAt ? endLabel(endsAt, l) : null;
  const T = {
    fr: {
      subject: "Ton essai Basketlog Pro se termine demain",
      hello: n ? `Salut ${n},` : "Salut,",
      paras: [
        `Petit rappel : ton essai gratuit de Basketlog Pro se termine dans moins de 24 h${when ? ` (${when})` : ""}.`,
        `Si tu continues, tu n'as rien à faire : ta carte sera débitée de ${price} par mois (plus les taxes de ton pays) et tu gardes toutes les analyses complètes.`,
        "Tu ne veux pas continuer ? Tu peux résilier en 2 clics depuis ton compte, avant la fin de l'essai : rien ne sera prélevé.",
      ],
      cta: "Gérer mon abonnement",
      after: [],
      foot: `Tu reçois cet e-mail parce que tu as commencé un essai Basketlog Pro. Une question ? ${CONTACT}`,
      unsubLabel: "Ne plus recevoir d'e-mails",
    },
    en: {
      subject: "Your Basketlog Pro trial ends tomorrow",
      hello: n ? `Hi ${n},` : "Hi there,",
      paras: [
        `Quick heads-up: your free Basketlog Pro trial ends in less than 24 hours${when ? ` (${when})` : ""}.`,
        `Want to keep it? Nothing to do: your card will be charged ${price}/month (plus your local tax) and you keep every full analysis.`,
        "Not for you? Cancel in 2 clicks from your account before the trial ends and you won't be charged.",
      ],
      cta: "Manage my subscription",
      after: [],
      foot: `You're getting this email because you started a Basketlog Pro trial. Questions? ${CONTACT}`,
      unsubLabel: "Unsubscribe",
    },
    es: {
      subject: "Tu prueba de Basketlog Pro termina mañana",
      hello: n ? `¡Hola, ${n}!` : "¡Hola!",
      paras: [
        `Un recordatorio: tu prueba gratuita de Basketlog Pro termina en menos de 24 horas${when ? ` (${when})` : ""}.`,
        `Si quieres seguir, no tienes que hacer nada: se cobrarán ${price} al mes (más los impuestos de tu país) en tu tarjeta y mantienes todos los análisis completos.`,
        "¿No quieres seguir? Cancela en 2 clics desde tu cuenta antes de que termine la prueba y no se te cobrará nada.",
      ],
      cta: "Gestionar mi suscripción",
      after: [],
      foot: `Recibes este correo porque empezaste una prueba de Basketlog Pro. ¿Preguntas? ${CONTACT}`,
      unsubLabel: "Darse de baja",
    },
  }[l];
  const unsub = to ? unsubUrl(to, l) : null;
  return { subject: T.subject, ...layout(l, { ...T, link: acct, unsub }), ...(to ? { headers: unsubHeaders(to, l) } : {}) };
}

// Essais Pro qui se terminent dans la fenêtre (now, now + 24 h] : une tâche par jour => chaque essai reçoit un seul rappel.
// memberships : liste Whop (GET /memberships). Renvoie [{ id, uid, endsAt, cur }].
export function trialsEndingSoon(memberships, { now = Date.now(), hours = 24, eurPlans = [] } = {}) {
  const out = [];
  for (const m of memberships || []) {
    if (String(m?.status || "").toLowerCase() !== "trialing") continue;
    const end = Date.parse(m.renewal_period_end || m.current_period_end || m.trial_end || "") || null;
    if (!end || end <= now || end > now + hours * 3600e3) continue;
    const uid = m.user?.id || m.user_id || null;
    if (!uid) continue;
    const planId = m.plan?.id || m.plan_id || "";
    out.push({ id: m.id, uid, endsAt: end, cur: eurPlans.includes(planId) ? "EUR" : "USD" });
  }
  return out;
}
