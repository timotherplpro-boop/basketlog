// Monnaie du visiteur, côté serveur : euros dans la zone euro, dollars américains partout ailleurs.
// Le pays vient de Vercel (en-tête x-vercel-ip-country). Sans pays connu, et pour les robots des moteurs
// de recherche (qui explorent surtout depuis les États-Unis), la langue de la page décide : les pages
// française et espagnole restent en euros dans les résultats de recherche, la page anglaise en dollars.
import { headers } from "next/headers";

const EURO_AREA = new Set([
  // Zone euro (21 pays au 1er janvier 2026, Bulgarie comprise)
  "AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
  // Pays et territoires qui utilisent aussi l'euro
  "AD", "MC", "SM", "VA", "ME", "XK", "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF",
]);
const BOTS = /bot|crawl|spider|slurp|Google|Bing|yandex|baidu|Lighthouse|facebookexternalhit|WhatsApp|Twitter|LinkedIn|Slack|Discord|Applebot|Perplexity|ChatGPT|Claude/i;

export async function getCurrency(L) {
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") || "").toUpperCase();
  const ua = h.get("user-agent") || "";
  if (!country || BOTS.test(ua)) return L?.en ? "USD" : "EUR";
  return EURO_AREA.has(country) ? "EUR" : "USD";
}
