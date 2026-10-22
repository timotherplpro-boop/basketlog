// Récupération des données NBA publiques (ESPN), côté serveur uniquement.
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

export function isValidDate(s) {
  return typeof s === "string" && /^\d{8}$/.test(s);
}

function parseTeam(c) {
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
    score: c.score != null ? Number(c.score) : null,
    winner: !!c.winner,
  };
}

function parseEvent(ev) {
  const comp = (ev.competitions || [])[0] || {};
  const comps = comp.competitors || [];
  const homeC = comps.find((c) => c.homeAway === "home") || comps[0];
  const awayC = comps.find((c) => c.homeAway === "away") || comps[1];
  if (!homeC || !awayC) return null;
  const st = (ev.status || comp.status || {}).type || {};
  return {
    id: String(ev.id),
    date: ev.date,
    name: ev.name,
    venue: comp.venue ? comp.venue.fullName : null,
    city: comp.venue && comp.venue.address ? comp.venue.address.city : null,
    state: st.state || "pre", // pre | in | post
    statusText: st.shortDetail || st.detail || "",
    home: parseTeam(homeC),
    away: parseTeam(awayC),
    broadcast: (comp.broadcasts || []).flatMap((b) => b.names || []).join(", ") || null,
  };
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
        player: (i.athlete && (i.athlete.displayName || i.athlete.shortName)) || "Joueur",
        pos: i.athlete && i.athlete.position ? i.athlete.position.abbreviation : "",
        status: i.status || (i.type && i.type.description) || "",
        detail: i.shortComment || (i.details && i.details.type) || "",
      }))
      .slice(0, 8);
  }
  return out;
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
