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
// 24/11/2026 : Pass 24 h retiré du site (décision de Tim) ; prix et identifiants gardés pour reconnaître un pass déjà acheté.
// 21/11/2026 : pass 24 h à 1,99 (€ et $), choix de Tim (« le numéro 5 peut être une bonne option ») : paiement unique,
// accès complet pendant 24 h, sans renouvellement. Plans Whop masqués du produit Pro (expiration 1 jour) : l'accès se vérifie
// donc comme Pro et s'arrête tout seul chez Whop au bout de 24 h.
// 23/11/2026 : le site ne vend plus qu'en euros. Les prix USD ci-dessous ne servent qu'aux abonnés déjà pris en dollars
// (« Mon compte », e-mail de fin d'essai). 24/11/2026 : hors zone euro, les prix en euros sont affichés convertis en dollars
// au taux du jour (lib/fx.js), sans plan en dollars : le paiement reste en euros.
export const PRICES = {
  EUR: { starter: 13.99, pro: 9.99, lifetime: 99.99, pass: 1.99 },
  USD: { starter: 13.99, pro: 9.99, lifetime: 99.99, pass: 1.99 },
};
export const PASS_HOURS = 24;
export const PASS_PLAN_IDS = ["plan_QGTI7eTiHHOl3", "plan_rj3ur5lZBklhv"]; // EUR, USD

// 18/11/2026 : essai gratuit de 3 jours sur Pro (choix de Tim), réglé sur les deux plans Pro chez Whop (euros et dollars) :
// carte demandée, 0 pendant 3 jours, puis le prix normal chaque mois. Whop ne l'accorde qu'une fois par compte.
// Mettre 0 ici si l'essai est retiré chez Whop.
// 24/11/2026 : l'essai n'est plus gratuit mais à 1 € (+ taxes), décision de Tim « pour tester les cartes » : une carte vide
// ne passe plus l'inscription. Réglé chez Whop sur le plan Pro en euros (prix initial 1, essai 3 jours, puis 9,99/mois).
// 28/11/2026 : 1 jour gratuit, carte demandée (Tim : « remettre à la place des 3 jours gratuits pour 1 €, 1 jour gratuit où
// il faut quand même mettre la carte »). Réglé chez Whop sur le plan Pro en euros : frais initiaux 0, essai 1 jour, puis
// 9,99 €/mois. Whop demande la carte pour démarrer l'essai et ne l'accorde qu'une fois par compte.
export const PRO_TRIAL_DAYS = 1;
export const PRO_TRIAL_PRICE = 0; // 0 : essai gratuit (les textes disent « 1 jour gratuit », plus « à 1 € »)
export const trialFree = () => !(PRO_TRIAL_PRICE > 0);

export const CHECKOUT_EUR = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER || "https://whop.com/checkout/plan_xxJRLlWIZdMBd/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "https://whop.com/checkout/plan_9LcgVO0AP56pI/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME || "https://whop.com/checkout/plan_LEqDYDZ6KkVUL/",
};

