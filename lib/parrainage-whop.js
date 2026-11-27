// Parrainage chez Whop (API v1, clé du site) : registre des récompenses (codes promo PARRAIN…, voir lib/parrainage.js) et
// 30 jours gratuits ajoutés à l'abonnement Pro du parrain (POST /memberships/{id}/add_free_days : Whop allonge la période en
// cours, ou l'essai, donc repousse le prochain paiement). Aucune dépendance à Next.
// Permissions de la clé (déjà couvertes par une clé aux droits de propriétaire) : promo_code:create, promo_code:update,
// promo_code:basic:read pour le registre ; member:manage (et member:basic:read) pour les jours offerts.
import { REWARD_DAYS } from "./parrainage.js";
import { CHECKOUT_EUR } from "./pricing.js";

const API = "https://api.whop.com/api/v1";
const company = () => process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";

// kind : nokey, scope (permission manquante), notfound, conflict (409 : ce code existe déjà), invalid, network.
export class WhopRefError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "WhopRefError";
    this.kind = kind;
  }
}

async function call(method, path, body) {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new WhopRefError("nokey", "WHOP_API_KEY absente");
  let res;
  try {
    res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
  } catch (e) {
    throw new WhopRefError("network", `${method} ${path} : ${e?.name === "TimeoutError" ? "délai dépassé" : "Whop injoignable"}`);
  }
  const json = await res.json().catch(() => null);
  if (res.ok) return json;
  const detail = String(json?.error?.message || json?.message || "").replace(/\s+/g, " ").slice(0, 200);
  const kind = res.status === 401 || res.status === 403 ? "scope" : res.status === 404 ? "notfound" : res.status === 409 ? "conflict"
    : res.status === 400 || res.status === 422 ? "invalid" : "network";
  throw new WhopRefError(kind, `${method} ${path} : Whop ${res.status}${detail ? ` (${detail})` : ""}`);
}

const proPlanId = () => (String(CHECKOUT_EUR.pro || "").match(/\b(plan_[A-Za-z0-9]{6,40})\b/) || [])[1] || null;

// Crée la récompense (registre) : code à usage unique, 100 % sur le premier paiement du plan Pro en euros. Il n'est montré à
// personne (Tim peut toutefois le donner à la main, par exemple à un parrain Lifetime). 409 : déjà créé (WhopRefError conflict).
export async function createReward(code) {
  const body = {
    account_id: company(), code, amount_off: 100, base_currency: "eur", promo_type: "percentage", promo_duration_months: 1,
    new_users_only: false, one_per_customer: true, stock: 1, unlimited_stock: false,
  };
  const plan = proPlanId();
  try {
    return await call("POST", "/promo_codes", plan ? { ...body, variant_ids: [plan] } : body);
  } catch (e) {
    // Restriction au plan refusée par Whop : le code reste à usage unique, sur toutes les formules.
    if (plan && e?.kind === "invalid") return call("POST", "/promo_codes", body);
    throw e;
  }
}

// Ajoute le mois offert sur l'abonnement Pro du parrain. La récompense est d'abord réservée (code désactivé : elle ne peut plus
// servir une deuxième fois), puis les 30 jours sont ajoutés ; si Whop refuse, le code est réactivé (le mois reste en attente).
// Renvoie { until } : nouvelle fin de période (date du prochain paiement), si Whop la donne.
export async function applyReward(promoId, membershipId) {
  if (!/^[A-Za-z0-9_]{3,80}$/.test(String(promoId)) || !/^[A-Za-z0-9_]{3,80}$/.test(String(membershipId))) throw new WhopRefError("invalid", "identifiant invalide");
  await call("POST", `/promo_codes/${encodeURIComponent(promoId)}/deactivate`);
  try {
    const m = await call("POST", `/memberships/${encodeURIComponent(membershipId)}/add_free_days`, { free_days: REWARD_DAYS });
    return { until: m?.renewal_period_end || m?.current_period_end || m?.expires_at || null };
  } catch (e) {
    try {
      await call("POST", `/promo_codes/${encodeURIComponent(promoId)}/activate`);
    } catch (e2) {
      console.warn(`[parrainage] code ${promoId} resté désactivé après un ajout refusé : ${String(e2?.message || e2).slice(0, 160)}`);
    }
    throw e;
  }
}
