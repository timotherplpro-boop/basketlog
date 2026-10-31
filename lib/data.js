import { getScoreboard, getStandings, getInjuries, getPlayerStats, seasonForDate, shiftDate, nbaToday, getScoreboardRange, nbaDateOf } from "./espn";
import { analyzeGame } from "./model";
import { nbaPicks, standingsBefore, lastDays } from "./history";
import { TEAMS, teamById } from "./teams";

async function context(date) {
  const season = seasonForDate(date);
  const past = date < nbaToday();
  const [picks, prior, injuries, yesterday, cur, prev] = await Promise.all([
    nbaPicks(season),
    getStandings(season - 1),
    past ? {} : getInjuries(), // on ne connaît pas les absences d'un match déjà passé
    getScoreboard(shiftDate(date, -1)),
    past ? null : getPlayerStats(season), // poids de chaque absent
    past ? null : getPlayerStats(season - 1),
  ]);
  const playedYesterday = new Set(yesterday.flatMap((g) => [g.home.id, g.away.id]));
  // Classement reconstitué avec les seuls matchs joués AVANT la date : un match terminé
  // garde le pronostic d'avant-match (aucun résultat du futur). Repli : classement officiel pour aujourd'hui
  // et les jours à venir ; pour un jour passé, la saison précédente seule (sinon le résultat fuiterait).
  const standings = picks ? standingsBefore(picks, date) : past ? {} : await getStandings(season);
  return { standings, prior, injuries, players: past ? null : { cur, prev }, playedYesterday, past };
}

export async function analyzeDay(date) {
  const [games, ctx] = await Promise.all([getScoreboard(date), context(date)]);
  const analyses = games.map((g) => analyzeGame(g, ctx));
  return { date, analyses };
}

// Taux de réussite réel du modèle sur les matchs terminés des derniers jours (sans information du futur).
export async function recentAccuracy(days = 7) {
  const picks = await nbaPicks(seasonForDate(nbaToday()));
  if (!picks) return { n: 0, ok: 0 };
  const l = lastDays(picks, days);
  return { n: l.length, ok: l.filter((p) => p.ok).length };
}

const slim = (t) => ({ id: t.id, name: t.name, short: t.short, abbr: t.abbr, logo: t.logo });

// Matchs à venir analysés (probabilités incluses), sur N jours.
export async function upcomingAnalyses(days = 7) {
  const today = nbaToday();
  const [games, ctx] = await Promise.all([getScoreboardRange(today, shiftDate(today, days)), context(today)]);
  // Back-to-back propre à chaque date : une équipe est fatiguée si elle a joué la veille DE CE match
  // (pas la veille d'aujourd'hui pour toute la semaine).
  const byDay = new Map();
  for (const g of games) {
    const d = nbaDateOf(g.date);
    if (!byDay.has(d)) byDay.set(d, new Set());
    byDay.get(d).add(g.home.id).add(g.away.id);
  }
  const playedBefore = (d) => (d === today ? ctx.playedYesterday : byDay.get(shiftDate(d, -1)) || new Set());
  return games
    .filter((g) => g.state !== "post")
    .sort((x, y) => new Date(x.date) - new Date(y.date))
    .map((g) => {
      const a = analyzeGame(g, { ...ctx, playedYesterday: playedBefore(nbaDateOf(g.date)) });
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
  if (fixture) return { fixture: { id: fixture.id, d: nbaDateOf(fixture.date), date: fixture.date, home: slim(fixture.home), away: slim(fixture.away) } };
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

// Forme : 5 derniers matchs NBA de chaque équipe (saison du match), avant une date (match passé) ou à ce jour.
export async function nbaRecentForm(teamIds, beforeIso = null) {
  const picks = (await nbaPicks(seasonForDate(beforeIso ? nbaDateOf(beforeIso) : nbaToday()))) || [];
  const limit = beforeIso ? new Date(beforeIso) : null;
  const out = {};
  for (const id of teamIds) {
    out[id] = picks
      .filter((p) => (p.home.id === id || p.away.id === id) && (!limit || new Date(p.date) < limit))
      .sort((x, y) => new Date(x.date) - new Date(y.date))
      .slice(-5)
      .map((p) => {
        const home = p.home.id === id;
        const me = home ? p.home : p.away, op = home ? p.away : p.home;
        return { res: me.score > op.score ? "W" : "L", opp: op.abbr, score: `${me.score}-${op.score}`, ha: home ? "vs" : "@" };
      });
  }
  return out;
}

// Formulaire d'analyse : vrai match à venir entre les deux équipes s'il existe, sinon match hypothétique.
export async function resolveDuel(homeId, awayId) {
  const res = await analyzeDuel(homeId, awayId);
  if (!res) return null;
  if (res.analysis) return { a: res.analysis, path: `/app?home=${res.analysis.game.home.id}&away=${res.analysis.game.away.id}` };
  const { analyses } = await analyzeDay(res.fixture.d);
  const a = analyses.find((x) => x.id === String(res.fixture.id));
  return a ? { a, path: `/app/match/${res.fixture.id}?d=${res.fixture.d}` } : null;
}
