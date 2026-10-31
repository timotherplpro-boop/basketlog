import { mk, switchPath } from "./i18n";

// Image de partage dans la langue de la page (français : app/opengraph-image.jsx ; anglais, espagnol : /api/og).
const ogFor = (L) => ({
  url: L.fr ? "/opengraph-image" : `/api/og?lang=${L.lang}`,
  width: 1200,
  height: 630,
  alt: L.t("Basketlog : analyse les matchs NBA et EuroLeague avant qu'ils commencent", "Basketlog: analyze NBA and EuroLeague games before they start", "Basketlog: analiza los partidos de la NBA y la Euroliga antes de que empiecen"),
});

// Métadonnées de page : titre, description, adresse canonique (par langue), hreflang et aperçu de partage.
// `path` est toujours le chemin français ; les versions anglaise et espagnole sont le même chemin sous /en et /es.
// Titre principal du site. « IA » seulement quand l'IA est vraiment branchée (aiReady côté serveur) :
// les probabilités viennent du modèle statistique, on ne promet pas une IA qui ne tourne pas.
export const homeTitle = (L, ai) =>
  ai
    ? L.t("Basketlog : pronostics NBA et EuroLeague analysés par IA", "Basketlog: AI-powered NBA and EuroLeague predictions", "Basketlog: pronósticos NBA y Euroliga analizados con IA")
    : L.t("Basketlog : pronostics NBA et EuroLeague analysés match par match", "Basketlog: NBA and EuroLeague predictions, analyzed game by game", "Basketlog: pronósticos NBA y Euroliga analizados partido a partido");

export function pageMeta({ title, description, path, noindex = false, L = mk("fr") }) {
  const canonical = L.href(path);
  const m = {
    title,
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
