import { concoursOgImage } from "../../../../lib/og";

// Image du jeu de Noël : ?format=portrait (1080×1350, Instagram et Facebook), carre (1080×1080), sinon 1200×630
// (aperçu de lien) ; ?lang=fr (défaut), en ou es.
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const lang = ["fr", "en", "es"].includes(q.get("lang")) ? q.get("lang") : "fr";
  return concoursOgImage(q.get("format") || "og", { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } }, lang);
}
