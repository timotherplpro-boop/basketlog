import { getScoreboard, getStandings, getInjuries, seasonForDate, shiftDate } from "./espn";
import { analyzeGame } from "./model";

export async function analyzeDay(date) {
  const season = seasonForDate(date);
  const [games, standings, prior, injuries, yesterday] = await Promise.all([
    getScoreboard(date),
    getStandings(season),
    getStandings(season - 1),
    getInjuries(),
    getScoreboard(shiftDate(date, -1)),
  ]);
  const playedYesterday = new Set(yesterday.flatMap((g) => [g.home.id, g.away.id]));
  const ctx = { standings, prior, injuries, playedYesterday };
  const analyses = games.map((g) => analyzeGame(g, ctx));
  return { date, analyses, hasData: Object.keys(prior).length > 0 || Object.keys(standings).length > 0 };
}
