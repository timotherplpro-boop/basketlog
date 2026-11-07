// Étapes du parcours vers l'abonnement et sources d'arrivée, partagées par le site (lib/funnel.js),
// l'enregistrement (/api/stats) et la page Statistiques de l'admin.
export const STEPS = [
  { id: "visite", label: "Visite du site", hint: "un onglet ouvert sur le site" },
  { id: "fiche", label: "Analyse d'un match ouverte", hint: "fiche match ou analyse de deux équipes" },
  { id: "fenetre", label: "Fenêtre « analyse complète » vue", hint: "le visiteur arrive sur la partie verrouillée" },
  { id: "pro", label: "Page des formules vue", hint: "/pro" },
  { id: "clic", label: "Clic sur une formule", hint: "départ vers le paiement Whop" },
];
// Étapes annexes : compte gratuit créé, retour sur le site après un paiement.
export const SIDE_STEPS = [
  { id: "compte", label: "Compte gratuit créé" },
  { id: "retour", label: "Retour sur le site après paiement" },
];
export const STEP_IDS = new Set([...STEPS, ...SIDE_STEPS].map((s) => s.id));

export const SOURCES = {
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  youtube: "YouTube",
  snapchat: "Snapchat",
  x: "X (Twitter)",
  google: "Google",
  moteur: "Autres moteurs de recherche",
  assistant: "ChatGPT et autres assistants",
  whop: "Whop",
  site: "Autres sites",
  autre: "Lien suivi (autre)",
  direct: "Direct (adresse tapée, favori, appli)",
};
export const SOURCE_IDS = new Set(Object.keys(SOURCES));
export const LANGS = ["fr", "en", "es"];
export const DEVICES = { mobile: "Mobile", tablette: "Tablette", ordinateur: "Ordinateur" };

// Source d'un référent, d'un paramètre utm_source ou du navigateur intégré d'une appli (texte en minuscules).
export function sourceFrom(s) {
  if (!s) return null;
  if (/tiktok|musical_ly|bytedance/.test(s)) return "tiktok";
  if (/instagram|(^|\W)ig($|\W)/.test(s)) return "instagram";
  if (/facebook|fban|fbav|fb_iab|messenger|(^|\W)fb($|\W)/.test(s)) return "facebook";
  if (/youtube|youtu\.be/.test(s)) return "youtube";
  if (/snapchat/.test(s)) return "snapchat";
  if (/(^|\.)(x|twitter)\.com$|^t\.co$|^(x|twitter)$/.test(s)) return "x";
  if (/(^|\.)google\.|^google$/.test(s)) return "google";
  if (/bing|duckduckgo|qwant|ecosia|yahoo|search\.brave|startpage|yandex|lilo/.test(s)) return "moteur";
  if (/chatgpt|openai|perplexity|claude\.ai|gemini|copilot|mistral/.test(s)) return "assistant";
  if (/whop/.test(s)) return "whop";
  return null;
}
