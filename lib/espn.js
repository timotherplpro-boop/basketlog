// Récupération des données NBA publiques (ESPN), côté serveur uniquement.
import { unstable_cache } from "next/cache";
const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const STANDINGS = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";

async function getJSON(url, revalidate = 600) {
  try {
    const res = await fetch(url, {
      next: { revalidate },
      headers: { "User-Agent": "Mozilla/5.0 Basketlog/0.1" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Date "NBA" = date à New York (les matchs sont programmés en heure de l'Est).
export function nbaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts.replaceAll("-", ""); // YYYYMMDD
}

export function shiftDate(yyyymmdd, days) {
  const y = +yyyymmdd.slice(0, 4), m = +yyyymmdd.slice(4, 6) - 1, d = +yyyymmdd.slice(6, 8);
  const dt = new Date(Date.UTC(y, m, d + days));
  return dt.toISOString().slice(0, 10).replaceAll("-", "");
}

// Date NBA (YYYYMMDD, heure de New York) d'un match à partir de son horaire ISO.
export function nbaDateOf(iso) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(iso))
    .replaceAll("-", "");
}

// Plusieurs jours : la source n'accepte pas les plages, on interroge chaque jour en parallèle.
export async function getScoreboardRange(from, to) {
  const days = [];
  for (let d = from, i = 0; d <= to && i < 40; d = shiftDate(d, 1), i++) days.push(d);
  const lists = await Promise.all(days.map((d) => getScoreboard(d)));
  const seen = new Set();
  return lists.flat().filter((g) => (seen.has(g.id) ? false : seen.add(g.id)));
}

// Date « AAAAMMJJ » réelle, entre le début de la saison précédente et dans 60 jours (au-delà : rien à afficher,
// et on évite de faire recalculer une saison entière pour une date fantaisiste).
export function isValidDate(s) {
  if (typeof s !== "string" || !/^\d{8}$/.test(s)) return false;
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return false;
  const today = nbaToday();
  const end = `${seasonForDate(today)}0630`, soon = shiftDate(today, 60);
  return s >= `${seasonForDate(today) - 2}1001` && s <= (end > soon ? end : soon);
}

function parseTeam(c, noScore = false) {
  const t = c.team || {};
  const rec = (c.records || []).find((r) => r.type === "total" || r.name === "overall") || (c.records || [])[0];
  return {
    id: String(t.id),
    name: t.displayName || t.name || "?",
    short: t.shortDisplayName || t.name || "?",
    abbr: t.abbreviation || "?",
    logo: t.logo || (t.logos && t.logos[0] && t.logos[0].href) || null,
    color: t.color ? `#${t.color}` : "#ff6b1a",
    record: rec ? rec.summary : null,
    score: !noScore && c.score != null ? Number(c.score) : null,
    winner: !noScore && !!c.winner,
  };
}

function parseEvent(ev) {
  const comp = (ev.competitions || [])[0] || {};
  const comps = comp.competitors || [];
  const homeC = comps.find((c) => c.homeAway === "home") || comps[0];
  const awayC = comps.find((c) => c.homeAway === "away") || comps[1];
  if (!homeC || !awayC) return null;
  const st = (ev.status || comp.status || {}).type || {};
  // Reporté ou annulé : ESPN le classe « post » sans l'avoir terminé (score 0-0) ; on le signale, sans score.
  const off = st.state === "post" && st.completed === false ? (/CANCEL/i.test(st.name || "") ? "canceled" : "postponed") : null;
  return {
    id: String(ev.id),
    date: ev.date,
    name: ev.name,
    venue: comp.venue ? comp.venue.fullName : null,
    city: comp.venue && comp.venue.address ? comp.venue.address.city : null,
    state: st.state || "pre", // pre | in | post
    postponed: off, // null | "postponed" | "canceled"
    statusText: st.shortDetail || st.detail || "",
    home: parseTeam(homeC, !!off),
    away: parseTeam(awayC, !!off),
    broadcast: (comp.broadcasts || []).flatMap((b) => b.names || []).join(", ") || null,
  };
}

// Le tableau d'un jour est-il joignable ? Sert à distinguer « match introuvable » (404) d'une panne d'ESPN.
export async function scoreboardReachable(date) {
  return (await getJSON(`${BASE}/scoreboard?dates=${date}`, 120)) != null;
}

export async function getScoreboard(date) {
  const data = await getJSON(`${BASE}/scoreboard?dates=${date}`, 120);
  if (!data || !Array.isArray(data.events)) return [];
  return data.events.map(parseEvent).filter(Boolean);
}

// Classements -> stats par équipe (moyennes points pour/contre, bilan, domicile/extérieur, 10 derniers).
function statVal(stats, ...names) {
  for (const n of names) {
    const s = stats.find((x) => x.name === n || x.type === n);
    if (s) return s.value != null ? Number(s.value) : null;
  }
  return null;
}
function statSummary(stats, ...names) {
  for (const n of names) {
    const s = stats.find((x) => x.name === n || x.type === n);
    if (s && s.summary) return s.summary;
    if (s && s.displayValue) return s.displayValue;
  }
  return null;
}

function collectEntries(node, out) {
  if (!node) return out;
  if (node.standings && Array.isArray(node.standings.entries)) out.push(...node.standings.entries);
  if (Array.isArray(node.children)) node.children.forEach((c) => collectEntries(c, out));
  return out;
}

export async function getStandings(season) {
  const url = season ? `${STANDINGS}?season=${season}` : STANDINGS;
  const data = await getJSON(url, 3600);
  const entries = collectEntries(data, []);
  const map = {};
  for (const e of entries) {
    const id = String(e.team && e.team.id);
    const s = e.stats || [];
    const wins = statVal(s, "wins") || 0;
    const losses = statVal(s, "losses") || 0;
    const ppg = statVal(s, "avgPointsFor");
    const oppg = statVal(s, "avgPointsAgainst");
    map[id] = {
      wins,
      losses,
      gp: wins + losses,
      ppg,
      oppg,
      diff: ppg != null && oppg != null ? ppg - oppg : statVal(s, "differential"),
      streak: statSummary(s, "streak"),
      home: statSummary(s, "home", "Home"),
      road: statSummary(s, "road", "Road", "away"),
      last10: statSummary(s, "lasttengames", "Last Ten Games", "L10"),
      seed: statVal(s, "playoffSeed"),
    };
  }
  return map;
}

// Blessures : structure ESPN variable, on parse de façon défensive.
export async function getInjuries() {
  const data = await getJSON(`${BASE}/injuries`, 900);
  const out = {};
  const groups = (data && (data.injuries || data.teams)) || [];
  for (const g of groups) {
    const teamId = String(g.id || (g.team && g.team.id) || "");
    const list = g.injuries || [];
    out[teamId] = list
      .map((i) => ({
        id: ((i.athlete?.links || []).map((l) => (String(l.href || "").match(/\/id\/(\d+)/) || [])[1]).find(Boolean)) || null,
        player: (i.athlete && (i.athlete.displayName || i.athlete.shortName)) || "Joueur",
        pos: i.athlete && i.athlete.position ? i.athlete.position.abbreviation : "",
        status: i.status || (i.type && i.type.description) || "",
        detail: i.shortComment || (i.details && i.details.type) || "",
      }))
      .slice(0, 12);
  }
  return out;
}

// Stats de tous les joueurs NBA d'une saison (points, minutes, rebonds, passes), en une requête.
// Sert à peser les absences (une star absente compte plus qu'un remplaçant) et à choisir les joueurs à suivre.
// La réponse brute est lourde : on garde seulement le tableau compact, 6 h. Une erreur n'est jamais gardée.
const playerStatsCached = unstable_cache(async (season) => {
  const res = await fetch(`https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete?region=us&lang=en&contentorigin=espn&isqualified=false&page=1&limit=1000&sort=offensive.avgPoints%3Adesc&season=${season}&seasontype=2`, {
    headers: { "User-Agent": "Mozilla/5.0 Basketlog/0.1" },
    signal: AbortSignal.timeout(10000), // réponse brute de plusieurs Mo
  });
  if (!res.ok) throw new Error(`ESPN joueurs ${res.status}`);
  const j = await res.json();
  if (!Array.isArray(j?.athletes)) throw new Error("ESPN joueurs : réponse vide");
  const idx = {};
  for (const c of j.categories || []) idx[c.name] = c.names || c.labels || [];
  const val = (a, cat, name) => {
    const i = (idx[cat] || []).indexOf(name);
    const c = (a.categories || []).find((x) => x.name === cat);
    const v = i >= 0 && c ? Number((c.totals || c.values || [])[i]) : NaN;
    return Number.isFinite(v) ? v : null;
  };
  const out = {};
  for (const a of j.athletes) {
    const p = a.athlete || {};
    if (!p.id) continue;
    out[String(p.id)] = {
      id: String(p.id),
      name: p.displayName || p.shortName || "",
      team: p.teamId != null ? String(p.teamId) : null,
      pos: p.position?.abbreviation || "",
      jersey: p.jersey || "",
      head: p.headshot?.href || null,
      gp: val(a, "general", "gamesPlayed") || 0,
      mpg: val(a, "general", "avgMinutes"),
      reb: val(a, "general", "avgRebounds"),
      ppg: val(a, "offensive", "avgPoints"),
      ast: val(a, "offensive", "avgAssists"),
    };
  }
  return out;
}, ["nba-joueurs-v1"], { revalidate: 21600 });

const playerStatsDown = new Map(); // saison -> instant de la dernière panne
export async function getPlayerStats(season) {
  if (Date.now() - (playerStatsDown.get(season) || 0) < 5 * 60e3) return {};
  try {
    return await playerStatsCached(season);
  } catch (e) {
    playerStatsDown.set(season, Date.now());
    console.warn(`[joueurs] stats indisponibles (${e.message})`);
    return {};
  }
}

// Saison ESPN = année de fin (2026-27 -> 2027).
export function seasonForDate(yyyymmdd) {
  const y = +yyyymmdd.slice(0, 4), m = +yyyymmdd.slice(4, 6);
  return m >= 8 ? y + 1 : y;
}

export async function getEventSummaryBasic(id, date) {
  // On retrouve le match via le scoreboard du jour (plus fiable que l'endpoint summary).
  const list = await getScoreboard(date);
  return list.find((g) => g.id === String(id)) || null;
}

// ---------- Données détaillées (fiche match, page équipe) ----------
const num = (v) => (v == null || v === "" || isNaN(Number(v)) ? null : Number(v));
const teamLogo = (t) => t?.logo || t?.logos?.[0]?.href || null;

// Résumé d'un match : joueurs clés, forme récente, confrontations, prédiction ESPN.
export async function getSummary(eventId) {
  const s = await getJSON(`${BASE}/summary?event=${eventId}`, 900);
  if (!s) return null;
  const leaders = {};
  for (const t of s.leaders || []) {
    const id = String(t.team?.id);
    leaders[id] = (t.leaders || [])
      .map((c) => {
        const top = (c.leaders || [])[0];
        if (!top || !top.athlete) return null;
        return {
          cat: c.displayName || c.name,
          value: top.displayValue,
          name: top.athlete.displayName,
          pos: top.athlete.position?.abbreviation || "",
          jersey: top.athlete.jersey || "",
          head: top.athlete.headshot?.href || null,
        };
      })
      .filter(Boolean)
      .slice(0, 3);
  }
  const form = {};
  for (const t of s.lastFiveGames || []) {
    form[String(t.team?.id)] = (t.events || []).slice(0, 5).map((e) => ({
      date: e.gameDate,
      opp: e.opponent?.abbreviation || "",
      oppLogo: e.opponentLogo || null,
      res: e.gameResult || "",
      score: e.score || "",
      ha: e.atVs || "",
    }));
  }
  const ss = (s.seasonseries || [])[0];
  const series = ss
    ? {
        summary: ss.summary || "",
        score: ss.seriesScore || "",
        total: ss.totalCompetitions || null,
        games: (ss.events || []).map((e) => {
          const cs = e.competitors || [];
          const h = cs.find((c) => c.homeAway === "home") || cs[0] || {};
          const a = cs.find((c) => c.homeAway === "away") || cs[1] || {};
          return {
            id: String(e.id),
            date: e.date,
            state: e.statusType?.completed === false && (e.statusType?.state || e.status) === "post" ? "postponed" : e.statusType?.state || e.status || "pre",
            home: { id: String(h.team?.id), abbr: h.team?.abbreviation, logo: teamLogo(h.team), score: num(h.score?.value ?? h.score), winner: !!h.winner },
            away: { id: String(a.team?.id), abbr: a.team?.abbreviation, logo: teamLogo(a.team), score: num(a.score?.value ?? a.score), winner: !!a.winner },
          };
        }),
      }
    : null;
  const p = s.predictor;
  const predictor = p && p.homeTeam && num(p.homeTeam.gameProjection) != null
    ? { home: num(p.homeTeam.gameProjection) / 100, away: num(p.awayTeam?.gameProjection) / 100 }
    : null;
  return { leaders, form, series, predictor };
}

// Statistiques moyennes de la saison d'une équipe.
export async function getTeamStats(teamId) {
  const s = await getJSON(`${BASE}/teams/${teamId}/statistics`, 1800);
  const cats = s?.results?.stats?.categories || [];
  const m = {};
  for (const c of cats) for (const x of c.stats || []) if (m[x.name] == null) m[x.name] = num(x.value ?? x.displayValue);
  if (!Object.keys(m).length) return null;
  return {
    gp: m.gamesPlayed,
    ppg: m.avgPoints,
    fgPct: m.fieldGoalPct,
    threePct: m.threePointFieldGoalPct ?? m.threePointPct,
    threeAtt: m.avgThreePointFieldGoalsAttempted,
    threeMade: m.avgThreePointFieldGoalsMade,
    ftPct: m.freeThrowPct,
    reb: m.avgRebounds,
    oreb: m.avgOffensiveRebounds,
    ast: m.avgAssists,
    stl: m.avgSteals,
    blk: m.avgBlocks,
    tov: m.avgTurnovers,
    paint: m.avgPointsInPaint ?? null,
  };
}

// Calendrier et résultats d'une équipe sur la saison.
export async function getTeamSchedule(teamId) {
  const s = await getJSON(`${BASE}/teams/${teamId}/schedule`, 900);
  return (s?.events || [])
    .map((e) => {
      const c = e.competitions?.[0] || {};
      const cs = c.competitors || [];
      const st = c.status?.type || {};
      const off = st.state === "post" && st.completed === false; // reporté ou annulé
      const side = (ha) => {
        const x = cs.find((k) => k.homeAway === ha) || {};
        const t = x.team || {};
        return { id: String(x.id || t.id), abbr: t.abbreviation, name: t.displayName, short: t.shortDisplayName, logo: teamLogo(t), score: off ? null : num(x.score?.value ?? x.score), winner: !off && !!x.winner };
      };
      return { id: String(e.id), date: e.date, state: st.state || "pre", postponed: off, type: e.seasonType?.abbreviation || "", home: side("home"), away: side("away") };
    })
    .filter((g) => g.home.id && g.away.id);
}

// Effectif (photos, postes, numéros).
export async function getRoster(teamId, lang = "fr") {
  const s = await getJSON(`${BASE}/teams/${teamId}/roster`, 3600);
  return (s?.athletes || []).map((a) => ({
    id: String(a.id),
    name: a.displayName,
    pos: a.position?.abbreviation || "",
    jersey: a.jersey || "",
    head: a.headshot?.href || null,
    age: a.age || null,
    height: !a.height ? "" : lang === "en" ? `${Math.floor(a.height / 12)}'${Math.round(a.height % 12)}"` : `${(a.height * 0.0254).toFixed(2).replace(".", ",")} m`,
  }));
}
