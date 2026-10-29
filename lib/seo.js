import { mk, switchPath } from "./i18n";

// Image de partage commune (app/opengraph-image.jsx)
const OG = { url: "/opengraph-image", width: 1200, height: 630, alt: "Basketlog" };

// Métadonnées de page : titre, description, adresse canonique (par langue), hreflang et aperçu de partage.
// `path` est toujours le chemin français ; la version anglaise est le même chemin sous /en.
export function pageMeta({ title, description, path, noindex = false, L = mk("fr") }) {
  const canonical = L.href(path);
  const m = {
    title,
    description,
    alternates: { canonical, languages: { fr: path, en: switchPath(path, "en"), "x-default": path } },
    openGraph: { title, description, url: canonical, type: "website", locale: L.en ? "en_US" : "fr_FR", siteName: "Basketlog", images: [OG] },
    twitter: { card: "summary_large_image", title, description, images: [OG.url] },
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
