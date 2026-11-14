// Widget « Probabilités NBA du soir » (lib/widget.js) : rendu HTML, liens, échappement, code d'intégration.
import { WIDGET_MAX, embedCode, widgetGames, widgetHtml, widgetLang, widgetLink, widgetTheme } from "../lib/widget.js";

const SITE = "https://basketlog-app.com";
const team = (id, short, logo = `https://a.espncdn.com/${id}.png`) => ({ id, short, abbr: short.slice(0, 3).toUpperCase(), logo });
const game = (id, pHome, extra = {}) => ({
  id, pHome,
  game: { id, date: `2026-11-14T0${id % 9}:00:00Z`, state: "pre", postponed: null, home: team(`h${id}`, `Home${id}`), away: team(`a${id}`, `Away${id}`), ...extra },
});

export async function widgetTests({ ok, ko, eq }) {
  console.log("Widget");
  eq("widget : langue inconnue = français", [widgetLang("de"), widgetLang("en"), widgetLang(undefined)], ["fr", "en", "fr"]);
  eq("widget : thème inconnu = automatique", [widgetTheme("rose"), widgetTheme("dark")], ["auto", "dark"]);
  eq("widget : liens avec repère de campagne, préfixe de langue", [widgetLink(SITE, "/", "fr"), widgetLink(SITE, "/", "en"), widgetLink(SITE, "/app/match/1", "es")], [
    `${SITE}/?utm_source=widget&utm_medium=embed&utm_campaign=widget-nba`,
    `${SITE}/en?utm_source=widget&utm_medium=embed&utm_campaign=widget-nba`,
    `${SITE}/es/app/match/1?utm_source=widget&utm_medium=embed&utm_campaign=widget-nba`,
  ]);
  const list = [game(3, 0.7), game(1, 0.4), game(2, 0.6, { state: "post" }), game(4, 0.5, { postponed: "postponed" }), game(5, null)];
  eq("widget : sans les matchs finis, reportés ou sans probabilité, dans l'ordre de l'heure", widgetGames(list).map((a) => a.id), [1, 3]);
  eq("widget : au plus 8 matchs", widgetGames(Array.from({ length: 12 }, (_, i) => game(i + 1, 0.55))).length, WIDGET_MAX);

  const html = widgetHtml({ analyses: [game(1, 0.72)], lang: "fr", site: SITE });
  const checks = [
    /Probabilités NBA du soir/.test(html),
    html.includes("72 %") && html.includes("28 %"),
    html.includes(`${SITE}/app/match/1?utm_source=widget`),
    /target="_blank" rel="noopener"/.test(html),
    /<meta name="robots" content="noindex">/.test(html),
    !/<script/i.test(html),
    !/pari|paris |cote|bet|apuesta|odds/i.test(html.replace(/<style>[\s\S]*<\/style>/, "")),
  ];
  eq("widget FR : titre, deux pourcentages, lien vers la fiche, nouvel onglet, noindex, sans script ni mot de paris", checks, checks.map(() => true));
  const en = widgetHtml({ analyses: [game(1, 0.72)], lang: "en", site: SITE });
  eq("widget EN : titre, % collé, liens /en", [en.includes("Tonight&#39;s NBA win probabilities"), en.includes("72%"), en.includes(`${SITE}/en/app/match/1?`)], [true, true, true]);
  const es = widgetHtml({ analyses: [], lang: "es", site: SITE });
  eq("widget ES sans match : message d'attente, lien Basketlog", [/Hoy no hay partidos/.test(es), es.includes(`${SITE}/es?utm_source=widget`)], [true, true]);
  const tom = widgetHtml({ analyses: [game(1, 0.6)], lang: "fr", site: SITE, tomorrow: true });
  eq("widget : matchs du lendemain annoncés", /Probabilités NBA du soir · Demain/.test(tom), true);
  const evil = game(1, 0.6);
  evil.game.home.short = `<img src=x onerror=alert(1)>`;
  const xss = widgetHtml({ analyses: [evil], site: SITE });
  eq("widget : noms d'équipe échappés", [xss.includes("<img src=x"), xss.includes("&lt;img src=x")], [false, true]);
  eq("widget : thème sombre forcé, sans media query", [/prefers-color-scheme/.test(widgetHtml({ site: SITE, theme: "dark" })), /prefers-color-scheme/.test(widgetHtml({ site: SITE }))], [false, true]);

  const code = embedCode(SITE, "en", "dark");
  eq("code d'intégration : iframe vers /api/widget, lien visible « Basketlog » hors de l'iframe", [
    code.includes(`src="${SITE}/api/widget?lang=en&theme=dark"`),
    /<\/iframe>\n<p[^>]*>Probabilities by <a href="https:\/\/basketlog-app.com\/en">Basketlog<\/a><\/p>$/.test(code),
    !/nofollow|display:\s*none/.test(code),
  ], [true, true, true]);
  eq("code d'intégration FR, thème auto : adresse sans thème, lien vers l'accueil", [embedCode(SITE).includes(`?lang=fr"`), embedCode(SITE).includes(`<a href="${SITE}/">Basketlog</a>`)], [true, true]);
}
