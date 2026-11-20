// Données des pages « Les Français en NBA » et « Españoles y latinos en la NBA » (côté serveur, caches ESPN existants).
import { upcomingAnalyses } from "./data";
import { getPlayerStats, getInjuries, nbaToday, seasonForDate } from "./espn";
import { teamById } from "./teams";
import { nationalRows, tonightGames } from "./nationals.js";

// Chargé une fois, partagé par les deux groupes (publication du jour).
export async function nationalBase() {
  const today = nbaToday();
  const season = seasonForDate(today);
  const [stats, injuries, up] = await Promise.all([
    getPlayerStats(season).catch(() => ({})),
    getInjuries().catch(() => ({})),
    upcomingAnalyses(7).catch(() => []),
  ]);
  return { today, season, stats, injuries, upcoming: up.map(({ a, ...g }) => g) };
}

export function nationalFrom(group, base) {
  const rows = nationalRows(group, { stats: base.stats, injuries: base.injuries, upcoming: base.upcoming, teamById });
  return { today: base.today, season: base.season, rows, tonight: tonightGames(rows, base.today) };
}

export async function nationalData(group) {
  return nationalFrom(group, await nationalBase());
}
