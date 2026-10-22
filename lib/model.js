// Modèle de prédiction Basketlog v0.1
// Idée : rating d'équipe = écart de points moyen (proxy du Net Rating), mélangé avec la saison
// précédente tant que l'échantillon est petit, puis ajustements contexte (domicile, back-to-back, absences).

const HOME_COURT = 2.3; // avantage du terrain NBA moderne, en points
const B2B_PENALTY = 1.6; // fatigue match la veille
const MARGIN_SD = 12.5; // écart-type de la marge finale NBA
const PRIOR_GAMES = 12; // poids de la saison précédente, en "matchs équivalents"
const REGRESS = 0.85; // régression vers la moyenne
const LEAGUE_PPG = 114.5;

function phi(x) {
  // CDF normale standard (approximation Abramowitz-Stegun)
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

function blend(cur, prev, key, fallback) {
  const c = cur && cur[key] != null ? cur[key] : null;
  const p = prev && prev[key] != null ? prev[key] : null;
  const gp = (cur && cur.gp) || 0;
  if (c == null && p == null) return fallback;
  if (c == null || gp === 0) return p != null ? p : fallback;
  if (p == null) {
    const w = gp / (gp + PRIOR_GAMES);
    return c * w + fallback * (1 - w);
  }
  const w = gp / (gp + PRIOR_GAMES);
  return c * w + p * (1 - w);
}

function injuryImpact(list) {
  if (!list || !list.length) return { pts: 0, out: [], doubtful: [] };
  const out = list.filter((i) => /out/i.test(i.status));
  const doubtful = list.filter((i) => /doubt|question|day-to-day|game time/i.test(i.status));
  const pts = Math.min(4.5, out.length * 0.9 + doubtful.length * 0.35);
  return { pts, out, doubtful };
}

export function analyzeGame(game, ctx) {
  const { standings = {}, prior = {}, injuries = {}, playedYesterday = new Set() } = ctx;
  const sides = {};
  for (const side of ["home", "away"]) {
    const t = game[side];
    const cur = standings[t.id];
    const prev = prior[t.id];
    const diff = blend(cur, prev, "diff", 0) * REGRESS;
    const ppg = blend(cur, prev, "ppg", LEAGUE_PPG);
    const oppg = blend(cur, prev, "oppg", LEAGUE_PPG);
    const inj = injuryImpact(injuries[t.id]);
    const b2b = playedYesterday.has(t.id);
    sides[side] = {
      team: t,
      cur: cur || null,
      prev: prev || null,
      diff,
      ppg,
      oppg,
      inj,
      b2b,
      sample: (cur && cur.gp) || 0,
    };
  }
  const h = sides.home, a = sides.away;

  const factors = [];
  const base = h.diff - a.diff;
  factors.push({
    label: "Niveau des équipes (écart de points ajusté)",
    value: base,
    detail: `${h.team.abbr} ${fmt(h.diff)} / ${a.team.abbr} ${fmt(a.diff)} par match`,
  });
  factors.push({ label: "Avantage du terrain", value: HOME_COURT, detail: `${h.team.short} à domicile` });
  let b2b = 0;
  if (h.b2b) b2b -= B2B_PENALTY;
  if (a.b2b) b2b += B2B_PENALTY;
  if (b2b !== 0)
    factors.push({
      label: "Back-to-back",
      value: b2b,
      detail: [h.b2b && `${h.team.short} a joué hier`, a.b2b && `${a.team.short} a joué hier`].filter(Boolean).join(", "),
    });
  const injAdj = a.inj.pts - h.inj.pts;
  if (h.inj.pts || a.inj.pts)
    factors.push({
      label: "Absences",
      value: injAdj,
      detail: `${h.team.abbr} : ${h.inj.out.length} out, ${h.inj.doubtful.length} incertain(s) · ${a.team.abbr} : ${a.inj.out.length} out, ${a.inj.doubtful.length} incertain(s)`,
    });

  const margin = base + HOME_COURT + b2b + injAdj; // marge attendue pour l'équipe à domicile
  const pHome = phi(margin / MARGIN_SD);

  // Total : attaque de chacun contre défense de l'autre, recentré sur la moyenne ligue.
  const homePts0 = (h.ppg + a.oppg) / 2;
  const awayPts0 = (a.ppg + h.oppg) / 2;
  let total = homePts0 + awayPts0;
  if (h.b2b || a.b2b) total -= 1.5;
  total -= (h.inj.pts + a.inj.pts) * 0.4;
  let homePts = total / 2 + margin / 2;
  let awayPts = total / 2 - margin / 2;
  // Pas d'égalité affichée au basket : on départage l'arrondi en faveur du favori.
  if (Math.round(homePts) === Math.round(awayPts)) {
    if (margin >= 0) { homePts = Math.round(homePts) + 1; awayPts = Math.round(awayPts); }
    else { awayPts = Math.round(awayPts) + 1; homePts = Math.round(homePts); }
  }

  // Confiance : dépend de l'écart et de la taille de l'échantillon.
  const edge = Math.abs(pHome - 0.5);
  const minSample = Math.min(h.sample, a.sample);
  let confidence = edge > 0.22 ? "Élevée" : edge > 0.1 ? "Moyenne" : "Faible";
  if (minSample < 5 && confidence === "Élevée") confidence = "Moyenne";

  const fav = pHome >= 0.5 ? h : a;
  const dog = pHome >= 0.5 ? a : h;

  // Scénarios via la distribution de la marge
  const m = margin, sd = MARGIN_SD;
  const pHomeBy10 = 1 - phi((10 - m) / sd);
  const pAwayBy10 = phi((-10 - m) / sd);
  const pClose = phi((5 - m) / sd) - phi((-5 - m) / sd);

  return {
    id: game.id,
    game,
    home: h,
    away: a,
    margin,
    pHome,
    pAway: 1 - pHome,
    total,
    homePts,
    awayPts,
    confidence,
    fav,
    dog,
    factors,
    scenarios: [
      { label: `${h.team.short} gagne de 10+`, p: pHomeBy10 },
      { label: "Match serré (écart ≤ 5)", p: pClose },
      { label: `${a.team.short} gagne de 10+`, p: pAwayBy10 },
    ],
    minSample,
  };
}

export function fmt(x, digits = 1) {
  if (x == null || isNaN(x)) return "–";
  const v = Number(x).toFixed(digits);
  return x > 0 ? `+${v}` : v;
}

export function pct(p) {
  return `${Math.round(p * 100)}%`;
}
