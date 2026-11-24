// Monnaie selon le pays (24/11/2026, décision de Tim : « si le client est américain ou autre, il peut payer en dollars ») :
// euros dans la zone euro, dollars américains partout ailleurs. Partagé par le serveur (lib/currency-server.js), le
// middleware (cookie bl_cur pour l'affichage côté navigateur) et les composants (lib/use-currency.js).
export const EURO_AREA = new Set([
  // Zone euro (21 pays au 1er janvier 2026, Bulgarie comprise)
  "AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
  // Pays et territoires qui utilisent aussi l'euro
  "AD", "MC", "SM", "VA", "ME", "XK", "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF",
]);
// Seulement les vrais robots (Googlebot, bingbot…) : les navigateurs intégrés des applis suivent le pays comme tout visiteur.
export const BOTS = /bot\b|bot\/|crawl|spider|slurp|Google-InspectionTool|Storebot-Google|BingPreview|Lighthouse|facebookexternalhit|ChatGPT-User|Claude-User|Perplexity-User/i;

// Sans pays connu, et pour les robots (qui explorent surtout depuis les États-Unis), la langue de la page décide :
// pages française, espagnole et portugaise en euros, page anglaise en dollars.
export function currencyFor({ country = "", ua = "", en = false } = {}) {
  const c = String(country || "").toUpperCase();
  if (!c || BOTS.test(ua || "")) return en ? "USD" : "EUR";
  return EURO_AREA.has(c) ? "EUR" : "USD";
}
