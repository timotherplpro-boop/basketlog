import { NextResponse } from "next/server";
import { analyzeDay } from "../../../lib/data";
import { nbaToday } from "../../../lib/espn";
import { recapDay } from "../../../lib/social-day";
import { nbaPath } from "../../../lib/slug.js";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Données du Short quotidien « les matchs de ce soir » (21/11/2026, scripts/short/) : matchs NBA du jour pas encore
// commencés, avec la probabilité du modèle, et le bilan de la nuit dernière. Mêmes chiffres que les fiches du site.
// Public (aucune donnée privée) ; mis en cache 5 minutes.
const team = (t) => ({ name: t.name, short: t.short, abbr: t.abbr, color: t.color, record: t.record || null });

export async function GET() {
  const d = nbaToday();
  const [day, recap] = await Promise.all([analyzeDay(d).catch(() => null), recapDay().catch(() => null)]);
  const games = (day?.analyses || [])
    .filter((a) => !a.game.hypothetical && !a.game.postponed && a.game.state === "pre")
    .sort((x, y) => new Date(x.game.date) - new Date(y.game.date))
    .map((a) => ({ date: a.game.date, away: team(a.game.away), home: team(a.game.home), pHome: Math.round(a.pHome * 1000) / 1000, conf: a.confidence || null, href: nbaPath(a.game, d) }));
  const f = recap?.facts;
  const lastNight = f?.n ? { d: recap.d, n: f.n, ok: f.ok } : null;
  return NextResponse.json({ d, generated: new Date().toISOString(), games, lastNight }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
}
