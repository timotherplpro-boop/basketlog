// Pass 24 h : affichage dans « Mon compte » (rien à résilier, fin à l'heure près) et liens de paiement.
import { normalizeMembership, planOf, buildPlans } from "../lib/account.js";
import { PASS_PLAN_IDS, PRICES, CHECKOUT_EUR, CHECKOUT_USD } from "../lib/pricing.js";
import { PAY_PLANS, planIdOf } from "../lib/whop-pay.js";

export async function passTests({ ok, ko, eq }) {
  console.log("Pass 24 h");
  const ids = { pro: "prod_pro", lifetime: "prod_life", starter: "prod_st" };
  const now = Date.parse("2026-11-21T12:00:00Z");
  const raw = (over) => ({ id: "mem_1", status: "active", product: { id: "prod_pro", title: "Basketlog Pro" }, plan: { id: PASS_PLAN_IDS[0] }, user: { id: "user_1" }, expires_at: "2026-11-22T11:00:00Z", ...over });
  const p = planOf(normalizeMembership(raw(), ids), now);
  eq("Pass actif : état « pass », pas de résiliation", [p?.state, p?.canCancel, p?.tier], ["pass", false, "pro"]);
  eq("Pass expiré : plus affiché", planOf(normalizeMembership(raw({ expires_at: "2026-11-21T11:00:00Z" }), ids), now), null);
  const both = buildPlans([normalizeMembership(raw(), ids), normalizeMembership({ ...raw({ id: "mem_2", plan: { id: "plan_pro" }, renewal_price: 9.99 }), current_period_end: "2026-12-21T11:00:00Z" }, ids)], now);
  eq("Pass + Pro : pas d'alerte de doublon", both.map((x) => [x.state, x.duplicate]), [["renews", false], ["pass", false]]);
  eq("Prix 1,99 € et 1,99 $", [PRICES.EUR.pass, PRICES.USD.pass], [1.99, 1.99]);
  eq("Pass retiré du site (24/11) : plus de lien de paiement ni de formule « pass »", [CHECKOUT_EUR.pass, CHECKOUT_USD.pass, PAY_PLANS.includes("pass")], [undefined, undefined, false]);
}
