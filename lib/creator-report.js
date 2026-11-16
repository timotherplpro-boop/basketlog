// Chiffres d'un créateur : qui a utilisé son code promo, sur quelle formule, et ce que cela lui rapporte.
// Fonctions pures (aucune dépendance à Next ni au réseau, tests sous Node) : lib/creator-stats.js leur donne ce que Whop a renvoyé.
//
// Règles de calcul (les mêmes pour la rubrique « Mes gains » du créateur et pour le tableau « Codes créateurs » de l'admin) :
//  - un paiement compte quand il est « paid » et supérieur à 0 ; son montant net est le total moins le remboursé ;
//  - un paiement est rattaché au code promo (1) du paiement lui-même, sinon (2) de son abonnement, sinon (3) d'un autre paiement du
//    même abonnement : Whop peut ne pas garder le code sur l'abonnement après la remise du premier paiement, et les renouvellements
//    suivants restent pourtant au créateur (40 % de chaque paiement tant que l'abonné reste) ;
//  - une « personne » est un abonnement rattaché au code qui a au moins un paiement encaissé (ou qui est en cours, par exemple en essai) ;
//  - les montants restent dans leur monnaie : euros et dollars sont comptés à part, jamais convertis ;
//  - ce fichier ne produit aucun nom, e-mail ni identifiant d'abonné : un créateur ne voit que des chiffres sur ses propres codes.
import { CREATOR_COMMISSION } from "./commission.js";
import { PRICES } from "./pricing.js";

export const PLAN_KEYS = ["starter", "pro", "lifetime"];
export const LIVE = new Set(["trialing", "active", "past_due", "completed"]); // abonnement qui donne accès
export const RECENT_MAX = 12;

const round2 = (x) => Math.round(x * 100) / 100;
const isCashed = (p) => p.status === "paid" && p.total > 0;

