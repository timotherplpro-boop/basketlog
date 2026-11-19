// Jeu « Bats le modèle » : matchs à choisir et résultats (côté serveur).
import { analyzeDay } from "./data";
import { nbaToday, shiftDate, seasonForDate } from "./espn";
import { nbaPicks } from "./history";

const slim = (t) => ({ id: String(t.id), short: t.short, name: t.name, logo: t.logo || null });

// Matchs NBA qu'on peut encore choisir : ceux d'aujourd'hui pas encore commencés, sinon ceux de demain.
// Chaque match porte le favori du modèle (même calcul que les fiches du site au même moment).
export async function defiGames(now = Date.now()) {
  const pick = (d, analyses) => analyses
    .filter((a) => a.game.state === "pre" && !a.game.postponed && !a.game.hypothetical && new Date(a.game.date).getTime() > now)
    .sort((x, y) => new Date(x.game.date) - new Date(y.game.date))
    .map((a) => ({ g: String(a.game.id), d, date: a.game.date, home: slim(a.game.home), away: slim(a.game.away), pHome: a.pHome, m: String(a.pHome >= 0.5 ? a.game.home.id : a.game.away.id) }));
  const today = nbaToday();
  let list = [];
  try { list = pick(today, (await analyzeDay(today)).analyses); } catch {}
  if (list.length) return { d: today, games: list, tomorrow: false };
  const next = shiftDate(today, 1);
  try { list = pick(next, (await analyzeDay(next)).analyses); } catch {}
  return { d: next, games: list, tomorrow: true };
}

// Résultats des matchs terminés entre deux dates NBA : { [match]: { w (équipe gagnante), d, f (favori du modèle) } }.
export async function defiResults(from, to) {
  const picks = await nbaPicks(seasonForDate(nbaToday())).catch(() => null);
  const out = {};
  for (const p of picks || []) {
    if (p.d < from || p.d > to) continue;
    out[String(p.id)] = { d: p.d, w: String(p.home.score > p.away.score ? p.home.id : p.away.id), f: String(p.pHome >= 0.5 ? p.home.id : p.away.id), s: `${p.away.short} ${p.away.score}-${p.home.score} ${p.home.short}` };
  }
  return out;
}
