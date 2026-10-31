// EuroLeague : données officielles (api-live.euroleague.net) + modèle Basketlog adapté.
import { unstable_cache } from "next/cache";
import { phi, fmt } from "./model";

const API = "https://api-live.euroleague.net/v2/competitions/E/seasons";
const HOME_COURT = 3.2; // l'avantage du terrain pèse plus lourd en Europe
const MARGIN_SD = 11.5;
const PRIOR_GAMES = 8;
const REGRESS = 0.85;
const LEAGUE_PPG = 84;

export function currentSeasonCode(d = new Date()) {
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  return `E${m >= 8 ? y : y - 1}`;
}

const club = (side) => {
  const c = side?.club || {};
  return {
    id: c.code,
    code: c.code,
    name: c.name || c.editorialName || c.code,
    short: c.abbreviatedName || c.name,
    abbr: c.tvCode || c.code,
    logo: c.images?.crest || null,
  };
};

// Les salles arrivent tout en majuscules (« TURKCELL BASKETBALL DEVELOPMENT CENTER ») : on les écrit
// normalement, en gardant les sigles (SAP, LDLC…) et les petits mots en minuscules.
const KEEP_UPPER = new Set(["SAP", "LDLC", "OAKA", "AEK", "PAOK", "CSKA", "SEF", "BC", "KK"]);
const SMALL = new Set(["and", "of", "the", "de", "del", "la", "las", "los", "di", "du", "des", "le"]);
export function venueName(raw) {
  const s = String(raw || "").trim();
  if (!s || s !== s.toUpperCase()) return s || null;
  return s
    .split(/\s+/)
    .map((w, i) => {
      if (KEEP_UPPER.has(w) || !/[AEIOUY]/.test(w)) return w;
      const low = w.toLowerCase();
      if (i > 0 && SMALL.has(low)) return low;
      return low.replace(/(^|-)(\p{L})/gu, (m, d, c) => d + c.toUpperCase());
    })
    .join(" ");
}

