import { switchPath } from "../lib/i18n";
import { TEAMS } from "../lib/teams";
import { SITE } from "../lib/site";
import { upcomingGames } from "../lib/data";
import { nbaToday, shiftDate, getScoreboardRange, getPlayerStats, seasonForDate } from "../lib/espn";
import { articleDates, articlePath } from "../lib/articles";
import { elContext } from "../lib/euroleague";
import { nbaPath, elPath, playerPath } from "../lib/slug.js";
import { pairPath } from "../lib/matchup.js";
import { TERMS } from "../lib/glossary.js";
import { monthsOf } from "../lib/months.js";
import { ncaaState, ncaaStateOf, ncaaDay } from "../lib/ncaa";
import { ncaaGamePath, ncaaTeamPath, topIds } from "../lib/ncaa-model.js";
import { actuList } from "../lib/actu";

export const revalidate = 3600; // régénéré chaque heure, avec les matchs à venir

const u = (path, priority, changeFrequency, lastModified = new Date()) => ({ path, lastModified, changeFrequency, priority });

// Chaque page existe en français (adresse actuelle), en anglais (/en), en espagnol (/es) et en portugais du Brésil (/pt), liées par hreflang.
const both = ({ path, ...rest }) => {
  const fr = `${SITE}${path}`;
  // Même forme que l'adresse canonique des pages (/en et non /en/ pour l'accueil), sinon Google ne relie pas la page au sitemap.
  const en = `${SITE}${switchPath(path, "en")}`;
  const es = `${SITE}${switchPath(path, "es")}`;
  const pt = `${SITE}${switchPath(path, "pt")}`;
  const alternates = { languages: { fr, en, es, "pt-BR": pt, "x-default": en } }; // x-default : anglais (visiteurs d'une autre langue)
  const p2 = Math.round(rest.priority * 0.9 * 100) / 100;
  // Sitemap allégé (26 nov.) : les pages portugaises restent liées par hreflang mais ne sont plus listées, pour concentrer
  // l'exploration de Google (134 pages indexées sur ~2 680 adresses listées).
  return [{ url: fr, ...rest, alternates }, { url: en, ...rest, priority: p2, alternates }, { url: es, ...rest, priority: p2, alternates }];
};

