import { SITE } from "../lib/site";
// /api/og/ reste ouvert : X, LinkedIn et Facebook respectent robots.txt et n'affichaient pas l'image des aperçus de liens
// (27/11/2026, post X de l'actu du jour sans image). Le reste de /api/ reste fermé aux robots.
// ?_rsc= : données de navigation Next.js (préchargement des liens). Le 25/11, 71 % des passages de Googlebot
// (Search Console, statistiques d'exploration) étaient ces requêtes, au lieu des vraies pages ; chacune recalcule
// la page côté Vercel. Le HTML de chaque page contient déjà tout son contenu : rien n'est perdu pour Google.
export default function robots() {
  return { rules: [{ userAgent: "*", allow: ["/", "/api/og/"], disallow: ["/api/", "/*?_rsc=", "/*&_rsc="] }], sitemap: `${SITE}/sitemap.xml` };
}
