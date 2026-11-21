// Courses aux trophées (MVP, rookie de l'année) à partir des stats ESPN, sans dépendance à Next (testable).
// Indice Basketlog, volontairement simple et public :
//  - production = points + 1,2 × rebonds + 1,5 × passes décisives (par match) ;
//  - MVP : production × (0,6 + 0,8 × pourcentage de victoires de l'équipe), les votants récompensant aussi les victoires ;
//    il faut avoir joué au moins 70 % des matchs de son équipe (la règle des 65 matchs, ramenée à la saison en cours) ;
//  - rookie : production seule, avec au moins la moitié des matchs de son équipe.
export const production = (p) => (p.ppg || 0) + 1.2 * (p.reb || 0) + 1.5 * (p.ast || 0);
export const MVP_MIN_SHARE = 0.7;
export const ROY_MIN_SHARE = 0.5;
const MIN_PLAYERS = 200; // en dessous, la liste ESPN est incomplète (panne) : pas de classement plutôt qu'un faux

export function mvpRace(stats, records, n = 15) {
  const rows = [];
  for (const p of Object.values(stats || {})) {
    const r = records?.[p.team];
    if (!r || !r.gp || (p.gp || 0) < Math.max(5, MVP_MIN_SHARE * r.gp)) continue;
    const pct = r.wins / r.gp;
    const prod = production(p);
    rows.push({ p, prod, pct, wins: r.wins, losses: r.losses, score: prod * (0.6 + 0.8 * pct) });
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, n);
}

// Rookie : joueur absent des stats des deux saisons précédentes (premier match NBA cette saison). L'année des débuts,
// quand ESPN la donne, écarte les vétérans revenus d'Europe (ex. Mario Hezonja, débuts en 2015).
export function rookiesOf(cur, prev, prev2, season = null) {
  if (Object.keys(prev || {}).length < MIN_PLAYERS || Object.keys(prev2 || {}).length < MIN_PLAYERS) return [];
  return Object.values(cur || {}).filter((p) => !prev[p.id] && !prev2[p.id] && !(season && p.debut != null && p.debut < season - 1));
}

export function royRace(cur, prev, prev2, records, n = 12, season = null) {
  return rookiesOf(cur, prev, prev2, season)
    .filter((p) => { const r = records?.[p.team]; return r && r.gp && (p.gp || 0) >= Math.max(3, ROY_MIN_SHARE * r.gp); })
    .map((p) => ({ p, prod: production(p), score: production(p) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
