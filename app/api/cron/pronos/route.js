import { NextResponse } from "next/server";
import { analyzeDay } from "../../../../lib/data";
import { nbaToday, shiftDate } from "../../../../lib/espn";
import { elContext, elAnalyze } from "../../../../lib/euroleague";
import { recordPronos, recordFinals } from "../../../../lib/pronos";
import { COOKIE, currentSession } from "../../../../lib/pro";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Lancé deux fois par jour par Vercel (avant les matchs EuroLeague, puis avant les matchs NBA) : enregistre le
// pronostic d'avant-match de chaque match à venir et le score final des matchs terminés (bilan réel).
// Rien n'est lu dans la requête : tout est recalculé côté serveur à partir des sources (ESPN, EuroLeague), donc un appel
// ne peut rien fausser. Accès : tâche planifiée de Vercel (avec CRON_SECRET s'il est défini) ou compte admin connecté,
// au plus une exécution par minute.
let lastRun = 0;
async function allowed(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return true;
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  return session?.role === "admin";
}

export async function GET(req) {
  if (!(await allowed(req))) return NextResponse.json({ error: "interdit" }, { status: 401 });
  if (Date.now() - lastRun < 60e3) return NextResponse.json({ ok: true, skipped: "déjà lancé il y a moins d'une minute" });
  lastRun = Date.now();
  const out = { saved: 0, finals: 0, errors: [] };
  const today = nbaToday();
  try {
    const [yday, d0, d1] = await Promise.all([-1, 0, 1].map((k) => analyzeDay(shiftDate(today, k))));
    out.saved += await recordPronos("NBA", [...d0.analyses, ...d1.analyses]);
    const fin = [...yday.analyses, ...d0.analyses]
      .filter((a) => a.game.state === "post" && !a.game.postponed && a.game.home.score != null && a.game.away.score != null)
      .map((a) => ({ league: "NBA", game_id: String(a.game.id), home_score: a.game.home.score, away_score: a.game.away.score }));
    out.finals += await recordFinals(fin);
  } catch (e) {
    out.errors.push(`NBA : ${e.message}`);
  }
  try {
    const ctx = await elContext();
    const now = Date.now();
    const pre = ctx.games
      .filter((g) => !g.played && !g.live && new Date(g.date).getTime() > now && new Date(g.date).getTime() < now + 3 * 864e5)
      .map((g) => elAnalyze(g, ctx.cur, ctx.prev));
    out.saved += await recordPronos("EL", pre);
    const fin = ctx.games
      .filter((g) => g.played && g.home.score != null && g.away.score != null && now - new Date(g.date).getTime() < 5 * 864e5)
      .map((g) => ({ league: "EL", game_id: String(g.id), home_score: g.home.score, away_score: g.away.score }));
    out.finals += await recordFinals(fin);
  } catch (e) {
    out.errors.push(`EuroLeague : ${e.message}`);
  }
  return NextResponse.json({ ok: !out.errors.length, ...out, at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
