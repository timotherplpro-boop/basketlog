// Formules Basketlog Pro (mêmes tarifs que Visifoot) et session d'abonné signée.
import crypto from "node:crypto";
import { getProfileName, getRoleInfo } from "./roles";
import { CHECKOUT_EUR } from "./pricing";
import { makeIntent, readIntent } from "./switch";
import { accountIdOf, accountUid, isAccountSession, localName } from "./auth-utils";
import { getCompte } from "./comptes";

export const PLANS = {
  gratuit: { label: "Gratuit", perDay: 0 }, // visiteur sans compte : probabilités seulement
  compte: { label: "Compte gratuit", perDay: 0 }, // inscrit, sans abonnement : aperçu des analyses seulement, comme Visifoot (0/0)
  starter: { label: "Starter", perDay: 1 }, // 1 analyse réduite par jour (probabilités exactes et stats clés), comme Visifoot
  pro: { label: "Pro", perDay: Infinity },
  lifetime: { label: "Lifetime", perDay: Infinity },
};

// Questions personnelles à l'IA (comme Visifoot) : Pro 1 par jour, Lifetime illimitées dans la limite d'un usage
// raisonnable (50 par jour). Actives seulement quand une IA est branchée : une clé Anthropic, ou Vercel AI Gateway
// (BASKETLOG_AI=gateway : le jeton OIDC du déploiement suffit, le crédit IA gratuit de Vercel paie les réponses).
export const QUESTIONS = { pro: 1, lifetime: 50 };
export const GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || "openai/gpt-4.1-mini"; // modèle inclus dans le crédit gratuit
export const aiProvider = () =>
  process.env.ANTHROPIC_API_KEY ? "anthropic"
    : process.env.AI_GATEWAY_API_KEY || process.env.BASKETLOG_AI === "gateway" ? "gateway"
      : null;
export const aiReady = () => !!aiProvider();
// Qui traite les questions (politique de confidentialité).
export function aiVendor() {
  if (aiProvider() !== "gateway") return { name: "Anthropic, PBC", via: "", narrative: true };
  const who = { openai: "OpenAI, L.L.C.", anthropic: "Anthropic, PBC", google: "Google LLC", mistral: "Mistral AI" }[GATEWAY_MODEL.split("/")[0]] || GATEWAY_MODEL.split("/")[0];
  return { name: who, via: "Vercel AI Gateway", narrative: true };
}

export const COOKIE = "bl_pro";
// Clé de signature : SESSION_SECRET si défini, sinon dérivée de la clé API Whop (jamais exposée).
const SECRET = process.env.SESSION_SECRET
  || (process.env.WHOP_API_KEY ? crypto.createHash("sha256").update(`basketlog-session:${process.env.WHOP_API_KEY}`).digest("hex") : "");
// L'abonnement est revérifié chez Whop : vite pour un compte qui vient peut-être de payer, rarement pour un Lifetime.
const RECHECK_MS = { compte: 2 * 60e3, starter: 5 * 60e3, pro: 30 * 60e3, lifetime: 6 * 3600e3 };
// Admin ou créateur : rôle revérifié toutes les 10 minutes, pour qu'un accès retiré s'arrête vite.
const RECHECK_ROLE_MS = 10 * 60e3;

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

export function encodeSession(obj) {
  if (!SECRET) return null;
  const data = b64(JSON.stringify(obj));
  return `${data}.${sign(data)}`;
}

export function decodeSession(value) {
  if (!SECRET || typeof value !== "string" || !value.includes(".")) return null;
  try {
    const [data, sig] = value.split(".");
    const a = Buffer.from(sig || ""), b = Buffer.from(sign(data));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null; // cookie abîmé ou modifié : simple visiteur
    return JSON.parse(Buffer.from(data, "base64url").toString());
  } catch {
    return null;
  }
}

// Jeton d'intention de changement de formule (lib/switch.js) : même clé que la session, mais signé pour cet usage seul.
export const switchToken = (info) => makeIntent(SECRET, info);
export const switchIntent = (value, uid) => readIntent(SECRET, value, uid);
// Clé des liens de confirmation de la newsletter (lib/newsletter-confirm.js) : dérivée de celle des sessions pour cet usage seul,
// jamais la clé des sessions elle-même. Vide si le site n'a pas de clé de signature (aucun lien ne peut alors être signé).
export const newsletterKey = () => (SECRET ? crypto.createHmac("sha256", SECRET).update("basketlog-newsletter-confirm:v1").digest("hex") : "");

export const whopConfigured = () =>
  !!(process.env.WHOP_API_KEY && process.env.WHOP_CLIENT_ID && SECRET);

