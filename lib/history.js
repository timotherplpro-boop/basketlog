// Bilan honnête du modèle : chaque match terminé est re-pronostiqué uniquement avec
// les résultats connus AVANT lui (aucune information du futur), puis comparé au score final.
import { unstable_cache } from "next/cache";
import { getStandings, nbaToday, shiftDate, seasonForDate, nbaDateOf } from "./espn";
import { analyzeGame } from "./model";
import { teamById } from "./teams";
import { elContext, elTable, elAnalyze } from "./euroleague";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const REAL_GAMES = new Set([2, 3, 5]); // saison régulière, playoffs, play-in (pas la présaison)

// Un jour passé ne change plus : on le garde longtemps. Une erreur lève (jamais mise en cache).
async function dayGames(date, today) {
  const res = await fetch(`${BASE}/scoreboard?dates=${date}`, {
    next: { revalidate: date < shiftDate(today, -2) ? 7 * 86400 : 900 },
    headers: { "User-Agent": "Mozilla/5.0 Basketlog/0.1" },
  });
  if (!res.ok) throw new Error(`ESPN ${res.status} ${date}`);
  const data = await res.json();
  const out = [];
  for (const ev of data.events || []) {
    const type = ev.season?.type;
    if (type != null && !REAL_GAMES.has(Number(type))) continue;
    const comp = (ev.competitions || [])[0] || {};
    const h = (comp.competitors || []).find((c) => c.homeAway === "home");
    const a = (comp.competitors || []).find((c) => c.homeAway === "away");
    if (!h || !a || !teamById(String(h.team?.id)) || !teamById(String(a.team?.id))) continue; // ex. All-Star
    const st = (ev.status || comp.status || {}).type || {};
    const side = (c) => {
      const t = teamById(String(c.team.id));
      return { id: t.id, abbr: t.abbr, name: t.name, short: t.short, logo: t.logo, score: c.score != null ? Number(c.score) : null };
    };
    out.push({ id: String(ev.id), date: ev.date, state: st.state || "pre", type: Number(type) || 2, home: side(h), away: side(a) });
  }
  return out;
}

