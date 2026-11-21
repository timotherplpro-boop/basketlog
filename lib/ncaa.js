// Données NCAA (basket universitaire américain, 1re division) depuis ESPN, et état du modèle (notes, bilan public).
// Un jour passé ne change plus : gardé 7 jours ; aujourd'hui et demain : 5 minutes. Une erreur n'est jamais gardée.
// lg : "m" (hommes, par défaut) ou "w" (femmes). Pour les hommes, les fonctions en cache sont appelées sans argument de
// compétition : même clé de cache qu'avant l'ajout du basket féminin.
import { unstable_cache } from "next/cache";
import { nbaToday, shiftDate } from "./espn";
import { getPath } from "./lang-server";
import { ncaaRatings, ncaaRecord, ncaaRecords, ncaaProb, ncaaSlug, parseNcaaSlug, LEAGUES } from "./ncaa-model";
import PRIOR from "./ncaa-prior.json";
import PRIOR_W from "./ncaaw-prior.json";

const B = (lg) => `https://site.api.espn.com/apis/site/v2/sports/basketball/${LEAGUES[lg === "w" ? "w" : "m"].espn}`;
const ax = (lg) => (lg === "w" ? ["w"] : []); // argument de cache selon la compétition
const PRIORS = { m: PRIOR, w: PRIOR_W };

// Compétition de la page demandée : /ncaaw/… et /app/ncaaw… = femmes.
export async function ncaaLg() {
  const p = (await getPath()).replace(/^\/(en|es|pt)(?=\/|$|\?)/, "");
  return /^\/(app\/)?ncaaw(\/|$|\?)/.test(p) ? "w" : "m";
}
export const NCAA_SEASON_START = "20261102"; // premier jour de la saison 2026-27
const UA = { "User-Agent": "Mozilla/5.0 Basketlog/0.1" };

const team = (c) => ({
  id: String(c.team?.id || ""),
  name: c.team?.displayName || c.team?.shortDisplayName || "",
  short: c.team?.shortDisplayName || c.team?.location || c.team?.displayName || "",
  loc: c.team?.location || c.team?.shortDisplayName || "",
  abbr: c.team?.abbreviation || "",
  logo: c.team?.logo || null,
  rank: c.curatedRank?.current && c.curatedRank.current <= 25 ? c.curatedRank.current : null,
});

async function rawDay(d, lg = "m") {
  const res = await fetch(`${B(lg)}/scoreboard?dates=${d}&groups=50&limit=500`, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10000) });
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
const dayPast = unstable_cache(rawDay, ["ncaa-day-v2"], { revalidate: 7 * 86400 });
const dayLive = unstable_cache(rawDay, ["ncaa-day-live-v2"], { revalidate: 300 });
export const ncaaDay = (d, lg = "m") => (d < shiftDate(nbaToday(), -1) ? dayPast(d, ...ax(lg)) : dayLive(d, ...ax(lg)));

