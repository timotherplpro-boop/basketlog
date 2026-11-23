// Monnaie du visiteur, côté serveur. Depuis le 23/11/2026 : euros pour tout le monde (voir PER_COUNTRY).
// Avant : euros dans la zone euro, dollars américains partout ailleurs.
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
// Seulement les vrais robots (Googlebot, bingbot, Applebot, YandexBot, Baiduspider…) : les navigateurs intégrés
// des applis (Instagram, TikTok, WhatsApp, appli Claude…) suivent le pays comme tout visiteur.
const BOTS = /bot\b|bot\/|crawl|spider|slurp|Google-InspectionTool|Storebot-Google|BingPreview|Lighthouse|facebookexternalhit|ChatGPT-User|Claude-User|Perplexity-User/i;

// 23/11/2026 : décision de Tim (« c'est 9,99 € […] enlève le 9,99 dollars ») : tout le monde paie en euros, quel que soit
// le pays ; la banque d'un acheteur hors zone euro convertit elle-même. Les plans Whop en dollars restent (masqués) pour
// les abonnés déjà pris en dollars. Pour revenir aux dollars hors zone euro : remettre PER_COUNTRY à true.
const PER_COUNTRY = false;

export async function getCurrency(L) {
  if (!PER_COUNTRY) return "EUR";
  const h = await headers();
  const country = (h.get("x-vercel-ip-country") || "").toUpperCase();
  const ua = h.get("user-agent") || "";
  if (!country || BOTS.test(ua)) return L?.en ? "USD" : "EUR";
  return EURO_AREA.has(country) ? "EUR" : "USD";
}
