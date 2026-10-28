import { TEAMS } from "../lib/teams";
import { SITE } from "../lib/site";
import { upcomingGames } from "../lib/data";
import { nbaToday, shiftDate, getScoreboardRange, nbaDateOf } from "../lib/espn";
import { elContext } from "../lib/euroleague";

export const revalidate = 3600; // régénéré chaque heure, avec les matchs à venir

const u = (path, priority, changeFrequency, lastModified = new Date()) => ({ url: `${SITE}${path}`, lastModified, changeFrequency, priority });

export default async function sitemap() {
  const pages = [
    u("", 1, "daily"), u("/app/matchs", 0.9, "hourly"), u("/app", 0.8, "daily"), u("/app/classement", 0.8, "daily"),
    u("/app/euroleague", 0.8, "daily"), u("/app/bilan", 0.8, "daily"), u("/pro", 0.6, "weekly"), u("/avis", 0.5, "weekly"),
  ];
  const teams = TEAMS.map((t) => u(`/app/equipe/${t.id}`, 0.6, "daily"));

  // Matchs NBA : les 7 prochains jours et les 3 derniers (fiches avec score final).
  let nba = [];
  try {
    const up = await upcomingGames(7);
    const today = nbaToday();
    const past = (await getScoreboardRange(shiftDate(today, -3), shiftDate(today, -1))).filter((g) => g.state === "post");
    nba = [
      ...up.map((g) => u(`/app/match/${g.id}?d=${g.d}`, 0.7, "hourly")),
      ...past.map((g) => u(`/app/match/${g.id}?d=${nbaDateOf(g.date)}`, 0.4, "weekly")),
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
        .map((g) => u(`/app/euroleague/match/${g.id}`, 0.6, "hourly")),
    ];
  } catch {}

  return [...pages, ...teams, ...nba, ...el];
}