// Équipes de 1re division (ids), d'après le classement par conférence.
const d1Ids = unstable_cache(async (lg = "m") => {
  const res = await fetch(`https://site.api.espn.com/apis/v2/sports/basketball/${LEAGUES[lg].espn}/standings`, { cache: "no-store", headers: UA, signal: AbortSignal.timeout(10000) });
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
export const ncaaState = unstable_cache(async (lg = "m") => {
  const today = nbaToday();
  const days = [];
  for (let d = NCAA_SEASON_START; d < today; d = shiftDate(d, 1)) days.push(d);
  const [ids, perDay] = await Promise.all([d1Ids(...ax(lg)), pool(days, 8, (d) => ncaaDay(d, lg))]);
  const d1 = new Set(ids);
  const byDay = days.map((d, i) => ({ d, games: (perDay[i] || []).filter((g) => g.state === "post" && g.hs != null && g.as != null && g.hs !== g.as).map((g) => ({ d, h: g.home.id, a: g.away.id, hs: g.hs, as: g.as, n: g.n })) }));
  const games = byDay.flatMap((x) => x.games);
  const ratings = ncaaRatings(games, d1, PRIORS[lg]);
  const meta = {};
  for (const l of perDay) for (const g of l || []) for (const t of [g.home, g.away]) meta[t.id] = { ...t, slug: d1.has(t.id) ? ncaaSlug(t) : null }; // jours dans l'ordre : le dernier classement AP connu l'emporte ; hors 1re division : nom seulement
  return { at: new Date().toISOString(), ratings, record: ncaaRecord(byDay, d1, PRIORS[lg]), records: ncaaRecords(games.filter((g) => d1.has(g.h) || d1.has(g.a))), meta, d1: ids, nGames: games.length, games };
}, ["ncaa-state-v3"], { revalidate: 3600 });

// État du modèle d'une compétition (même cache que ncaaState() pour les hommes).
export const ncaaStateOf = (lg = "m") => ncaaState(...ax(lg));

// Matchs d'un jour (aujourd'hui par défaut) avec la probabilité du modèle pour chaque match entre équipes de 1re division.
export async function ncaaGames(d = nbaToday(), lg = "m") {
  const [st, list] = await Promise.all([ncaaState(...ax(lg)), ncaaDay(d, lg)]);
  const d1 = new Set(st.d1);
  return {
    st,
    games: list
      .filter((g) => d1.has(g.home.id) && d1.has(g.away.id))
      .map((g) => withProb(st, g, lg))
      .sort((x, y) => new Date(x.date) - new Date(y.date)),
  };
}

function withProb(st, g, lg = "m") { const { pHome, margin } = ncaaProb(st.ratings, g.home.id, g.away.id, g.n, LEAGUES[lg].P); return { ...g, pHome, margin }; }

// Fiche d'un match (/ncaa/michigan-state-vs-duke-2026-11-21) : le match du jour indiqué dont les deux écoles correspondent.
export async function ncaaGameBySlug(slug, lg = "m") {
  const s = parseNcaaSlug(slug);
  if (!s) return null;
  const [st, list] = await Promise.all([ncaaState(...ax(lg)), ncaaDay(s.date, lg)]);
  const d1 = new Set(st.d1);
  const g = list.find((x) => ncaaSlug(x.away) === s.away && ncaaSlug(x.home) === s.home);
  if (!g || !d1.has(g.home.id) || !d1.has(g.away.id)) return null;
  return { st, g: withProb(st, g, lg) };
}

// Fiche d'une équipe (/ncaa/team/duke) : note, rang, bilan, résultats de la saison et matchs des 7 prochains jours.
export async function ncaaTeamBySlug(slug, lg = "m") {
  const st = await ncaaState(...ax(lg));
  const t = Object.values(st.meta).find((x) => x.slug === slug);
  if (!t) return null;
  const rank = st.d1.filter((id) => st.ratings[id] > st.ratings[t.id]).length + 1;
  const past = st.games.filter((g) => g.h === t.id || g.a === t.id).map((g) => ({ ...g, home: st.meta[g.h] || { id: g.h, short: "–", name: "–" }, away: st.meta[g.a] || { id: g.a, short: "–", name: "–" } }));
  const today = nbaToday();
  const days = Array.from({ length: 8 }, (_, i) => shiftDate(today, i));
  const lists = await Promise.all(days.map((d) => ncaaDay(d, lg).catch(() => [])));
  const d1 = new Set(st.d1);
  const upcoming = lists.flat().filter((g) => g.state !== "post" && (g.home.id === t.id || g.away.id === t.id) && d1.has(g.home.id) && d1.has(g.away.id)).map((g) => withProb(st, g, lg));
  return { st, t, rank, rating: st.ratings[t.id], rec: st.records[t.id] || { w: 0, l: 0 }, past, upcoming };
}
