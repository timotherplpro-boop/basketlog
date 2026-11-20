// Pronostics NBA d'une saison au format CSV (données ouvertes, voir app/data/[file]/route.js). Sans appel réseau.
import { SITE } from "./site.js";
import { nbaPath } from "./slug.js";

export const csvName = (season) => `nba-predictions-${season - 1}-${String(season).slice(2)}.csv`;
// « nba-predictions-2026-27.csv » → 2027 (année de fin de saison, comme ESPN) ; null sinon.
export function csvFileOf(file) {
  const m = String(file || "").match(/^nba-predictions-(\d{4})-(\d{2})\.csv$/);
  if (!m) return null;
  const end = +m[1] + 1;
  return String(end).slice(2) === m[2] ? end : null;
}

const cell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const CSV_HEAD = ["date", "game_id", "away_team", "home_team", "away_score", "home_score", "home_win_probability", "predicted_winner", "predicted_winner_probability", "predicted_away_points", "predicted_home_points", "correct", "game_page"];

export function picksCsv(picks) {
  const rows = [...(picks || [])].sort((a, b) => String(a.d).localeCompare(String(b.d)) || new Date(a.date) - new Date(b.date));
  const lines = [CSV_HEAD.join(",")];
  for (const p of rows) {
    if (!p?.home || !p?.away) continue;
    const homeFav = p.pHome >= 0.5;
    const d = String(p.d || "");
    lines.push([
      `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, p.id, p.away.name || p.away.short, p.home.name || p.home.short,
      p.away.score, p.home.score, Number(p.pHome).toFixed(3),
      homeFav ? (p.home.name || p.home.short) : (p.away.name || p.away.short), (homeFav ? p.pHome : 1 - p.pHome).toFixed(3),
      p.pred?.[1], p.pred?.[0], p.ok ? 1 : 0, `${SITE}/en${nbaPath(p, d)}`,
    ].map(cell).join(","));
  }
  return lines.join("\n") + "\n";
}
