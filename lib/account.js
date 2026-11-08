// Espace « Mon compte » : règles pures (prénom affiché, mot de confirmation, lecture des abonnements Whop).
// Aucune dépendance à Next ni au réseau : tout est testé dans tests/unit.mjs.

// ---------- Prénom affiché ----------

export const NAME_MIN = 2;
export const NAME_MAX = 40;

// Prénom choisi par le membre. Renvoie { ok: true, name } (name vide : revenir au nom de son compte Whop)
// ou { ok: false, reason: "court" | "long" | "invalide" }.
export function cleanName(raw) {
  const s = String(raw ?? "")
    .normalize("NFC")
    .replace(/[\u200b-\u200f\u2060-\u206f\ufeff]/g, "") // caractères invisibles (largeur nulle…) : supprimés
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028-\u202e]/g, " ") // contrôles, sauts de ligne, inversion du sens d'écriture : espace
    .replace(/\s+/g, " ")
    .trim();
  if (!s) return { ok: true, name: "" };
  // Pas de balises ni d'adresses web : le prénom s'affiche tel quel dans la barre latérale.
  if (/[<>]/.test(s) || /:\/\/|www\.|https?:/i.test(s)) return { ok: false, reason: "invalide" };
  const n = [...s].length;
  if (n < NAME_MIN) return { ok: false, reason: "court" };
  if (n > NAME_MAX) return { ok: false, reason: "long" };
  return { ok: true, name: s };
}

// ---------- Suppression du compte ----------

// Mot à recopier pour confirmer. On accepte les trois langues, sans tenir compte des majuscules ni des accents :
// quelqu'un qui change de langue en cours de route ne doit pas être bloqué.
export const DELETE_WORDS = { fr: "SUPPRIMER", en: "DELETE", es: "ELIMINAR" };
const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").trim().toUpperCase();
export const deleteConfirmed = (typed) => Object.values(DELETE_WORDS).includes(fold(typed));

// Codes promo d'un créateur tels que la base les renvoie (basketlog_createur_infos) -> [{ code, pct }]. Tout ce qui n'a pas la
// forme d'un code (3 à 24 majuscules ou chiffres, remise entière de 1 à 90 %) est ignoré, et chaque code n'apparaît qu'une fois :
// la liste part dans la page et sert à désactiver les codes chez Whop, jamais telle quelle.
export function creatorCodes(raw) {
  const out = [];
  for (const c of Array.isArray(raw) ? raw : []) {
    const code = typeof c?.code === "string" ? c.code.trim().toUpperCase() : "";
    const pct = Number(c?.pct);
    if (/^[A-Z0-9]{3,24}$/.test(code) && Number.isInteger(pct) && pct >= 1 && pct <= 90 && !out.some((x) => x.code === code)) out.push({ code, pct });
  }
  return out;
}

// ---------- Abonnements Whop ----------

export const TIER_RANK = { starter: 1, pro: 2, lifetime: 3 };

// Formule Basketlog d'un produit Whop d'après les identifiants de produit du site (WHOP_PRODUCT_*), ou null
// (produit d'un autre vendeur, compte gratuit…).
export function tierOfProduct(productId, ids = {}) {
  if (!productId) return null;
  for (const t of ["lifetime", "pro", "starter"]) if (ids[t] && ids[t] === productId) return t;
  return null;
}

