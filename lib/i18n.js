// Langues du site : français (adresses actuelles), anglais (/en) et espagnol (/es) — mêmes pages, même contenu.
// t(fr, en, es) choisit le texte (ou le bloc JSX), href() ajoute le préfixe de langue aux liens internes,
// locale/tz/tzLabel servent aux dates et heures.
export const LANGS = ["fr", "en", "es"];
export const LANG_NAMES = { fr: "Français", en: "English", es: "Español" };

const CFG = {
  fr: { locale: "fr-FR", tz: "Europe/Paris", tzLabel: "heure de Paris", og: "fr_FR", hreflang: "fr-FR" },
  en: { locale: "en-US", tz: "America/New_York", tzLabel: "ET", og: "en_US", hreflang: "en-US" },
  es: { locale: "es-ES", tz: "Europe/Madrid", tzLabel: "hora de España", og: "es_ES", hreflang: "es-ES" },
};

const PREFIX = /^\/(en|es)(?=\/|$|\?|#)/;

// Chemin sans préfixe de langue : "/en/app?d=1" -> "/app?d=1", "/es" -> "/".
export function stripLang(path) {
  if (typeof path !== "string") return "/";
  const m = path.match(PREFIX);
  if (!m) return path || "/";
  const rest = path.slice(m[0].length);
  if (!rest) return "/";
  return rest.startsWith("/") ? rest : `/${rest}`;
}

// Même chemin dans une autre langue (sélecteur de langue, balises hreflang, sitemap).
export function switchPath(path, toLang) {
  const bare = stripLang(path);
  if (toLang !== "en" && toLang !== "es") return bare;
  if (bare === "/") return `/${toLang}`;
  if (bare.startsWith("/?") || bare.startsWith("/#")) return `/${toLang}${bare.slice(1)}`;
  return `/${toLang}${bare}`;
}

export function mk(lang) {
  const l = LANGS.includes(lang) ? lang : "fr";
  const en = l === "en";
  const es = l === "es";
  return {
    lang: l,
    fr: l === "fr",
    en,
    es,
    // L'espagnol retombe sur l'anglais si une traduction manque (ne devrait pas arriver).
    t: (frText, enText, esText) => (en ? enText : es ? (esText === undefined ? enText : esText) : frText),
    href: (p) => {
      if (l === "fr" || typeof p !== "string" || !p.startsWith("/") || p.startsWith("/api/") || PREFIX.test(p)) return p;
      return switchPath(p, l);
    },
    ...CFG[l],
  };
}

export function fmtDate(L, iso, opts) {
  try { return new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, ...opts }).format(new Date(iso)); } catch { return ""; }
}
export function fmtTime(L, iso) {
  return fmtDate(L, iso, { hour: L.en ? "numeric" : "2-digit", minute: "2-digit" });
}
