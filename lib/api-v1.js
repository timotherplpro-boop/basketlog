// API publique et gratuite (/api/v1/predictions) : probabilités NBA du jour en JSON, licence CC BY 4.0.
// Sans dépendance à Next (testable). Les sites qui s'en servent citent la source avec un lien : c'est le but.
export const API_LICENSE = "CC BY 4.0";
export const API_SOURCE = "Basketlog (https://basketlog-app.com)";
const r3 = (x) => Math.round(x * 1000) / 1000;

// games : sortie de upcomingAnalyses ; d : date NBA « 20261121 » ; pathOf : (match, date) => chemin de la fiche.
export function apiPredictions(games, d, { site, pathOf, now = new Date() }) {
  const list = (games || []).filter((g) => g.d === d).map((g) => ({
    id: g.id,
    tipoff: g.date,
    status: g.live ? "live" : "scheduled",
    home: { name: g.home.name, abbreviation: g.home.abbr },
    away: { name: g.away.name, abbreviation: g.away.abbr },
    home_win_probability: r3(g.pHome),
    away_win_probability: r3(1 - g.pHome),
    projected_score: { home: Math.round(g.homePts), away: Math.round(g.awayPts) },
    url: `${site}/en${pathOf(g, g.d)}`,
  }));
  return { source: API_SOURCE, license: API_LICENSE, attribution: "Please link to https://basketlog-app.com when you use this data.", date: d, updated: now.toISOString(), count: list.length, games: list };
}
