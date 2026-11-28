import { jgOgImage } from "../../../lib/og";

// Visuel de l'annonce « 1 jour gratuit sur Basketlog Pro » (28/11/2026), hors de /api/ comme /bf/og (robots.txt ferme /api/ :
// X et LinkedIn n'y liraient pas l'image). /offre/og?f=portrait (1080×1350, Instagram et Facebook), f=carre (1080×1080), sinon
// 1200×630 (aperçu de lien) ; &lang=fr (défaut), en, es ou pt. Autorisé depuis un autre site (canvas des réseaux sociaux).
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const lang = ["fr", "en", "es", "pt"].includes(q.get("lang")) ? q.get("lang") : "fr";
  return jgOgImage(q.get("f") || q.get("format") || "og", { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400, s-maxage=604800" } }, lang);
}