// Seuls les liens Whop sont repris (le lien « gérer le paiement » est affiché tel quel dans la page).
const whopLink = (u) => (typeof u === "string" && /^https:\/\/([a-z0-9-]+\.)*whop\.com\//i.test(u) && u.length < 600 ? u : null);
const iso = (v) => (typeof v === "string" && Number.isFinite(Date.parse(v)) ? v : null);
// Montant Whop : objet { amount: "13.99", currency } (API récente) ou nombre seul, la devise étant alors celle de la fiche.
const money = (x, fallbackCurrency) => {
  const raw = x && typeof x === "object" ? x.amount : x;
  const amount = raw != null && raw !== "" ? Number(raw) : NaN;
  const currency = String((x && typeof x === "object" ? x.currency : null) || fallbackCurrency || "").toLowerCase().slice(0, 3) || null;
  return Number.isFinite(amount) && amount >= 0 ? { amount, currency } : null;
};

// Un abonnement tel que Whop le renvoie -> forme stable. Whop écrit l'acheteur « user_id » (documentation) ou « user.id »
// (réponses observées) : les deux sont lues. Renvoie null si la fiche est inutilisable.
export function normalizeMembership(m, ids = {}) {
  if (!m || typeof m !== "object" || !m.id) return null;
  const productId = m.product?.id || m.product_id || null;
  const days = Number(m.billing_period_days);
  return {
    id: String(m.id),
    uid: m.user_id || m.user?.id || null,
    status: String(m.status || ""),
    productId,
    title: String(m.product?.title || "").slice(0, 80),
    tier: tierOfProduct(productId, ids),
    cancelAtPeriodEnd: m.cancel_at_period_end === true,
    periodEnd: iso(m.current_period_end) || iso(m.renewal_period_end) || iso(m.expires_at), // les deux noms existent selon la version de l'API
    periodDays: Number.isFinite(days) && days > 0 ? Math.round(days) : null,
    renewal: money(m.renewal_price, m.currency),
    manageUrl: whopLink(m.manage_url),
  };
}

const RENEWING = new Set(["active", "trialing", "past_due"]); // abonnement en cours (le prélèvement suivant aura lieu)
const ENDING = new Set(["canceling", "expiring"]); // anciens noms de « résilié, actif jusqu'à la fin de la période »
const PAID_ONCE = new Set(["completed", "one_time"]); // payé une fois pour toutes

// Ce que le membre voit pour un abonnement Basketlog, ou null (autre produit, terminé, en pause…).
// state : lifetime (achat à vie), paid (payé en une fois), renews (se renouvelle), past_due (paiement refusé, à régler),
// ends (résilié : actif jusqu'à la fin de la période déjà payée).
export function planOf(n, now = Date.now()) {
  if (!n || !n.tier) return null;
  const end = n.periodEnd ? Date.parse(n.periodEnd) : NaN;
  const future = Number.isFinite(end) && end > now;
  const base = {
    id: n.id, tier: n.tier, title: n.title, periodEnd: n.periodEnd, periodDays: n.periodDays, price: n.renewal,
    manageUrl: n.manageUrl, canCancel: false, canResume: false, included: null, duplicate: false,
  };
  if (n.tier === "lifetime") {
    return RENEWING.has(n.status) || PAID_ONCE.has(n.status) ? { ...base, state: "lifetime", periodEnd: null, price: null } : null;
  }
  if (PAID_ONCE.has(n.status)) return { ...base, state: "paid" };
  if (RENEWING.has(n.status)) {
    if (n.cancelAtPeriodEnd) return { ...base, state: "ends", canResume: true };
    return { ...base, state: n.status === "past_due" ? "past_due" : "renews", canCancel: true };
  }
  if (ENDING.has(n.status)) return { ...base, state: "ends", canResume: n.cancelAtPeriodEnd };
  if (n.status === "canceled" && future) return { ...base, state: "ends" };
  return null;
}

const ORDER = { lifetime: 0, past_due: 1, renews: 2, paid: 3, ends: 4 };

// Liste des abonnements à afficher, du plus important au moins important. Deux avertissements utiles contre le
// double paiement (Starter, Pro et Lifetime sont trois produits séparés chez Whop) :
//   included  : formule déjà comprise dans une formule supérieure active (tu peux annuler celle-ci) ;
//   duplicate : deux abonnements actifs de la même formule.
export function buildPlans(memberships, now = Date.now()) {
  const plans = (memberships || []).map((m) => planOf(m, now)).filter(Boolean);
  const covers = (p) => p.state === "lifetime" || p.state === "renews" || p.state === "paid";
  const out = plans.map((p) => {
    if (!p.canCancel) return p;
    const better = plans.filter((q) => q !== p && covers(q) && TIER_RANK[q.tier] > TIER_RANK[p.tier]).sort((a, b) => TIER_RANK[b.tier] - TIER_RANK[a.tier])[0];
    const twin = plans.some((q) => q !== p && q.canCancel && q.tier === p.tier);
    return { ...p, included: better ? better.tier : null, duplicate: twin };
  });
  return out.sort((a, b) => ORDER[a.state] - ORDER[b.state] || TIER_RANK[b.tier] - TIER_RANK[a.tier]);
}

// Abonnements à arrêter avant d'effacer un compte : ceux qui se renouvelleraient encore.
export const renewing = (memberships, now = Date.now()) =>
  (memberships || []).filter((m) => planOf(m, now)?.canCancel);
