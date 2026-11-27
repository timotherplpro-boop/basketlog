import { bfOgImage } from "../../../lib/og";

// Visuel Black Friday, à une adresse publique hors de /api/ (robots.txt ferme /api/ aux robots : X et LinkedIn n'y liraient pas
// l'image). /bf/og?f=portrait (1080×1350, Instagram et Facebook), f=carre (1080×1080), sinon 1200×630 (aperçu de lien) ;
// &lang=fr (défaut), en, es ou pt. Fixe, sans donnée du jour : gardé 1 jour par le navigateur et 7 par le CDN.
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const lang = ["fr", "en", "es", "pt"].includes(q.get("lang")) ? q.get("lang") : "fr";
  return bfOgImage(q.get("f") || q.get("format") || "og", { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400, s-maxage=604800" } }, lang);
}
