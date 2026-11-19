import { oddsOgImage } from "../../../../lib/og";

// Image de partage des pages de probabilités (chances de playoffs, NBA Cup, EuroLeague).
export async function GET(req) {
  return oddsOgImage(new URL(req.url).searchParams, { headers: { "Cache-Control": "public, max-age=3600, s-maxage=21600" } });
}