async function fetchELGames(season) {
  {
    const res = await fetch(`${API}/${season}/games?teamCode=`, { cache: "no-store", headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`EuroLeague ${res.status}`);
    const j = await res.json();
    return (j.data || [])
      .map((g) => ({
        id: String(g.gameCode),
        season,
        date: g.utcDate || g.date,
        round: g.round?.round ?? g.round,
        phase: g.phaseType?.code || "",
        played: !!g.played,
        live: !g.played && /live|progress/i.test(g.gameStatus || ""),
        venue: venueName(g.venue?.name),
        home: { ...club(g.local), score: g.played ? g.local?.score : null },
        away: { ...club(g.road), score: g.played ? g.road?.score : null },
      }))
      .filter((g) => g.home.id && g.away.id)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }
}

// Résultat déjà nettoyé mis en cache 10 min (la réponse brute est trop lourde pour le cache HTTP).
const cachedGames = unstable_cache(fetchELGames, ["el-games-v1"], { revalidate: 600 });
export async function getELGames(season = currentSeasonCode()) {
  try {
    return await cachedGames(season); // une erreur n'est jamais mise en cache
  } catch {
    return [];
  }
}

// Tableau par club : bilan, points, écart, forme, domicile / extérieur.
export function elTable(games) {
  const t = {};
  const get = (c) => (t[c.id] ||= { ...c, gp: 0, wins: 0, losses: 0, pf: 0, pa: 0, hw: 0, hl: 0, rw: 0, rl: 0, results: [] });
  for (const g of games.filter((x) => x.played && x.home.score != null)) {
    const h = get(g.home), a = get(g.away);
    const hw = g.home.score > g.away.score;
    h.gp++; a.gp++;
    h.pf += g.home.score; h.pa += g.away.score; a.pf += g.away.score; a.pa += g.home.score;
    if (hw) { h.wins++; h.hw++; a.losses++; a.rl++; } else { a.wins++; a.rw++; h.losses++; h.hl++; }
    h.results.push({ res: hw ? "W" : "L", opp: g.away, score: `${g.home.score}-${g.away.score}`, ha: "vs", date: g.date, id: g.id });
    a.results.push({ res: hw ? "L" : "W", opp: g.home, score: `${g.away.score}-${g.home.score}`, ha: "@", date: g.date, id: g.id });
  }
  for (const g of games) { get(g.home); get(g.away); }
  for (const r of Object.values(t)) {
    r.ppg = r.gp ? r.pf / r.gp : null;
    r.oppg = r.gp ? r.pa / r.gp : null;
    r.diff = r.gp ? (r.pf - r.pa) / r.gp : null;
    const last = r.results.slice(-10);
    r.last10 = last.length ? `${last.filter((x) => x.res === "W").length}-${last.filter((x) => x.res === "L").length}` : null;
    let s = 0; const lr = r.results[r.results.length - 1]?.res;
    for (let i = r.results.length - 1; i >= 0 && r.results[i].res === lr; i--) s++;
    r.streak = lr ? `${lr === "W" ? "V" : "D"}${s}` : null;
    r.home = `${r.hw}-${r.hl}`; r.road = `${r.rw}-${r.rl}`;
    r.form = r.results.slice(-5).reverse();
  }
  return t;
}

export function elStandings(table) {
  return Object.values(table).sort((a, b) => (b.gp ? b.wins / b.gp : 0) - (a.gp ? a.wins / a.gp : 0) || b.wins - a.wins || (b.diff ?? 0) - (a.diff ?? 0));
}

function blend(cur, prev, key, fallback) {
  const c = cur?.gp ? cur[key] : null;
  const p = prev?.gp ? prev[key] : null;
  if (c == null && p == null) return fallback;
  if (c == null) return p;
  const w = cur.gp / (cur.gp + PRIOR_GAMES);
  return c * w + (p ?? fallback) * (1 - w);
}

// Même forme d'objet que l'analyse NBA, pour réutiliser la fiche match.
export function elAnalyze(g, cur, prev) {
  const sides = {};
  for (const k of ["home", "away"]) {
    const t = g[k], c = cur[t.id], p = prev[t.id];
    sides[k] = {
      team: t,
      cur: c?.gp ? c : null,
      prev: p?.gp ? p : null,
      diff: blend(c, p, "diff", 0) * REGRESS,
      ppg: blend(c, p, "ppg", LEAGUE_PPG),
      oppg: blend(c, p, "oppg", LEAGUE_PPG),
      inj: { out: [], doubtful: [], pts: 0 },
      b2b: false,
      sample: c?.gp || 0,
    };
  }
  const h = sides.home, a = sides.away;
  const base = h.diff - a.diff;
  const margin = base + HOME_COURT;
  const pHome = phi(margin / MARGIN_SD);
  const total = (h.ppg + a.oppg) / 2 + (a.ppg + h.oppg) / 2;
  let homePts = total / 2 + margin / 2, awayPts = total / 2 - margin / 2;
  if (Math.round(homePts) === Math.round(awayPts)) { if (margin >= 0) homePts = Math.round(homePts) + 1; else awayPts = Math.round(awayPts) + 1; }
  const edge = Math.abs(pHome - 0.5);
  const minSample = Math.min(h.sample, a.sample);
  let confidence = edge > 0.22 ? "Élevée" : edge > 0.1 ? "Moyenne" : "Faible";
  if (minSample < 4 && confidence === "Élevée") confidence = "Moyenne";
  const m = margin, sd = MARGIN_SD;
  const rec = (c) => (c ? `${c.wins}-${c.losses}` : "0-0");
  return {
    league: "EL",
    id: `el-${g.id}`,
    game: {
      ...g,
      id: `el-${g.id}`,
      state: g.played ? "post" : g.live ? "in" : "pre",
      broadcast: null,
      home: { ...g.home, record: rec(h.cur), color: "#ff7a1a" },
      away: { ...g.away, record: rec(a.cur), color: "#ff7a1a" },
    },
    home: h, away: a, margin, pHome, pAway: 1 - pHome, total, homePts, awayPts, confidence,
    fav: pHome >= 0.5 ? h : a, dog: pHome >= 0.5 ? a : h,
    factors: [
      { key: "level", label: "Niveau des équipes (écart de points ajusté)", value: base, detail: `${h.team.abbr} ${fmt(h.diff).replace(".", ",")} / ${a.team.abbr} ${fmt(a.diff).replace(".", ",")} par match` },
      { key: "home", el: true, label: "Avantage du terrain", value: HOME_COURT, detail: `${h.team.short} à domicile (très marqué en Europe)` },
    ],
    scenarios: [
      { key: "home10", label: `${h.team.short} gagne de 10+`, p: 1 - phi((10 - m) / sd) },
      { key: "close", label: "Match serré (écart ≤ 5)", p: phi((5 - m) / sd) - phi((-5 - m) / sd) },
      { key: "away10", label: `${a.team.short} gagne de 10+`, p: phi((-10 - m) / sd) },
    ],
    allScenarios: [
      { key: "home10", label: `${h.team.short} gagne de 10+`, p: 1 - phi((10 - m) / sd) },
      { key: "home6", label: `${h.team.short} gagne de 6 à 9`, p: phi((10 - m) / sd) - phi((5 - m) / sd) },
      { key: "close", label: "Match serré (écart ≤ 5)", p: phi((5 - m) / sd) - phi((-5 - m) / sd) },
      { key: "away6", label: `${a.team.short} gagne de 6 à 9`, p: phi((-5 - m) / sd) - phi((-10 - m) / sd) },
      { key: "away10", label: `${a.team.short} gagne de 10+`, p: phi((-10 - m) / sd) },
    ],
    minSample,
  };
}

// Tout ce qu'il faut pour les pages EuroLeague, en un appel.
export async function elContext() {
  const season = currentSeasonCode();
  const prevSeason = `E${Number(season.slice(1)) - 1}`;
  const [games, prevGames] = await Promise.all([getELGames(season), getELGames(prevSeason)]);
  const cur = elTable(games);
  const prev = elTable(prevGames);
  return { season, games, prevGames, cur, prev };
}

export async function elUpcoming(days = 10) {
  const ctx = await elContext();
  const now = Date.now();
  const list = ctx.games
    .filter((g) => !g.played && new Date(g.date).getTime() > now - 3 * 3600e3 && new Date(g.date).getTime() < now + days * 864e5)
    .map((g) => ({ g, a: elAnalyze(g, ctx.cur, ctx.prev) }));
  return { ...ctx, list };
}
