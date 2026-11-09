import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, currentSession } from "../../../../lib/pro";
import { mk } from "../../../../lib/i18n";
import { maskEmail, newsletterConfig, resend } from "../../../../lib/resend";
import { WhopEmailError } from "../../../../lib/whop-email";
import { sessionEmail } from "../../../../lib/session-email";
import { getCompte } from "../../../../lib/comptes";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Newsletter du dimanche, côté membre (« Mon compte » et carte d'invitation de l'espace membre) :
//   GET  ?lang=fr                        l'état : { available, subscribed, blocked, email (masquée) }
//   POST { action: "abonner" | "desabonner", lang }
// L'adresse vient toujours du compte de la session, jamais de la requête (lib/session-email.js) : l'adresse du compte Basketlog,
// ou celle que Whop donne pour un compte Whop. Elle n'est renvoyée que masquée. Un compte Basketlog dont l'adresse n'est pas
// encore prouvée (inscription e-mail + mot de passe) ne peut pas encore s'inscrire : { problem: "verify" }.
// Le consentement est enregistré chez Resend (lib/resend.js) : le membre est ajouté à la liste quand il clique, jamais avant.
// Tant que NEWSLETTER_ENABLED ne vaut pas 1 (et sans clé Resend), tout reste fermé : { available: false }.

const json = (body, status = 200, cookie = null) => {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (cookie) res.cookies.set(COOKIE, cookie, cookieOptions);
  return res;
};
const err = (error, status = 400, extra = {}) => json({ ok: false, error, ...extra }, status);

// Les requêtes d'écriture doivent venir de notre propre site (en plus du cookie SameSite=Lax).
function sameOrigin(req) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") || req.headers.get("host"));
  } catch {
    return false;
  }
}

// Limite simple par compte (l'instance se souvient des demandes des 10 dernières minutes) : chaque lecture interroge Whop et Resend.
const hits = new Map();
function tooMany(uid, kind, max) {
  const key = `${kind}:${uid}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((x) => now - x < 600e3);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

function messages(lang) {
  const { t } = mk(lang);
  return {
    login: t("Connecte-toi pour gérer ta newsletter.", "Log in to manage your newsletter.", "Inicia sesión para gestionar tu newsletter."),
    refused: t("Requête refusée.", "Request refused.", "Solicitud rechazada."),
    many: t("Trop de demandes, réessaie dans quelques minutes.", "Too many requests, please try again in a few minutes.", "Demasiadas solicitudes, inténtalo de nuevo en unos minutos."),
    preview: t("Tu es en mode aperçu : quitte l'aperçu pour modifier ton compte.", "You're in preview mode: leave the preview to change your account.", "Estás en modo vista previa: sal de la vista previa para modificar tu cuenta."),
    notReady: t("La newsletter n'est pas encore ouverte.", "The newsletter isn't open yet.", "La newsletter todavía no está abierta."),
    noEmail: t("On n'arrive pas à lire ton adresse e-mail chez Whop pour le moment. Écris-nous à contact@basketlog-app.com et on s'en occupe.", "We can't read your email address at Whop right now. Write to us at contact@basketlog-app.com and we'll sort it out.", "No conseguimos leer tu correo en Whop por ahora. Escríbenos a contact@basketlog-app.com y lo solucionamos."),
    verify: t("Pour recevoir la newsletter, ton adresse e-mail doit d'abord être confirmée : connecte-toi avec Google, ou demande un lien avec « Mot de passe oublié ? » dans la fenêtre de connexion.", "To receive the newsletter, your email address must be confirmed first: log in with Google, or ask for a link with “Forgot your password?” in the login window.", "Para recibir la newsletter, primero hay que confirmar tu correo: inicia sesión con Google o pide un enlace con «¿Has olvidado tu contraseña?» en la ventana de inicio de sesión."),
    down: t("Le service d'envoi ne répond pas pour le moment, réessaie dans un instant.", "The email service isn't responding right now, please try again in a moment.", "El servicio de correo no responde por ahora, inténtalo de nuevo en un instante."),
    blocked: t("Cette adresse s'est désinscrite de tous nos envois. Écris-nous à contact@basketlog-app.com pour la réactiver.", "This address has unsubscribed from all our emails. Write to us at contact@basketlog-app.com to turn it back on.", "Esta dirección se ha dado de baja de todos nuestros envíos. Escríbenos a contact@basketlog-app.com para reactivarla."),
    unconfirmed: t("Ta demande n'a pas pu être confirmée. Réessaie dans un instant.", "Your request couldn't be confirmed. Please try again in a moment.", "No se ha podido confirmar tu solicitud. Inténtalo de nuevo en un instante."),
    unknown: t("Action inconnue.", "Unknown action.", "Acción desconocida."),
  };
}

// Réponse d'erreur pour un souci chez Whop ou Resend (le détail technique reste dans les journaux du serveur).
function fail(M, e, extra = {}) {
  console.warn(`[newsletter] ${e?.name === "WhopEmailError" ? "adresse" : e?.kind ? "Resend" : "base"} : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
  switch (e?.kind) {
    case "noemail":
    case "scope":
    case "nokey": return err(e instanceof WhopEmailError ? M.noEmail : M.notReady, e instanceof WhopEmailError ? 502 : 503, extra);
    case "blocked": return err(M.blocked, 409, extra);
    case "unconfirmed": return err(M.unconfirmed, 502, extra);
    default: return err(M.down, 503, extra);
  }
}

