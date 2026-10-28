// Formules Basketlog Pro (mêmes tarifs que Visifoot) et session d'abonné signée.
import crypto from "node:crypto";

export const PLANS = {
  gratuit: { label: "Gratuit", perDay: 3 },
  mensuel: { label: "Mensuel", perDay: 10, price: "22,90 €", per: "/mois" },
  annuel: { label: "Annuel", perDay: Infinity, price: "118,99 €", per: "/an", monthly: "9,92 €" },
};

export const COOKIE = "bl_pro";
// Clé de signature : SESSION_SECRET si défini, sinon dérivée de la clé API Whop (jamais exposée).
const SECRET = process.env.SESSION_SECRET
  || (process.env.WHOP_API_KEY ? crypto.createHash("sha256").update(`basketlog-session:${process.env.WHOP_API_KEY}`).digest("hex") : "");
const RECHECK_MS = 6 * 3600e3; // l'abonnement est revérifié chez Whop toutes les 6 h

const b64 = (s) => Buffer.from(s).toString("base64url");
const sign = (data) => crypto.createHmac("sha256", SECRET).update(data).digest("base64url");

export function encodeSession(obj) {
  if (!SECRET) return null;
  const data = b64(JSON.stringify(obj));
  return `${data}.${sign(data)}`;
}

export function decodeSession(value) {
  if (!SECRET || !value || !value.includes(".")) return null;
  const [data, sig] = value.split(".");
  const expected = sign(data);
  if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try { return JSON.parse(Buffer.from(data, "base64url").toString()); } catch { return null; }
}

export const whopConfigured = () =>
  !!(process.env.WHOP_API_KEY && process.env.WHOP_CLIENT_ID && SECRET && (process.env.WHOP_PRODUCT_MONTHLY || process.env.WHOP_PRODUCT_ANNUAL));

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

// Formule active chez Whop pour cet utilisateur : annuel prioritaire, puis mensuel.
export async function whopTier(userId) {
  if (await hasAccess(userId, process.env.WHOP_PRODUCT_ANNUAL)) return "annuel";
  if (await hasAccess(userId, process.env.WHOP_PRODUCT_MONTHLY)) return "mensuel";
  return "gratuit";
}

// Lit la session, la revérifie chez Whop si elle est ancienne. Renvoie { session, refreshed }.
export async function currentSession(cookieValue) {
  const s = decodeSession(cookieValue);
  if (!s?.uid) return { session: null, refreshed: null };
  if (Date.now() - (s.checked || 0) < RECHECK_MS) return { session: s, refreshed: null };
  try {
    const tier = await whopTier(s.uid);
    const next = { ...s, tier, checked: Date.now() };
    return { session: next, refreshed: encodeSession(next) };
  } catch {
    return { session: s, refreshed: null }; // Whop injoignable : on garde la dernière formule connue
  }
}

export const cookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 60 };
