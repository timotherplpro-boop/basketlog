// Offre de dernière chance (« downsell ») : une remise unique, proposée une seule fois à un compte gratuit qui ferme la
// fenêtre « analyse complète », ou qui s'apprête à quitter /pro sur ordinateur.
//
// Éteinte tant que EXIT_OFFER_CODE (le code) et EXIT_OFFER_PCT (la remise, en %) ne sont pas réglés dans Vercel.
// Allumée seulement si Whop confirme que ce code existe, qu'il est actif et qu'il a bien cette remise (mêmes vérifications
// que pour les codes des créateurs) : on ne promet jamais une remise que le paiement refuserait.
// Le code se crée une fois chez Whop (Codes promo > Créer un code promo), comme celui d'un créateur.
// Aucune dépendance à Next : testé sans serveur (tests/unit.mjs).
import { CODE_RE, cleanPct } from "./promo.js";
import { checkPromo, findPromo, promoMonths, WhopPromoError } from "./whop-promo.js";

// Code et remise réglés dans l'environnement du serveur, ou null (offre éteinte).
export function offerConfig(env = process.env) {
  const code = String(env.EXIT_OFFER_CODE ?? "").trim().toUpperCase();
  const pct = cleanPct(env.EXIT_OFFER_PCT);
  return CODE_RE.test(code) && pct ? { code, pct } : null;
}

// Vérifie le code chez Whop. `find` est injectable pour les tests. Résultat :
//   { ok: true, code, pct, mois }           offre active (mois : nombre de paiements remisés, 0 = tous)
//   { ok: false, why, problems?, detail? }  why : off (non réglée), nokey, scope, network (Whop injoignable),
//                                           absent (code inconnu chez Whop), reglages (Whop a enregistré autre chose)
export async function resolveOffer(cfg, { find = findPromo, months = promoMonths() } = {}) {
  if (!cfg) return { ok: false, why: "off" };
  let p;
  try {
    p = await find(cfg.code);
  } catch (e) {
    return { ok: false, why: e instanceof WhopPromoError ? e.kind : "network", detail: String(e?.message || e).slice(0, 200) };
  }
  if (!p) return { ok: false, why: "absent" };
  const problems = checkPromo(p, { code: cfg.code, pct: cfg.pct, months });
  if (problems.length) return { ok: false, why: "reglages", problems };
  return { ok: true, code: cfg.code, pct: cfg.pct, mois: months };
}

// Même vérification, gardée en mémoire du serveur : 5 minutes quand l'offre est valide, 1 minute sinon (un souci chez Whop
// ne doit pas être redemandé à chaque visite). `fresh` ignore la mémoire (diagnostic de l'admin, tests).
const OK_TTL = 5 * 60e3;
const FAIL_TTL = 60e3;
let memo = null;
export const resetOfferMemo = () => { memo = null; };
export async function liveOffer({ env = process.env, find, months, now = Date.now(), fresh = false } = {}) {
  const cfg = offerConfig(env);
  if (!cfg) return { ok: false, why: "off" };
  const key = `${cfg.code}:${cfg.pct}`;
  if (!fresh && memo && memo.key === key && now - memo.at < memo.ttl) return memo.value;
  const value = await resolveOffer(cfg, { find, months });
  memo = { key, at: now, ttl: value.ok ? OK_TTL : FAIL_TTL, value };
  return value;
}
