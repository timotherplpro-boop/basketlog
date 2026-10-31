import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, currentSession, safeNext, usageKey } from "../../../../lib/pro";
import { matchKey, recordAnalysis, tierLimit, tierOf } from "../../../../lib/usage";
import { analyzeDuel } from "../../../../lib/data";

export const dynamic = "force-dynamic";

const str = (v, n = 40) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : null);
const team = (t) => (t && typeof t === "object" ? {
  short: str(t.short), abbr: str(t.abbr, 8),
  logo: typeof t.logo === "string" && /^https:\/\//.test(t.logo) && t.logo.length < 300 ? t.logo : null,
} : null);

// Lance l'analyse complète d'un match : vérifie la limite du jour de la formule et l'enregistre (historique).
// Corps : { league, id, path, info } pour un match, ou { home, away } pour un duel entre deux équipes NBA.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  let league = body.league === "EL" ? "EL" : "NBA";
  let id = str(body.id, 60);
  let path = safeNext(body.path);
  let info = { date: str(body.info?.date, 40), home: team(body.info?.home), away: team(body.info?.away) };

  if (body.home && body.away) {
    const res = await analyzeDuel(str(body.home, 8), str(body.away, 8)).catch(() => null);
    if (!res) return NextResponse.json({ error: "match" }, { status: 400 });
    league = "NBA";
    if (res.fixture) {
      const f = res.fixture;
      id = f.id;
      path = `/app/match/${f.id}?d=${f.d}`;
      info = { date: f.date, home: team(f.home), away: team(f.away) };
    } else {
      const g = res.analysis.game;
      id = g.id;
      path = `/app?home=${g.home.id}&away=${g.away.id}`;
      info = { date: null, home: team(g.home), away: team(g.away) };
    }
  }
  if (!id || !path || !/^\/app(\/|\?|$)/.test(path)) return NextResponse.json({ error: "match" }, { status: 400 });

  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session) return NextResponse.json({ state: "visitor", path });

  const tier = tierOf(session.tier);
  const limit = tierLimit(tier);
  // Compte gratuit : pas d'analyse complète, rien à enregistrer.
  const r = limit === 0 ? { ok: false, used: 0 } : await recordAnalysis(usageKey(session), matchKey(league, id), { ...info, league, path }, limit);
  const out = NextResponse.json({ state: r.ok ? "open" : "limit", used: r.used, limit, path }, { headers: { "Cache-Control": "no-store" } });
  if (refreshed) out.cookies.set(COOKIE, refreshed, cookieOptions);
  return out;
}
