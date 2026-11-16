// « Mes gains » des créateurs : calcul (lib/creator-report.js), lecture partagée gardée en mémoire (lib/shared-read.js)
// et part reversée (lib/commission.js : 40 % du montant hors TVA), aperçu avec chiffres d'exemple (lib/creator-demo.js).
// Aucun réseau : les abonnements et paiements de Whop sont simulés.
import { CREATOR_COMMISSION, COMMISSION_PCT, VAT_RATE, VAT_PCT, commissionOf, exVat } from "../lib/commission.js";
import { buildCreatorReport, creatorView, membershipPromos, monthOf, prevMonth, promoOf } from "../lib/creator-report.js";
import { DEMO_CODE, demoReport } from "../lib/creator-demo.js";
import { sharedReader } from "../lib/shared-read.js";

const T = (iso) => Date.parse(iso);
export const NOW = T("2026-11-16T17:00:00Z"); // lundi 16 novembre 2026

export const promoCodes = {
  promo_A: { id: "promo_A", code: "GONZOPICKS10" },
  promo_B: { id: "promo_B", code: "AUTRE10" },
};
// Abonnements : m1 Starter (code gardé sur l'abonnement), m2 Pro en dollars (code retiré de l'abonnement par Whop),
// m3 Lifetime, m4 Starter résilié et remboursé, m5 Pro d'un autre créateur, m6 sans code, m7 Pro dont l'arrêt est programmé.
export const memberships = [
  { id: "mem_1", plan: "starter", status: "active", cancelAtEnd: false, promo: "promo_A", renewal: 13.99, currency: "eur" },
  { id: "mem_2", plan: "pro", status: "active", cancelAtEnd: false, promo: null, renewal: 29.99, currency: "usd" },
  { id: "mem_3", plan: "lifetime", status: "completed", cancelAtEnd: false, promo: "promo_A", renewal: null, currency: "eur" },
  { id: "mem_4", plan: "starter", status: "canceled", cancelAtEnd: false, promo: "promo_A", renewal: 13.99, currency: "eur" },
  { id: "mem_5", plan: "pro", status: "active", cancelAtEnd: false, promo: "promo_B", renewal: 29.99, currency: "eur" },
  { id: "mem_6", plan: "starter", status: "active", cancelAtEnd: false, promo: null, renewal: 13.99, currency: "eur" },
  { id: "mem_7", plan: "pro", status: "active", cancelAtEnd: true, promo: "promo_A", renewal: 29.99, currency: "eur" },
];
const pay = (id, membership, plan, at, total, extra = {}) => ({
  id, membership, plan, status: "paid", reason: "subscription_cycle", currency: "eur", total, refunded: 0, at: T(at), promo: null, ...extra,
});
export const payments = [
  pay("pay_1", "mem_1", "starter", "2026-10-15T09:00:00Z", 12.59, { reason: "subscription_create", promo: "promo_A" }),
  pay("pay_2", "mem_1", "starter", "2026-11-15T09:00:00Z", 13.99), // renouvellement : sans code sur le paiement
  pay("pay_3", "mem_2", "pro", "2026-10-10T09:00:00Z", 26.99, { reason: "subscription_create", promo: "promo_A", currency: "usd" }),
  pay("pay_4", "mem_2", "pro", "2026-11-10T09:00:00Z", 29.99, { currency: "usd" }), // renouvellement, abonnement sans code
  pay("pay_5", "mem_3", "lifetime", "2026-11-02T09:00:00Z", 89.99, { reason: "one_time", promo: "promo_A" }),
  pay("pay_6", "mem_4", "starter", "2026-10-05T09:00:00Z", 12.59, { reason: "subscription_create", promo: "promo_A", refunded: 12.59 }),
  pay("pay_7", "mem_5", "pro", "2026-11-03T09:00:00Z", 26.99, { reason: "subscription_create", promo: "promo_B" }),
  pay("pay_8", "mem_6", "starter", "2026-11-04T09:00:00Z", 13.99, { reason: "subscription_create" }),
  pay("pay_9", "mem_7", "pro", "2026-11-01T09:00:00Z", 26.99, { reason: "subscription_create", promo: "promo_A" }),
  pay("pay_10", "mem_1", "starter", "2026-11-14T09:00:00Z", 13.99, { status: "open" }), // paiement non encaissé : ignoré
];