async function inBatches(items, size, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

// Ajoute un match terminé au tableau cumulé (bilan, points, série, domicile/extérieur).
function addGame(acc, g) {
  for (const [me, op, home] of [[g.home, g.away, true], [g.away, g.home, false]]) {
    const r = (acc[me.id] ||= { w: 0, l: 0, gp: 0, pf: 0, pa: 0, hw: 0, hl: 0, rw: 0, rl: 0, res: [] });
    const won = me.score > op.score;
    r.gp++; r.pf += me.score; r.pa += op.score;
    if (won) { r.w++; home ? r.hw++ : r.rw++; } else { r.l++; home ? r.hl++ : r.rl++; }
    r.res.push(won ? "W" : "L");
  }
}

function snapshot(acc) {
  const s = {};
  for (const [id, r] of Object.entries(acc)) {
    const last = r.res[r.res.length - 1];
    let k = 0;
    for (let i = r.res.length - 1; i >= 0 && r.res[i] === last; i--) k++;
    const l10 = r.res.slice(-10);
    s[id] = {
      wins: r.w, losses: r.l, gp: r.gp, ppg: r.pf / r.gp, oppg: r.pa / r.gp, diff: (r.pf - r.pa) / r.gp,
      streak: last ? `${last === "W" ? "V" : "D"}${k}` : null,
      last10: `${l10.filter((x) => x === "W").length}-${l10.filter((x) => x === "L").length}`,
      home: `${r.hw}-${r.hl}`, road: `${r.rw}-${r.rl}`,
    };
  }
  return s;
}

async function computeNBASeason(season) {
  const today = nbaToday();
  const last = [shiftDate(today, -1), `${season}0630`].sort()[0];
  const days = [];
  for (let d = `${season - 1}1001`; d <= last; d = shiftDate(d, 1)) days.push(d);
  const [lists, prior] = await Promise.all([inBatches(days, 16, (d) => dayGames(d, today)), getStandings(season - 1)]);
  if (!prior || !Object.keys(prior).length) throw new Error("standings prior indisponibles");

  const acc = {};
  const picks = [];
  let prevDay = new Set();
  lists.forEach((games, i) => {
    const done = games.filter((g) => g.state === "post" && g.home.score != null && g.away.score != null && g.home.score !== g.away.score);
    if (done.length) {
      const ctx = { standings: snapshot(acc), prior, injuries: {}, playedYesterday: prevDay };
      for (const g of done) {
        const a = analyzeGame({ ...g, home: { ...g.home }, away: { ...g.away } }, ctx);
        const homeWon = g.home.score > g.away.score;
        picks.push({
          id: g.id, d: days[i], date: g.date, type: g.type,
          home: g.home, away: g.away,
          pHome: Math.round(a.pHome * 1000) / 1000,
          pred: [Math.round(a.homePts), Math.round(a.awayPts)],
          conf: a.confidence,
          ok: (a.pHome >= 0.5) === homeWon,
        });
      }
      for (const g of done) addGame(acc, g);
    }
    prevDay = new Set(games.map((g) => [g.home.id, g.away.id]).flat());
  });
  return picks;
}

const cachedNBA = unstable_cache(computeNBASeason, ["bilan-nba-v1"], { revalidate: 1800 });
const cachedNBAPast = unstable_cache(computeNBASeason, ["bilan-nba-past-v1"], { revalidate: 7 * 86400 });

export async function nbaPicks(season) {
  const cur = seasonForDate(nbaToday());
  try {
    return await (season < cur ? cachedNBAPast : cachedNBA)(season);
  } catch {
    return null;
  }
}

// EuroLeague : même principe, le tableau est recalculé avec les seuls matchs déjà joués.
async function computeEL() {
  const { games, prev } = await elContext();
  const played = games.filter((g) => g.played && g.home.score != null && g.home.score !== g.away.score);
  return played.map((g, i) => {
    const before = elTable(played.slice(0, i).filter((x) => new Date(x.date) < new Date(g.date)));
    const a = elAnalyze(g, before, prev);
    return {
      id: g.id, d: nbaDateOf(g.date), date: g.date,
      home: { ...g.home }, away: { ...g.away },
      pHome: Math.round(a.pHome * 1000) / 1000,
      pred: [Math.round(a.homePts), Math.round(a.awayPts)],
      conf: a.confidence,
      ok: (a.pHome >= 0.5) === (g.home.score > g.away.score),
    };
  });
}
export async function elPicks() {
  try { return await computeEL(); } catch { return null; }
}

// Synthèse : réussite globale, par niveau de confiance, calibration par tranche de probabilité.
export function summarize(picks) {
  const n = picks.length, ok = picks.filter((p) => p.ok).length;
  const byConf = ["Élevée", "Moyenne", "Faible"].map((c) => {
    const l = picks.filter((p) => p.conf === c);
    return { label: c, n: l.length, ok: l.filter((p) => p.ok).length };
  });
  const buckets = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 1.01]].map(([lo, hi]) => {
    const l = picks.filter((p) => { const f = Math.max(p.pHome, 1 - p.pHome); return f >= lo && f < hi; });
    const avg = l.length ? l.reduce((s, p) => s + Math.max(p.pHome, 1 - p.pHome), 0) / l.length : null;
    return { lo, hi: Math.min(hi, 1), n: l.length, ok: l.filter((p) => p.ok).length, avg };
  });
  // Écart moyen entre score projeté et score réel (sur la marge).
  const mae = n ? picks.reduce((s, p) => s + Math.abs((p.pred[0] - p.pred[1]) - (p.home.score - p.away.score)), 0) / n : null;
  return { n, ok, pct: n ? ok / n : null, byConf, buckets, mae };
}

// Les N derniers jours (pour la page d'accueil).
export function lastDays(picks, days, today = nbaToday()) {
  const from = shiftDate(today, -days);
  return picks.filter((p) => p.d >= from);
}

// Classement reconstitué à partir des matchs joués avant une date (pour revoir un match passé).
export function standingsBefore(picks, date) {
  const acc = {};
  for (const p of picks) if (p.d < date) addGame(acc, p);
  return snapshot(acc);
}
