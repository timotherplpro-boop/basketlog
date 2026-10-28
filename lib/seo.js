// Image de partage commune (app/opengraph-image.jsx)
const OG = { url: "/opengraph-image", width: 1200, height: 630, alt: "Basketlog : pronostics NBA et EuroLeague" };

// Métadonnées de page : titre, description, adresse canonique et aperçu de partage.
export function pageMeta({ title, description, path, noindex = false }) {
  const m = {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website", locale: "fr_FR", siteName: "Basketlog", images: [OG] },
    twitter: { card: "summary_large_image", title, description, images: [OG.url] },
  };
  if (noindex) m.robots = { index: false, follow: true };
  return m;
}

const fmt = (iso, o) => {
  try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...o }).format(new Date(iso)); } catch { return ""; }
};
export const dayLong = (iso) => fmt(iso, { weekday: "long", day: "numeric", month: "long" });
export const dayShort = (iso) => fmt(iso, { day: "numeric", month: "short" });
export const pctTxt = (p) => `${Math.round(p * 100)} %`;
