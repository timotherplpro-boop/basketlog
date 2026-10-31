// Formules Basketlog Pro (mêmes tarifs que Visifoot) et session d'abonné signée.
import crypto from "node:crypto";
import { getRole } from "./roles";

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

export const whopConfigured = () =>
  !!(process.env.WHOP_API_KEY && process.env.WHOP_CLIENT_ID && SECRET);

async function hasAccess(userId, productId) {
  if (!productId) return false;
  const res = await fetch(`https://api.whop.com/api/v1/users/${encodeURIComponent(userId)}/access/${encodeURIComponent(productId)}`, {
    headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` },
    cache: "no-store",
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
export const CHECKOUT = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER || "https://whop.com/checkout/plan_c8MZCxs2q1nl5/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "https://whop.com/checkout/plan_9LcgVO0AP56pI/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME || "https://whop.com/checkout/plan_LEqDYDZ6KkVUL/",
};

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
export async function resolveAccess(uid, previous = {}) {
  const paid = await whopTier(uid);
  let role = previous.role || null;
  try { role = await getRole(uid); } catch {}
  return { tier: role ? "lifetime" : paid, paid, role };
}

// Aperçu d'une formule par un admin (« voir le site comme un client Starter ») : la session prend la formule choisie,
// sans rôle, et les analyses de l'aperçu sont comptées à part pour ne pas toucher au vrai compte.
export const PREVIEW_TIERS = ["compte", "starter", "pro", "lifetime"];
export const usageKey = (s) => (s?.preview && PREVIEW_TIERS.includes(s.preview) ? `${s.uid}~apercu-${s.preview}` : s?.uid);

// Lit la session, la revérifie chez Whop si elle est ancienne. Renvoie { session, refreshed }.
export async function currentSession(cookieValue) {
  const s = decodeSession(cookieValue);
  if (!s?.uid) return { session: null, refreshed: null };
  if (s.tier === "gratuit") s.tier = "compte"; // anciennes sessions : connecté = compte gratuit
  const wait = s.role || s.admin ? RECHECK_ROLE_MS : (RECHECK_MS[s.tier] ?? RECHECK_MS.compte);
  const legacy = !("paid" in s); // session ouverte avant les rôles : revérifiée une fois tout de suite
  if (!legacy && Date.now() - (s.checked || 0) < wait) return { session: s, refreshed: null };
  try {
    const a = await resolveAccess(s.uid, s.preview ? { ...s, role: "admin" } : s);
    let next = { ...s, tier: a.tier, paid: a.paid, role: a.role, checked: Date.now() };
    delete next.preview;
    delete next.admin;
    // Aperçu en cours : gardé tant que le compte est toujours admin.
    if (s.preview && a.role === "admin" && PREVIEW_TIERS.includes(s.preview)) next = { ...next, tier: s.preview, role: null, admin: true, preview: s.preview };
    return { session: next, refreshed: encodeSession(next), changed: next.tier !== s.tier || (next.role || null) !== (s.role || null) };
  } catch {
    return { session: s, refreshed: null }; // Whop injoignable : on garde la dernière formule connue
  }
}

export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 };
