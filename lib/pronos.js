// Pronostics publiés : chaque pronostic est enregistré tel qu'affiché avant le coup d'envoi (absences comprises),
// la dernière version d'avant-match fait foi, puis il est comparé au score final. C'est le bilan « réel » du site,
// à côté du bilan recalculé après coup (lib/history.js). Stockage : Supabase, via des fonctions protégées par la clé serveur.
import { after } from "next/server";
import { dbRpc, rolesConfigured } from "./roles";
import { nbaDateOf } from "./espn";

export const TRACK_START = "2026-10-31"; // début du suivi
const team = (t = {}) => ({ id: String(t.id ?? ""), abbr: t.abbr || t.code || String(t.id ?? ""), name: t.name || "", short: t.short || t.name || "", logo: t.logo || null });
const gameId = (a) => String(a.game.id).replace(/^el-/, "");

function rowOf(league, a) {
  const g = a.game;
  return {
    league, game_id: gameId(a), d: nbaDateOf(g.date), game_date: g.date,
    home: team(g.home), away: team(g.away),
    p_home: Math.round(a.pHome * 10000) / 10000,
    pred_home: Math.round(a.homePts), pred_away: Math.round(a.awayPts),
    conf: a.confidence || null,
  };
}

const upcoming = (a, now = Date.now()) => a?.game && a.game.state === "pre" && !a.game.hypothetical && !a.game.postponed && a.game.date && new Date(a.game.date).getTime() > now;

// Enregistre (ou met à jour) les pronostics des matchs pas encore commencés. Renvoie le nombre de lignes envoyées.
export async function recordPronos(league, analyses) {
  if (!rolesConfigured()) return 0;
  const rows = (analyses || []).filter((a) => upcoming(a)).map((a) => rowOf(league, a));
  let n = 0;
  for (let i = 0; i < rows.length; i += 40) n += Number(await dbRpc("basketlog_prono_save", { p_rows: rows.slice(i, i + 40) }, 8000)) || 0;
  return n;
}

// Scores finaux des matchs terminés (league, game_id, home_score, away_score).
export async function recordFinals(rows) {
  if (!rolesConfigured() || !rows?.length) return 0;
  let n = 0;
  for (let i = 0; i < rows.length; i += 80) n += Number(await dbRpc("basketlog_prono_final", { p_rows: rows.slice(i, i + 80) }, 8000)) || 0;
  return n;
}

// Depuis les pages : au plus une écriture toutes les 10 minutes par match et par instance, après la réponse.
const seen = new Map();
export function recordPronosSoon(league, analyses) {
  try {
    if (!rolesConfigured()) return;
    const now = Date.now();
    const fresh = (analyses || []).filter((a) => {
      if (!upcoming(a, now)) return false;
      const k = `${league}:${gameId(a)}`;
      if (now - (seen.get(k) || 0) < 10 * 60e3) return false;
      seen.set(k, now);
      return true;
    });
    if (seen.size > 2000) seen.clear();
    if (fresh.length) after(() => recordPronos(league, fresh).catch(() => {}));
  } catch {
    // jamais bloquant pour la page
  }
}

// Lignes de la base -> même forme que les pronostics du bilan recalculé (lib/history.js).
export function toPick(r) {
  const hs = r.home_score, as = r.away_score, ph = Number(r.p_home);
  const done = hs != null && as != null && hs !== as;
  return {
    id: r.game_id, league: r.league, d: r.d, date: r.game_date,
    home: { ...r.home, score: hs }, away: { ...r.away, score: as },
    pHome: ph, pred: [r.pred_home, r.pred_away], conf: r.conf,
    ok: done ? (ph >= 0.5) === (hs > as) : null, done, updates: r.updates, lastAt: r.last_at,
  };
}

// Pronostics publiés : { graded, pending } ou null si la base ne répond pas.
export async function publishedPicks(sinceIso = `${TRACK_START}T00:00:00Z`) {
  if (!rolesConfigured()) return null;
  try {
    const rows = await dbRpc("basketlog_prono_list", { p_since: sinceIso }, 5000);
    const picks = (Array.isArray(rows) ? rows : []).map(toPick);
    return { graded: picks.filter((p) => p.done), pending: picks.filter((p) => !p.done) };
  } catch {
    return null;
  }
}
