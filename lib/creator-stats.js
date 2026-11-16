// « Mes gains » (rubrique des créateurs) : ce que le code promo d'un créateur a rapporté, lu en direct chez Whop avec la clé du site.
//
// Consommation maîtrisée : la lecture chez Whop (abonnements, paiements, codes promo) est faite UNE fois pour tous les créateurs et gardée
// 60 secondes en mémoire de l'instance ; les demandes simultanées partagent la même lecture. Si Whop ne répond pas, les derniers chiffres
// connus (moins de 15 minutes) sont renvoyés, marqués « stale ». Chaque créateur n'en reçoit que la part de ses propres codes
// (lib/creator-report.js) : la copie gardée en mémoire ne contient ni nom ni e-mail, seulement des identifiants et des montants.
import { dbRpc, profileNotInstalled, rolesConfigured } from "./roles";
import { creatorCodes } from "./account";
import { amount, lower, productPlans, settle, whopList } from "./whop-read";
import { buildCreatorReport } from "./creator-report";
import { sharedReader } from "./shared-read";

export const FRESH_MS = 60e3; // une lecture chez Whop sert toutes les demandes pendant 60 s
export const RETRY_MS = 10e3; // après un échec, on ne réinterroge pas Whop avant 10 s
export const STALE_MS = 15 * 60e3; // âge maximal des chiffres renvoyés quand Whop ne répond plus

// Fiche du créateur (supabase/compte-createur.sql) : { installed, unreachable, role, codes }.
// installed est faux tant que ce script n'a pas été lancé ; role vient de la base (« createur », « admin » ou null : la base fait foi,
// pas le cookie) ; codes : ses codes promo [{ code, pct }].
export async function readCreator(uid) {
  const none = { role: null, codes: [] };
  if (!rolesConfigured()) return { installed: false, ...none };
  try {
    const r = await dbRpc("basketlog_createur_infos", { p_uid: uid });
    if (r?.ok) return { installed: true, role: "createur", codes: creatorCodes(r.codes) };
    return { installed: true, ...none, role: r?.reason === "admin" ? "admin" : null };
  } catch (e) {
    return profileNotInstalled(e) ? { installed: false, ...none } : { installed: true, unreachable: true, ...none };
  }
}

// Ce que Whop sait de tous les abonnements et paiements, réduit à ce qui sert au calcul (aucune donnée personnelle).
export async function fetchSource() {
  const products = productPlans();
  const [mRes, pRes, cRes] = await Promise.all([
    settle(whopList("memberships")),
    settle(whopList("payments", {}, { pages: 30, first: 100 })),
    settle(whopList("promo_codes", {}, { pages: 5 })),
  ]);
  if (!mRes.ok) throw mRes.error;
  if (!pRes.ok) throw pRes.error;

  const promoCodes = {};
  const note = (id, code) => { if (id && code && !promoCodes[id]) promoCodes[id] = { id, code: String(code) }; };
  if (cRes.ok) for (const c of cRes.value.items) note(c.id, c.code);

  const memberships = mRes.value.items.map((m) => {
    note(m.promo_code?.id, m.promo_code?.code);
    return {
      id: m.id,
      plan: products[m.product?.id || m.product_id] || null,
      status: lower(m.status),
      cancelAtEnd: !!m.cancel_at_period_end,
      promo: m.promo_code?.id || m.promo_code_id || null,
      renewal: amount(m.renewal_price) || null,
      currency: lower(m.renewal_price?.currency || m.initial_price?.currency || m.currency) || null,
    };
  }).filter((m) => m.id && m.status !== "drafted");

  const payments = pRes.value.items.map((p) => {
    note(p.promo_code?.id, p.promo_code?.code);
    return {
      id: p.id,
      membership: p.membership?.id || p.membership_id || null,
      plan: products[p.product?.id || p.product_id] || null,
      status: lower(p.status),
      reason: lower(p.billing_reason),
      currency: lower(p.currency || p.total?.currency) || "eur",
      total: amount(p.total),
      refunded: amount(p.refunded_amount),
      at: Date.parse(p.paid_at || p.created_at || "") || null,
      promo: p.promo_code?.id || p.promo_code_id || null,
    };
  }).filter((p) => p.at);

  // Sans aucun code promo connu, un « 0 personne » serait faux plutôt que vrai : on le dit comme une panne.
  if (!cRes.ok && !Object.keys(promoCodes).length) throw cRes.error;
  return { memberships, payments, promoCodes, partial: !mRes.value.complete || !pRes.value.complete };
}

// Lecture partagée de l'instance (globalThis : une seule copie même si Next charge ce fichier à plusieurs endroits).
const reader = (globalThis.__blCreatorReader ||= sharedReader({ fetcher: fetchSource, fresh: FRESH_MS, retry: RETRY_MS, stale: STALE_MS }));
export const getSource = () => reader();
export const resetCreatorCache = () => reader.reset(); // tests

// Gains du créateur : seuls ses propres codes (donnés par la base, jamais par la requête) entrent dans le calcul.
export async function creatorEarnings(codes, opts = {}) {
  const src = await getSource();
  const report = buildCreatorReport({ codes, promoCodes: src.promoCodes, memberships: src.memberships, payments: src.payments, asOf: src.at, now: (opts.now || Date.now)(), partial: src.partial });
  return { ...report, stale: !!src.stale };
}
