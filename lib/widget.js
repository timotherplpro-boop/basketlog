// Widget « Probabilités NBA du soir » : petite page autonome que les sites et blogs basket intègrent dans une iframe.
// Rendu côté serveur en une seule chaîne HTML (aucun script), gardée par le CDN : quasiment aucun calcul par affichage.
// Chaque match renvoie vers sa fiche sur Basketlog ; le code d'intégration ajoute sous l'iframe un lien visible
// « Basketlog », écrit dans la page du site partenaire (c'est ce lien qui compte pour Google).
// Vocabulaire : probabilités de victoire, jamais de mots de paris.

export const WIDGET_LANGS = ["fr", "en", "es"];
export const WIDGET_THEMES = ["auto", "light", "dark"];
export const WIDGET_MAX = 8;
export const WIDGET_HEIGHT = 420;

const T = {
  fr: { title: "Probabilités NBA du soir", none: "Pas de match NBA aujourd'hui. Prochaine affiche bientôt sur Basketlog.", by: "Probabilités par", all: "Tous les matchs", live: "En cours", tomorrow: "Demain", fav: "favori", locale: "fr-FR" },
  en: { title: "Tonight's NBA win probabilities", none: "No NBA games today. Next games soon on Basketlog.", by: "Probabilities by", all: "All games", live: "Live", tomorrow: "Tomorrow", fav: "favorite", locale: "en-US" },
  es: { title: "Probabilidades NBA de hoy", none: "Hoy no hay partidos de la NBA. Próximos partidos pronto en Basketlog.", by: "Probabilidades de", all: "Todos los partidos", live: "En juego", tomorrow: "Mañana", fav: "favorito", locale: "es-ES" },
};

export const widgetLang = (v) => (WIDGET_LANGS.includes(v) ? v : "fr");
export const widgetTheme = (v) => (WIDGET_THEMES.includes(v) ? v : "auto");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const prefix = (lang) => (lang === "fr" ? "" : `/${lang}`);
const pctText = (p, lang) => `${Math.round(p * 100)}${lang === "en" ? "%" : " %"}`;
const UTM = "utm_source=widget&utm_medium=embed&utm_campaign=widget-nba";

// Adresse d'un lien sortant du widget, avec le repère de campagne (pour voir dans les statistiques ce que le widget apporte).
export function widgetLink(site, path, lang) {
  const p = path === "/" ? prefix(lang) || "/" : `${prefix(lang)}${path}`;
  return `${site}${p}${p.includes("?") ? "&" : "?"}${UTM}`;
}

// Matchs à montrer : ni reportés, ni terminés, avec une probabilité ; dans l'ordre de l'heure de début.
export function widgetGames(analyses = []) {
  return analyses
    .filter((a) => a && a.game && a.pHome != null && !Number.isNaN(a.pHome) && a.game.state !== "post" && !a.game.postponed)
    .sort((x, y) => String(x.game.date).localeCompare(String(y.game.date)))
    .slice(0, WIDGET_MAX);
}

function timeOf(iso, lang) {
  try {
    return new Intl.DateTimeFormat(T[lang].locale, { hour: "2-digit", minute: "2-digit", timeZone: lang === "en" ? "America/New_York" : "Europe/Paris" }).format(new Date(iso)) + (lang === "en" ? " ET" : "");
  } catch {
    return "";
  }
}

// Code à copier-coller : l'iframe, puis un lien texte visible vers Basketlog (dans la page du partenaire).
export function embedCode(site, lang = "fr", theme = "auto") {
  const l = widgetLang(lang), t = T[l];
  const src = `${site}/api/widget?lang=${l}${widgetTheme(theme) === "auto" ? "" : `&theme=${widgetTheme(theme)}`}`;
  const home = `${site}${prefix(l) || "/"}`;
  return `<iframe src="${src}" title="${t.title}" width="100%" height="${WIDGET_HEIGHT}" style="border:0;max-width:420px" loading="lazy"></iframe>\n<p style="font-size:13px;margin:4px 0 0">${t.by} <a href="${home}">Basketlog</a></p>`;
}

