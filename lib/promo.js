// Codes promo des créateurs : règles partagées par l'espace admin, l'API et les tests (aucune dépendance à Next).
// Un créateur a un code (celui que le client saisit sur la page de paiement Whop) et une remise en %, choisis par l'admin.
// Les codes sont stockés dans Supabase (supabase/codes-promo.sql) ; le code doit aussi être créé chez Whop.

export const PROMO_MIN = 1;
export const PROMO_MAX = 90;
// Remise proposée au départ : les prix du site financent déjà -20 % pour le client et 20 % reversés au créateur (lib/pricing.js).
export const PROMO_DEFAULT = 20;

// 3 à 24 caractères, majuscules et chiffres seulement : ce que Whop accepte partout, sans accent ni espace.
export const CODE_RE = /^[A-Z0-9]{3,24}$/;

// « @La Nuit NBA ! » -> « LANUITNBA » : sans accents, espaces ni symboles, en majuscules.
export const cleanCode = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 24);

// Remise saisie (20, « 20 », « 20 % », « 20,0 ») -> entier de 1 à 90, sinon null.
export function cleanPct(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[%\s  ]/g, "").replace(",", "."));
  return Number.isInteger(n) && n >= PROMO_MIN && n <= PROMO_MAX ? n : null;
}

// Alphabet sans caractères qui se ressemblent (0/O, 1/I) pour les codes tirés au hasard.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomChars(n) {
  const bytes = new Uint8Array(n);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

// Code proposé pour un créateur : son nom suivi de la remise (« @lanuitnba », 20 -> LANUITNBA20).
// Nom trop court pour faire un code : « BL » + 4 caractères au hasard si `rand` est fourni, sinon chaîne vide.
export function suggestCode(name, pct, rand = null) {
  const tail = cleanPct(pct) ? String(cleanPct(pct)) : "";
  const base = cleanCode(name).slice(0, 24 - tail.length);
  if (base.length >= 3) return base + tail;
  return rand ? `BL${rand(4)}${tail}`.slice(0, 24) : "";
}

// Rattache à chaque compte et à chaque invitation son code promo ; les codes qui ne correspondent plus à aucun
// créateur (invitation expirée, compte retiré par ailleurs) sont isolés dans `orphelins`.
export function mergePromos({ roles = [], invitations = [] } = {}, promos = []) {
  const byUid = new Map();
  const byInv = new Map();
  for (const p of promos) {
    if (p.uid) byUid.set(p.uid, p);
    if (p.inv_code) byInv.set(p.inv_code, p);
  }
  const used = new Set();
  const attach = (row, p) => {
    if (p) used.add(p.id);
    return { ...row, promo: p || null };
  };
  const out = {
    roles: roles.map((r) => attach(r, byUid.get(r.uid))),
    invitations: invitations.map((i) => attach(i, byInv.get(i.code))),
  };
  out.orphelins = promos.filter((p) => !used.has(p.id));
  return out;
}
