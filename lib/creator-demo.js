// Aperçu de la rubrique « Mes gains » avec des chiffres d'EXEMPLE, inventés : un administrateur (ou le mode « voir comme ») voit ainsi
// l'écran des créateurs sans compte créateur et sans aucun appel à Whop. Les chiffres passent par le vrai calcul (buildCreatorReport) :
// même règle (TVA retirée, puis 40 %), même présentation. Les dates sont calées sur « maintenant » pour que « ce mois-ci » et
// « mois dernier » soient toujours remplis. Fonction pure (aucune dépendance à Next ni au réseau, tests sous Node).
import { buildCreatorReport, monthOf } from "./creator-report.js";

export const DEMO_CODE = "EXEMPLE10";

export function demoReport(now = Date.now()) {
  const [y, m] = monthOf(now).split("-").map(Number);
  const day = 86400e3;
  const thisStart = Date.UTC(y, m - 1, 1, 12); // midi UTC le 1er du mois : toujours dans le bon mois à Paris
  const prevStart = Date.UTC(y, m - 2, 1, 12);
  const cur = (d) => Math.min(now - 600e3, thisStart + d * day); // ce mois-ci, jamais dans le futur
  const old = (d) => prevStart + d * day; // mois dernier

  const promo = "promo_demo";
  const memberships = [
    { id: "d1", plan: "starter", status: "active", cancelAtEnd: false, promo, renewal: 13.99, currency: "eur" },
    { id: "d2", plan: "starter", status: "active", cancelAtEnd: false, promo, renewal: 13.99, currency: "eur" },
    { id: "d3", plan: "pro", status: "active", cancelAtEnd: false, promo, renewal: 29.99, currency: "eur" },
    { id: "d4", plan: "lifetime", status: "completed", cancelAtEnd: false, promo, renewal: null, currency: "eur" },
    { id: "d5", plan: "starter", status: "active", cancelAtEnd: false, promo, renewal: 13.99, currency: "usd" },
    { id: "d6", plan: "pro", status: "canceled", cancelAtEnd: false, promo, renewal: 29.99, currency: "usd" },
    { id: "d7", plan: "starter", status: "canceled", cancelAtEnd: false, promo, renewal: 13.99, currency: "eur" },
  ];
  const pay = (id, membership, plan, at, total, extra = {}) => ({
    id, membership, plan, status: "paid", reason: "subscription_cycle", currency: "eur", total, refunded: 0, at, promo: null, ...extra,
  });
  const first = { reason: "subscription_create", promo };
  const payments = [
    pay("p1", "d1", "starter", old(3), 12.59, first),
    pay("p2", "d1", "starter", cur(3), 13.99), // renouvellement
    pay("p3", "d2", "starter", old(10), 12.59, first),
    pay("p4", "d2", "starter", cur(10), 13.99), // renouvellement
    pay("p5", "d3", "pro", cur(2), 26.99, first),
    pay("p6", "d4", "lifetime", cur(5), 89.99, { reason: "one_time", promo }),
    pay("p7", "d5", "starter", cur(6), 12.59, { ...first, currency: "usd" }),
    pay("p8", "d6", "pro", old(17), 26.99, { ...first, currency: "usd" }),
    pay("p9", "d7", "starter", old(21), 12.59, { ...first, refunded: 12.59 }), // remboursé
  ];
  return buildCreatorReport({
    codes: [{ code: DEMO_CODE, pct: 10 }],
    promoCodes: { [promo]: { id: promo, code: DEMO_CODE } },
    memberships, payments, asOf: now, now,
  });
}