export function widgetHtml({ analyses = [], lang = "fr", theme = "auto", site, tomorrow = false } = {}) {
  const l = widgetLang(lang), t = T[l], th = widgetTheme(theme);
  const games = widgetGames(analyses);
  const rows = games.map((a) => {
    const g = a.game, h = g.home, w = g.away;
    const pH = a.pHome, homeFav = pH >= 0.5;
    const href = widgetLink(site, `/app/match/${encodeURIComponent(a.id ?? g.id)}`, l);
    const when = g.state === "in" ? `<span class="live">${t.live}</span>` : esc(timeOf(g.date, l));
    const side = (team, p, fav) =>
      `<span class="tm${fav ? " fav" : ""}">${team.logo ? `<img src="${esc(team.logo)}" alt="" width="22" height="22" loading="lazy">` : ""}<span class="nm">${esc(team.short || team.abbr)}</span><b>${pctText(p, l)}</b></span>`;
    return `<a class="row" href="${esc(href)}" target="_blank" rel="noopener"><span class="when">${when}</span>${side(w, 1 - pH, !homeFav)}<span class="bar" aria-hidden="true"><i style="width:${Math.round((1 - pH) * 100)}%"></i></span>${side(h, pH, homeFav)}</a>`;
  });
  const heading = tomorrow ? `${t.title} · ${t.tomorrow}` : t.title;
  const body = rows.length ? rows.join("") : `<p class="none">${t.none}</p>`;
  const home = widgetLink(site, "/", l);
  const all = widgetLink(site, "/app/matchs", l);
  const dark = ":root{--bg:#11141a;--fg:#f2f4f7;--mut:#9aa3b2;--line:#252b36;--acc:#ff7a1a;--bar:#2a3140}";
  const light = ":root{--bg:#ffffff;--fg:#14171f;--mut:#5d6675;--line:#e7e9ee;--acc:#e8650a;--bar:#eef0f4}";
  const colors = th === "dark" ? dark : th === "light" ? light : `${light}@media (prefers-color-scheme:dark){${dark}}`;
  return `<!doctype html><html lang="${l}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(heading)} – Basketlog</title><style>${colors}
*{box-sizing:border-box}html,body{background:transparent}body{margin:0;color:var(--fg);font:14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.w{background:var(--bg);border:1px solid var(--line);border-radius:12px;overflow:hidden}h1{margin:0;padding:10px 12px;font-size:15px;border-bottom:1px solid var(--line)}
.row{display:grid;grid-template-columns:44px 1fr 46px 1fr;align-items:center;gap:6px;padding:8px 12px;border-bottom:1px solid var(--line);color:inherit;text-decoration:none}
.row:hover{background:var(--bar)}.when{font-size:12px;color:var(--mut)}.live{color:#e11d48;font-weight:700}
.tm{display:flex;align-items:center;gap:6px;min-width:0}.tm .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tm b{margin-left:auto;font-variant-numeric:tabular-nums}
.tm img{flex:none}.fav b{color:var(--acc)}.bar{height:6px;border-radius:3px;background:var(--acc);overflow:hidden}.bar i{display:block;height:100%;background:var(--mut)}
.none{padding:16px 12px;color:var(--mut);margin:0}.ft{display:flex;justify-content:space-between;padding:8px 12px;font-size:12px;color:var(--mut)}.ft a{color:var(--acc);font-weight:600;text-decoration:none}
</style></head><body><div class="w"><h1>${esc(heading)}</h1>${body}<div class="ft"><a href="${esc(all)}" target="_blank" rel="noopener">${t.all} →</a><span>${t.by} <a href="${esc(home)}" target="_blank" rel="noopener">Basketlog</a></span></div></div></body></html>`;
}