export const CHECKOUT_USD = {
  starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER_USD || "https://whop.com/checkout/plan_akKahkiEQVTul/",
  pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO_USD || "https://whop.com/checkout/plan_qpRxDjCSA3Qy6/",
  lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME_USD || "https://whop.com/checkout/plan_VvwhJtfH9o87X/",
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

// Monnaie d'affichage : soit un code ("EUR", ou "USD" pour les abonnés déjà pris en dollars avant le 23/11/2026), soit
// l'objet du visiteur { cur: "EUR" } / { cur: "USD", rate } (lib/currency-server.js) : les prix en euros sont alors convertis
// en dollars au taux du jour, arrondis au centime (24/11/2026, demande de Tim : jamais « 9,99 $ » sur le site).
const isFx = (c) => !!c && typeof c === "object";
export const curOf = (c) => (isFx(c) ? (c.cur === "USD" && c.rate > 0 ? "USD" : "EUR") : c || "EUR");
export const convert = (eur, c) => (curOf(c) === "USD" && isFx(c) ? Math.round(eur * c.rate * 100) / 100 : eur);
export const amountOf = (plan, c) => (isFx(c) ? convert(PRICES.EUR[plan], c) : PRICES[c || "EUR"][plan]);
// Un montant en euros affiché dans la monnaie du visiteur : shown(1, fx, L) -> « 1 € » ou « $1.16 ».
export const shown = (eur, c, L) => money(isFx(c) ? convert(eur, c) : eur, isFx(c) ? curOf(c) : "EUR", L);

// Prix d'une formule : price("pro", "EUR", L) -> « 9,99 € » ; price("pro", fx, L) -> « $11.59 » hors zone euro.
export const price = (plan, c, L) => money(amountOf(plan, c), curOf(c), L);

// Hors zone euro : rappel que le paiement se fait en euros (le montant en dollars est une conversion au taux du jour).
export function fxNote(L, c) {
  if (curOf(c) !== "USD") return "";
  if (trialFree()) {
    const t = trialLabel(L);
    return L.t(
      `Prix convertis en dollars au taux du jour. Paiement en euros (${price("pro", "EUR", L)}/mois après ${t}, Lifetime ${price("lifetime", "EUR", L)}), converti par ta banque.`,
      `Prices shown in dollars at today's exchange rate. You pay in euros (${price("pro", "EUR", L)}/mo after ${t}, Lifetime ${price("lifetime", "EUR", L)}), converted by your bank.`,
      `Precios convertidos a dólares al tipo de cambio del día. Pagas en euros (${price("pro", "EUR", L)}/mes después de ${t}, Lifetime ${price("lifetime", "EUR", L)}), convertido por tu banco.`,
      `Preços convertidos em dólares pelo câmbio do dia. Você paga em euros (${price("pro", "EUR", L)}/mês depois de ${t}, Lifetime ${price("lifetime", "EUR", L)}), convertido pelo seu banco.`
    );
  }
  return L.t(
    `Prix convertis en dollars au taux du jour. Paiement en euros (${price("pro", "EUR", L)}/mois, essai à ${money(PRO_TRIAL_PRICE, "EUR", L)}, Lifetime ${price("lifetime", "EUR", L)}), converti par ta banque.`,
    `Prices shown in dollars at today's exchange rate. You pay in euros (${price("pro", "EUR", L)}/mo, ${money(PRO_TRIAL_PRICE, "EUR", L)} trial, Lifetime ${price("lifetime", "EUR", L)}), converted by your bank.`,
    `Precios convertidos a dólares al tipo de cambio del día. Pagas en euros (${price("pro", "EUR", L)}/mes, prueba por ${money(PRO_TRIAL_PRICE, "EUR", L)}, Lifetime ${price("lifetime", "EUR", L)}), convertido por tu banco.`,
    `Preços convertidos em dólares pelo câmbio do dia. Você paga em euros (${price("pro", "EUR", L)}/mês, teste por ${money(PRO_TRIAL_PRICE, "EUR", L)}, Lifetime ${price("lifetime", "EUR", L)}), convertido pelo seu banco.`
  );
}

// Textes de l'essai Pro dans la monnaie du visiteur (« 3 jours à 1 €, puis 9,99 €/mois » ; hors zone euro, les mêmes
// montants convertis en dollars au taux du jour, avec la mention du paiement en euros).
const daysTxt = (L, d) => (d === 1 ? L.t("1 jour", "1 day", "1 día", "1 dia") : L.t(`${d} jours`, `${d} days`, `${d} días`, `${d} dias`));

// « 1 jour gratuit » (essai gratuit) ou « 3 jours à 1 € » (essai payant). `amount` : montant déjà formaté (remise comprise).
export function trialLabel(L, c = "EUR", amount = null) {
  const d = PRO_TRIAL_DAYS;
  if (trialFree()) return d === 1 ? L.t("1 jour gratuit", "1 free day", "1 día gratis", "1 dia grátis") : L.t(`${d} jours gratuits`, `${d} free days`, `${d} días gratis`, `${d} dias grátis`);
  const one = amount || shown(PRO_TRIAL_PRICE, c, L), n = daysTxt(L, d);
  return L.t(`${n} à ${one}`, `${n} for ${one}`, `${n} por ${one}`, `${n} por ${one}`);
}

// Bouton de l'essai : « Essayer Pro 1 jour gratuitement » ou « Essai 3 jours à 1 € ».
export function trialCta(L, c = "EUR", amount = null) {
  const d = PRO_TRIAL_DAYS, n = daysTxt(L, d);
  if (trialFree()) return L.t(`Essayer Pro ${n} gratuitement`, `Try Pro free for ${n}`, `Prueba Pro ${n} gratis`, `Teste o Pro ${n} grátis`);
  const one = amount || shown(PRO_TRIAL_PRICE, c, L);
  return L.t(`Essai ${d} jours à ${one}`, `Start ${d}-day trial for ${one}`, `Prueba ${d} días por ${one}`, `Teste ${d} dias por ${one}`);
}

// Essai gratuit : Whop demande quand même la carte (Tim, 28/11/2026), on le dit à côté de l'offre.
export const cardNote = (L) => (trialFree() ? L.t(" (carte demandée)", " (card required)", " (se pide tarjeta)", " (cartão necessário)") : "");

export function trialTexts(L, c = "EUR") {
  const one = shown(PRO_TRIAL_PRICE, c, L), pro = price("pro", c, L), label = trialLabel(L, c);
  const usd = curOf(c) === "USD";
  const billed = usd && trialFree() ? L.t(` Paiement en euros : ${price("pro", "EUR", L)}/mois après l'essai.`, ` Billed in euros: ${price("pro", "EUR", L)}/mo after the trial.`, ` Pago en euros: ${price("pro", "EUR", L)}/mes después de la prueba.`, ` Pagamento em euros: ${price("pro", "EUR", L)}/mês depois do teste.`) : usd ? L.t(` Paiement en euros : ${money(PRO_TRIAL_PRICE, "EUR", L)} puis ${price("pro", "EUR", L)}/mois.`, ` Billed in euros: ${money(PRO_TRIAL_PRICE, "EUR", L)} then ${price("pro", "EUR", L)}/mo.`, ` Pago en euros: ${money(PRO_TRIAL_PRICE, "EUR", L)} y luego ${price("pro", "EUR", L)}/mes.`, ` Pagamento em euros: ${money(PRO_TRIAL_PRICE, "EUR", L)} e depois ${price("pro", "EUR", L)}/mês.`) : "";
  return {
    cta: trialCta(L, c),
    line: L.t(`${label}${cardNote(L)}, puis ${pro}/mois + taxes. Résiliable à tout moment.`, `${label}${cardNote(L)}, then ${pro}/mo (+ tax). Cancel anytime.`, `${label}${cardNote(L)}, luego ${pro}/mes + impuestos. Cancela cuando quieras.`, `${label}${cardNote(L)}, depois ${pro}/mês + impostos. Cancele quando quiser.`) + billed,
    one, pro, label, free: trialFree(),
  };
}

// Ancien affichage double (« 13,99 € (13,99 $ hors zone euro) »), plus utilisé depuis le 23/11/2026 : tout le monde paie en euros.
export const priceBoth = (plan, L) =>
  `${price(plan, "EUR", L)} (${price(plan, "USD", L)} ${L?.en ? "outside the euro area" : L?.es ? "fuera de la zona euro" : "hors zone euro"})`;