export default async function sitemap() {
  const pages = [
    u("", 1, "daily"), u("/analyse-basket", 0.9, "daily"), u("/pronostic-basket", 0.9, "hourly"), u("/app/matchs", 0.9, "hourly"), u("/app/demain", 0.8, "hourly"), u("/app/power-rankings", 0.8, "daily"), u("/app/semaine", 0.8, "daily"), u("/app/blessures", 0.8, "hourly"), u("/app/nba-cup", 0.8, "daily"), u("/app/simulation", 0.8, "daily"), u("/app/champion", 0.8, "daily"), u("/app/resultats", 0.8, "hourly"), u("/app/noel", 0.8, "daily"), u("/app/francais", 0.8, "daily"), u("/app/espagnols", 0.8, "daily"), u("/app/ncaa", 0.8, "hourly"), u("/app/ncaa/classement", 0.8, "daily"), u("/app/ncaaw", 0.7, "hourly"), u("/app/ncaaw/classement", 0.6, "daily"), u("/app/mvp", 0.8, "daily"), u("/app/rookie", 0.7, "daily"), u("/app/draft", 0.8, "daily"), u("/app/calendrier-restant", 0.7, "daily"), u("/app/back-to-back", 0.7, "daily"), u("/app/surprises", 0.7, "daily"), u("/app/donnees", 0.6, "weekly"), u("/meilleurs-sites-pronostics-nba", 0.7, "weekly"), u("/app/lexique", 0.5, "monthly"), u("/app/defi", 0.8, "daily"), u("/fivethirtyeight-nba", 0.7, "weekly"), u("/app/classement/east", 0.8, "daily"), u("/app/euroleague/simulation", 0.7, "daily"), u("/app/classement/west", 0.8, "daily"), u("/app/programme", 0.8, "hourly"), u("/app/leaders", 0.7, "daily"), u("/app/leaders/rebounds", 0.6, "daily"), u("/app/leaders/assists", 0.6, "daily"), u("/app", 0.8, "daily"), u("/app/classement", 0.8, "daily"),
    u("/app/euroleague", 0.8, "daily"), u("/app/competitions", 0.7, "daily"), u("/app/bilan", 0.8, "daily"), u("/methode", 0.7, "monthly"), u("/a-propos", 0.5, "monthly"), u("/pro", 0.6, "weekly"), u("/avis", 0.5, "weekly"), u("/widget", 0.5, "monthly"),
    u("/mentions-legales", 0.2, "yearly"), u("/cgu", 0.2, "yearly"), u("/cgv", 0.2, "yearly"), u("/confidentialite", 0.2, "yearly"), u("/cookies", 0.2, "yearly"),
  ];
  pages.push(...TERMS.map((x) => u(`/app/lexique/${x.slug}`, 0.4, "monthly")), ...monthsOf(seasonForDate(nbaToday()), nbaToday()).map((m) => u(`/app/bilan/${m}`, 0.5, "daily")));
  // NCAA : les 25 écoles les mieux notées et leurs matchs entre elles, d'aujourd'hui à après-demain (décision du 28/11, voir NCAA_TOP).
  let ncaa = [];
  try {
    const st = await ncaaState();
    const d1 = topIds(st);
    ncaa = Object.values(st.meta).filter((t) => t.slug && d1.has(t.id)).map((t) => u(`/ncaa/team/${t.slug}`, 0.5, "daily"));
    const today = nbaToday();
    const lists = await Promise.all([0, 1, 2].map((i) => ncaaDay(shiftDate(today, i)).catch(() => [])));
    for (const g of lists.flat()) if (d1.has(g.home.id) && d1.has(g.away.id)) ncaa.push(u(ncaaGamePath(g), 0.6, "hourly"));
  } catch {}
  // Basket universitaire féminin : idem, top 25.
  try {
    const st = await ncaaStateOf("w");
    const d1 = topIds(st);
    ncaa.push(...[...d1].filter((id) => st.meta[id]?.slug).map((id) => u(ncaaTeamPath(st.meta[id], "/ncaaw"), 0.4, "daily")));
    const today = nbaToday();
    const lists = await Promise.all([0, 1, 2].map((i) => ncaaDay(shiftDate(today, i), "w").catch(() => [])));
    for (const g of lists.flat()) if (d1.has(g.home.id) && d1.has(g.away.id)) ncaa.push(u(ncaaGamePath(g, "/ncaaw"), 0.5, "hourly"));
  } catch {}
  // NCAA : version anglaise seulement dans le sitemap (recherches américaines) ; les autres langues restent liées par hreflang.
  const ncaaEn = ncaa.map((e) => both(e)[1]);
  const teams = TEAMS.flatMap((t) => [u(`/app/equipe/${t.id}`, 0.6, "daily"), u(`/app/equipe/${t.id}/calendrier`, 0.5, "daily")]);

  // Matchs NBA : les 7 prochains jours et les 3 derniers (fiches avec score final).
  let nba = [];
  try {
    const up = await upcomingGames(7);
    const today = nbaToday();
    const past = (await getScoreboardRange(shiftDate(today, -7), shiftDate(today, -1))).filter((g) => g.state === "post");
    nba = [
      // Fiches datées : aujourd'hui et demain seulement (26 nov. : 0 impression en 28 jours, jamais découvertes à temps).
      ...up.filter((g) => g.d === today || g.d === shiftDate(today, 1)).map((g) => u(nbaPath(g, g.d), 0.7, "hourly")),
      // Pages duel sans date (/nba/celtics-vs-lakers) : pages durables, affiches des 7 prochains et des 7 derniers jours.
      ...[...new Set([...up, ...past].map((g) => pairPath(g.home, g.away)))].map((p) => u(p, 0.7, "daily")),
    ];
  } catch {}

  // EuroLeague : clubs et matchs des 10 prochains jours.
  let el = [];
  try {
    const { cur, games } = await elContext();
    const now = Date.now();
    el = [
      ...Object.keys(cur).map((code) => u(`/app/euroleague/equipe/${code}`, 0.5, "daily")),
      ...games.filter((g) => !g.played && new Date(g.date).getTime() > now - 3 * 3600e3 && new Date(g.date).getTime() < now + 10 * 864e5)
        .map((g) => u(elPath(g), 0.6, "hourly")),
    ];
  } catch {}

  // Articles quotidiens (Google Discover) : la page liste et les 14 derniers jours.
  const arts = [u("/articles", 0.7, "daily"), ...articleDates(7).map((d, i) => u(articlePath(d), i === 0 ? 0.8 : 0.5, i === 0 ? "hourly" : "weekly"))];

  // Pages joueurs (« X joue-t-il ce soir ? ») : les 100 meilleurs marqueurs de la saison (au moins 3 matchs).
  // Pas plus : Google laisse déjà 260 pages « détectées, non indexées » (Search Console, 21 nov.), inutile de diluer l'exploration.
  let players = [];
  try {
    const st = await getPlayerStats(seasonForDate(nbaToday()));
    const seen = new Set();
    players = Object.values(st || {}).filter((p) => (p.gp || 0) >= 3 && p.ppg != null).sort((a, b) => b.ppg - a.ppg)
      .map((p) => playerPath(p.name)).filter((p) => !seen.has(p) && seen.add(p)).slice(0, 100).map((p) => u(p, 0.5, "daily"));
  } catch {}

  // Jeu de Noël 2026 : ouvert au monde entier sauf quelques pays ; la page portugaise (surtout lue au Brésil, exclu) est en noindex.
  const cAlt = { languages: { fr: `${SITE}/concours`, en: `${SITE}/en/concours`, es: `${SITE}/es/concours`, "x-default": `${SITE}/en/concours` } };
  const concours = ["/concours", "/en/concours", "/es/concours"].map((p, i) => ({ url: `${SITE}${p}`, lastModified: new Date(), changeFrequency: "daily", priority: i ? 0.7 : 0.8, alternates: cAlt }));
  // Actu du jour (27/11) : la page « Actu NBA » et les articles /actu/<post Bluesky>-<titre>, en français seulement (pas de
  // version /en ni /es). Même source que la page /actu (flux Bluesky en cache 1 h) ; IndexNow les reçoit avec le sitemap.
  let actu = [];
  try {
    const list = await actuList();
    const day = (iso) => (iso && !isNaN(Date.parse(iso)) ? new Date(iso) : new Date()); // date invalide : le sitemap entier planterait
    actu = [
      { url: `${SITE}/actu`, lastModified: day(list[0]?.at), changeFrequency: "daily", priority: 0.7 },
      ...list.map((x, i) => ({ url: `${SITE}${x.path}`, lastModified: day(x.at), changeFrequency: i ? "weekly" : "daily", priority: i < 7 ? 0.7 : 0.5 })),
    ];
  } catch {}
  return [...[...pages, ...teams, ...nba, ...el, ...arts, ...players].flatMap(both), ...ncaaEn, ...concours, ...actu];
}
