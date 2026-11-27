// Offre Black Friday 2026 de Basketlog (décision de Tim, 27/11/2026 19 h 13 : « moins 25 % peut-être, ou moins 30 comme tu
// veux » ; choix retenu : -30 %) pour faire les premières ventes.
//   - Code BLACKFRIDAY, remise de 30 %, jusqu'au lundi 30/11/2026 à 23:59:59 heure de Paris (2026-11-30T22:59:59Z).
//   - Lifetime : paiement unique, 99,99 € -> 69,99 €.
//   - Pro : les 2 premiers paiements sont remisés (l'essai de 3 jours, 1 € -> 0,70 €, puis le 1er mois, 9,99 € -> 6,99 €),
//     ensuite 9,99 €/mois.
//   - Prix hors taxes, comme partout sur le site. Une seule utilisation par client. Prix de référence barrés : 99,99 € et 9,99 €
//     (prix le plus bas des 30 derniers jours, obligatoire en droit français).
// Aucune dépendance (ni Next, ni le réseau) : importé par le serveur, par les pages et par les tests (tests/unit.mjs).
// La création du code chez Whop est dans lib/whop-promo.js (ensurePromo), sa vérification dans lib/exit-offer.js (liveBf).
// Les mêmes dates et le même code sont recopiés à la main dans scripts/short/texts.mjs (script autonome) : un test les compare.

export const BF = {
  CODE: "BLACKFRIDAY",
  PCT: 30,
  MONTHS: 2, // nombre de paiements remisés : l'essai Pro, puis le 1er mois
  END: "2026-11-30T22:59:59Z", // lundi 30/11/2026 23:59:59, heure de Paris (UTC+1)
  PATH: "/pro",
};
export const BF_END_MS = Date.parse(BF.END);

// Offre en cours ? (le jour même et jusqu'à la dernière seconde du lundi 30/11 à Paris)
export const bfLive = (now = Date.now()) => Number(now) <= BF_END_MS;

// Prix de référence (barrés) et prix remisés, en euros, arrondis au centime comme Whop. Hors taxes.
const cents = (eur) => Math.round(eur * (100 - BF.PCT)) / 100;
export const BF_PRICES = {
  trialWas: 1, trial: cents(1), // essai Pro de 3 jours
  proWas: 9.99, pro: cents(9.99), // 1er mois de Pro, puis 9,99 €/mois
  lifetimeWas: 99.99, lifetime: cents(99.99), // paiement unique
};

const LANGS = ["fr", "en", "es", "pt"];
export const bfLang = (lang) => (LANGS.includes(lang) ? lang : "fr");

// « 69,99 € » (français, espagnol, portugais) ; « €69.99 » (anglais). Prix toujours en euros : le paiement se fait en euros.
export function bfEur(n, lang = "fr") {
  const s = (Math.round(n * 100) / 100).toFixed(2);
  return bfLang(lang) === "en" ? `€${s}` : `${s.replace(".", ",")} €`;
}

// Lien de l'offre dans la langue : /pro?code=BLACKFRIDAY (français sans préfixe, /en, /es, /pt). `utm` : repère de campagne facultatif.
export function bfPath(lang = "fr", utm = "") {
  const l = bfLang(lang);
  return `${l === "fr" ? "" : `/${l}`}${BF.PATH}?code=${BF.CODE}${utm ? `&${utm}` : ""}`;
}

const pct = (lang) => (bfLang(lang) === "en" ? `${BF.PCT}%` : `-${BF.PCT} %`);

// Bandeau du haut des pages (components/BlackFridayBar.jsx).
export function bfBar(lang = "fr") {
  const l = bfLang(lang);
  return {
    fr: { title: "Black Friday", full: `${pct(l)} sur Pro et Lifetime avec le code ${BF.CODE}, jusqu'à lundi minuit`, short: `${pct(l)} avec le code ${BF.CODE}`, close: "Masquer le bandeau Black Friday" },
    en: { title: "Black Friday", full: `${pct(l)} off Pro and Lifetime with code ${BF.CODE}, until Monday midnight`, short: `${pct(l)} off with code ${BF.CODE}`, close: "Hide the Black Friday banner" },
    es: { title: "Black Friday", full: `${pct(l)} en Pro y Lifetime con el código ${BF.CODE}, hasta el lunes a medianoche`, short: `${pct(l)} con el código ${BF.CODE}`, close: "Ocultar el banner del Black Friday" },
    pt: { title: "Black Friday", full: `${pct(l)} no Pro e no Lifetime com o código ${BF.CODE}, até segunda-feira à meia-noite`, short: `${pct(l)} com o código ${BF.CODE}`, close: "Ocultar o banner da Black Friday" },
  }[l];
}

// Ligne courte des posts automatiques (Bluesky, Telegram, X, Facebook, LinkedIn), sans le lien ni l'émoji de tête.
export function bfLine(lang = "fr") {
  const l = bfLang(lang);
  return {
    fr: `Black Friday : ${pct(l)} sur Pro et Lifetime avec le code ${BF.CODE}`,
    en: `Black Friday: ${pct(l)} off Pro and Lifetime with code ${BF.CODE}`,
    es: `Black Friday: ${pct(l)} en Pro y Lifetime con el código ${BF.CODE}`,
    pt: `Black Friday: ${pct(l)} no Pro e no Lifetime com o código ${BF.CODE}`,
  }[l];
}

