// Adresses lisibles des fiches de match NBA : /nba/magic-vs-celtics-2026-11-16 (mêmes chemins sous /en et /es).
// Les recherches US tapent exactement « magic vs celtics prediction » : les noms d'équipes dans l'adresse aident Google.
// Les anciennes adresses /app/match/<id>?d=<date> redirigent (308) vers celles-ci.
export const slugify = (x) =>
  String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const nick = (t) => (t && typeof t === "object" ? t.short || (t.name ? String(t.name).split(" ").slice(-1)[0] : null) : null);
export const teamSlug = (t) => slugify(nick(t));

// g : match avec home/away ({ short, name }) ; d : date NBA « 20261116 » (ou « 2026-11-16 »).
// Sans noms d'équipe exploitables, on garde l'ancienne adresse (elle redirige d'elle-même).
export function nbaPath(g, d) {
  const a = teamSlug(g?.away), h = teamSlug(g?.home);
  const date = String(d || "").replace(/-/g, "");
  if (!a || !h || !/^\d{8}$/.test(date)) return `/app/match/${g?.id}?d=${d}`;
  return `/nba/${a}-vs-${h}-${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
}

// « magic-vs-celtics-2026-11-16 » -> { away: "magic", home: "celtics", date: "20261116" }
export function parseNbaSlug(slug) {
  const m = /^([a-z0-9-]+?)-vs-([a-z0-9-]+)-(\d{4})-(\d{2})-(\d{2})$/.exec(String(slug || ""));
  return m ? { away: m[1], home: m[2], date: `${m[3]}${m[4]}${m[5]}` } : null;
}
