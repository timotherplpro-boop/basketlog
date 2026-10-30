// Analyse d'un match à partir de sa clé, avec le même calcul que sa fiche : match NBA (id + date NBA),
// duel hypothétique (« duel-<domicile>-<extérieur> ») ou match d'EuroLeague (« el-<code> »).
import { analyzeDay, analyzeDuel } from "./data";
import { nbaToday, isValidDate, shiftDate } from "./espn";
import { elContext, elAnalyze, elTable } from "./euroleague";

async function nbaById(id, d) {
  const today = nbaToday();
  const dates = isValidDate(d) ? [d] : [today, shiftDate(today, 1), shiftDate(today, -1)];
  for (const date of dates) {
    const { analyses } = await analyzeDay(date);
    const a = analyses.find((x) => x.id === String(id));
    if (a) return a;
  }
  return null;
}

export async function analysisFor(league, id, d = null) {
  if (!id) return null;
  if (league === "EL") {
    const code = String(id).replace(/^el-/, "");
    const ctx = await elContext();
    const g = ctx.games.find((x) => x.id === code);
    if (!g) return null;
    const before = g.played ? elTable(ctx.games.filter((x) => x.played && new Date(x.date) < new Date(g.date))) : ctx.cur;
    return elAnalyze(g, before, ctx.prev);
  }
  const duel = String(id).match(/^duel-([A-Za-z0-9]+)-([A-Za-z0-9]+)$/);
  if (duel) {
    const r = await analyzeDuel(duel[1], duel[2]);
    if (r?.analysis) return r.analysis;
    return r?.fixture ? nbaById(r.fixture.id, r.fixture.d) : null;
  }
  return nbaById(id, d);
}
