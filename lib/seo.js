import { mk, switchPath } from "./i18n";

// Image de partage dans la langue de la page (français : app/opengraph-image.jsx ; anglais, espagnol : /api/og).
const ogFor = (L) => ({
  url: L.fr ? "/opengraph-image" : `/api/og?lang=${L.lang}`,
  width: 1200,
  height: 630,
  alt: L.t("Basketlog : analyse les matchs NBA et EuroLeague avant qu'ils commencent", "Basketlog: analyze NBA and EuroLeague games before they start", "Basketlog: analiza los partidos de la NBA y la Euroliga antes de que empiecen"),
});

// Titre principal du site. « IA » seulement quand l'IA est vraiment branchée (aiReady côté serveur) :
// les probabilités viennent du modèle statistique, on ne promet pas une IA qui ne tourne pas.
export const homeTitle = (L, ai) =>
  ai
    ? L.t("Basketlog : pronostics NBA et EuroLeague analysés par IA", "Basketlog: AI-powered NBA and EuroLeague predictions", "Basketlog: pronósticos NBA y Euroliga analizados con IA")
    : L.t("Basketlog : pronostics NBA et EuroLeague analysés match par match", "Basketlog: NBA and EuroLeague predictions, analyzed game by game", "Basketlog: pronósticos NBA y Euroliga analizados partido a partido");

// Métadonnées de page : titre, description, adresse canonique (par langue), hreflang et aperçu de partage.
// `path` est toujours le chemin français ; les versions anglaise et espagnole sont le même chemin sous /en et /es.
// La marque en fin de titre quand elle tient dans ce que Google affiche (~68 caractères) : « … – Basketlog ».
// Plus de pages titrées « Basketlog » aident Google à reconnaître le mot (au lieu de le corriger en « basket log »).
const BRAND = " – Basketlog";
export const withBrand = (t) => (!t || /basketlog/i.test(t) || (t + BRAND).length > 68 ? t : t + BRAND);

export function pageMeta({ title, description, path, noindex = false, L = mk("fr") }) {
  const canonical = L.href(path);
  const m = {
    title: withBrand(title),
    description,
    alternates: { canonical, languages: { fr: path, en: switchPath(path, "en"), es: switchPath(path, "es"), "x-default": path } },
    openGraph: { title, description, url: canonical, type: "website", locale: L.og, alternateLocale: ["fr_FR", "en_US", "es_ES"].filter((x) => x !== L.og), siteName: "Basketlog", images: [ogFor(L)] },
    twitter: { card: "summary_large_image", title, description, images: [ogFor(L).url] },
  };
  if (noindex) m.robots = { index: false, follow: true };
  return m;
}

const fmt = (iso, o, L) => {
  const l = L || mk("fr");
  try { return new Intl.DateTimeFormat(l.locale, { timeZone: l.tz, ...o }).format(new Date(iso)); } catch { return ""; }
};
export const dayLong = (iso, L) => fmt(iso, { weekday: "long", day: "numeric", month: "long" }, L);
export const dayShort = (iso, L) => fmt(iso, { day: "numeric", month: "short" }, L);
export const pctTxt = (p, L) => (L?.en ? `${Math.round(p * 100)}%` : `${Math.round(p * 100)} %`);
// Premier titre qui tient dans ce que Google affiche (~68 caractères), sinon le dernier (le plus court).
// Sert aux pages de match : noms complets (« Orlando Magic – Phoenix Suns ») quand ils tiennent,
// pour sortir aussi bien sur « pronostic orlando phoenix » que sur « pronostic magic suns ».
export const fitTitle = (...titles) => titles.find((t) => t.length <= 68) || titles[titles.length - 1];

// Les plus gros favoris parmi les matchs pas encore joués : « Celtics 78 %, Thunder 71 % ».
// Répond aux recherches « favoritos NBA hoy » / « NBA favorites today » sans aucun calcul en plus.
export function topFavorites(games, L, n = 3) {
  return games
    .filter((g) => g.state !== "post" && !g.postponed && g.pHome != null)
    .map((g) => (g.pHome >= 0.5 ? { t: g.home, p: g.pHome } : { t: g.away, p: 1 - g.pHome }))
    .sort((a, b) => b.p - a.p)
    .slice(0, n)
    .map((f) => `${f.t.short} ${Math.round(f.p * 100)}${L.en ? "%" : "\u00a0%"}`);
}
