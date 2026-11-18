import { matchOgImage } from "../../../../lib/og";

// Image de partage d'une fiche de match NBA (voir matchMeta dans lib/match-meta.js).
export async function GET(req) {
  return matchOgImage(new URL(req.url).searchParams, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