// Bloc de la newsletter du dimanche : texte complet (prix en euros, hors taxes) et libellé du bouton.
export function bfNewsletter(lang = "fr") {
  const l = bfLang(lang);
  const P = BF_PRICES, e = (n) => bfEur(n, l);
  return {
    fr: { text: `🖤 Black Friday, jusqu'à lundi minuit : ${pct(l)} sur Pro et Lifetime avec le code ${BF.CODE}. Lifetime à ${e(P.lifetime)} au lieu de ${e(P.lifetimeWas)} ; Pro : essai de 3 jours à ${e(P.trial)}, puis ${e(P.pro)} le 1er mois (${e(P.proWas)}/mois ensuite). Prix hors taxes.`, label: "Profiter du Black Friday" },
    en: { text: `🖤 Black Friday, until Monday midnight: ${pct(l)} off Pro and Lifetime with code ${BF.CODE}. Lifetime for ${e(P.lifetime)} instead of ${e(P.lifetimeWas)}; Pro: 3-day trial for ${e(P.trial)}, then ${e(P.pro)} for the first month (${e(P.proWas)}/month after that). Prices exclude tax.`, label: "Get the Black Friday deal" },
    es: { text: `🖤 Black Friday, hasta el lunes a medianoche: ${pct(l)} en Pro y Lifetime con el código ${BF.CODE}. Lifetime por ${e(P.lifetime)} en lugar de ${e(P.lifetimeWas)}; Pro: prueba de 3 días por ${e(P.trial)}, luego ${e(P.pro)} el primer mes (${e(P.proWas)}/mes después). Precios sin impuestos.`, label: "Aprovechar el Black Friday" },
    pt: { text: `🖤 Black Friday, até segunda-feira à meia-noite: ${pct(l)} no Pro e no Lifetime com o código ${BF.CODE}. Lifetime por ${e(P.lifetime)} em vez de ${e(P.lifetimeWas)}; Pro: teste de 3 dias por ${e(P.trial)}, depois ${e(P.pro)} no primeiro mês (${e(P.proWas)}/mês depois). Preços sem impostos.`, label: "Aproveitar a Black Friday" },
  }[l];
}

// Notification (web push), une par langue : titre court, corps d'une ligne, lien dans la langue.
export function bfPush(lang = "fr") {
  const l = bfLang(lang);
  const url = `${bfPath(l, "utm_source=push&utm_medium=notification&utm_campaign=black-friday")}`;
  return {
    fr: { title: "🖤 Black Friday Basketlog", body: `${pct(l)} sur Pro et Lifetime avec le code ${BF.CODE}, jusqu'à lundi minuit →`, url },
    en: { title: "🖤 Basketlog Black Friday", body: `${pct(l)} off Pro and Lifetime with code ${BF.CODE}, until Monday midnight →`, url },
    es: { title: "🖤 Black Friday Basketlog", body: `${pct(l)} en Pro y Lifetime con el código ${BF.CODE}, hasta el lunes a medianoche →`, url },
    pt: { title: "🖤 Black Friday Basketlog", body: `${pct(l)} no Pro e no Lifetime com o código ${BF.CODE}, até segunda-feira à meia-noite →`, url },
  }[l];
}

// Texte de l'annonce unique (?bf=1) : Bluesky (300 graphèmes au plus) et Telegram (HTML), en français comme tous les réseaux
// de Basketlog depuis le 24/11/2026. `shown` : adresse affichée (sans https://), la même que celle du lien cliquable.
export const BF_MARK = "🖤 BLACK FRIDAY";
export const BF_SHOWN = `basketlog-app.com${bfPath("fr")}`;
export function bfAnnounce() {
  const P = BF_PRICES, e = (n) => bfEur(n, "fr");
  return {
    mark: BF_MARK,
    shown: BF_SHOWN,
    url: `https://${BF_SHOWN}`,
    // Bluesky : court (la limite est de 300 signes, l'adresse comprise).
    bluesky: (tags) => `${BF_MARK}\n\n${pct("fr")} sur Pro et Lifetime avec le code ${BF.CODE}, jusqu'à lundi minuit.\nLifetime ${e(P.lifetime)} au lieu de ${e(P.lifetimeWas)} · Pro : essai 3 jours à ${e(P.trial)} (hors taxes)\n\n👉 ${BF_SHOWN}\n\n${tags.map((t) => `#${t}`).join(" ")}`,
    // Telegram : un peu plus complet. `link` : l'adresse déjà balisée en lien HTML.
    telegram: (link, tags) => `${BF_MARK} 🏀\n\n${pct("fr")} sur Basketlog Pro et Lifetime avec le code ${BF.CODE}, jusqu'à lundi minuit.\n\n• Lifetime : ${e(P.lifetime)} au lieu de ${e(P.lifetimeWas)} (paiement unique)\n• Pro : essai de 3 jours à ${e(P.trial)}, puis ${e(P.pro)} le 1er mois (${e(P.proWas)}/mois ensuite)\n\nPrix hors taxes, une seule utilisation par client.\n👉 ${link}\n\n${tags.map((t) => `#${t}`).join(" ")}`,
    tags: ["BlackFriday", "NBA", "Basket"],
  };
}
