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

// Mise en page commune : paragraphes, un bouton, signature, ligne de désinscription (reprise par lib/parrainage.js).
export function layout(lang, { hello, paras, cta, link, after = [], foot, unsub = null, unsubLabel = "" }) {
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
        "Tu veux l'analyse complète ? Probabilités exactes, tous les scénarios, les joueurs à suivre et les blessures en temps réel : essaie Basketlog Pro 3 jours pour 1 € (+ taxes), puis 9,99 €/mois + taxes, résiliable à tout moment depuis ton compte.",
      ],
      cta: "Essayer Pro 3 jours pour 1 €",
      after: ["Petite question : qu'est-ce qui t'a donné envie de t'inscrire ? Réponds simplement à cet e-mail, je lis toutes les réponses."],
      foot: `Tu reçois cet e-mail parce que tu viens de créer un compte sur basketlog-app.com. Contact : ${CONTACT}`,
      unsubLabel: "Se désinscrire",
    },
    en: {
      subject: "Welcome to Basketlog 🏀",
      hello: n ? `Hi ${n},` : "Hi there,",
      paras: [
        `Your Basketlog account is ready. Every night, you get each NBA game's win probability for free: ${games}`,
        "Want the full analysis? Exact probabilities, every likely scenario, the players to watch and real-time injury news: try Basketlog Pro for 3 days for €1 (+ tax), then €9.99/month + tax, cancel anytime from your account.",
      ],
      cta: "Start my 3-day trial for €1",
      after: ["Quick question: what made you sign up? Just hit reply, I read every answer."],
      foot: `You're getting this email because you just created an account on basketlog-app.com. Contact: ${CONTACT}`,
      unsubLabel: "Unsubscribe",
    },
    es: {
      subject: "Bienvenido a Basketlog 🏀",
      hello: n ? `¡Hola, ${n}!` : "¡Hola!",
      paras: [
        `Tu cuenta de Basketlog está lista. Cada noche tienes gratis la probabilidad de victoria de cada partido de la NBA: ${games}`,
        "¿Quieres el análisis completo? Probabilidades exactas, todos los escenarios, los jugadores a seguir y las lesiones en tiempo real: prueba Basketlog Pro 3 días por 1 € (+ impuestos), luego 9,99 €/mes + impuestos, cancela cuando quieras desde tu cuenta.",
      ],
      cta: "Probar Pro 3 días por 1 €",
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
        `Petit rappel : ton essai Basketlog Pro se termine dans moins de 24 h${when ? ` (${when})` : ""}.`,
        `Si tu continues, tu n'as rien à faire : ta carte sera débitée de ${price} par mois (plus les taxes de ton pays) et tu gardes toutes les analyses complètes.`,
        "Tu ne veux pas continuer ? Tu peux résilier en 2 clics depuis ton compte, avant la fin de l'essai : rien de plus ne sera prélevé.",
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
        `Quick heads-up: your Basketlog Pro trial ends in less than 24 hours${when ? ` (${when})` : ""}.`,
        `Want to keep it? Nothing to do: your card will be charged ${price}/month (plus your local tax) and you keep every full analysis.`,
        "Not for you? Cancel in 2 clicks from your account before the trial ends and you won't be charged anything more.",
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
        `Un recordatorio: tu prueba de Basketlog Pro termina en menos de 24 horas${when ? ` (${when})` : ""}.`,
        `Si quieres seguir, no tienes que hacer nada: se cobrarán ${price} al mes (más los impuestos de tu país) en tu tarjeta y mantienes todos los análisis completos.`,
        "¿No quieres seguir? Cancela en 2 clics desde tu cuenta antes de que termine la prueba y no se te cobrará nada más.",
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

// ---------------------------------------------------------------------------------------------------------------------
// Relance « Ton paiement n'est pas passé » (demande de Tim, 24/11/2026 : « automatique pour tous les paiements ratés »).
// Tâche quotidienne /api/cron/relance : un paiement d'abonnement refusé dont l'abonnement est toujours « en retard »
// (past_due) reçoit un e-mail dans les 24 h qui suivent l'échec, puis un rappel entre 72 et 96 h après, s'il n'est toujours
// pas réglé. Pas de base de données : la date de création du paiement (fixe chez Whop, même quand Whop retente) suffit
// à n'envoyer chaque e-mail qu'une fois. Tant que PAYMENT_EMAILS ne vaut pas 1, rien n'est envoyé (aperçu seulement).
export const paymentMailsOn = (env = process.env) => String(env.PAYMENT_EMAILS || "").trim() === "1";

const PAID = (p) => String(p?.status || "").toLowerCase() === "paid" || !!p?.paid_at;
const FAILED = (p) => {
  const s = String(p?.status || "").toLowerCase(), sub = String(p?.substatus || "").toLowerCase();
  return s === "past_due" || s === "uncollectible" || s === "open" || s === "pending" || sub === "failed" || sub === "past_due" || !!p?.failure_message;
};

// payments : liste Whop (GET /payments) ; pastDue : abonnements encore « past_due » (objets Whop, ou leurs identifiants).
// Renvoie [{ id, uid, email, membership, manage, step: 1 | 2 }] : step 1 = premier e-mail, 2 = rappel ; manage = lien Whop
// « gérer l'abonnement » (changer de carte) quand Whop le donne.
export function paymentsToRemind(payments, pastDue, { now = Date.now() } = {}) {
  const live = new Map((pastDue || []).map((m) => (typeof m === "string" ? [m, null] : [m?.id, m?.manage_url || null])));
  const out = [];
  for (const p of payments || []) {
    if (PAID(p) || !FAILED(p)) continue;
    const membership = p.membership?.id || p.membership_id || null;
    if (!membership || !live.has(membership)) continue;
    const at = Date.parse(p.created_at || "") || null;
    if (!at) continue;
    const h = (now - at) / 3600e3;
    const step = h > 0 && h <= 24 ? 1 : h > 72 && h <= 96 ? 2 : 0;
    if (!step) continue;
    const manage = live.get(membership);
    out.push({ id: p.id, uid: p.user?.id || p.user_id || null, email: p.user?.email || null, membership, manage: /^https:\/\/([a-z0-9-]+\.)*whop\.com\//i.test(manage || "") ? manage : null, step });
  }
  return out;
}

// { subject, html, text } ; step 2 = rappel.
export function paymentFailedEmail({ lang = "en", name = null, step = 1, to = null, manage = null } = {}) {
  const l = langOf(lang);
  const n = firstName(name);
  const acct = manage || `${SITE}${prefix(l)}/app/compte`;
  const again = step === 2;
  const T = {
    fr: {
      subject: again ? "Rappel : ton paiement Basketlog n'est toujours pas passé" : "Ton paiement Basketlog n'est pas passé",
      hello: n ? `Salut ${n},` : "Salut,",
      paras: [
        again ? "Petit rappel : le paiement de ton abonnement Basketlog Pro est toujours refusé par ta banque." : "Le paiement de ton abonnement Basketlog Pro a été refusé par ta banque.",
        "Tes analyses complètes sont en pause tant que le paiement n'est pas passé. Pour les retrouver, ajoute une autre carte en cliquant sur le bouton ci-dessous.",
      ],
      cta: "Mettre à jour ma carte",
      after: ["Nous retenterons le paiement automatiquement dans les prochains jours. Une question ? Réponds simplement à cet e-mail."],
      foot: `Tu reçois cet e-mail parce que le paiement de ton abonnement Basketlog a échoué. Contact : ${CONTACT}`,
      unsubLabel: "Ne plus recevoir d'e-mails",
    },
    en: {
      subject: again ? "Reminder: your Basketlog payment still didn't go through" : "Your Basketlog payment didn't go through",
      hello: n ? `Hi ${n},` : "Hi there,",
      paras: [
        again ? "Quick reminder: the payment for your Basketlog Pro subscription is still being declined by your bank." : "The payment for your Basketlog Pro subscription was declined by your bank.",
        "Your full analyses are paused until the payment goes through. To get them back, add another card with the button below.",
      ],
      cta: "Update my card",
      after: ["We'll try the payment again automatically in the next few days. Any question, just reply to this email."],
      foot: `You're getting this email because a payment for your Basketlog subscription failed. Questions? ${CONTACT}`,
      unsubLabel: "Unsubscribe",
    },
    es: {
      subject: again ? "Recordatorio: tu pago de Basketlog sigue sin pasar" : "Tu pago de Basketlog no se ha realizado",
      hello: n ? `¡Hola, ${n}!` : "¡Hola!",
      paras: [
        again ? "Un recordatorio: tu banco sigue rechazando el pago de tu suscripción a Basketlog Pro." : "Tu banco ha rechazado el pago de tu suscripción a Basketlog Pro.",
        "Tus análisis completos están en pausa hasta que se realice el pago. Para recuperarlos, añade otra tarjeta con el botón de abajo.",
      ],
      cta: "Actualizar mi tarjeta",
      after: ["Volveremos a intentar el pago automáticamente en los próximos días. ¿Alguna pregunta? Responde a este correo."],
      foot: `Recibes este correo porque falló un pago de tu suscripción a Basketlog. ¿Preguntas? ${CONTACT}`,
      unsubLabel: "Darse de baja",
    },
  }[l];
  const unsub = to ? unsubUrl(to, l) : null;
  return { subject: T.subject, ...layout(l, { ...T, link: acct, unsub }), ...(to ? { headers: unsubHeaders(to, l) } : {}) };
}
