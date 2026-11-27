import { SITE } from "../lib/site";
// /api/og/ reste ouvert : X, LinkedIn et Facebook respectent robots.txt et n'affichaient pas l'image des aperçus de liens
// (27/11/2026, post X de l'actu du jour sans image). Le reste de /api/ reste fermé aux robots.
export default function robots() {
  return { rules: [{ userAgent: "*", allow: ["/", "/api/og/"], disallow: ["/api/"] }], sitemap: `${SITE}/sitemap.xml` };
}
