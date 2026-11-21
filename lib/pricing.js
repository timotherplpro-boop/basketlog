// Prix des formules dans la monnaie du visiteur : euros dans la zone euro, dollars américains ailleurs
// (choix de Tim le 07/11/2026). Les liens de paiement Whop en dollars sont des liens masqués des mêmes
// produits Starter, Pro et Lifetime : l'accès se vérifie exactement comme pour les liens en euros.
// Le lien Lifetime en dollars accepte aussi la devise locale de l'acheteur (option Whop des paiements uniques).
// 07/11/2026 : +20 % sur toutes les formules (avant : 10 / 19 / 99 € et 11,99 / 21,99 / 109 $), pour financer
// les 20 % reversés aux créateurs sur les abonnements pris avec leur code promo (-20 % pour le client).
// 13/11/2026 : l'offre faite aux créateurs est passée à 40 % de chaque paiement (lib/commission.js), tant que l'abonné reste abonné.
// 07/11/2026 (soir) : prix fixés par Tim à 13,99 / 29,99 / 99,99 € (Starter / Pro / Lifetime), au lieu de 12 / 22,80 /
// 118,80 €, et aux mêmes montants en dollars (13,99 / 29,99 / 99,99 $), au lieu de 14,39 / 26,39 / 130,80 $.
// Whop interdit de changer le prix d'un plan qui a des abonnés : le Starter en euros a donc un nouveau plan à 13,99 €
// (lien ci-dessous) ; l'ancien plan à 12 € (plan_c8MZCxs2q1nl5) est masqué et garde son abonné actuel à ce tarif.
// Ces montants doivent rester identiques aux prix des formules sur Whop.
// 19/11/2026 : Pro passe à 9,99 (€ et $) sur les deux plans Whop existants (aucun abonné), choix de Tim ; Starter n'est
// plus proposé (carte « Gratuit » à la place sur /pro), son prix reste ici pour les abonnés Starter déjà en cours.
// 21/11/2026 : pass 24 h à 1,99 (€ et $), choix de Tim (« le numéro 5 peut être une bonne option ») : paiement unique,
// accès complet pendant 24 h, sans renouvellement. Plans Whop masqués du produit Pro (expiration 1 jour) : l'accès se vérifie
// donc comme Pro et s'arrête tout seul chez Whop au bout de 24 h.
export const PRICES = {
  EUR: { starter: 13.99, pro: 9.99, lifetime: 99.99, pass: 1.99 },
  USD: { starter: 13.99, pro: 9.99, lifetime: 99.99, pass: 1.99 },
};
export const PASS_HOURS = 24;
export const PASS_PLAN_IDS = ["plan_QGTI7eTiHHOl3", "plan_rj3ur5lZBklhv"]; // EUR, USD

// 18/11/2026 : essai gratuit de 3 jours sur Pro (choix de Tim), réglé sur les deux plans Pro chez Whop (euros et dollars) :
// carte demandée, 0 pendant 3 jours, puis le prix normal chaque mois. Whop ne l'accorde qu'une fois par compte.
// Mettre 0 ici si l'essai est retiré chez Whop.
export const PRO_TRIAL_DAYS = 3;

export const CHECKOUT_EUR = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER || "https://whop.com/checkout/plan_xxJRLlWIZdMBd/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "https://whop.com/checkout/plan_9LcgVO0AP56pI/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME || "https://whop.com/checkout/plan_LEqDYDZ6KkVUL/",
  pass: "https://whop.com/checkout/plan_QGTI7eTiHHOl3/",
};

export const CHECKOUT_USD = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER_USD || "https://whop.com/checkout/plan_akKahkiEQVTul/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO_USD || "https://whop.com/checkout/plan_qpRxDjCSA3Qy6/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME_USD || "https://whop.com/checkout/plan_VvwhJtfH9o87X/",
  pass: "https://whop.com/checkout/plan_rj3ur5lZBklhv/",
};

export const checkoutFor = (cur) => (cur === "USD" ? CHECKOUT_USD : CHECKOUT_EUR);

// « 100 € », « 29,99 € », « 13,99 $ » (français, espagnol) ; « €100 », « €29.99 », « $13.99 » (anglais).
export function money(amount, cur, L) {
  const locale = L?.en ? "en-US" : L?.es ? "es-ES" : "fr-FR";
  const whole = Number.isInteger(amount);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency", currency: cur, currencyDisplay: "narrowSymbol",
      minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return cur === "USD" ? `$${amount}` : `${amount} €`;
  }
}

// Prix d'une formule dans une monnaie : price("pro", "USD", L) -> « 29,99 $ ».
export const price = (plan, cur, L) => money(PRICES[cur][plan], cur, L);

// Pour les textes valables partout (CGV, réponses aux questions) : « 13,99 € (13,99 $ hors zone euro) ».
export const priceBoth = (plan, L) =>
  `${price(plan, "EUR", L)} (${price(plan, "USD", L)} ${L?.en ? "outside the euro area" : L?.es ? "fuera de la zona euro" : "hors zone euro"})`;
