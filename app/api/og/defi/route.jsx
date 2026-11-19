import { defiOgImage } from "../../../../lib/og";

// Image de partage du jeu « Bats le modèle » (score joueur contre modèle).
export async function GET(req) {
  return defiOgImage(new URL(req.url).searchParams, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
