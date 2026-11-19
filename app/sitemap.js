import { switchPath } from "../lib/i18n";
import { TEAMS } from "../lib/teams";
import { SITE } from "../lib/site";
import { upcomingGames } from "../lib/data";
import { nbaToday, shiftDate, getScoreboardRange, nbaDateOf, getPlayerStats, seasonForDate } from "../lib/espn";
import { articleDates, articlePath } from "../lib/articles";
import { elContext } from "../lib/euroleague";
import { nbaPath, elPath, playerPath } from "../lib/slug.js";
import { pairPath } from "../lib/matchup.js";

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
  return [{ url: fr, ...rest, alternates }, { url: en, ...rest, priority: p2, alternates }, { url: es, ...rest, priority: p2, alternates }, { url: pt, ...rest, priority: p2, alternates }];
};

export default async function sitemap() {
  const pages = [
    u("", 1, "daily"), u("/analyse-basket", 0.9, "daily"), u("/pronostic-basket", 0.9, "hourly"), u("/app/matchs", 0.9, "hourly"), u("/app/demain", 0.8, "hourly"), u("/app/power-rankings", 0.8, "daily"), u("/app/semaine", 0.8, "daily"), u("/app/blessures", 0.8, "hourly"), u("/app/nba-cup", 0.8, "daily"), u("/app/simulation", 0.8, "daily"), u("/app/champion", 0.8, "daily"), u("/app/resultats", 0.8, "hourly"), u("/app/noel", 0.8, "daily"), u("/fivethirtyeight-nba", 0.7, "weekly"), u("/app/classement/east", 0.8, "daily"), u("/app/euroleague/simulation", 0.7, "daily"), u("/app/classement/west", 0.8, "daily"), u("/app/programme", 0.8, "hourly"), u("/app/leaders", 0.7, "daily"), u("/app/leaders/rebounds", 0.6, "daily"), u("/app/leaders/assists", 0.6, "daily"), u("/app", 0.8, "daily"), u("/app/classement", 0.8, "daily"),
    u("/app/euroleague", 0.8, "daily"), u("/app/competitions", 0.7, "daily"), u("/app/bilan", 0.8, "daily"), u("/methode", 0.7, "monthly"), u("/pro", 0.6, "weekly"), u("/avis", 0.5, "weekly"), u("/widget", 0.5, "monthly"),
    u("/mentions-legales", 0.2, "yearly"), u("/cgu", 0.2, "yearly"), u("/cgv", 0.2, "yearly"), u("/confidentialite", 0.2, "yearly"), u("/cookies", 0.2, "yearly"),
  ];
  const teams = TEAMS.flatMap((t) => [u(`/app/equipe/${t.id}`, 0.6, "daily"), u(`/app/equipe/${t.id}/calendrier`, 0.5, "daily")]);

  // Matchs NBA : les 7 prochains jours et les 3 derniers (fiches avec score final).
  let nba = [];
  try {
    const up = await upcomingGames(7);
    const today = nbaToday();
    const past = (await getScoreboardRange(shiftDate(today, -3), shiftDate(today, -1))).filter((g) => g.state === "post");
    nba = [
      ...up.map((g) => u(nbaPath(g, g.d), 0.7, "hourly")),
      // Pages duel sans date (/nba/celtics-vs-lakers) des affiches de la semaine.
      ...[...new Set(up.map((g) => pairPath(g.home, g.away)))].map((p) => u(p, 0.6, "daily")),
      ...past.map((g) => u(nbaPath(g, nbaDateOf(g.date)), 0.4, "weekly")),
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
  const arts = [u("/articles", 0.7, "daily"), ...articleDates(14).map((d, i) => u(articlePath(d), i === 0 ? 0.8 : 0.5, i === 0 ? "hourly" : "weekly"))];

  // Pages joueurs : les 200 meilleurs marqueurs de la saison (au moins 3 matchs).
  let players = [];
  try {
    const st = await getPlayerStats(seasonForDate(nbaToday()));
    const seen = new Set();
    players = Object.values(st || {}).filter((p) => (p.gp || 0) >= 3 && p.ppg != null).sort((a, b) => b.ppg - a.ppg)
      .map((p) => playerPath(p.name)).filter((p) => !seen.has(p) && seen.add(p)).slice(0, 200).map((p) => u(p, 0.5, "daily"));
  } catch {}

  return [...pages, ...teams, ...nba, ...el, ...arts, ...players].flatMap(both);
}
