import { concoursOgImage } from "../../../../lib/og";

// Image du jeu de Noël : ?format=portrait (1080×1350, Instagram et Facebook), carre (1080×1080), sinon 1200×630 (aperçu de lien).
export async function GET(req) {
  const format = new URL(req.url).searchParams.get("format") || "og";
  return concoursOgImage(format, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