async function hasAccess(userId, productId) {
  if (!productId) return false;
  const res = await fetch(`https://api.whop.com/api/v1/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(productId)}`, {
    headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` },
    cache: "no-store",
    signal: AbortSignal.timeout(5000), // Whop lent ou en panne : on garde la dernière formule connue plutôt que d'attendre
  });
  if (!res.ok) throw new Error(`Whop ${res.status}`);
  const j = await res.json();
  return !!j.has_access;
}

// Formule active chez Whop pour cet utilisateur connecté : Lifetime, puis Pro, puis Starter, sinon compte gratuit.
export async function whopTier(userId) {
  if (await hasAccess(userId, process.env.WHOP_PRODUCT_LIFETIME)) return "lifetime";
  if (await hasAccess(userId, process.env.WHOP_PRODUCT_PRO)) return "pro";
  if (await hasAccess(userId, process.env.WHOP_PRODUCT_STARTER)) return "starter";
  return "compte";
}

// Pages de paiement Whop de chaque formule (page des formules et espace admin).
// Liens de paiement en euros ; ceux en dollars et le choix de la monnaie sont dans lib/pricing.js.
export const CHECKOUT = CHECKOUT_EUR;

// Page Whop du compte gratuit (inscription par e-mail, Google ou Apple), qui renvoie ensuite vers /api/whop/login.
export const FREE_SIGNUP_URL = process.env.NEXT_PUBLIC_WHOP_CHECKOUT_FREE || "https://whop.com/basketlog/basketlog-compte-gratuit/";

// Page où revenir après la connexion : uniquement un chemin interne au site (ni espace ni caractère de contrôle,
// que le navigateur supprimerait pour en faire une adresse externe, ex. « /\t/site-pirate.com »).
export function safeNext(v) {
  if (typeof v !== "string" || v.length > 300 || !v.startsWith("/") || v.startsWith("//") || /[\\\s\u0000-\u001f\u007f]/.test(v)) return null;
  try {
    const u = new URL(v, "https://basketlog.invalid");
    if (u.origin !== "https://basketlog.invalid" || u.pathname.startsWith("/api/")) return null;
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}
export const NEXT_COOKIE = "bl_next";
export const flowCookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/api/whop", maxAge: 1800 };

// Accès effectif d'un compte : la formule payée chez Whop (paid) et, pour un admin ou un créateur invité, l'accès
// complet (tier « lifetime »). Lève une erreur si Whop ne répond pas ; base injoignable : dernier rôle connu.
// Compte e-mail ou Google (uid « bl_… ») : la fiche du compte est relue dans la base (erreur si la base ne répond pas,
// erreur « gone » s'il a été supprimé) ; ses abonnements sont ceux du compte Whop qui lui est relié après le paiement
// (aucun : compte gratuit), et son rôle celui du compte lui-même ou, à défaut, du compte Whop relié.
export async function resolveAccess(uid, previous = {}) {
  const acctId = accountIdOf(uid);
  let compte = null;
  if (acctId) {
    compte = await getCompte(acctId);
    if (!compte) throw Object.assign(new Error("compte supprimé"), { gone: true });
  }
  const whop = acctId ? compte.whop_uid || null : uid;
  const paid = whop ? await whopTier(whop) : "compte";
  let info = previous.role ? { role: previous.role, nom: null } : null;
  let profile = null;
  let profileKnown = true;
  const [roleRes, profileRes, whopRoleRes] = await Promise.allSettled([
    getRoleInfo(uid),
    getProfileName(uid),
    acctId && whop ? getRoleInfo(whop) : null,
  ]);
  if (roleRes.status === "fulfilled") {
    info = roleRes.value;
    if (!info && acctId && whop) info = whopRoleRes.status === "fulfilled" ? whopRoleRes.value : previous.role ? { role: previous.role, nom: null } : null;
  }
  if (profileRes.status === "fulfilled") profile = profileRes.value;
  else profileKnown = false;
  const role = info?.role || null;
  // nom : prénom choisi dans « Mon compte », sinon nom affiché donné par l'admin (admin, créateur), tous deux prioritaires sur le
  // nom d'utilisateur Whop. Base injoignable pour le prénom : on garde celui de la session plutôt que de revenir au nom Whop.
  const a = { tier: role ? "lifetime" : paid, paid, role, nom: profile || info?.nom || (profileKnown ? null : previous.name || null), v: SESSION_V };
  // wname d'un compte e-mail : le prénom donné par Google, sinon le début de l'adresse e-mail.
  return compte ? { ...a, whop, sv: compte.sv, email: compte.email, wname: compte.nom || localName(compte.email) } : a;
}

// Session d'un compte e-mail ou Google juste connecté : formule et rôle relus tout de suite (compte Whop relié, rôle admin
// ou créateur). Si Whop ou la base ne répondent pas : compte gratuit en attendant, revérifié dès la requête suivante.
export async function freshAccountSession(compte) {
  try {
    return accountSession(compte, await resolveAccess(accountUid(compte.id)));
  } catch {
    return accountSession(compte);
  }
}

// Session d'un compte e-mail ou Google, juste après l'inscription ou la connexion (a : résultat de resolveAccess, ou
// formule gratuite par défaut si Whop ou la base n'ont pas répondu ; checked à 0 force alors une vérification rapide).
export function accountSession(compte, a = null) {
  const wname = a?.wname || compte.nom || localName(compte.email);
  return {
    uid: accountUid(compte.id),
    acct: 1,
    email: compte.email,
    name: a?.nom || wname,
    wname,
    tier: a?.tier || "compte",
    paid: a?.paid || "compte",
    role: a?.role || null,
    whop: (a ? a.whop : compte.whop_uid) || null,
    sv: a?.sv ?? compte.sv ?? 1,
    v: SESSION_V,
    checked: a ? Date.now() : 0,
  };
}

// Nom affiché d'une session : le prénom choisi ou donné (a.nom), sinon le nom du compte Whop relevé à la connexion (wname),
// sinon celui qu'avait déjà la session.
export const displayName = (a, s) => a?.nom || s?.wname || s?.name || "";

// Version du contenu de la session : une session plus ancienne est revérifiée une fois tout de suite.
export const SESSION_V = 2;

// Aperçu d'une formule par un admin (« voir le site comme un client Starter ») : la session prend la formule choisie,
// sans rôle, et les analyses de l'aperçu sont comptées à part pour ne pas toucher au vrai compte.
export const PREVIEW_TIERS = ["compte", "starter", "pro", "lifetime"];
export const usageKey = (s) => (s?.preview && PREVIEW_TIERS.includes(s.preview) ? `${s.uid}~apercu-${s.preview}` : s?.uid);

// Lit la session, la revérifie chez Whop si elle est ancienne. Renvoie { session, refreshed }.
// cleared : la session n'est plus valable (compte e-mail supprimé, ou mot de passe changé sur un autre appareil) :
// l'appelant efface le cookie, le visiteur est déconnecté.
export async function currentSession(cookieValue) {
  const s = decodeSession(cookieValue);
  if (!s?.uid) return { session: null, refreshed: null };
  if (s.tier === "gratuit") s.tier = "compte"; // anciennes sessions : connecté = compte gratuit
  const acct = isAccountSession(s);
  if (s.acct && !acct) return { session: null, refreshed: null, cleared: true };
  const wait = s.role || s.admin ? RECHECK_ROLE_MS : (RECHECK_MS[s.tier] ?? RECHECK_MS.compte);
  let legacy = s.v !== SESSION_V; // session d'une version précédente : revérifiée une fois tout de suite
  // Compte e-mail ou Google : la fiche est relue à chaque fois (une requête légère), pour qu'un mot de passe changé ou un
  // compte supprimé déconnecte tout de suite les autres appareils ; un compte Whop relié entre-temps force la revérification.
  if (acct && !legacy && Date.now() - (s.checked || 0) < wait) {
    let c;
    try {
      c = await getCompte(accountIdOf(s.uid));
    } catch {
      return { session: s, refreshed: null }; // base injoignable : on garde la session
    }
    if (!c || c.sv !== s.sv) return { session: null, refreshed: null, cleared: true };
    if ((c.whop_uid || null) === (s.whop || null)) return { session: s, refreshed: null };
    legacy = true;
  }
  if (!legacy && Date.now() - (s.checked || 0) < wait) return { session: s, refreshed: null };
  try {
    const a = await resolveAccess(s.uid, s.preview ? { ...s, role: "admin" } : s);
    if (acct && a.sv !== s.sv) return { session: null, refreshed: null, cleared: true };
    const base = acct ? { ...s, whop: a.whop || null, email: a.email, wname: a.wname } : s;
    let next = { ...base, tier: a.tier, paid: a.paid, role: a.role, name: displayName(a, base), v: SESSION_V, checked: Date.now() };
    delete next.preview;
    delete next.admin;
    // Aperçu en cours : gardé tant que le compte est toujours admin.
    if (s.preview && a.role === "admin" && PREVIEW_TIERS.includes(s.preview)) next = { ...next, tier: s.preview, role: null, admin: true, preview: s.preview };
    return { session: next, refreshed: encodeSession(next), changed: next.tier !== s.tier || (next.role || null) !== (s.role || null) };
  } catch (e) {
    if (e?.gone) return { session: null, refreshed: null, cleared: true };
    return { session: s, refreshed: null }; // Whop injoignable : on garde la dernière formule connue
  }
}

export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 };
