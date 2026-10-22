import { getScoreboard, getStandings, getInjuries, seasonForDate, shiftDate, nbaToday, getScoreboardRange, nbaDateOf } from "./espn";

// Taux de réussite réel du modèle sur les matchs terminés des derniers jours.
export async function recentAccuracy(days = 7) {
  const today = nbaToday();
  const results = await Promise.all(
    Array.from({ length: days }, (_, i) => analyzeDay(shiftDate(today, -(i + 1))))
  );
  let n = 0, ok = 0;
  for (const { analyses } of results) {
    for (const a of analyses) {
      const g = a.game;
      if (g.state !== "post" || g.home.score == null || g.away.score == null || g.home.score === g.away.score) continue;
      n++;
      if ((a.pHome >= 0.5) === g.home.score > g.away.score) ok++;
    }
  }
  return { n, ok };
}

// Matchs à venir sur la semaine, pour la recherche par équipe.
export async function upcomingGames(days = 7) {
  const today = nbaToday();
  const games = await getScoreboardRange(today, shiftDate(today, days));
  return games
    .filter((g) => g.state !== "post")
    .sort((x, y) => new Date(x.date) - new Date(y.date))
    .map((g) => ({
      id: g.id,
      d: nbaDateOf(g.date),
      date: g.date,
      live: g.state === "in",
      home: { name: g.home.name, short: g.home.short, abbr: g.home.abbr, logo: g.home.logo },
      away: { name: g.away.name, short: g.away.short, abbr: g.away.abbr, logo: g.away.logo },
    }));
}
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
