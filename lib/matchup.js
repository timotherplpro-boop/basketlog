// Page « duel » sans date : /nba/celtics-vs-lakers. Elle répond aux recherches tapées sans date
// (« celtics vs lakers prediction », « lakers vs celtics ») : prochaine rencontre et sa probabilité, toutes les rencontres
// de la saison avec le pronostic Basketlog et le résultat, bilan des deux équipes.
import { TEAMS } from "./teams.js";
import { teamSlug, slugify } from "./slug.js";

const BY_SLUG = new Map(TEAMS.map((t) => [slugify(t.short), t]));

// « lakers-vs-celtics » → { a, b, canonical } ; canonical = ordre alphabétique des deux équipes.
export function parsePair(slug) {
  const s = String(slug || "");
  const i = s.indexOf("-vs-");
  if (i <= 0) return null;
  // Le nom d'une équipe peut contenir « - » (trail-blazers) mais jamais « -vs- ».
  const a = BY_SLUG.get(s.slice(0, i)), b = BY_SLUG.get(s.slice(i + 4));
  if (!a || !b || a.id === b.id) return null;
  const [x, y] = [a, b].sort((p, q) => slugify(p.short).localeCompare(slugify(q.short)));
  return { a, b, x, y, canonical: `${slugify(x.short)}-vs-${slugify(y.short)}` };
}

export const pairPath = (t1, t2) => {
  const [x, y] = [teamSlug(t1), teamSlug(t2)].sort();
  return `/nba/${x}-vs-${y}`;
};
