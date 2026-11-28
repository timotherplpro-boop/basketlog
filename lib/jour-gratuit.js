// Annonce du jour gratuit de Basketlog Pro (Tim, 28/11/2026 : « 1 jour gratuit où il faut quand même mettre la carte », puis
// « Préviens tout le monde qu'il y a un jour gratuit »). Textes des posts (en français, comme tous les réseaux de Basketlog
// depuis le 24/11/2026), de la notification (4 langues) et du visuel (/offre/og, lib/og.jsx). Prix en euros, hors taxes,
// jamais « essai gratuit » : on écrit « 1 jour gratuit ». Tant que le Black Friday court, une ligne rappelle le code.
// Aucune dépendance à Next : importé par les routes, lib/og.jsx et les tests.
import { BF, bfLive } from "./black-friday.js";

export const JG_MARK = "🎁 1 JOUR GRATUIT"; // début du post Bluesky : sert au contrôle anti-doublon
export const JG_SHOWN = "basketlog-app.com/pro";
export const JG_URL = `https://${JG_SHOWN}`;
export const JG_IMAGE = "https://basketlog-app.com/offre/og";
const LANGS = ["fr", "en", "es", "pt"];
export const jgLang = (l) => (LANGS.includes(l) ? l : "fr");

// Post Bluesky (300 signes au plus, adresse comprise) et texte Telegram (HTML, légende d'une photo : 1 024 signes au plus).
export function jgAnnounce(now = Date.now()) {
  const bf = bfLive(now);
  const tags = ["NBA", "Basket"];
  const bluesky = [
    `${JG_MARK} SUR BASKETLOG PRO`,
    "",
    "L'analyse complète de chaque match NBA : probabilités, scénarios, infirmerie.",
    "Carte demandée, puis 9,99 €/mois + taxes, sans engagement.",
    ...(bf ? [`🖤 Black Friday : code ${BF.CODE}, 6,99 €/mois les 2 premiers mois.`] : []),
    "",
    `👉 ${JG_SHOWN}`,
    "",
    tags.map((t) => `#${t}`).join(" "),
  ].join("\n");
  const telegram = (link) => [
    `<b>${JG_MARK} SUR BASKETLOG PRO</b> 🏀`,
    "",
    "L'analyse complète de chaque match NBA : probabilités exactes, tous les scénarios, les joueurs à suivre et l'infirmerie en temps réel.",
    "",
    "• 1 jour gratuit (carte demandée, rien n'est prélevé aujourd'hui)",
    "• puis 9,99 €/mois + taxes, résiliable à tout moment",
    ...(bf ? [`• 🖤 Black Friday jusqu'à lundi minuit : code <b>${BF.CODE}</b>, 6,99 €/mois les 2 premiers mois`] : []),
    "",
    `👉 ${link}`,
    "",
    tags.map((t) => `#${t}`).join(" "),
  ].join("\n");
  return { mark: JG_MARK, shown: JG_SHOWN, url: JG_URL, tags, bluesky, telegram };
}

// Notification (web push), une par langue, avec le lien /pro de la langue.
export function jgPush(lang = "fr") {
  const l = jgLang(lang);
  const q = "?utm_source=push&utm_medium=notification&utm_campaign=jour-gratuit";
  return {
    fr: { title: "🎁 1 jour gratuit sur Basketlog Pro", body: "L'analyse complète de chaque match NBA, gratuite pendant 1 jour. Ensuite 9,99 €/mois + taxes, sans engagement →", url: `/pro${q}` },
    en: { title: "🎁 1 free day of Basketlog Pro", body: "The full analysis of every NBA game, free for 1 day. Then €9.99/month (+ tax), cancel anytime →", url: `/en/pro${q}` },
    es: { title: "🎁 1 día gratis de Basketlog Pro", body: "El análisis completo de cada partido de la NBA, gratis durante 1 día. Luego 9,99 €/mes + impuestos, sin compromiso →", url: `/es/pro${q}` },
    pt: { title: "🎁 1 dia grátis de Basketlog Pro", body: "A análise completa de cada jogo da NBA, grátis por 1 dia. Depois 9,99 €/mês + impostos, sem compromisso →", url: `/pt/pro${q}` },
  }[l];
}

// Textes du visuel (lib/og.jsx, jgOgImage).
export const JG_TXT = {
  fr: { pill: "BASKETLOG PRO", big1: "1 JOUR", big2: "GRATUIT", sub: "L'analyse complète de chaque match NBA", then: "puis 9,99 €/mois, sans engagement", note: "Carte demandée · prix hors taxes" },
  en: { pill: "BASKETLOG PRO", big1: "1 DAY", big2: "FREE", sub: "The full analysis of every NBA game", then: "then €9.99/month, cancel anytime", note: "Card required · price excludes tax" },
  es: { pill: "BASKETLOG PRO", big1: "1 DÍA", big2: "GRATIS", sub: "El análisis completo de cada partido NBA", then: "luego 9,99 €/mes, sin compromiso", note: "Se pide tarjeta · precio sin impuestos" },
  pt: { pill: "BASKETLOG PRO", big1: "1 DIA", big2: "GRÁTIS", sub: "A análise completa de cada jogo da NBA", then: "depois 9,99 €/mês, sem compromisso", note: "Cartão necessário · preço sem impostos" },
};
