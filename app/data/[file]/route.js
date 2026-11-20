import { nbaPicks } from "../../../lib/history";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { picksCsv, csvFileOf } from "../../../lib/picks-csv.js";

export const dynamic = "force-dynamic";

// Données ouvertes : tous les pronostics NBA d'une saison, recalculés avec les seuls résultats connus avant chaque
// match (même bilan que /app/bilan), en CSV. /data/nba-predictions-2026-27.csv (saison en cours, mise à jour chaque
// heure) et /data/nba-predictions-2025-26.csv. Licence CC BY 4.0 : réutilisation libre avec un lien vers Basketlog
// (sites de données, Kaggle, GitHub, articles). Mis en cache par le CDN : une génération par heure au plus.
export async function GET(_req, { params }) {
  const { file } = await params;
  const cur = seasonForDate(nbaToday());
  const season = csvFileOf(file);
  if (!season || season > cur || season < cur - 1) return new Response("Not found", { status: 404 });
  const picks = await nbaPicks(season);
  if (!Array.isArray(picks)) return new Response("Temporarily unavailable", { status: 503, headers: { "Retry-After": "600" } });
  return new Response(picksCsv(picks), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${file}"`,
      "Cache-Control": season < cur ? "public, s-maxage=86400, stale-while-revalidate=604800" : "public, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
