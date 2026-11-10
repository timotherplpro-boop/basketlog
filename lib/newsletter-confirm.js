// Confirmation de l'adresse e-mail avant l'inscription à la newsletter du dimanche (double inscription).
//
// Un compte Basketlog créé avec e-mail + mot de passe n'a pas prouvé que l'adresse est la sienne : quelqu'un a pu saisir l'adresse
// d'un autre. Au clic sur « Je m'inscris », on envoie donc un e-mail À CETTE ADRESSE, avec un lien ; seul le clic sur le bouton de la
// page ouverte par ce lien (…/newsletter/confirmer) inscrit vraiment. Rien n'est ajouté chez Resend avant, et un lien ouvert par un
// antivirus ou un aperçu de messagerie n'inscrit personne (la page demande un clic, la simple ouverture ne change rien).
//
// Le lien porte un jeton signé et sans état (rien à stocker) : { compte, empreinte de l'adresse, langue, instant }, valable 48 h.
// Il ne contient jamais l'adresse. Il est signé avec une clé dérivée de celle des sessions (lib/pro.js : newsletterKey) et pour cet
// usage seul : un jeton de session ou de changement de formule ne peut pas passer pour une confirmation. Il lie le compte ET
// l'adresse : si l'adresse du compte n'est plus celle du jeton, il ne vaut plus rien. Il ne donne qu'un droit : inscrire CETTE adresse
// à la newsletter, ce qu'elle seule a demandé en cliquant sur le lien reçu.
// Aucune dépendance à Next ni au réseau : l'envoi, la base, Resend et les limites sont injectés (testé dans tests/newsletter.mjs).
import crypto from "node:crypto";
import { signToken, readToken } from "./switch.js";
import { accountIdOf } from "./auth-utils.js";
import { LANGS } from "./resend.js";
import { confirmEmail } from "./mail.js";

export const CONFIRM_PURPOSE = "nl-confirm";
export const CONFIRM_HOURS = 48;
export const CONFIRM_TTL_MS = CONFIRM_HOURS * 3600e3;
// Forme d'un jeton (données.signature, en base64url) : vérifiée avant toute lecture de la base.
export const CONFIRM_TOKEN_RE = /^[A-Za-z0-9_-]{40,400}\.[A-Za-z0-9_-]{43}$/;
// Limites d'envoi de l'e-mail de confirmation (Resend gratuit : 100 e-mails par jour pour tous les usages du compte).
export const CONFIRM_LIMITS = { perAccountHour: 3, perAccountDay: 6, perIpHour: 10, globalDay: 40 };

const normalized = (email) => String(email ?? "").trim().toLowerCase();

// Empreinte courte de l'adresse (le jeton ne la contient pas) : 24 caractères hexadécimaux.
export const emailTag = (key, email) => crypto.createHmac("sha256", key).update(`nl-email:${normalized(email)}`).digest("hex").slice(0, 24);

export function makeConfirm(key, { uid, email, lang }, now = Date.now()) {
  if (!key || !accountIdOf(uid) || !LANGS.includes(lang) || !normalized(email)) return null;
  return signToken(key, CONFIRM_PURPOSE, { u: uid, e: emailTag(key, email), l: lang, at: now });
}

// Jeton valable : { uid, lang, tag, at }, ou null (abîmé, modifié, d'un autre usage, expiré ou daté du futur).
export function readConfirm(key, value, now = Date.now()) {
  if (typeof value !== "string" || !CONFIRM_TOKEN_RE.test(value)) return null;
  const x = readToken(key, CONFIRM_PURPOSE, value);
  if (!x || !accountIdOf(x.u) || !LANGS.includes(x.l) || typeof x.e !== "string" || !/^[0-9a-f]{24}$/.test(x.e)) return null;
  const age = now - Number(x.at);
  if (!Number.isFinite(age) || age < -60e3 || age > CONFIRM_TTL_MS) return null;
  return { uid: x.u, lang: x.l, tag: x.e, at: Number(x.at) };
}

// Adresse du lien : la page de confirmation dans la langue du membre (le jeton est dans le fragment, il ne part pas vers le serveur
// avec la page ni dans les statistiques).
export const confirmLink = (site, lang, token) => `${String(site).replace(/\/$/, "")}${lang === "fr" ? "" : `/${lang}`}/newsletter/confirmer#${token}`;

// Demande d'inscription d'un compte dont l'adresse n'est pas prouvée : envoie l'e-mail de confirmation.
//   moi    { uid, email, lang, ip }
//   outils { key, site, status(email, lang), send({ to, subject, html, text }), allowed(action, valeur, max, minutes), now }
// Renvoie { ok: true, pending: true } (e-mail envoyé), { ok: true, subscribed: true } (déjà inscrit : rien à envoyer) ou
// { ok: false, reason: "many" | "busy" | "blocked" | "config" | "mail" }. Une erreur de Resend à la lecture de l'état est levée telle quelle.
export async function requestConfirmation({ uid, email, lang, ip }, { key, site, status, send, allowed, now = Date.now() }) {
  const L = CONFIRM_LIMITS;
  // Par compte (heure et jour) puis par adresse IP : une même adresse e-mail n'a qu'un seul compte, donc pas de pluie d'e-mails sur quelqu'un.
  if (!(await allowed("nl-confirm", uid, L.perAccountHour, 60))) return { ok: false, reason: "many" };
  if (!(await allowed("nl-confirm-jour", uid, L.perAccountDay, 1440))) return { ok: false, reason: "many" };
  if (!(await allowed("nl-confirm-ip", ip, L.perIpHour, 60))) return { ok: false, reason: "many" };
  const s = await status(email, lang);
  if (s.blocked) return { ok: false, reason: "blocked" }; // désinscrite de tous les envois : un e-mail de confirmation ne servirait à rien
  if (s.subscribed) return { ok: true, subscribed: true };
  // Plafond du site entier, compté en dernier : une demande refusée plus haut n'en consomme pas.
  if (!(await allowed("nl-confirm-global", "tous", L.globalDay, 1440))) return { ok: false, reason: "busy" };
  const token = makeConfirm(key, { uid, email, lang }, now);
  if (!token) return { ok: false, reason: "config" };
  try {
    await send({ to: normalized(email), ...confirmEmail({ lang, link: confirmLink(site, lang, token), hours: CONFIRM_HOURS }) });
  } catch (error) {
    return { ok: false, reason: "mail", error };
  }
  return { ok: true, pending: true };
}

// Lien reçu : le jeton est-il valable, et le compte existe-t-il encore avec la même adresse ?
//   outils { key, fiche(idDuCompte), now }
// Renvoie { ok: true, uid, email, lang } ou { ok: false, reason: "invalid" }. Une erreur de la base est levée telle quelle.
export async function checkConfirmation(token, { key, fiche, now = Date.now() }) {
  const x = readConfirm(key, token, now);
  if (!x) return { ok: false, reason: "invalid" };
  const c = await fiche(accountIdOf(x.uid));
  const email = normalized(c?.email);
  if (!email) return { ok: false, reason: "invalid" }; // compte supprimé depuis
  const a = Buffer.from(emailTag(key, email)), b = Buffer.from(x.tag);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return { ok: false, reason: "invalid" }; // l'adresse du compte a changé
  return { ok: true, uid: x.uid, email, lang: x.lang };
}
