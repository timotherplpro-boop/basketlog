import { getScoreboard, getStandings, getInjuries, seasonForDate, shiftDate, nbaToday, getScoreboardRange, nbaDateOf } from "./espn";
import { analyzeGame } from "./model";
import { TEAMS, teamById } from "./teams";

async function context(date) {
  const season = seasonForDate(date);
  const [standings, prior, injuries, yesterday] = await Promise.all([
    getStandings(season),
    getStandings(season - 1),
    getInjuries(),
    getScoreboard(shiftDate(date, -1)),
  ]);
  const playedYesterday = new Set(yesterday.flatMap((g) => [g.home.id, g.away.id]));
  return { standings, prior, injuries, playedYesterday };
}

export async function analyzeDay(date) {
  const [games, ctx] = await Promise.all([getScoreboard(date), context(date)]);
  const analyses = games.map((g) => analyzeGame(g, ctx));
  return { date, analyses };
}

// Taux de réussite réel du modèle sur les matchs terminés des derniers jours.
export async function recentAccuracy(days = 7) {
  const today = nbaToday();
  const results = await Promise.all(Array.from({ length: days }, (_, i) => analyzeDay(shiftDate(today, -(i + 1)))));
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

const slim = (t) => ({ id: t.id, name: t.name, short: t.short, abbr: t.abbr, logo: t.logo });

// Matchs à venir analysés (probabilités incluses), sur N jours.
export async function upcomingAnalyses(days = 7) {
  const today = nbaToday();
  const [games, ctx] = await Promise.all([getScoreboardRange(today, shiftDate(today, days)), context(today)]);
  return games
    .filter((g) => g.state !== "post")
    .sort((x, y) => new Date(x.date) - new Date(y.date))
    .map((g) => {
      const a = analyzeGame(g, ctx);
      return {
        id: g.id,
        d: nbaDateOf(g.date),
        date: g.date,
        live: g.state === "in",
        home: slim(g.home),
        away: slim(g.away),
        pHome: a.pHome,
        homePts: a.homePts,
        awayPts: a.awayPts,
        total: a.total,
        close: a.scenarios[1].p,
        confidence: a.confidence,
        a,
      };
    });
}

// Compat : liste légère pour la recherche
export async function upcomingGames(days = 7) {
  return (await upcomingAnalyses(days)).map(({ a, ...rest }) => rest);
}

// Duel entre deux équipes : vrai match à venir s'il existe, sinon match hypothétique (1re équipe à domicile).
export async function analyzeDuel(homeId, awayId) {
  const home = teamById(homeId), away = teamById(awayId);
  if (!home || !away || home.id === away.id) return null;
  const today = nbaToday();
  const upcoming = await getScoreboardRange(today, shiftDate(today, 21));
  const fixture = upcoming.find(
    (g) => g.state !== "post" && [g.home.id, g.away.id].includes(home.id) && [g.home.id, g.away.id].includes(away.id)
  );
  if (fixture) return { fixture: { id: fixture.id, d: nbaDateOf(fixture.date) } };
  const ctx = await context(today);
  ctx.playedYesterday = new Set();
  const rec = (id) => {
    const s = ctx.standings[id];
    return s ? `${s.wins}-${s.losses}` : null;
  };
  const game = {
    id: `duel-${home.id}-${away.id}`,
    date: null,
    state: "pre",
    hypothetical: true,
    venue: null,
    broadcast: null,
    home: { ...home, record: rec(home.id), score: null, color: "#ff7a1a" },
    away: { ...away, record: rec(away.id), score: null, color: "#ff7a1a" },
  };
  return { analysis: analyzeGame(game, ctx) };
}

// Classement par conférence
export async function conferenceStandings() {
  const today = nbaToday();
  const season = seasonForDate(today);
  const [cur, prev] = await Promise.all([getStandings(season), getStandings(season - 1)]);
  const rows = TEAMS.map((t) => {
    const s = cur[t.id] || { wins: 0, losses: 0, gp: 0 };
    const p = prev[t.id];
    return {
      ...slim(t),
      conf: t.conf,
      wins: s.wins,
      losses: s.losses,
      gp: s.gp,
      pct: s.gp ? s.wins / s.gp : 0,
      diff: s.diff ?? null,
      streak: s.streak || null,
      last10: s.last10 || null,
      prev: p ? `${p.wins}-${p.losses}` : null,
      prevPct: p && p.gp ? p.wins / p.gp : 0,
    };
  });
  const sort = (a, b) => b.pct - a.pct || (b.diff ?? 0) - (a.diff ?? 0) || b.prevPct - a.prevPct;
  return {
    east: rows.filter((r) => r.conf === "E").sort(sort),
    west: rows.filter((r) => r.conf === "W").sort(sort),
  };
}
