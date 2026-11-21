// Loterie 3-2-1, calendrier restant, courses MVP et rookie, bilans mensuels, API JSON, lexique.
import { lotteryEntries, drawLottery, remainingSchedule, BALLS, RELEGATED_FLOOR } from "../lib/season-tools.js";
import { mvpRace, royRace, rookiesOf, production } from "../lib/awards.js";
import { monthsOf, monthOk, seasonOfMonth } from "../lib/months.js";
import { apiPredictions } from "../lib/api-v1.js";
import { TERMS, termOf, tr } from "../lib/glossary.js";
import { ncaaRatings, ncaaProb, ncaaRecord, ncaaRecords, NCAA, NCAAW, LEAGUES, ncaaWords, ncaaSlug, ncaaGamePath, ncaaTeamPath, parseNcaaSlug } from "../lib/ncaa-model.js";
import { mk } from "../lib/i18n.js";
import PRIOR_W from "../lib/ncaaw-prior.json" with { type: "json" };

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export async function awardsTests({ ok, ko, eq }) {
  console.log("Loterie 3-2-1, calendrier restant, MVP et rookie, bilans mensuels, API");
  // 2 conférences de 15 équipes ; victoires décroissantes avec le rang (E1..E15 : 50 à 22).
  const orders = { E: [], W: [] }, key = {};
  for (const c of ["E", "W"]) for (let i = 0; i < 15; i++) { const id = `${c}${i + 1}`; orders[c].push(id); key[id] = 50 - 2 * i + (c === "W" ? 0.5 : 0); }
  const losers = { E: "E8", W: "W7" };
  const lot = lotteryEntries(orders, losers, key);
  eq("loterie : 16 équipes", lot.length, 16);
  eq("loterie : 37 boules (7×3 + 3×2 + 4×2 + 2×1)", lot.reduce((s, x) => s + x.balls, 0), 37);
  const rel = lot.filter((x) => x.rel).map((x) => x.id).sort();
  eq("les 3 plus mauvais bilans sont relégués", rel.join(","), ["E14", "E15", "W15"].sort().join(","));
  eq("9e de conférence : 2 boules", lot.find((x) => x.id === "E9").balls, BALLS.nineTen);
  eq("perdant 7-8 : 1 boule", lot.find((x) => x.id === "W7").balls, BALLS.sevenEight);
  if (!lot.some((x) => x.id === "E7" || x.id === "W8" || x.id === "E1")) ok("vainqueurs 7-8 et qualifiés hors loterie"); else ko("vainqueurs 7-8 et qualifiés hors loterie", "condition fausse");

  const R = rng(42), N = 20000, first = {}, worstPick = {};
  for (let k = 0; k < N; k++) {
    const picks = drawLottery(lot, R);
    if (k === 0) eq("tirage : 16 choix distincts", new Set(picks).size, 16);
    first[picks[0]] = (first[picks[0]] || 0) + 1;
    for (const id of rel) { const p = picks.indexOf(id) + 1; worstPick[id] = Math.max(worstPick[id] || 0, p); }
  }
  const f = (id) => (first[id] || 0) / N;
  if (Math.abs(f("E11") - 3 / 37) < 0.008) ok(`3 boules : ~8,1 % pour le 1er choix (${(f("E11") * 100).toFixed(1)} %)`); else ko(`3 boules : ~8,1 % pour le 1er choix (${(f("E11") * 100).toFixed(1)} %)`, "condition fausse");
  if (Math.abs(f("E15") - 2 / 37) < 0.007) ok(`relégué : ~5,4 % (${(f("E15") * 100).toFixed(1)} %)`); else ko(`relégué : ~5,4 % (${(f("E15") * 100).toFixed(1)} %)`, "condition fausse");
  if (Math.abs(f("W7") - 1 / 37) < 0.005) ok(`perdant 7-8 : ~2,7 % (${(f("W7") * 100).toFixed(1)} %)`); else ko(`perdant 7-8 : ~2,7 % (${(f("W7") * 100).toFixed(1)} %)`, "condition fausse");
  if (rel.every((id) => worstPick[id] <= RELEGATED_FLOOR)) ok("un relégué ne descend jamais sous le 12e choix"); else ko("un relégué ne descend jamais sous le 12e choix", "condition fausse");

  const sos = remainingSchedule({ a: { strength: 4 }, b: { strength: -2 }, c: { strength: 0 } }, [["a", "b"], ["c", "a"], ["b", "c"]]);
  eq("calendrier : 2 matchs restants pour a", sos.a.n, 2);
  eq("calendrier : 1 à domicile", sos.a.home, 1);
  eq("calendrier : force moyenne des adversaires de a = (−2 + 0) / 2", sos.a.opp, -1);
  eq("calendrier : adversaires de b = (4 + 0) / 2", sos.b.opp, 2);

  const rec = { 1: { wins: 12, losses: 3, gp: 15 }, 2: { wins: 4, losses: 11, gp: 15 } };
  const stats = {
    a: { id: "a", name: "Star A", team: "1", gp: 14, ppg: 28, reb: 10, ast: 8 },
    b: { id: "b", name: "Star B", team: "2", gp: 15, ppg: 33, reb: 6, ast: 7 },
    c: { id: "c", name: "Blessé", team: "1", gp: 6, ppg: 35, reb: 12, ast: 10 },
  };
  eq("production = pts + 1,2 reb + 1,5 pd", production(stats.a), 28 + 12 + 12);
  const mvp = mvpRace(stats, rec);
  eq("MVP : les victoires comptent, moins de 70 % des matchs = exclu", mvp.map((r) => r.p.id).join(","), "a,b");
  const prev = {}, prev2 = {};
  for (let i = 0; i < 250; i++) { prev[`v${i}`] = { id: `v${i}` }; prev2[`v${i}`] = { id: `v${i}` }; }
  prev.b = { id: "b" };
  const cur = { ...stats, r1: { id: "r1", name: "Rookie 1", team: "2", gp: 12, ppg: 18, reb: 5, ast: 3 }, r2: { id: "r2", name: "Rookie 2", team: "1", gp: 4, ppg: 25, reb: 5, ast: 5 } };
  eq("rookies : absents des deux saisons passées", rookiesOf(cur, prev, prev2).length, 4);
  eq("rookie : production d'abord (joueurs éligibles)", royRace(cur, prev, prev2, rec).map((r) => r.p.id)[0], "a");
  if (!royRace(cur, prev, prev2, rec).some((r) => r.p.id === "r2")) ok("rookie : moins de la moitié des matchs = exclu"); else ko("rookie : moins de la moitié des matchs = exclu", "condition fausse");
  eq("stats de la saison passée indisponibles : aucun faux rookie", rookiesOf(cur, {}, prev2).length, 0);
  eq("vétéran revenu d'Europe (débuts en 2015) : pas rookie", rookiesOf({ ...cur, h: { id: "h", name: "Vétéran", team: "1", gp: 10, debut: 2015 } }, prev, prev2, 2027).length, 4);

  if (monthOk("2026-11") && !monthOk("2026-13") && !monthOk("x")) ok("mois valides"); else ko("mois valides", "condition fausse");
  eq("novembre 2026 = saison 2027", seasonOfMonth("2026-11"), 2027);
  eq("mars 2027 = saison 2027", seasonOfMonth("2027-03"), 2027);
  eq("mois de la saison jusqu'au mois en cours", monthsOf(2027, "20261121").join(","), "2026-10,2026-11");

  const g = { id: "9", d: "20261121", date: "2026-11-22T00:30:00Z", live: false, home: { name: "Boston Celtics", abbr: "BOS", short: "Celtics" }, away: { name: "Orlando Magic", abbr: "ORL", short: "Magic" }, pHome: 0.61234, homePts: 114.4, awayPts: 108.6 };
  const api = apiPredictions([g, { ...g, id: "10", d: "20261122" }], "20261121", { site: "https://x", pathOf: () => "/nba/magic-vs-celtics-2026-11-21", now: new Date("2026-11-21T10:00:00Z") });
  eq("API : seulement les matchs de la date demandée", api.count, 1);
  eq("API : probabilité arrondie au millième", api.games[0].home_win_probability, 0.612);
  eq("API : probabilité de l'extérieur", api.games[0].away_win_probability, 0.388);
  eq("API : score projeté arrondi", api.games[0].projected_score.away, 109);
  eq("API : lien vers la fiche anglaise", api.games[0].url, "https://x/en/nba/magic-vs-celtics-2026-11-21");
  eq("API : licence", api.license, "CC BY 4.0");

  if (TERMS.every((x) => x.t.length === 4 && x.d.length === 4 && x.d.every((d) => d.length > 150))) ok("lexique : 4 langues, définitions complètes"); else ko("lexique : 4 langues, définitions complètes", "condition fausse");
  // NCAA : A bat B de 20, B bat C de 10 (terrain neutre) ; X hors 1re division.
  const d1n = new Set(["A", "B", "C"]);
  const ng = [{ h: "A", a: "B", hs: 80, as: 60, n: true }, { h: "B", a: "C", hs: 70, as: 60, n: true }, { h: "C", a: "X", hs: 90, as: 50, n: false }];
  const nr = ncaaRatings(ng.slice(0, 2), d1n, {});
  if (nr.A > nr.B && nr.B > nr.C) ok("NCAA : notes dans l'ordre des résultats"); else ko("NCAA : notes", JSON.stringify(nr));
  const np = ncaaProb(nr, "A", "C", true), npH = ncaaProb(nr, "C", "A", false);
  if (np.pHome > 0.5 && Math.abs(ncaaProb(nr, "C", "A", true).pHome - (1 - np.pHome)) < 1e-9) ok("NCAA : probabilités symétriques sur terrain neutre"); else ko("NCAA : symétrie", np.pHome);
  if (Math.abs(npH.margin - (nr.C - nr.A + NCAA.H)) < 1e-9) ok("NCAA : 3 points pour l'équipe qui reçoit"); else ko("NCAA : terrain", npH.margin);
  eq("NCAA : bilan public sans les 3 premiers jours", ncaaRecord([{ d: "1", games: ng }, { d: "2", games: [] }, { d: "3", games: [] }, { d: "4", games: [{ h: "A", a: "C", hs: 70, as: 60, n: true }] }], d1n, {}).n, 1);
  eq("NCAA : adresse d'un match", ncaaGamePath({ d: "20261121", away: { loc: "Michigan State", short: "Michigan St" }, home: { loc: "Duke" } }), "/ncaa/michigan-state-vs-duke-2026-11-21");
  eq("NCAA : lecture de l'adresse", JSON.stringify(parseNcaaSlug("miami-oh-vs-saint-mary-s-2026-11-21")), JSON.stringify({ away: "miami-oh", home: "saint-mary-s", date: "20261121" }));
  eq("NCAA : nom d'école sans mascotte", ncaaSlug({ loc: "Miami (OH)", name: "Miami (OH) RedHawks" }), "miami-oh");
  eq("NCAA : apostrophe et esperluette", [ncaaSlug({ loc: "St. John's" }), ncaaSlug({ loc: "Texas A&M" }), ncaaSlug({ loc: "Saint Mary's" })].join(","), "st-johns,texas-am,saint-marys");
  if (parseNcaaSlug("duke-2026-11-21") === null) ok("NCAA : adresse invalide refusée"); else ko("NCAA : adresse invalide", "");
  eq("NCAA : bilan de C", JSON.stringify(ncaaRecords(ng).C), JSON.stringify({ w: 1, l: 1 }));
  // Basket universitaire féminin
  eq("NCAA F : adresse d'un match", ncaaGamePath({ d: "20261123", away: { loc: "South Carolina" }, home: { loc: "UConn" } }, LEAGUES.w.base), "/ncaaw/south-carolina-vs-uconn-2026-11-23");
  eq("NCAA F : adresse d'une école", ncaaTeamPath({ loc: "UConn" }, LEAGUES.w.base), "/ncaaw/team/uconn");
  eq("NCAA H : adresse inchangée par défaut", ncaaTeamPath({ loc: "Duke" }), "/ncaa/team/duke");
  const pw = ncaaProb({ A: 5, B: 0 }, "A", "B", true, NCAAW).pHome, pm = ncaaProb({ A: 5, B: 0 }, "A", "B", true).pHome;
  if (pw > pm && pm > 0.5 && NCAAW.SD < NCAA.SD) ok("NCAA F : écart-type plus serré, probabilité plus nette"); else ko("NCAA F : écart-type", [pw, pm]);
  eq("NCAA F : libellé anglais", ncaaWords(mk("en"), "w").name, "Women's college basketball");
  eq("NCAA H : libellé anglais", ncaaWords(mk("en"), "m").name, "College basketball");
  const nw = Object.keys(PRIOR_W).length;
  if (nw > 340 && nw < 380 && Object.values(PRIOR_W).every((x) => Math.abs(x) < 40)) ok("NCAA F : notes de départ (" + nw + " écoles)"); else ko("NCAA F : notes de départ", nw);
  eq("lexique : adresses uniques", new Set(TERMS.map((x) => x.slug)).size, TERMS.length);
  eq("lexique : traduction", tr(termOf("play-in").t, "es"), "Play-in");
  if (!TERMS.some((x) => x.d.some((d) => /\b(IA|AI|paris|bet|apuesta|aposta)\b/i.test(d)))) ok("lexique : ni « IA » ni vocabulaire de pari"); else ko("lexique : ni « IA » ni vocabulaire de pari", "condition fausse");
}
