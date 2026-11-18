import JsonLd from "./JsonLd";
import { SITE } from "../lib/site";

// Fil d'Ariane pour Google (BreadcrumbList) : dans les résultats, « Basketlog › Euroligue › … »
// remplace l'adresse brute, plus lisible et plus cliqué. items : [[nom, chemin], …] (le dernier = la page).
export default function Crumbs({ items, L }) {
  const list = (items || []).filter(([n, p]) => n && p != null);
  if (list.length < 2) return null;
  return (
    <JsonLd data={{
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: list.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${L.href(path)}` })),
    }} />
  );
}
