// Outils de fin de saison, sans dépendance à Next (testables) : loterie de la draft et difficulté du calendrier restant.

// Loterie « 3-2-1 », votée par la NBA le 28 mai 2026, appliquée pour la première fois à la draft 2027
// (https://pr.nba.com/nba-board-of-governors-approves-new-draft-lottery-system-to-address-tanking/).
// 16 équipes tirées au sort pour les 16 premiers choix :
//  - les 10 équipes ni qualifiées ni en play-in : 3 boules, sauf les 3 plus mauvais bilans (« relégués ») : 2 boules ;
//  - les 9e et 10e de chaque conférence : 2 boules ;
//  - les perdants des matchs 7e contre 8e : 1 boule.
// Un relégué ne descend pas plus bas que le 12e choix. Règles non simulées : échanges de choix, et l'interdiction
// d'avoir le 1er choix deux drafts de suite (ou un top 5 trois drafts de suite).
export const BALLS = { bottom: 3, relegated: 2, nineTen: 2, sevenEight: 1 };
export const RELEGATED = 3;
export const RELEGATED_FLOOR = 12;

// orders : { E: [15 ids du 1er au 15e], W: [...] } ; losers78 : { E: id, W: id } ; key : { id: victoires (+ départage) }.
export function lotteryEntries(orders, losers78, key) {
  const out = [];
  for (const conf of Object.keys(orders)) {
    const o = orders[conf];
    for (const id of o.slice(10)) out.push({ id, balls: BALLS.bottom, rel: false, w: key[id] });
    out.push({ id: o[8], balls: BALLS.nineTen, rel: false, w: key[o[8]] }, { id: o[9], balls: BALLS.nineTen, rel: false, w: key[o[9]] });
    if (losers78[conf] != null) out.push({ id: losers78[conf], balls: BALLS.sevenEight, rel: false, w: key[losers78[conf]] });
  }
  const bottom = out.filter((x) => x.balls === BALLS.bottom).sort((a, b) => a.w - b.w);
  for (const x of bottom.slice(0, RELEGATED)) { x.balls = BALLS.relegated; x.rel = true; }
  return out;
}

// Tirage de tous les choix de la loterie (rand : nombre au hasard dans [0, 1)). Renvoie les ids dans l'ordre des choix.
export function drawLottery(entries, rand) {
  const pool = entries.map((e) => ({ ...e }));
  const picks = [];
  for (let k = 1; pool.length; k++) {
    const rel = pool.filter((x) => x.rel);
    let i;
    if (rel.length && rel.length >= RELEGATED_FLOOR - k + 1) {
      // Plus assez de place avant le 12e choix : le relégué au plus mauvais bilan passe.
      i = pool.indexOf(rel.sort((a, b) => a.w - b.w)[0]);
    } else {
      let r = rand() * pool.reduce((s, x) => s + x.balls, 0);
      i = 0;
      while (i < pool.length - 1 && (r -= pool[i].balls) >= 0) i++;
    }
    picks.push(pool[i].id);
    pool.splice(i, 1);
  }
  return picks;
}

// Difficulté du calendrier restant : force moyenne des adversaires (écart de points face à une équipe moyenne),
// nombre de matchs restants et part à domicile. teams : { id: { strength } } ; remaining : [[idDomicile, idExtérieur]].
export function remainingSchedule(teams, remaining) {
  const acc = {};
  for (const id of Object.keys(teams)) acc[id] = { n: 0, sum: 0, home: 0 };
  for (const [h, a] of remaining) {
    if (!acc[h] || !acc[a]) continue;
    acc[h].n++; acc[h].home++; acc[h].sum += teams[a].strength;
    acc[a].n++; acc[a].sum += teams[h].strength;
  }
  const out = {};
  for (const [id, x] of Object.entries(acc)) out[id] = { n: x.n, home: x.home, opp: x.n ? x.sum / x.n : null };
  return out;
}
