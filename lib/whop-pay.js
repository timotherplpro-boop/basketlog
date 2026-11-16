// Paiement intégré sur Basketlog (16/11/2026, demande de Tim : « je ne veux pas qu'il ouvre un compte Whop, je veux juste
// qu'il paye ») : le formulaire de paiement Whop s'affiche dans la page /paiement du site, sans redirection vers whop.com,
// et l'abonnement s'active tout seul au retour, sans « Activer mon abonnement » ni connexion Whop.
//
// 1. /api/pay crée chez Whop une configuration de paiement (POST /checkout_configurations) pour le plan choisi, avec une
//    étiquette `bl` = empreinte d'un jeton tiré au hasard ; le jeton lui-même reste dans un cookie httpOnly du visiteur.
// 2. Le formulaire Whop (@whop/checkout) s'ouvre avec cette configuration. Le paiement hérite de ses métadonnées.
// 3. Au retour (/api/pay/retour?payment=pay_…), le paiement est relu chez Whop avec la clé du site, et accepté seulement si :
//    il est payé, il porte l'étiquette du jeton de CE visiteur, et c'est bien une formule Basketlog. Personne ne peut donc
//    débloquer un accès avec l'identifiant de paiement de quelqu'un d'autre.
// Aucune dépendance à Next (testé dans tests/unit.mjs).
import crypto from "node:crypto";

const API = "https://api.whop.com/api/v1";

export const PAY_COOKIE = "bl_pay";
export const PAY_NEXT_COOKIE = "bl_pay_next";
export const PAY_PLANS = ["starter", "pro", "lifetime"];
export const PAY_ID_RE = /^pay_[A-Za-z0-9]{4,60}$/;
export const newPayToken = () => crypto.randomBytes(24).toString("base64url");
export const payTag = (token) => crypto.createHash("sha256").update(`basketlog-pay:${token}`).digest("hex").slice(0, 40);

// « https://whop.com/checkout/plan_qpRxDjCSA3Qy6/ » -> « plan_qpRxDjCSA3Qy6 ».
export function planIdOf(url) {
  const m = String(url || "").match(/\b(plan_[A-Za-z0-9]{6,40})\b/);
  return m ? m[1] : null;
}

export class WhopPayError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "WhopPayError";
    this.kind = kind; // nokey | scope | notfound | invalid | network
  }
}

async function call(method, path, body, fetchImpl = fetch) {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new WhopPayError("nokey", "WHOP_API_KEY absente");
  let res;
  try {
    res = await fetchImpl(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
  } catch (e) {
    throw new WhopPayError("network", `${method} ${path} : ${e?.name === "TimeoutError" ? "délai dépassé" : "Whop injoignable"}`);
  }
  const json = await res.json().catch(() => null);
  if (res.ok) return json;
  const detail = String(json?.error?.message || json?.message || "").replace(/\s+/g, " ").slice(0, 200);
  const kind = res.status === 401 || res.status === 403 ? "scope" : res.status === 404 ? "notfound" : res.status === 400 || res.status === 422 ? "invalid" : "network";
  throw new WhopPayError(kind, `${method} ${path} : Whop ${res.status}${detail ? ` (${detail})` : ""}`);
}

// Configuration de paiement pour un plan, étiquetée avec le jeton du visiteur. Renvoie l'identifiant ch_… à donner au formulaire.
export async function createCheckout({ planId, tag, plan, redirectUrl }, fetchImpl) {
  const j = await call("POST", "/checkout_configurations", {
    // L'API actuelle de Whop appelle le plan « variant » (identifiant plan_…) ; plan_id est l'ancien nom.
    variant_id: planId,
    metadata: { bl: tag, formule: plan, source: "basketlog-integre" },
    ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
  }, fetchImpl);
  const id = j?.id;
  if (typeof id !== "string" || !/^ch_[A-Za-z0-9]{4,60}$/.test(id)) throw new WhopPayError("invalid", "configuration de paiement sans identifiant");
  return id;
}

export const getPayment = (id, fetchImpl) => call("GET", `/payments/${encodeURIComponent(id)}`, null, fetchImpl);

const idOf = (v) => (typeof v === "string" ? v : v && typeof v === "object" && typeof v.id === "string" ? v.id : null);

// Vérifie un paiement relu chez Whop. products : { starter, pro, lifetime } -> identifiants prod_… des formules.
// Renvoie { ok: true, uid, email, plan, membership } ou { ok: false, reason } :
//   attente (pas encore payé, ou acheteur pas encore rattaché), etiquette (pas le paiement de ce visiteur),
//   produit (pas une formule Basketlog), invalide (réponse illisible).
export function checkPayment(p, { tag, products }) {
  if (!p || typeof p !== "object" || !PAY_ID_RE.test(String(p.id || ""))) return { ok: false, reason: "invalide" };
  if (!tag || p.metadata?.bl !== tag) return { ok: false, reason: "etiquette" };
  const productId = idOf(p.product);
  const plan = Object.entries(products || {}).find(([, v]) => v && v === productId)?.[0] || null;
  if (!plan) return { ok: false, reason: "produit" };
  const paid = p.status === "paid" || p.substatus === "succeeded" || (!!p.paid_at && !p.refunded_at);
  if (!paid) return { ok: false, reason: "attente" };
  const uid = idOf(p.user);
  if (!uid || !/^user_[A-Za-z0-9]{4,60}$/.test(uid)) return { ok: false, reason: "attente" };
  const email = typeof p.user?.email === "string" ? p.user.email.trim().toLowerCase() : null;
  return { ok: true, uid, email, plan, membership: idOf(p.membership) };
}
