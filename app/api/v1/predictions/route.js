import { upcomingAnalyses } from "../../../../lib/data";
import { nbaToday, shiftDate } from "../../../../lib/espn";
import { nbaPath } from "../../../../lib/slug";
import { SITE } from "../../../../lib/site";
import { apiPredictions } from "../../../../lib/api-v1";

// API gratuite : GET /api/v1/predictions?date=YYYYMMDD (aujourd'hui par défaut, jusqu'à 7 jours plus tard).
// Gardée 10 minutes par le CDN : un seul calcul par date, quel que soit le nombre d'appels.
export const dynamic = "force-dynamic";

const HEAD = { "access-control-allow-origin": "*", "x-robots-tag": "noindex" };

export async function GET(req) {
  const today = nbaToday();
  const d = (req.nextUrl.searchParams.get("date") || today).replace(/-/g, "");
  if (!/^\d{8}$/.test(d) || d < today || d > shiftDate(today, 7)) {
    return Response.json({ error: "date must be YYYYMMDD, from today to 7 days ahead", today }, { status: 400, headers: { ...HEAD, "cache-control": "public, s-maxage=3600" } });
  }
  try {
    const games = await upcomingAnalyses(7);
    return Response.json(apiPredictions(games, d, { site: SITE, pathOf: nbaPath }), { headers: { ...HEAD, "cache-control": "public, max-age=300, s-maxage=600, stale-while-revalidate=1800" } });
  } catch {
    return Response.json({ error: "temporarily unavailable" }, { status: 503, headers: { ...HEAD, "cache-control": "public, s-maxage=60" } });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: { ...HEAD, "access-control-allow-methods": "GET, OPTIONS" } });
}
