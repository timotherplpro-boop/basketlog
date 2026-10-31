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
  try {
    const out = new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, ...opts }).format(new Date(iso));
    // Typographie française : « 1er novembre », pas « 1 novembre ».
    return L.fr ? out.replace(/(^|\s)1 (janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)/, (_, sp, mo) => `${sp}1er ${mo}`) : out;
  } catch { return ""; }
}

// « de » ou « d' » devant un nom (club EuroLeague) : « d'Olympiacos », « de Fenerbahçe ».
export const deFr = (n) => (/^[aeiouyàâäéèêëîïôöùûü]/i.test(String(n)) ? `d'${n}` : `de ${n}`);

// Pourcentage (p entre 0 et 1) et nombre décimal dans la langue de la page : « 62 % » / « 62% », « 114,5 » / « 114.5 ».
export const pctOf = (p, L, d = 0) => `${(p * 100).toFixed(d).replace(".", L.en ? "." : ",")}${L.en ? "%" : "\u202f%"}`;
export const numOf = (x, L, d = 1) => (x == null || isNaN(x) ? "–" : Number(x).toFixed(d).replace(".", L.en ? "." : ","));
export function fmtTime(L, iso) {
  return fmtDate(L, iso, { hour: L.en ? "numeric" : "2-digit", minute: "2-digit" });
}