const sorted = (bag) => Object.fromEntries(Object.entries(bag).sort(([x], [y]) => x.localeCompare(y))); // l'ordre des monnaies n'a pas d'importance

export async function creatorGainsTests({ ok, ko, eq }) {
  console.log("Mes gains (créateurs)");
  const report = (codes, extra = {}) => buildCreatorReport({ codes, promoCodes, memberships, payments, asOf: NOW - 20e3, now: NOW, ...extra });

  eq("gains : part du créateur = 40 % du montant hors TVA (TVA 20 %), partagée avec l'admin", [CREATOR_COMMISSION, COMMISSION_PCT, VAT_RATE, VAT_PCT, report([]).ratePct, report([]).vatPct], [0.4, 40, 0.2, 20, 40, 20]);
  eq("gains : 1 000 € payés = 833,33 € hors TVA = 333,33 € pour le créateur", [exVat(1000), commissionOf(1000)], [833.33, 333.33]);
  eq("gains : prix des formules (13,99 / 12,59 / 29,99 / 89,99) -> commission", [exVat(13.99), commissionOf(13.99), commissionOf(12.59), commissionOf(29.99), commissionOf(89.99), commissionOf(0)], [11.66, 4.66, 4.2, 10, 30, 0]);
  eq("gains : sans TVA (taux 0), la commission est 40 % du montant payé", [commissionOf(1000, 0.4, 0), exVat(50, 0)], [400, 50]);
  eq("gains : mois à l'heure de Paris (31 oct. 23 h 30 UTC = 1er nov. à Paris)", [monthOf(T("2026-10-31T23:30:00Z")), monthOf(T("2026-10-31T22:30:00Z")), prevMonth("2026-01"), prevMonth("2026-11")], ["2026-11", "2026-10", "2025-12", "2026-10"]);

  const a = report([{ code: "GONZOPICKS10", pct: 10 }]);
  const t = a.total;
  eq("gains : mois en cours et mois précédent", a.months, { this: "2026-11", prev: "2026-10" });
  eq("gains : personnes par formule (Starter 2, Pro 2, Lifetime 1) et total", [t.plans.starter.people, t.plans.pro.people, t.plans.lifetime.people, t.people], [2, 2, 1, 5]);
  eq("gains : abonnés actifs par formule (le résilié n'en fait pas partie)", [t.plans.starter.active, t.plans.pro.active, t.plans.lifetime.active, t.active], [1, 2, 1, 4]);
  eq("gains : le renouvellement d'un abonnement dont Whop a retiré le code reste au créateur", [t.plans.pro.paid.USD, t.commission.month.USD], [56.98, 10]);
  eq("gains : payé par formule, euros et dollars séparés", [t.plans.starter.paid, sorted(t.plans.pro.paid), t.plans.lifetime.paid], [{ EUR: 26.58 }, { EUR: 26.99, USD: 56.98 }, { EUR: 89.99 }]);
  eq("gains : montant hors TVA par formule (payé ÷ 1,2)", [t.plans.starter.exVat, sorted(t.plans.pro.exVat), t.plans.lifetime.exVat], [{ EUR: 22.15 }, { EUR: 22.49, USD: 47.48 }, { EUR: 74.99 }]);
  eq("gains : commission par formule (40 % du hors TVA)", [t.plans.starter.commission, sorted(t.plans.pro.commission), t.plans.lifetime.commission], [{ EUR: 8.86 }, { EUR: 9, USD: 18.99 }, { EUR: 30 }]);
  eq("gains : la commission affichée = 40 % du hors TVA affiché, pour chaque formule et chaque monnaie",
    Object.values(t.plans).every((v) => Object.keys(v.paid).every((c) => Math.round(v.exVat[c] * 0.4 * 100) / 100 === v.commission[c])), true);
  eq("gains : commission du mois (novembre)", sorted(t.commission.month), { EUR: 43.66, USD: 10 });
  eq("gains : commission du mois précédent (octobre), remboursement déduit", sorted(t.commission.prev), { EUR: 4.2, USD: 9 });
  eq("gains : commission cumulée = somme des formules", sorted(t.commission.all), { EUR: 47.86, USD: 18.99 });
  eq("gains : hors TVA du mois, du mois précédent et cumulé", [sorted(t.exVat.month), sorted(t.exVat.prev), sorted(t.exVat.all)], [{ EUR: 109.14, USD: 24.99 }, { EUR: 10.49, USD: 22.49 }, { EUR: 119.63, USD: 47.48 }]);
  eq("gains : estimation mensuelle (ni Lifetime, ni arrêt programmé, ni résilié), hors TVA puis 40 %", sorted(t.monthly), { EUR: 4.66, USD: 10 });
  eq("gains : sans TVA (taux 0), la commission redevient 40 % du payé", sorted(report([{ code: "GONZOPICKS10" }], { vat: 0 }).total.commission.month), { EUR: 52.39, USD: 12 });

  eq("gains : paiements récents du plus récent au plus ancien, non encaissés exclus", a.recent.map((r) => [r.at, r.plan, r.first, r.state]), [
    [T("2026-11-15T09:00:00Z"), "starter", false, "paid"],
    [T("2026-11-10T09:00:00Z"), "pro", false, "paid"],
    [T("2026-11-02T09:00:00Z"), "lifetime", true, "paid"],
    [T("2026-11-01T09:00:00Z"), "pro", true, "paid"],
    [T("2026-10-15T09:00:00Z"), "starter", true, "paid"],
    [T("2026-10-10T09:00:00Z"), "pro", true, "paid"],
    [T("2026-10-05T09:00:00Z"), "starter", true, "refunded"],
  ]);
  eq("gains : commission d'un paiement récent (13,99 € payés = 11,66 € hors TVA = 4,66 €)", [a.recent[0].net, a.recent[0].exVat, a.recent[0].commission, a.recent[1].currency, a.recent[1].exVat, a.recent[1].commission], [13.99, 11.66, 4.66, "USD", 24.99, 10]);

  // Un créateur ne voit rien des autres : ni leurs chiffres, ni un identifiant d'abonné ou de paiement.
  const b = report([{ code: "AUTRE10", pct: 10 }]);
  eq("gains : un autre créateur ne voit que son propre code (1 personne, Pro, 26,99 €)", [b.total.people, b.total.plans.pro.people, b.total.plans.pro.paid, b.total.commission.all, b.recent.length], [1, 1, { EUR: 26.99 }, { EUR: 9 }, 1]);
  eq("gains : un code inconnu ne reçoit rien", [report([{ code: "PIRATE99", pct: 5 }]).total.people, report([{ code: "PIRATE99", pct: 5 }]).recent.length], [0, 0]);
  eq("gains : sans code, tout est à zéro", [report([]).codes, report([]).total.people, report([]).total.commission.all], [[], 0, {}]);
  eq("gains : le code est reconnu quelle que soit la casse", report([{ code: "gonzopicks10", pct: 10 }]).total.people, 5);
  const leak = JSON.stringify(a);
  eq("gains : aucun identifiant d'abonné ni de paiement dans le résultat", /mem_|pay_|user_|promo_/.test(leak), false);

  // Plusieurs codes : chacun a ses chiffres, le total les additionne.
  const both = report([{ code: "GONZOPICKS10", pct: 10 }, { code: "AUTRE10", pct: 10 }]);
  eq("gains : deux codes, chiffres par code et total", [both.codes.map((c) => [c.code, c.people]), both.total.people, both.total.plans.pro.people], [[["GONZOPICKS10", 5], ["AUTRE10", 1]], 6, 3]);

  // Cas limites de rattachement.
  eq("gains : le code de l'abonnement l'emporte, sinon celui du premier paiement remisé", [...membershipPromos(
    [{ id: "m1", promo: "P1" }, { id: "m2", promo: null }],
    [{ membership: "m1", promo: "P2", at: 1 }, { membership: "m2", promo: "P3", at: 5 }, { membership: "m2", promo: "P4", at: 2 }]
  ).entries()], [["m1", "P1"], ["m2", "P4"]]);
  eq("gains : paiement sans code ni abonnement connu = aucun code", promoOf({ promo: null, membership: "mem_x" }, new Map()), null);
  const trial = buildCreatorReport({
    codes: [{ code: "AUTRE10" }], promoCodes, asOf: NOW, now: NOW,
    memberships: [{ id: "t1", plan: "pro", status: "trialing", promo: "promo_B", renewal: 29.99, currency: "eur" }], payments: [],
  });
  eq("gains : un abonnement en essai avec le code compte comme une personne, sans argent", [trial.total.people, trial.total.active, trial.total.plans.pro.paid], [1, 1, {}]);
  const other = buildCreatorReport({
    codes: [{ code: "AUTRE10" }], promoCodes, asOf: NOW, now: NOW, memberships: [],
    payments: [pay("pay_x", "mem_x", null, "2026-11-10T09:00:00Z", 10, { promo: "promo_B" })],
  });
  eq("gains : formule inconnue = ligne « autre » seulement quand elle existe", [Object.keys(other.total.plans), Object.keys(report([{ code: "AUTRE10" }]).total.plans)], [["starter", "pro", "lifetime", "other"], ["starter", "pro", "lifetime"]]);
  eq("gains : le drapeau « partiel » est transmis", [report([]).partial, report([], { partial: true }).partial], [false, true]);
  eq("gains : paiement complètement remboursé = 0 € de commission", [report([{ code: "GONZOPICKS10" }]).recent.at(-1).exVat, report([{ code: "GONZOPICKS10" }]).recent.at(-1).commission], [0, 0]);

  // Aperçu avec chiffres d'exemple (admin et « voir comme ») : même calcul, dates calées sur « maintenant », jamais de vrai code.
  const demo = demoReport(NOW);
  eq("démo : un code d'exemple, 7 personnes dont 5 actives (Starter 4, Pro 2, Lifetime 1)", [demo.codes.map((c) => c.code), demo.total.people, demo.total.active, demo.total.plans.starter.people, demo.total.plans.pro.people, demo.total.plans.lifetime.people], [[DEMO_CODE], 7, 5, 4, 2, 1]);
  eq("démo : commission du mois et du mois précédent (hors TVA puis 40 %)", [sorted(demo.total.commission.month), sorted(demo.total.commission.prev)], [{ EUR: 48.32, USD: 4.2 }, { EUR: 8.39, USD: 9 }]);
  eq("démo : euros et dollars, un paiement remboursé, des renouvellements", [Object.keys(demo.total.paid.all).sort(), demo.recent.some((r) => r.state === "refunded"), demo.recent.some((r) => !r.first), demo.recent.some((r) => r.first)], [["EUR", "USD"], true, true, true]);
  eq("démo : aucun identifiant d'abonné ni de paiement", /mem_|pay_|user_|promo_|"d[0-9]"|"p[0-9]"/.test(JSON.stringify(demo)), false);
  for (const iso of ["2026-11-01T00:30:00Z", "2026-10-31T23:30:00Z", "2026-01-01T09:00:00Z", "2026-03-31T21:30:00Z", "2026-07-15T10:00:00Z"]) {
    const d = demoReport(T(iso));
    eq(`démo : le mois en cours et le mois précédent sont remplis (${iso})`, [d.total.people, Object.keys(d.total.commission.month).includes("EUR"), Object.keys(d.total.commission.prev).includes("EUR"), d.recent.every((r) => r.at <= T(iso))], [7, true, true, true]);
  }

  // Ce qui part vers un créateur : ses gains seulement. Jamais ce que les abonnés ont payé, ni le hors TVA, ni le total ou le net d'un paiement.
  const keysOf = (o, acc = new Set()) => { if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) { acc.add(k); keysOf(v, acc); } return acc; };
  const full = report([{ code: "GONZOPICKS10" }]);
  const vue = creatorView(full);
  const vueDemo = creatorView(demo);
  eq("vue créateur : ni « payé », ni hors TVA, ni net d'un paiement, nulle part (rapport réel et aperçu)", [vue, vueDemo].map((v) => ["paid", "exVat", "net"].filter((k) => keysOf(v).has(k))), [[], []]);
  eq("vue créateur : une ligne de paiement ne garde que date, code, formule, monnaie, 1er paiement, état et commission", [...new Set(vue.recent.flatMap((r) => Object.keys(r)))].sort(), ["at", "code", "commission", "currency", "first", "plan", "state"]);
  eq("vue créateur : les gains sont intacts (mois, mois dernier, depuis le début, estimation, par formule, par code, paiements)", [
    sorted(vue.total.commission.month), sorted(vue.total.commission.prev), sorted(vue.total.commission.all), sorted(vue.total.monthly),
    JSON.stringify(vue.total.plans.starter.commission) === JSON.stringify(full.total.plans.starter.commission), JSON.stringify(vue.codes[0].commission) === JSON.stringify(full.codes[0].commission),
    vue.recent.map((r) => r.commission).join() === full.recent.map((r) => r.commission).join(),
  ], [{ EUR: 43.66, USD: 10 }, { EUR: 4.2, USD: 9 }, { EUR: 47.86, USD: 18.99 }, { EUR: 4.66, USD: 10 }, true, true, true]);
  eq("vue créateur : personnes, actifs, taux, TVA, mois et drapeau « partiel » inchangés", [vue.total.people, vue.total.active, vue.total.plans.pro.people, vue.codes[0].people, vue.rate, vue.ratePct, vue.vat, vue.vatPct, vue.months, vue.partial], [full.total.people, full.total.active, full.total.plans.pro.people, full.codes[0].people, full.rate, full.ratePct, full.vat, full.vatPct, full.months, full.partial]);
  eq("vue créateur : le rapport d'origine garde son détail (il sert au calcul)", [keysOf(full).has("paid"), keysOf(full).has("exVat"), full.recent[0].net > 0], [true, true, true]);
  eq("vue créateur : sans rapport, rien ne casse", [creatorView(null), creatorView(undefined), Object.keys(creatorView({}))], [null, undefined, ["codes", "total", "recent"]]);

  // Lecture partagée : une seule lecture chez Whop pour tous, cache de 60 s, erreurs, chiffres anciens en secours.
  let clock = 1_000_000;
  let calls = 0;
  let fail = false;
  const slow = [];
  const reader = sharedReader({
    fetcher: async () => { calls++; if (fail) throw new Error("Whop 500"); await new Promise((r) => setTimeout(r, 5)); slow.push(calls); return { n: calls }; },
    now: () => clock,
  });
  const burst = await Promise.all(Array.from({ length: 25 }, () => reader()));
  eq("cache : 25 demandes en même temps = 1 seule lecture chez Whop", [calls, burst.every((x) => x.n === 1)], [1, true]);
  clock += 59_000;
  eq("cache : encore valable après 59 s", [(await reader()).n, calls], [1, 1]);
  clock += 2_000;
  eq("cache : relu après 60 s", [(await reader()).n, calls], [2, 2]);
  fail = true;
  clock += 61_000;
  const stale = await reader();
  eq("cache : Whop en panne, derniers chiffres renvoyés et marqués", [stale.n, stale.stale, calls], [2, true, 3]);
  clock += 5_000;
  await reader();
  eq("cache : pas de nouvelle lecture avant 10 s après un échec", calls, 3);
  clock += 6_000;
  await reader();
  eq("cache : nouvelle tentative après 10 s", calls, 4);
  clock += 16 * 60_000;
  let msg = "";
  try { await reader(); } catch (e) { msg = e.message; }
  eq("cache : au-delà de 15 min, l'erreur est renvoyée plutôt que des chiffres périmés", msg, "Whop 500");
  fail = false;
  clock += 11_000;
  eq("cache : Whop revenu, les chiffres sont de nouveau à jour", [(await reader()).stale, (await reader()).n >= 5], [undefined, true]);
  reader.reset();
  eq("cache : remise à zéro", [(await reader()).n >= 1], [true]);
}
