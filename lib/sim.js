// Simulation de la saison NBA et de la NBA Cup avec le modèle Basketlog (méthode de Monte-Carlo).
// Chaque simulation joue tous les matchs restants : la marge de chaque match suit une loi normale centrée sur l'écart
// attendu (force des deux équipes + avantage du terrain), d'écart-type 12,3 points, comme les pronostics du site.
// La force de chaque équipe est en plus tirée au hasard une fois par simulation (incertitude sur son vrai niveau),
// d'autant plus que la saison est jeune. On en déduit les chances de play-in, de playoffs, de finale et de titre.
// Règles simplifiées : égalités au classement départagées au hasard (pas de confrontations directes).
import { unstable_cache } from "next/cache";
import { TEAMS } from "./teams";
import { getStandings, getTeamSchedule, seasonForDate, nbaToday } from "./espn";
import { teamStrength, MODEL } from "./model";
import { elContext, elStrength, EL_MODEL } from "./euroleague";

const { HOME_COURT, MARGIN_SD } = MODEL;

// Générateur pseudo-aléatoire à graine fixe : les chiffres ne bougent pas d'un chargement à l'autre dans la journée.
function rng(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let spare = null;
  const normal = () => {
    if (spare != null) { const s = spare; spare = null; return s; }
    let u = 0, v = 0;
    while (u === 0) u = next();
    v = next();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
  return { next, normal };
}
const seedOf = (s) => [...String(s)].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

// Toute la saison régulière : matchs joués (score) et à venir, sans doublon, à partir des calendriers des 30 équipes.
async function seasonGames() {
  const lists = await Promise.all(TEAMS.map((t) => getTeamSchedule(t.id).catch(() => [])));
  const byId = new Map();
  for (const g of lists.flat()) {
    if (g.type && g.type !== "reg") continue;
    if (!byId.has(g.id)) byId.set(g.id, g);
  }
  return [...byId.values()];
}

const known = new Set(TEAMS.map((t) => t.id));
const isCupGroup = (g) => /cup/i.test(g.note || "") && /group/i.test(g.note || "");

// Données de départ : force de chaque équipe, bilan actuel, matchs restants, matchs de groupe de la NBA Cup.
async function loadInputs() {
  const season = seasonForDate(nbaToday());
  const [cur, prev, games] = await Promise.all([getStandings(season), getStandings(season - 1), seasonGames()]);
  const teams = {};
  for (const t of TEAMS) {
    const c = cur[t.id] || null;
    teams[t.id] = { id: t.id, conf: t.conf, wins: c?.wins ?? 0, losses: c?.losses ?? 0, gp: c?.gp ?? 0, strength: teamStrength(c, prev[t.id] || null), prevPct: prev[t.id]?.gp ? prev[t.id].wins / prev[t.id].gp : 0.5 };
  }
  const valid = games.filter((g) => known.has(g.home.id) && known.has(g.away.id) && !g.postponed);
  const remaining = valid.filter((g) => g.state !== "post").map((g) => [g.home.id, g.away.id]);
  const cup = valid.filter(isCupGroup).map((g) => ({
    id: g.id, date: g.date, home: g.home.id, away: g.away.id, done: g.state === "post" && g.home.score != null,
    hs: g.home.score, as: g.away.score, ot: !!g.ot,
  }));
  // Chaque équipe joue 82 matchs ; le calendrier publié en compte parfois moins (2 dates fixées après la NBA Cup).
  const scheduled = {};
  for (const g of valid) for (const id of [g.home.id, g.away.id]) scheduled[id] = (scheduled[id] || 0) + 1;
  const extra = {};
  for (const t of TEAMS) extra[t.id] = Math.max(0, 82 - (scheduled[t.id] || 0));
  return { season, teams, remaining, cup, extra };
}

// Incertitude sur le vrai niveau d'une équipe (en points) : forte en début de saison, plus faible ensuite.
const levelSd = (gp) => 1.8 + 2.2 * Math.sqrt(12 / (gp + 12));

function pGame(sHome, sAway, neutral = false) {
  const mu = sHome - sAway + (neutral ? 0 : HOME_COURT);
  return { mu, sd: MARGIN_SD };
}

// Série au meilleur des 7, terrain à la mieux classée (2-2-1-1-1). Renvoie l'id du vainqueur.
function series(hi, lo, s, R) {
  let wh = 0, wl = 0;
  const homeHi = [1, 1, 0, 0, 1, 0, 1];
  for (let g = 0; wh < 4 && wl < 4; g++) {
    const h = homeHi[g];
    const mu = h ? s[hi] - s[lo] + HOME_COURT : s[hi] - s[lo] - HOME_COURT;
    if (mu + MARGIN_SD * R.normal() > 0) wh++; else wl++;
  }
  return wh === 4 ? hi : lo;
}
const one = (home, away, s, R, neutral = false) => {
  const { mu, sd } = pGame(s[home], s[away], neutral);
  return mu + sd * R.normal() > 0 ? home : away;
};

// ---------------------------------------------------------------- Saison régulière, play-in et playoffs
export function simulateSeasonRaw(inp, n = 4000) {
  const { teams, remaining, extra } = inp;
  const ids = Object.keys(teams);
  const R = rng(seedOf(`${inp.season}-${nbaToday()}-season`));
  const acc = {};
  for (const id of ids) acc[id] = { wins: 0, top6: 0, playIn: 0, playoffs: 0, round2: 0, confFinal: 0, finals: 0, title: 0, seed1: 0 };
  const s = {}, w = {};
  for (let k = 0; k < n; k++) {
    for (const id of ids) { s[id] = teams[id].strength + levelSd(teams[id].gp) * R.normal(); w[id] = teams[id].wins; }
    for (const [h, a] of remaining) {
      if (s[h] - s[a] + HOME_COURT + MARGIN_SD * R.normal() > 0) w[h]++; else w[a]++;
    }
    for (const id of ids) for (let e = 0; e < extra[id]; e++) if (s[id] + MARGIN_SD * R.normal() > 0) w[id]++;
    const champs = [];
    for (const conf of ["E", "W"]) {
      const order = ids.filter((id) => teams[id].conf === conf).map((id) => [id, w[id] + R.next() * 0.5]).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
      order.forEach((id, i) => { if (i < 6) acc[id].top6++; else if (i < 10) acc[id].playIn++; });
      acc[order[0]].seed1++;
      // Play-in : 7 contre 8 (le vainqueur est 7e), le perdant reçoit le vainqueur de 9 contre 10 (le gagnant est 8e).
      const w78 = one(order[6], order[7], s, R);
      const l78 = w78 === order[6] ? order[7] : order[6];
      const w910 = one(order[8], order[9], s, R);
      const eighth = one(l78, w910, s, R);
      const seeds = [...order.slice(0, 6), w78, eighth];
      for (const id of seeds) acc[id].playoffs++;
      const r1 = [series(seeds[0], seeds[7], s, R), series(seeds[3], seeds[4], s, R), series(seeds[1], seeds[6], s, R), series(seeds[2], seeds[5], s, R)];
      for (const id of r1) acc[id].round2++;
      const rank = (id) => seeds.indexOf(id);
      const pair = (a, b) => (rank(a) < rank(b) ? series(a, b, s, R) : series(b, a, s, R));
      const r2 = [pair(r1[0], r1[1]), pair(r1[2], r1[3])];
      for (const id of r2) acc[id].confFinal++;
      const cf = pair(r2[0], r2[1]);
      acc[cf].finals++;
      champs.push(cf);
    }
    const [e, wst] = champs;
    const champ = w[e] >= w[wst] ? series(e, wst, s, R) : series(wst, e, s, R);
    acc[champ].title++;
    for (const id of ids) acc[id].wins += w[id];
  }
  const out = {};
  for (const id of ids) {
    const a = acc[id];
    out[id] = {
      id, conf: teams[id].conf, record: [teams[id].wins, teams[id].losses], strength: teams[id].strength,
      projWins: a.wins / n, top6: a.top6 / n, playIn: a.playIn / n, playoffs: a.playoffs / n, round2: a.round2 / n,
      confFinal: a.confFinal / n, finals: a.finals / n, title: a.title / n, seed1: a.seed1 / n,
    };
  }
  return out;
}

// ---------------------------------------------------------------- NBA Cup
// Groupes : chaque équipe joue une fois les 4 autres équipes de son groupe ; on retrouve les groupes à partir des matchs.
function cupGroups(cup) {
  const adj = {};
  for (const g of cup) { (adj[g.home] ||= new Set()).add(g.away); (adj[g.away] ||= new Set()).add(g.home); }
  const seen = new Set(), groups = [];
  for (const id of Object.keys(adj)) {
    if (seen.has(id)) continue;
    const stack = [id], comp = [];
    seen.add(id);
    while (stack.length) { const x = stack.pop(); comp.push(x); for (const y of adj[x]) if (!seen.has(y)) { seen.add(y); stack.push(y); } }
    groups.push(comp);
  }
  return groups;
}

// Classement d'un groupe : bilan, puis confrontation directe (entre deux équipes), écart de points, points marqués,
// bilan de la saison passée. Les prolongations comptent 0 d'écart (règle 2026).
function rankGroup(ids, results, prevPct) {
  const st = {};
  for (const id of ids) st[id] = { id, w: 0, l: 0, diff: 0, pf: 0 };
  const h2h = {};
  for (const r of results) {
    const win = r.hs > r.as ? r.home : r.away, los = win === r.home ? r.away : r.home;
    if (!st[win] || !st[los]) continue;
    st[win].w++; st[los].l++;
    const d = r.ot ? 0 : Math.abs(r.hs - r.as);
    st[win].diff += d; st[los].diff -= d;
    const reg = r.ot ? Math.min(r.hs, r.as) : null;
    st[r.home].pf += reg ?? r.hs; st[r.away].pf += reg ?? r.as;
    h2h[`${win}>${los}`] = true;
  }
  // Égalité de bilan : on compare d'abord les victoires dans les matchs entre équipes à égalité (confrontation
  // directe à deux, mini-classement à trois ou plus), puis l'écart, les points marqués, la saison passée.
  const list = Object.values(st).sort((a, b) => b.w - a.w || a.l - b.l);
  const out = [];
  for (let i = 0; i < list.length;) {
    let j = i;
    while (j < list.length && list[j].w === list[i].w && list[j].l === list[i].l) j++;
    const block = list.slice(i, j);
    if (block.length > 1) {
      const ids = new Set(block.map((x) => x.id));
      const mini = (id) => [...ids].filter((o) => o !== id && h2h[`${id}>${o}`]).length;
      // À égalité de mini-classement, deux équipes repartent de leur confrontation directe (règle NBA).
      block.sort((a, b) => mini(b.id) - mini(a.id) || (h2h[`${a.id}>${b.id}`] ? -1 : h2h[`${b.id}>${a.id}`] ? 1 : 0) || b.diff - a.diff || b.pf - a.pf || (prevPct[b.id] || 0) - (prevPct[a.id] || 0));
    }
    out.push(...block);
    i = j;
  }
  return out;
}
const better = (a, b) => b.w - a.w || a.l - b.l || b.diff - a.diff || b.pf - a.pf;

export function cupStandings(inp) {
  const prevPct = Object.fromEntries(Object.values(inp.teams).map((t) => [t.id, t.prevPct]));
  return cupGroups(inp.cup).map((ids) => {
    const games = inp.cup.filter((g) => ids.includes(g.home));
    const table = rankGroup(ids, games.filter((g) => g.done), prevPct);
    const conf = inp.teams[ids[0]]?.conf;
    return { conf, ids, table, played: games.filter((g) => g.done).length, total: games.length, games };
  }).sort((a, b) => (a.conf === b.conf ? 0 : a.conf === "E" ? -1 : 1));
}

export function simulateCupRaw(inp, n = 6000) {
  const groups = cupStandings(inp);
  if (!groups.length) return null;
  const prevPct = Object.fromEntries(Object.values(inp.teams).map((t) => [t.id, t.prevPct]));
  const R = rng(seedOf(`${inp.season}-${nbaToday()}-cup`));
  const acc = {};
  for (const g of groups) for (const id of g.ids) acc[id] = { group: 0, qf: 0, sf: 0, final: 0, cup: 0 };
  const s = {};
  for (let k = 0; k < n; k++) {
    for (const id of Object.keys(acc)) s[id] = inp.teams[id].strength + levelSd(inp.teams[id].gp) * R.normal();
    const winners = { E: [], W: [] }, seconds = { E: [], W: [] };
    for (const g of groups) {
      const results = g.games.map((m) => {
        if (m.done) return m;
        const margin = s[m.home] - s[m.away] + HOME_COURT + MARGIN_SD * R.normal();
        const pts = 112 + 6 * R.normal();
        let hs = Math.round(pts + margin / 2), as = Math.round(pts - margin / 2);
        if (hs === as) { if (margin >= 0) hs++; else as++; }
        return { home: m.home, away: m.away, hs, as, ot: false };
      });
      const t = rankGroup(g.ids, results, prevPct);
      winners[g.conf].push(t[0]); seconds[g.conf].push(t[1]);
      acc[t[0].id].group++;
    }
    const finalists = [];
    for (const conf of ["E", "W"]) {
      const wc = [...seconds[conf]].sort(better)[0];
      const seeds = [...winners[conf]].sort(better).concat(wc);
      for (const x of seeds) acc[x.id].qf++;
      const q1 = one(seeds[0].id, seeds[3].id, s, R), q2 = one(seeds[1].id, seeds[2].id, s, R);
      acc[q1].sf++; acc[q2].sf++;
      const order = seeds.map((x) => x.id);
      const sf = order.indexOf(q1) < order.indexOf(q2) ? one(q1, q2, s, R) : one(q2, q1, s, R);
      acc[sf].final++;
      finalists.push(sf);
    }
    acc[one(finalists[0], finalists[1], s, R, true)].cup++;
  }
  const odds = {};
  for (const id of Object.keys(acc)) odds[id] = { group: acc[id].group / n, qf: acc[id].qf / n, sf: acc[id].sf / n, final: acc[id].final / n, cup: acc[id].cup / n };
  return { groups: groups.map(({ games, ...g }) => ({ ...g, next: games.filter((m) => !m.done).map((m) => ({ id: m.id, date: m.date, home: m.home, away: m.away })) })), odds };
}

// Résultats mis en cache une heure (le calcul complet prend une fraction de seconde, mais 30 calendriers sont lus).
export const simulateSeason = unstable_cache(async () => {
  const inp = await loadInputs();
  return { at: new Date().toISOString(), season: inp.season, remaining: inp.remaining.length, teams: simulateSeasonRaw(inp) };
}, ["bl-sim-season-v1"], { revalidate: 3600 });

export const simulateCup = unstable_cache(async () => {
  const inp = await loadInputs();
  return { at: new Date().toISOString(), season: inp.season, ...(simulateCupRaw(inp) || { groups: [], odds: {} }) };
}, ["bl-sim-cup-v3"], { revalidate: 3600 });

// ---------------------------------------------------------------- EuroLeague
// Saison régulière (38 journées), top 6 en playoffs, 7 à 10 au play-in, playoffs au meilleur des 5 (terrain au mieux
// classé, 2-2-1), puis Final Four sur terrain neutre (demies et finale sur un match).
export function simulateELRaw(ctx, n = 5000) {
  const { HOME_COURT: H, MARGIN_SD: SD, PRIOR_GAMES: PG } = EL_MODEL;
  const ids = Object.keys(ctx.cur);
  if (ids.length < 12) return null;
  const base = {};
  for (const id of ids) {
    const c = ctx.cur[id];
    base[id] = { wins: c.wins || 0, losses: c.losses || 0, gp: c.gp || 0, diff: c.diff || 0, s: elStrength(ctx.cur, ctx.prev, id) };
  }
  const rs = ctx.games.filter((g) => !g.phase || /^RS$/i.test(g.phase));
  const remaining = rs.filter((g) => !g.played && base[g.home.id] && base[g.away.id]).map((g) => [g.home.id, g.away.id]);
  const R = rng(seedOf(`${ctx.season}-${nbaToday()}-el`));
  const acc = {};
  for (const id of ids) acc[id] = { wins: 0, top4: 0, top6: 0, playIn: 0, playoffs: 0, f4: 0, final: 0, title: 0, first: 0 };
  const s = {}, w = {};
  const lvl = (gp) => 1.8 + 2.2 * Math.sqrt(PG / (gp + PG));
  const game = (h, a, neutral) => (s[h] - s[a] + (neutral ? 0 : H) + SD * R.normal() > 0 ? h : a);
  const bo5 = (hi, lo) => {
    let a = 0, b = 0;
    const homeHi = [1, 1, 0, 0, 1];
    for (let g = 0; a < 3 && b < 3; g++) { if (game(homeHi[g] ? hi : lo, homeHi[g] ? lo : hi) === hi) a++; else b++; }
    return a === 3 ? hi : lo;
  };
  for (let k = 0; k < n; k++) {
    for (const id of ids) { s[id] = base[id].s + lvl(base[id].gp) * R.normal(); w[id] = base[id].wins; }
    for (const [h, a] of remaining) w[game(h, a)]++;
    const order = ids.map((id) => [id, w[id] + R.next() * 0.5]).sort((x, y) => y[1] - x[1]).map((x) => x[0]);
    order.forEach((id, i) => { if (i < 4) acc[id].top4++; if (i < 6) acc[id].top6++; else if (i < 10) acc[id].playIn++; });
    acc[order[0]].first++;
    const w78 = game(order[6], order[7]);
    const l78 = w78 === order[6] ? order[7] : order[6];
    const eighth = game(l78, game(order[8], order[9]));
    const seeds = [...order.slice(0, 6), w78, eighth];
    for (const id of seeds) acc[id].playoffs++;
    const f4 = [bo5(seeds[0], seeds[7]), bo5(seeds[3], seeds[4]), bo5(seeds[1], seeds[6]), bo5(seeds[2], seeds[5])];
    for (const id of f4) acc[id].f4++;
    const fa = game(f4[0], f4[1], true), fb = game(f4[2], f4[3], true);
    acc[fa].final++; acc[fb].final++;
    acc[game(fa, fb, true)].title++;
    for (const id of ids) acc[id].wins += w[id];
  }
  const out = {};
  for (const id of ids) {
    const a = acc[id];
    out[id] = { id, record: [base[id].wins, base[id].losses], projWins: a.wins / n, top4: a.top4 / n, top6: a.top6 / n, playIn: a.playIn / n, playoffs: a.playoffs / n, f4: a.f4 / n, final: a.final / n, title: a.title / n, first: a.first / n };
  }
  return { remaining: remaining.length, teams: out };
}

export const simulateEL = unstable_cache(async () => {
  const ctx = await elContext();
  const r = simulateELRaw(ctx);
  const clubs = Object.fromEntries(Object.values(ctx.cur).map((c) => [c.id, { id: c.id, name: c.name, short: c.short, abbr: c.abbr, logo: c.logo }]));
  return { at: new Date().toISOString(), season: ctx.season, ...(r || { remaining: 0, teams: {} }), clubs };
}, ["bl-sim-el-v1"], { revalidate: 3600 });
