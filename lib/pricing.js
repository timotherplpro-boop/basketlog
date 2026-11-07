// Prix des formules dans la monnaie du visiteur : euros dans la zone euro, dollars américains ailleurs
// (choix de Tim le 07/11/2026). Les liens de paiement Whop en dollars sont des liens masqués des mêmes
// produits Starter, Pro et Lifetime : l'accès se vérifie exactement comme pour les liens en euros.
// Le lien Lifetime en dollars accepte aussi la devise locale de l'acheteur (option Whop des paiements uniques).
// 07/11/2026 : +20 % sur toutes les formules (avant : 10 / 19 / 99 € et 11,99 / 21,99 / 109 $), pour financer
// les 20 % reversés aux créateurs sur les abonnements pris avec leur code promo (-20 % pour le client).
// Ces montants doivent rester identiques aux prix des formules sur Whop.
export const PRICES = {
  EUR: { starter: 12, pro: 22.8, lifetime: 118.8 },
  USD: { starter: 14.39, pro: 26.39, lifetime: 130.8 },
};

export const CHECKOUT_EUR = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER || "https://whop.com/checkout/plan_c8MZCxs2q1nl5/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "https://whop.com/checkout/plan_9LcgVO0AP56pI/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME || "https://whop.com/checkout/plan_LEqDYDZ6KkVUL/",
};

export const CHECKOUT_USD = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER_USD || "https://whop.com/checkout/plan_akKahkiEQVTul/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO_USD || "https://whop.com/checkout/plan_qpRxDjCSA3Qy6/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME_USD || "https://whop.com/checkout/plan_VvwhJtfH9o87X/",
};

export const checkoutFor = (cur) => (cur === "USD" ? CHECKOUT_USD : CHECKOUT_EUR);

// « 12 € », « 22,80 € », « 14,39 $ » (français, espagnol) ; « €12 », « €22.80 », « $14.39 » (anglais).
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

// Prix d'une formule dans une monnaie : price("pro", "USD", L) -> « 26,39 $ ».
export const price = (plan, cur, L) => money(PRICES[cur][plan], cur, L);

// Pour les textes valables partout (CGV, réponses aux questions) : « 12 € (14,39 $ hors zone euro) ».
export const priceBoth = (plan, L) =>
  `${price(plan, "EUR", L)} (${price(plan, "USD", L)} ${L?.en ? "outside the euro area" : L?.es ? "fuera de la zona euro" : "hors zone euro"})`;
