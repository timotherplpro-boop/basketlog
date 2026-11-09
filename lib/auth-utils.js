// Comptes Basketlog par e-mail ou Google : règles simples, sans appel réseau (testées dans tests/unit.mjs).
// Un compte a pour identifiant « bl_ » + son id dans la base ; un compte Whop garde son identifiant Whop (user_…).
import crypto from "node:crypto";

export const ACCT_PREFIX = "bl_";
const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export const accountUid = (id) => `${ACCT_PREFIX}${id}`;
export const accountIdOf = (uid) =>
  typeof uid === "string" && uid.startsWith(ACCT_PREFIX) && ID_RE.test(uid.slice(ACCT_PREFIX.length)) ? uid.slice(ACCT_PREFIX.length) : null;
// Session d'un compte e-mail ou Google (et non d'un compte Whop).
export const isAccountSession = (s) => !!(s?.acct && accountIdOf(s?.uid));
// Compte Whop qui porte les abonnements de cette session : celui relié au compte e-mail, ou le compte Whop lui-même.
export const whopUidOf = (s) => (isAccountSession(s) ? s.whop || null : s?.uid || null);

// Même règle que la base (basketlog_email_norm) : minuscules, sans espaces autour, forme « x@y.z ».
export function normEmail(v) {
  if (typeof v !== "string") return null;
  const e = v.trim().toLowerCase();
  if (e.length < 3 || e.length > 254) return null;
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) ? e : null;
}

// Nom affiché par défaut d'un compte e-mail : le début de l'adresse (« tim.dupont@… » -> « tim.dupont »).
export function localName(email) {
  const s = String(email || "").split("@")[0].replace(/[<>"'`\\]/g, "").trim();
  return s.slice(0, 40) || "Membre";
}

// Adresse masquée pour l'affichage (« t•••@gmail.com »).
export function maskEmail(email) {
  const [u, d] = String(email || "").split("@");
  if (!u || !d) return "";
  return `${u[0]}${"•".repeat(Math.min(3, Math.max(1, u.length - 1)))}@${d}`;
}

// Lien « mot de passe oublié » : jeton envoyé par e-mail (43 caractères) ; la base n'en garde que l'empreinte.
export const RESET_MINUTES = 60;
export const newResetToken = () => crypto.randomBytes(32).toString("base64url");
export const RESET_TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;
export const tokenHash = (t) => crypto.createHash("sha256").update(String(t)).digest("hex");

// Adresse IP du visiteur (Vercel la met en tête de x-forwarded-for), jamais gardée telle quelle : seulement son empreinte.
export function clientIp(headers) {
  const xf = headers.get("x-forwarded-for");
  const ip = (xf ? xf.split(",")[0] : headers.get("x-real-ip") || "").trim();
  return ip.slice(0, 64) || "inconnue";
}
// Clé de la limite d'essais : action + empreinte (avec la clé du serveur) de l'adresse e-mail ou IP.
export const limitKey = (action, value, pepper = "") =>
  `${action}:${crypto.createHmac("sha256", `basketlog-limite:${pepper}`).update(String(value)).digest("hex").slice(0, 40)}`;

// Les requêtes d'écriture doivent venir de notre propre site (en plus du cookie SameSite=Lax).
export function sameOrigin(headers) {
  if (headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (headers.get("x-forwarded-host") || headers.get("host"));
  } catch {
    return false;
  }
}

// Navigateur intégré d'une appli (Instagram, TikTok, Facebook, Snapchat…) : Google y refuse la connexion.
export const IN_APP_RE = /Instagram|FBAN|FBAV|FB_IAB|Messenger|musical_ly|BytedanceWebview|TikTok|Snapchat|Line\/|Twitter|LinkedInApp|Pinterest|; wv\)/i;
export const inAppBrowser = (ua) => IN_APP_RE.test(String(ua || ""));