// Ce que l'espace membre a besoin de savoir, sans jamais appeler Whop ni Resend quand ce n'est pas la peine.
function gate(session, cfg, lang) {
  if (!cfg.enabled) return "off"; // pas de clé Resend ou interrupteur éteint
  if (session.preview) return "preview"; // un admin qui regarde le site comme un client ne touche pas à son compte
  if (!cfg.langs.includes(lang)) return "lang"; // newsletter pas encore ouverte dans cette langue
  return null;
}

export async function GET(req) {
  const lang = mk(new URL(req.url).searchParams.get("lang")).lang;
  const M = messages(lang);
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) return err(M.login, 401);
  const cfg = newsletterConfig();
  const closed = gate(session, cfg, lang);
  if (closed) return json({ ok: true, available: false, reason: closed }, 200, refreshed);
  if (tooMany(session.uid, "lecture", 30)) return err(M.many, 429);

  let email;
  try {
    const who = await sessionEmail(session, { fiche: getCompte });
    if (who.account && !who.proven) return json({ ok: true, available: true, subscribed: null, problem: "verify", email: maskEmail(who.email) }, 200, refreshed);
    email = who.email;
  } catch (e) {
    console.warn(`[newsletter] lecture de l'adresse : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
    return json({ ok: true, available: true, subscribed: null, problem: e?.name === "WhopEmailError" && e.kind !== "network" ? "email" : "down" }, 200, refreshed);
  }
  try {
    const s = await resend().status(email, lang);
    return json({ ok: true, available: true, subscribed: s.subscribed, blocked: s.blocked, email: maskEmail(email) }, 200, refreshed);
  } catch (e) {
    console.warn(`[newsletter] lecture de l'état : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
    return json({ ok: true, available: true, subscribed: null, problem: "down", email: maskEmail(email) }, 200, refreshed);
  }
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return err("Requête invalide / Invalid request.", 400); }
  const lang = mk(body?.lang).lang;
  const M = messages(lang);
  if (!sameOrigin(req)) return err(M.refused, 403);
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) return err(M.login, 401);
  const cfg = newsletterConfig();
  const closed = gate(session, cfg, lang);
  if (closed === "preview") return err(M.preview, 403);
  if (closed) return err(M.notReady, 503);
  if (tooMany(session.uid, "action", 12)) return err(M.many, 429);
  if (body.action !== "abonner" && body.action !== "desabonner") return err(M.unknown, 400);

  let email;
  try {
    const who = await sessionEmail(session, { fiche: getCompte });
    // Se désinscrire reste toujours possible ; s'inscrire demande une adresse prouvée pour un compte Basketlog.
    if (who.account && !who.proven && body.action === "abonner") return err(M.verify, 403, { problem: "verify" });
    email = who.email;
  } catch (e) {
    return fail(M, e);
  }
  try {
    const on = body.action === "abonner";
    const s = on ? await resend().subscribe(email, lang) : await resend().unsubscribe(email, lang);
    console.log(`[newsletter] ${on ? "inscription" : "désinscription"} (${lang})`);
    return json({ ok: true, subscribed: s.subscribed, email: maskEmail(email) }, 200, refreshed);
  } catch (e) {
    return fail(M, e);
  }
}
