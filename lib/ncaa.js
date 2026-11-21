// Données NCAA (basket universitaire américain, 1re division) depuis ESPN, et état du modèle (notes, bilan public).
// Un jour passé ne change plus : gardé 7 jours ; aujourd'hui et demain : 5 minutes. Une erreur n'est jamais gardée.
import { unstable_cache } from "next/cache";
import { nbaToday, shiftDate } from "./espn";
import { ncaaRatings, ncaaRecord, ncaaRecords, ncaaProb } from "./ncaa-model";
import PRIOR from "./ncaa-prior.json";

const B = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";
export const NCAA_SEASON_START = "20261102"; // premier jour de la saison 2026-27
const UA = { "User-Agent": "Mozilla/5.0 Basketlog/0.1" };

const team = (c) => ({
  id: String(c.team?.id || ""),
  name: c.team?.displayName || c.team?.shortDisplayName || "",
  short: c.team?.shortDisplayName || c.team?.location || c.team?.displayName || "",
  abbr: c.team?.abbreviation || "",
  logo: c.team?.logo || null,
  rank: c.curatedRank?.current && c.curatedRank.current <= 25 ? c.curatedRank.current : null,
});

async function rawDay(d) {
  const res = await fetch(`${B}/scoreboard?dates=${d}&groups=50&limit=500`, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ESPN NCAA ${res.status}`);
  const j = await res.json();
  if (!Array.isArray(j?.events)) throw new Error("ESPN NCAA : réponse vide");
  return j.events.map((e) => {
    const c = e.competitions?.[0] || {};
    const h = (c.competitors || []).find((x) => x.homeAway === "home"), a = (c.competitors || []).find((x) => x.homeAway === "away");
    if (!h || !a) return null;
    return {
      id: String(e.id), d, date: e.date, state: c.status?.type?.state || "pre", n: !!c.neutralSite,
      home: team(h), away: team(a), hs: h.score != null ? Number(h.score) : null, as: a.score != null ? Number(a.score) : null,
      tv: (c.broadcasts || []).flatMap((b) => b.names || []).slice(0, 2).join(", ") || null,
      note: c.notes?.[0]?.headline || null,
    };
  }).filter(Boolean);
}
const dayPast = unstable_cache(rawDay, ["ncaa-day-v1"], { revalidate: 7 * 86400 });
const dayLive = unstable_cache(rawDay, ["ncaa-day-live-v1"], { revalidate: 300 });
export const ncaaDay = (d) => (d < shiftDate(nbaToday(), -1) ? dayPast(d) : dayLive(d));

// Équipes de 1re division (ids), d'après le classement par conférence.
const d1Ids = unstable_cache(async () => {
  const res = await fetch("https://site.api.espn.com/apis/v2/sports/basketball/mens-college-basketball/standings", { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ESPN NCAA classement ${res.status}`);
  const out = [];
  const walk = (n) => { for (const e of n?.standings?.entries || []) out.push(String(e.team.id)); for (const c of n?.children || []) walk(c); };
  walk(await res.json());
  if (out.length < 300) throw new Error("ESPN NCAA classement incomplet");
  return out;
}, ["ncaa-d1-v1"], { revalidate: 86400 });

async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } }));
  return out;
}

// Notes du jour (résultats jusqu'à hier), bilan public et fiche de chaque équipe. Recalculé chaque heure.
export const ncaaState = unstable_cache(async () => {
  const today = nbaToday();
  const days = [];
  for (let d = NCAA_SEASON_START; d < today; d = shiftDate(d, 1)) days.push(d);
  const [ids, perDay] = await Promise.all([d1Ids(), pool(days, 8, (d) => ncaaDay(d))]);
  const d1 = new Set(ids);
  const byDay = days.map((d, i) => ({ d, games: (perDay[i] || []).filter((g) => g.state === "post" && g.hs != null && g.as != null && g.hs !== g.as).map((g) => ({ h: g.home.id, a: g.away.id, hs: g.hs, as: g.as, n: g.n })) }));
  const games = byDay.flatMap((x) => x.games);
  const ratings = ncaaRatings(games, d1, PRIOR);
  const meta = {};
  for (const l of perDay) for (const g of l || []) for (const t of [g.home, g.away]) if (d1.has(t.id)) meta[t.id] = { ...t }; // jours dans l'ordre : le dernier classement AP connu l'emporte
  return { at: new Date().toISOString(), ratings, record: ncaaRecord(byDay, d1, PRIOR), records: ncaaRecords(games.filter((g) => d1.has(g.h) || d1.has(g.a))), meta, d1: ids, nGames: games.length };
}, ["ncaa-state-v1"], { revalidate: 3600 });

// Matchs d'un jour (aujourd'hui par défaut) avec la probabilité du modèle pour chaque match entre équipes de 1re division.
export async function ncaaGames(d = nbaToday()) {
  const [st, list] = await Promise.all([ncaaState(), ncaaDay(d)]);
  const d1 = new Set(st.d1);
  return {
    st,
    games: list
      .filter((g) => d1.has(g.home.id) && d1.has(g.away.id))
      .map((g) => { const { pHome, margin } = ncaaProb(st.ratings, g.home.id, g.away.id, g.n); return { ...g, pHome, margin }; })
      .sort((x, y) => new Date(x.date) - new Date(y.date)),
  };
}
