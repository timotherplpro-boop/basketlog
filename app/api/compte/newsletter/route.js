import { COOKIE, currentSession, newsletterKey } from "../../../../lib/pro";
import { mk } from "../../../../lib/i18n";
import { maskEmail, newsletterConfig, resend } from "../../../../lib/resend";
import { sessionEmail } from "../../../../lib/session-email";
import { allowed, getCompte } from "../../../../lib/comptes";
import { clientIp } from "../../../../lib/auth-utils";
import { requestConfirmation } from "../../../../lib/newsletter-confirm";
import { sendMail } from "../../../../lib/mail";
import { SITE } from "../../../../lib/site";
import { err, fail, json, messages } from "../../../../lib/newsletter-http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Newsletter du dimanche, côté membre (« Mon compte » et carte d'invitation de l'espace membre) :
//   GET  ?lang=fr                        l'état : { available, subscribed, blocked, email (masquée), confirm }
//   POST { action: "abonner" | "desabonner", lang }
// L'adresse vient toujours du compte de la session, jamais de la requête (lib/session-email.js) : l'adresse du compte Basketlog,
// ou celle que Whop donne pour un compte Whop. Elle n'est renvoyée que masquée.
// Un compte Basketlog dont l'adresse n'est pas encore prouvée (inscription e-mail + mot de passe) ne s'inscrit pas d'un clic :
// « abonner » lui envoie un e-mail de confirmation (lib/newsletter-confirm.js) et répond { subscribed: false, pending: true } ;
// l'inscription n'a lieu qu'au clic sur le bouton de la page ouverte par le lien de cet e-mail (/api/newsletter/confirmer).
// `confirm` dit à la page que « s'inscrire » passera par cet e-mail.
// Le consentement est enregistré chez Resend (lib/resend.js) : le membre est ajouté à la liste quand il clique, jamais avant.
// Tant que NEWSLETTER_ENABLED ne vaut pas 1 (et sans clé Resend), tout reste fermé : { available: false }.

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

  let email, confirm = false;
  try {
    const who = await sessionEmail(session, { fiche: getCompte });
    email = who.email;
    confirm = who.account && !who.proven; // adresse pas encore prouvée : s'inscrire passe par un e-mail de confirmation
  } catch (e) {
    console.warn(`[newsletter] lecture de l'adresse : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
    return json({ ok: true, available: true, subscribed: null, problem: e?.name === "WhopEmailError" && e.kind !== "network" ? "email" : "down" }, 200, refreshed);
  }
  try {
    const s = await resend().status(email, lang);
    return json({ ok: true, available: true, subscribed: s.subscribed, blocked: s.blocked, email: maskEmail(email), confirm }, 200, refreshed);
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

  let who;
  try {
    who = await sessionEmail(session, { fiche: getCompte });
  } catch (e) {
    return fail(M, e);
  }
  const email = who.email;
  const on = body.action === "abonner";
  try {
    // Adresse d'un compte Basketlog pas encore prouvée : on n'inscrit pas, on envoie l'e-mail de confirmation à cette adresse.
    // (Se désinscrire reste toujours possible, sans e-mail.)
    if (on && who.account && !who.proven) {
      const r = await requestConfirmation(
        { uid: session.uid, email, lang, ip: clientIp(req.headers) },
        { key: newsletterKey(), site: SITE, status: (e, l) => resend().status(e, l), send: (m) => sendMail(m), allowed }
      );
      if (r.ok && r.subscribed) return json({ ok: true, subscribed: true, email: maskEmail(email) }, 200, refreshed);
      if (r.ok) {
        console.log(`[newsletter] e-mail de confirmation envoyé (${lang})`);
        return json({ ok: true, subscribed: false, pending: true, email: maskEmail(email) }, 200, refreshed);
      }
      if (r.reason === "many") return err(M.many, 429);
      if (r.reason === "busy") return err(M.busy, 429);
      if (r.reason === "blocked") return fail(M, { kind: "blocked", message: "adresse désinscrite de tous les envois" });
      if (r.reason === "mail") console.warn(`[newsletter] e-mail de confirmation non envoyé : ${String(r.error?.message || r.error).slice(0, 200)}`);
      else console.warn(`[newsletter] e-mail de confirmation impossible : ${r.reason}`);
      return err(M.mailFail, r.reason === "mail" ? 502 : 503);
    }
    const s = on ? await resend().subscribe(email, lang) : await resend().unsubscribe(email, lang);
    console.log(`[newsletter] ${on ? "inscription" : "désinscription"} (${lang})`);
    return json({ ok: true, subscribed: s.subscribed, email: maskEmail(email) }, 200, refreshed);
  } catch (e) {
    return fail(M, e);
  }
}
