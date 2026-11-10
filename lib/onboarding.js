// Questions d'accueil après la création d'un compte, et question « Comment as-tu connu Basketlog ? » après le paiement.
// Règles partagées par les composants (components/Onboarding.jsx, components/SourceAsk.jsx) et les tests : aucune dépendance à Next.
// Réponses : gardées dans le navigateur de la personne (clé bl-profil) et envoyées à Amplitude seulement si elle a accepté la
// mesure d'audience (lib/analytics.js).
import { teamById } from "./teams.js";

export const ONBOARDING_EVENT = "bl-onboarding"; // ouvre les questions d'accueil (lancé par WelcomeToast après une inscription)
export const SOURCE_EVENT = "bl-source"; // ouvre la question de source (lancé par WelcomeToast après un paiement activé)
export const PROFILE_KEY = "bl-profil";
export const SOURCE_KEY = "bl-source";

// Compétition suivie : [français, anglais, espagnol].
export const LEAGUES = [
  { id: "nba", t: ["NBA", "NBA", "NBA"] },
  { id: "euroleague", t: ["EuroLeague", "EuroLeague", "Euroliga"] },
  { id: "both", t: ["Les deux", "Both", "Las dos"] },
];
export const LEAGUE_IDS = new Set(LEAGUES.map((l) => l.id));

// Comment la personne a connu Basketlog. `creator` : on propose alors de nommer le créateur (facultatif).
export const SOURCE_CHOICES = [
  { id: "tiktok", creator: true, t: ["TikTok", "TikTok", "TikTok"] },
  { id: "instagram", creator: true, t: ["Instagram", "Instagram", "Instagram"] },
  { id: "youtube", creator: true, t: ["YouTube", "YouTube", "YouTube"] },
  { id: "x", creator: true, t: ["X (Twitter)", "X (Twitter)", "X (Twitter)"] },
  { id: "google", creator: false, t: ["Google", "Google", "Google"] },
  { id: "ia", creator: false, t: ["ChatGPT ou une IA", "ChatGPT or an AI", "ChatGPT o una IA"] },
  { id: "ami", creator: false, t: ["Un ami", "A friend", "Un amigo"] },
  { id: "autre", creator: false, t: ["Autre", "Other", "Otro"] },
];
export const SOURCE_IDS = new Set(SOURCE_CHOICES.map((s) => s.id));

// Texte d'un choix dans la langue de L (L.en, L.es) : français par défaut.
export const labelOf = (choice, L) => choice.t[L?.en ? 1 : L?.es ? 2 : 0];

// Pages où l'on ne dérange pas un nouveau compte : une analyse (fiche d'un match, résultat de deux équipes choisies) est
// justement ce qu'il vient voir, et la fenêtre « analyse complète » s'y ouvre déjà. Sur ces pages, pas de questions d'accueil.
export function isAnalysisPath(pathname = "", search = "") {
  const p = String(pathname).replace(/^\/(?:en|es)(?=\/|$)/, "") || "/";
  if (/^\/app\/(?:match|euroleague\/match)(?:\/|$)/.test(p)) return true;
  if (/^\/app\/?$/.test(p)) {
    const q = new URLSearchParams(search);
    return !!(q.get("home") && q.get("away"));
  }
  return false;
}

// Profil enregistré : { ligue, equipe, passe, at } ou null. `passe` : les questions ont été ignorées (pas redemandées).
export function cleanProfile(p) {
  if (!p || typeof p !== "object") return null;
  const ligue = LEAGUE_IDS.has(p.ligue) ? p.ligue : null;
  const equipe = ligue !== "euroleague" && teamById(p.equipe) ? String(p.equipe) : null;
  const passe = p.passe === true || (!ligue && !equipe);
  return { ligue, equipe, passe, at: Number.isFinite(p.at) ? p.at : 0 };
}
export function readProfile(store) {
  try { return cleanProfile(JSON.parse(store.getItem(PROFILE_KEY) || "null")); } catch { return null; }
}
export function saveProfile(store, p, now = Date.now()) {
  const c = cleanProfile({ ...p, at: now });
  if (!c) return null;
  try { store.setItem(PROFILE_KEY, JSON.stringify(c)); } catch { /* stockage refusé : la personne sera simplement redemandée */ }
  return c;
}
// Les questions ont déjà été vues (répondues ou ignorées) : on ne les repose pas. Sans stockage : on ne les pose pas.
export function onboardingDone(store) {
  try { return store.getItem(PROFILE_KEY) !== null; } catch { return true; }
}

// Où envoyer la personne une fois ses réponses données : les prochains matchs de son équipe NBA (la liste de /app est déjà
// filtrée par ?team=), la page EuroLeague, ou les matchs de ce soir.
export function onboardingTarget(profile, L) {
  const p = cleanProfile(profile);
  if (p?.ligue === "euroleague") return L.href("/app/euroleague");
  if (p?.equipe) return `${L.href("/app")}?team=${p.equipe}`;
  return L.href("/app/matchs");
}

// Nom du créateur saisi (facultatif) : lettres, chiffres, espace et @ . _ - seulement, 40 caractères au plus. Vide si rien de valable.
export function cleanCreator(s) {
  return String(s ?? "").normalize("NFC").replace(/[^\p{L}\p{N}@._\- ]/gu, "").replace(/\s+/g, " ").trim().slice(0, 40);
}

export function sourceAsked(store) {
  try { return store.getItem(SOURCE_KEY) !== null; } catch { return true; }
}
export function markSourceAsked(store, now = Date.now()) {
  try { store.setItem(SOURCE_KEY, String(now)); } catch { /* stockage refusé : sourceAsked renverra true à la prochaine visite */ }
}