// Les mois se comptent à l'heure de Paris, comme dans l'espace admin.
const parisDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
export const monthOf = (ms) => parisDay.format(new Date(ms)).slice(0, 7); // « 2026-11 »
export function prevMonth(key) {
  const [y, m] = String(key).split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

// Sacs d'argent par monnaie : { EUR: 12.5, USD: 3 }.
export function addMoney(bag, cur, value) {
  if (!value) return;
  const c = String(cur || "eur").toUpperCase();
  bag[c] = round2((bag[c] || 0) + value);
}
export const scaleMoney = (bag, f) => Object.fromEntries(Object.entries(bag).map(([k, v]) => [k, round2(v * f)]));
const sumInto = (to, from) => { for (const [c, v] of Object.entries(from)) addMoney(to, c, v); };

// Code promo (identifiant Whop) de chaque abonnement : celui de l'abonnement, sinon celui de son premier paiement remisé.
export function membershipPromos(memberships, payments) {
  const out = new Map();
  for (const m of memberships) if (m.promo) out.set(m.id, m.promo);
  const discounted = payments.filter((p) => p.membership && p.promo).sort((a, b) => (a.at || 0) - (b.at || 0));
  for (const p of discounted) if (!out.has(p.membership)) out.set(p.membership, p.promo);
  return out;
}
// Code promo d'un paiement : le sien, sinon celui de son abonnement.
export const promoOf = (p, byMembership) => p.promo || (p.membership && byMembership.get(p.membership)) || null;

const keyOf = (plan) => (PLAN_KEYS.includes(plan) ? plan : "other");
const planRow = () => ({ people: 0, active: 0, paid: {}, commission: {} });

// codes : les codes du créateur [{ code, pct }] (jamais ceux d'un autre).
// promoCodes : codes promo connus chez Whop { [id]: { id, code } }.
// memberships : [{ id, plan, status, cancelAtEnd, promo, renewal, currency }].
// payments : [{ id, membership, plan, status, reason, currency, total, refunded, at, promo }].
export function buildCreatorReport({ codes = [], promoCodes = {}, memberships = [], payments = [], asOf = Date.now(), now = asOf, commission = CREATOR_COMMISSION, partial = false } = {}) {
  const wanted = new Map();
  for (const c of codes) {
    const code = String(c?.code || "").toUpperCase();
    if (code && !wanted.has(code)) wanted.set(code, c);
  }
  const mine = new Map(); // identifiant du code chez Whop -> code du créateur
  for (const [id, pc] of Object.entries(promoCodes)) {
    const code = String(pc?.code || "").toUpperCase();
    if (wanted.has(code)) mine.set(id, code);
  }
  const byMem = membershipPromos(memberships, payments);
  const memById = new Map(memberships.map((m) => [m.id, m]));
  const thisMonth = monthOf(now);
  const lastMonth = prevMonth(thisMonth);
  const firstAt = new Map(); // premier paiement encaissé de chaque abonnement
  for (const p of payments) {
    if (p.membership && isCashed(p) && (!firstAt.has(p.membership) || p.at < firstAt.get(p.membership))) firstAt.set(p.membership, p.at);
  }

  const slots = new Map();
  for (const [code, c] of wanted) {
    slots.set(code, {
      code,
      pct: Number.isFinite(Number(c.pct)) ? Number(c.pct) : null,
      plans: Object.fromEntries([...PLAN_KEYS, "other"].map((k) => [k, { members: new Set(), paid: {}, month: {}, prev: {} }])),
    });
  }
  const recent = [];

  for (const p of payments) {
    if (!isCashed(p)) continue;
    const code = mine.get(promoOf(p, byMem));
    if (!code) continue;
    const pl = slots.get(code).plans[keyOf(p.plan || memById.get(p.membership)?.plan)];
    const net = Math.max(0, round2(p.total - (p.refunded || 0)));
    const cur = String(p.currency || "eur").toUpperCase();
    addMoney(pl.paid, cur, net);
    const mk = monthOf(p.at);
    if (mk === thisMonth) addMoney(pl.month, cur, net);
    else if (mk === lastMonth) addMoney(pl.prev, cur, net);
    pl.members.add(p.membership || `paiement:${p.id}`);
    const first = p.reason ? p.reason === "subscription_create" || p.reason === "one_time" : firstAt.get(p.membership) === p.at;
    recent.push({
      at: p.at, code, plan: keyOf(p.plan || memById.get(p.membership)?.plan), currency: cur, total: round2(p.total), net, first,
      state: (p.refunded || 0) >= p.total ? "refunded" : p.refunded > 0 ? "partial" : "paid",
    });
  }
  // Abonnement rattaché au code et en cours, sans paiement encaissé (essai, code à 100 %) : il compte quand même comme une personne.
  for (const m of memberships) {
    const code = mine.get(byMem.get(m.id));
    if (code && LIVE.has(m.status)) slots.get(code).plans[keyOf(m.plan)].members.add(m.id);
  }

  const outCodes = [];
  for (const s of slots.values()) {
    const plans = {};
    const paid = { all: {}, month: {}, prev: {} };
    const monthly = {}; // ce que les abonnés en cours paient chaque mois (hors Lifetime et hors arrêt déjà programmé)
    const gainAll = {}; // somme des commissions des formules : les cartes « Par formule » s'additionnent au centime près
    let people = 0, active = 0;
    for (const key of [...PLAN_KEYS, "other"]) {
      const pl = s.plans[key];
      const ids = [...pl.members];
      const live = ids.filter((id) => LIVE.has(memById.get(id)?.status));
      if (key === "other" && !ids.length && !Object.keys(pl.paid).length) continue;
      plans[key] = { people: ids.length, active: live.length, paid: pl.paid, commission: scaleMoney(pl.paid, commission) };
      people += ids.length;
      active += live.length;
      sumInto(paid.all, pl.paid);
      sumInto(gainAll, plans[key].commission);
      sumInto(paid.month, pl.month);
      sumInto(paid.prev, pl.prev);
      if (key === "lifetime") continue;
      for (const id of live) {
        const m = memById.get(id);
        if (!m || m.cancelAtEnd) continue;
        const cur = String(m.currency || "eur").toUpperCase();
        addMoney(monthly, cur, m.renewal || PRICES[cur]?.[key] || 0);
      }
    }
    outCodes.push({
      code: s.code, pct: s.pct, people, active, plans, paid,
      commission: { all: gainAll, month: scaleMoney(paid.month, commission), prev: scaleMoney(paid.prev, commission) },
      monthly: scaleMoney(monthly, commission),
    });
  }

  const total = { people: 0, active: 0, plans: {}, paid: { all: {}, month: {}, prev: {} }, commission: { all: {}, month: {}, prev: {} }, monthly: {} };
  for (const k of PLAN_KEYS) total.plans[k] = planRow();
  for (const c of outCodes) {
    total.people += c.people;
    total.active += c.active;
    for (const [k, v] of Object.entries(c.plans)) {
      const t = (total.plans[k] ||= planRow());
      t.people += v.people;
      t.active += v.active;
      sumInto(t.paid, v.paid);
      sumInto(t.commission, v.commission);
    }
    for (const k of ["all", "month", "prev"]) {
      sumInto(total.paid[k], c.paid[k]);
      sumInto(total.commission[k], c.commission[k]);
    }
    sumInto(total.monthly, c.monthly);
  }

  recent.sort((a, b) => b.at - a.at);
  return {
    rate: commission,
    ratePct: Math.round(commission * 100),
    asOf,
    months: { this: thisMonth, prev: lastMonth },
    partial: !!partial,
    codes: outCodes,
    total,
    recent: recent.slice(0, RECENT_MAX).map((r) => ({ ...r, commission: round2(r.net * commission) })),
  };
}
