// Langues du site : français (adresses actuelles) et anglais (mêmes pages sous /en).
// t(fr, en) choisit le texte, href() ajoute /en aux liens internes, locale/tz pour les dates.
export const LANGS = ["fr", "en"];

export function mk(lang) {
  const en = lang === "en";
  return {
    lang: en ? "en" : "fr",
    en,
    t: (fr, enText) => (en ? enText : fr),
    href: (p) => {
      if (!en || typeof p !== "string" || !p.startsWith("/") || p.startsWith("/api/") || p.startsWith("/en")) return p;
      return p === "/" ? "/en" : `/en${p}`;
    },
    locale: en ? "en-US" : "fr-FR",
    tz: en ? "America/New_York" : "Europe/Paris",
    tzLabel: en ? "ET" : "heure de Paris",
  };
}

// Même chemin dans l'autre langue (sélecteur de langue, balises hreflang).
export function switchPath(path, toLang) {
  const bare = path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
  return toLang === "en" ? (bare === "/" ? "/en" : `/en${bare}`) : bare;
}

export function fmtDate(L, iso, opts) {
  try { return new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, ...opts }).format(new Date(iso)); } catch { return ""; }
}
export function fmtTime(L, iso) {
  const s = fmtDate(L, iso, { hour: L.en ? "numeric" : "2-digit", minute: "2-digit" });
  return s;
}
