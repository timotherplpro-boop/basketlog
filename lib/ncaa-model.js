// Modèle NCAA (basket universitaire américain, 1re division), sans dépendance à Next (testable).
// Note de chaque équipe = écart de points attendu, corrigé de la force des adversaires (méthode « SRS ») :
//  - marge de chaque match plafonnée à 25 points (les écrasements ne disent pas grand-chose de plus) ;
//  - avantage du terrain : 3 points (0 sur terrain neutre) ; adversaire hors 1re division : note fixe −15 ;
//  - départ de la saison : note finale de la saison passée × 0,7, qui pèse comme 6 matchs (puis s'efface).
// Probabilité = loi normale de l'écart attendu, écart-type 11 points.
// Testé sur la saison 2026-27 (667 matchs du 6 au 20 novembre, chaque match prédit avec les seuls résultats d'avant) :
// 76 % de favoris gagnants, score de Brier 0,157 ; les équipes données à 80-90 % ont gagné environ 90 % du temps.
export const NCAA = { H: 3, CAP: 25, K: 6, REG: 0.7, NON_D1: -15, SD: 11, MISSING: -5 };
// Basket universitaire féminin : mêmes règles, écart-type 8 points (écarts plus prévisibles). Testé sur la saison 2026-27
// (718 matchs du 5 au 20 novembre, départ = note finale 2025-26) : 81 % de favoris gagnants, score de Brier 0,127.
export const NCAAW = { ...NCAA, SD: 8 };
// m : hommes (/ncaa, /app/ncaa) ; w : femmes (/ncaaw, /app/ncaaw).
export const LEAGUES = {
  m: { lg: "m", espn: "mens-college-basketball", base: "/ncaa", hub: "/app/ncaa", P: NCAA },
  w: { lg: "w", espn: "womens-college-basketball", base: "/ncaaw", hub: "/app/ncaaw", P: NCAAW },
};
// Libellés selon la compétition (L = langue).
export const ncaaWords = (L, lg) => lg === "w" ? {
  name: L.t("Basket NCAA féminin", "Women's college basketball", "Baloncesto NCAA femenino", "Basquete NCAA feminino"),
  low: L.t("basket NCAA féminin", "women's college basketball", "baloncesto NCAA femenino", "basquete NCAA feminino"),
  div: L.t("Basket universitaire féminin américain, 1re division", "NCAA women's Division I basketball", "Baloncesto universitario femenino de EE. UU., primera división", "Basquete universitário feminino dos EUA, primeira divisão"),
  tag: L.t(" féminin", " women's", " femenino", " feminino"),
} : {
  name: L.t("Basket NCAA", "College basketball", "Baloncesto NCAA", "Basquete NCAA"),
  low: L.t("basket NCAA", "college basketball", "baloncesto NCAA", "basquete NCAA"),
  div: L.t("Basket universitaire américain, 1re division", "NCAA men's Division I basketball", "Baloncesto universitario de EE. UU., primera división", "Basquete universitário dos EUA, primeira divisão"),
  tag: "",
};
import { slugify } from "./slug.js";

// Adresses lisibles : /ncaa/michigan-state-vs-duke-2026-11-21 (nom de l'école, sans la mascotte) et /ncaa/team/duke.
// Les recherches américaines tapent « michigan state vs duke prediction ».
export const ncaaSlug = (t) => slugify(String(t?.loc || t?.short || t?.name || "").replace(/['’&.]/g, "")); // St. John's → st-johns, Texas A&M → texas-am
export const ncaaGamePath = (g, base = "/ncaa") => `${base}/${ncaaSlug(g.away)}-vs-${ncaaSlug(g.home)}-${g.d.slice(0, 4)}-${g.d.slice(4, 6)}-${g.d.slice(6)}`;
export const ncaaTeamPath = (t, base = "/ncaa") => `${base}/team/${ncaaSlug(t)}`;
export function parseNcaaSlug(slug) {
  const m = String(slug || "").match(/^([a-z0-9-]+?)-vs-([a-z0-9-]+)-(\d{4})-(\d{2})-(\d{2})$/);
  return m ? { away: m[1], home: m[2], date: `${m[3]}${m[4]}${m[5]}` } : null;
}

export function phi(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

// games : [{ h, a, hs, as, n }] (ids d'équipes, scores, terrain neutre) ; d1 : Set des ids de 1re division ; prior : { id: note }.
export function ncaaRatings(games, d1, prior = {}, it = 50) {
  const { H, CAP, K, REG, NON_D1, MISSING } = NCAA;
  const adj = {};
  for (const g of games) {
    for (const [me, op, m] of [[g.h, g.a, g.hs - g.as - (g.n ? 0 : H)], [g.a, g.h, g.as - g.hs + (g.n ? 0 : H)]]) {
      if (!d1.has(me)) continue;
      (adj[me] ||= []).push([op, Math.max(-CAP, Math.min(CAP, m))]);
    }
  }
  const pr = {}, r = {};
  for (const id of d1) { pr[id] = (prior[id] ?? MISSING) * REG; r[id] = pr[id]; }
  for (let k = 0; k < it; k++) {
    const nr = {};
    for (const id of d1) {
      const L = adj[id] || [];
      let s = 0;
      for (const [op, m] of L) s += m + (d1.has(op) ? r[op] : NON_D1);
      nr[id] = (s + K * pr[id]) / (L.length + K);
    }
    Object.assign(r, nr);
  }
  return r;
}

export function ncaaProb(r, home, away, neutral, P = NCAA) {
  const margin = (r[home] ?? P.MISSING) - (r[away] ?? P.MISSING) + (neutral ? 0 : P.H);
  return { pHome: phi(margin / P.SD), margin };
}

// Bilan public : chaque match entre deux équipes de 1re division, prédit avec les seuls résultats des jours d'avant
// (à partir du 4e jour de la saison). days : [{ d, games }] triés par date.
export function ncaaRecord(days, d1, prior) {
  let n = 0, ok = 0;
  const done = [];
  days.forEach((day, i) => {
    if (i >= 3) {
      const r = ncaaRatings(done, d1, prior, 30);
      for (const g of day.games) {
        if (!d1.has(g.h) || !d1.has(g.a)) continue;
        const { pHome } = ncaaProb(r, g.h, g.a, g.n);
        n++;
        if ((pHome >= 0.5) === (g.hs > g.as)) ok++;
      }
    }
    done.push(...day.games);
  });
  return { n, ok };
}

// Bilan victoires-défaites de chaque équipe sur la saison.
export function ncaaRecords(games) {
  const rec = {};
  for (const g of games) {
    const hw = g.hs > g.as;
    for (const [id, w] of [[g.h, hw], [g.a, !hw]]) { const x = (rec[id] ||= { w: 0, l: 0 }); if (w) x.w++; else x.l++; }
  }
  return rec;
}
