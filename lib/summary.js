// Résumés en texte, propres à chaque match et à chaque équipe, visibles gratuitement.
// Ils rendent chaque page unique pour les moteurs de recherche et utiles pour le visiteur.

const fmt = (iso, o) => {
  try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...o }).format(new Date(iso)); } catch { return ""; }
};
const pct = (p) => `${Math.round(p * 100)}\u00a0%`;
const rec = (s) => (s?.cur && s.cur.wins + s.cur.losses > 0 ? `${s.cur.wins}-${s.cur.losses}` : null);
const dec = (x) => x.toFixed(1).replace(".", ",");
const list = (arr) => (arr.length < 2 ? arr.join("") : `${arr.slice(0, -1).join(", ")} et ${arr[arr.length - 1]}`);

export function matchSummary(a, league = "NBA", L) {
  if (L?.en) return matchSummaryEn(a, league, L);
  if (L?.es) return matchSummaryEs(a, league, L);
  const g = a.game;
  const h = a.home, aw = a.away;
  const nba = league === "NBA";
  const comp = nba ? "NBA" : "d'EuroLeague";
  // NBA : « les Lakers » (pluriel) ; EuroLeague : « Real Madrid » (nom du club, singulier).
  const T = (t, full = false) => (nba ? `les ${full ? t.name : t.short}` : t.name);
  const Tcap = (t, full = false) => { const x = T(t, full); return x.charAt(0).toUpperCase() + x.slice(1); };
  const pour = (t) => (nba ? `aux ${t.short}` : `à ${t.name}`);
  const v = (pl, sg) => (nba ? pl : sg);
  const out = [];
  const hr = rec(h), ar = rec(aw);
  const when = `le ${fmt(g.date, { weekday: "long", day: "numeric", month: "long" })} à ${fmt(g.date, { hour: "numeric", minute: "2-digit" }).replace(":", " h ")} (heure de Paris)`;

  if (g.hypothetical) {
    out.push(`${Tcap(g.home, true)} et ${T(g.away, true)} ne se rencontrent pas dans les prochaines semaines. Voici un match ${comp} hypothétique, avec ${T(g.home)} à domicile.`);
  } else {
    out.push(`${Tcap(g.home, true)}${hr ? ` (${hr})` : ""} ${v("reçoivent", "reçoit")} ${T(g.away, true)}${ar ? ` (${ar})` : ""} ${when}${g.venue ? `, à ${g.venue}` : ""}, en match ${comp}.`);
  }

  const done = !g.hypothetical && g.state === "post" && g.home.score != null;
  const fav = a.pHome >= 0.5 ? g.home : g.away;
  const pFav = Math.max(a.pHome, a.pAway);
  if (done) {
    const winner = g.home.score > g.away.score ? g.home : g.away;
    const ok = winner.id === fav.id;
    out.push(`Score final : ${g.away.short} ${g.away.score} – ${g.home.short} ${g.home.score}. Avant le match, le modèle Basketlog donnait ${pct(pFav)} de chances de victoire ${pour(fav)} : pronostic ${ok ? "réussi" : "manqué"}.`);
  } else {
    out.push(`Le modèle Basketlog donne ${pct(pFav)} de chances de victoire ${pour(fav)} et projette un score de ${Math.round(a.awayPts)}-${Math.round(a.homePts)} (${g.away.short} – ${g.home.short}), soit environ ${Math.round(a.total)} points au total.`);
  }

  const split = [];
  if (h.cur?.home && h.cur.home !== "0-0") split.push(`${T(g.home)} ${v("sont", "est")} à ${h.cur.home} à domicile`);
  if (aw.cur?.road && aw.cur.road !== "0-0") split.push(`${T(g.away)}${split.length ? "" : ` ${v("sont", "est")}`} à ${aw.cur.road} à l'extérieur`);
  if (split.length) out.push(`Cette saison, ${list(split)}.`);

  const form = [];
  if (h.cur?.last10) form.push(`${h.cur.last10} pour ${T(g.home)}`);
  if (aw.cur?.last10) form.push(`${aw.cur.last10} pour ${T(g.away)}`);
  const vd = (x) => String(x).replace(/^W/, "V").replace(/^L/, "D");
  const streaks = [h.cur?.streak && `${g.home.short} ${vd(h.cur.streak)}`, aw.cur?.streak && `${g.away.short} ${vd(aw.cur.streak)}`].filter(Boolean);
  const gp = Math.min((h.cur?.wins ?? 0) + (h.cur?.losses ?? 0), (aw.cur?.wins ?? 0) + (aw.cur?.losses ?? 0));
  if (form.length) out.push(`${gp >= 10 ? "Sur les 10 derniers matchs" : "Depuis le début de la saison"} : ${list(form)}${streaks.length ? ` (séries en cours : ${streaks.join(", ")})` : ""}.`);

  if (!done) {
    const close = a.scenarios?.[1]?.p;
    if (close != null) out.push(close >= 0.38 ? `Le modèle s'attend à un match serré : ${pct(close)} de chances d'un écart de 5 points ou moins.` : `Un match serré (écart de 5 points ou moins) n'arrive que dans ${pct(close)} des cas selon le modèle.`);
    const b2b = [h.b2b && g.home, aw.b2b && g.away].filter(Boolean);
    if (b2b.length) out.push(`Fatigue : ${list(b2b.map((t) => T(t)))} ${b2b.length > 1 || nba ? "ont" : "a"} joué la veille (back-to-back).`);
    const outs = [...(aw.inj?.out || []).map((i) => `${i.player} (${g.away.short})`), ...(h.inj?.out || []).map((i) => `${i.player} (${g.home.short})`)];
    if (outs.length) out.push(`Absences signalées : ${list(outs.slice(0, 6))}${outs.length > 6 ? "…" : ""}.`);
    out.push(`Niveau de confiance du pronostic : ${String(a.confidence).toLowerCase()}.`);
  }
  return out;
}

export function teamSummary({ team, me = {}, rank, conf, next = [], probs = {}, stats, L }) {
  if (L?.en) return teamSummaryEn({ team, me, rank, conf, next, probs, stats, L });
  if (L?.es) return teamSummaryEs({ team, me, rank, conf, next, probs, stats, L });
  const out = [];
  const confName = conf === "E" ? "Est" : "Ouest";
  if (me.gp) {
    out.push(`Les ${team.name} comptent ${me.wins} victoire${me.wins > 1 ? "s" : ""} et ${me.losses} défaite${me.losses > 1 ? "s" : ""} cette saison en NBA${rank ? `, ${rank === 1 ? "1re" : `${rank}e`} de la conférence ${confName}` : ""}.`);
  } else {
    out.push(`Les ${team.name} évoluent dans la conférence ${confName} de la NBA.`);
  }
  const bits = [];
  if (stats?.ppg) bits.push(`${dec(stats.ppg)} points par match`);
  if (stats?.threePct != null) bits.push(`${dec(stats.threePct)} % de réussite à 3 points`);
  if (me.gp && me.diff != null) bits.push(`un écart moyen de ${me.diff > 0 ? "+" : ""}${dec(me.diff)} point${Math.abs(me.diff) >= 2 ? "s" : ""} par match`);
  if (bits.length) out.push(`L'équipe tourne à ${list(bits)}.`);
  if (me.last10 || me.streak) out.push(`Forme récente : ${[me.last10 && `${me.last10} sur les 10 derniers matchs`, me.streak && `série en cours ${me.streak}`].filter(Boolean).join(", ")}.`);
  const n = next[0];
  if (n) {
    const home = n.home.id === team.id;
    const opp = home ? n.away : n.home;
    const p = probs[n.id];
    const pTeam = p == null ? null : home ? p : 1 - p;
    out.push(`Prochain match : ${home ? "réception des" : "déplacement chez les"} ${opp.name} le ${fmt(n.date, { weekday: "long", day: "numeric", month: "long" })}${pTeam != null ? `, avec ${pct(pTeam)} de chances de victoire selon Basketlog` : ""}.`);
  }
  return out;
}

// ——— English versions (same facts, US time zone) ———
const fmtEn = (iso, o) => {
  try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", ...o }).format(new Date(iso)); } catch { return ""; }
};
const pctEn = (p) => `${Math.round(p * 100)}%`;
const listEn = (arr) => (arr.length < 2 ? arr.join("") : arr.length === 2 ? `${arr[0]} and ${arr[1]}` : `${arr.slice(0, -1).join(", ")} and ${arr[arr.length - 1]}`);
const strEn = (s) => String(s || "").replace(/^V/, "W").replace(/^D/, "L");
const ord = (n) => { const m = n % 100; return `${n}${m >= 11 && m <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`; };
const CONF_EN = { "Élevée": "high", "Moyenne": "medium", "Faible": "low" };

function matchSummaryEn(a, league = "NBA") {
  const g = a.game;
  const h = a.home, aw = a.away;
  const nba = league === "NBA";
  const comp = nba ? "NBA" : "EuroLeague";
  const T = (t, full = false) => (nba ? `the ${full ? t.name : t.short}` : t.name);
  const Tcap = (t, full = false) => { const x = T(t, full); return x.charAt(0).toUpperCase() + x.slice(1); };
  const out = [];
  const hr = rec(h), ar = rec(aw);
  const when = `on ${fmtEn(g.date, { weekday: "long", month: "long", day: "numeric" })} at ${fmtEn(g.date, { hour: "numeric", minute: "2-digit" })} ET`;

  if (g.hypothetical) {
    out.push(`${Tcap(g.home, true)} and ${T(g.away, true)} don't meet in the coming weeks. Here is a hypothetical ${comp} game, with ${T(g.home)} at home.`);
  } else {
    out.push(`${Tcap(g.home, true)}${hr ? ` (${hr})` : ""} host ${T(g.away, true)}${ar ? ` (${ar})` : ""} ${when}${g.venue ? ` at ${g.venue}` : ""} in ${comp} action.`);
  }

  const done = !g.hypothetical && g.state === "post" && g.home.score != null;
  const fav = a.pHome >= 0.5 ? g.home : g.away;
  const pFav = Math.max(a.pHome, a.pAway);
  if (done) {
    const winner = g.home.score > g.away.score ? g.home : g.away;
    const ok = winner.id === fav.id;
    out.push(`Final score: ${g.away.short} ${g.away.score} – ${g.home.short} ${g.home.score}. Before tip-off, the Basketlog model gave ${T(fav)} a ${pctEn(pFav)} chance to win: prediction ${ok ? "correct" : "missed"}.`);
  } else {
    out.push(`The Basketlog model gives ${T(fav)} a ${pctEn(pFav)} chance to win and projects a ${Math.round(a.awayPts)}-${Math.round(a.homePts)} score (${g.away.short} – ${g.home.short}), about ${Math.round(a.total)} total points.`);
  }

  const split = [];
  if (h.cur?.home && h.cur.home !== "0-0") split.push(`${T(g.home)} are ${h.cur.home} at home`);
  if (aw.cur?.road && aw.cur.road !== "0-0") split.push(`${T(g.away)} are ${aw.cur.road} on the road`);
  if (split.length) out.push(`This season, ${listEn(split)}.`);

  const form = [];
  if (h.cur?.last10) form.push(`${h.cur.last10} for ${T(g.home)}`);
  if (aw.cur?.last10) form.push(`${aw.cur.last10} for ${T(g.away)}`);
  const streaks = [h.cur?.streak && `${g.home.short} ${strEn(h.cur.streak)}`, aw.cur?.streak && `${g.away.short} ${strEn(aw.cur.streak)}`].filter(Boolean);
  const gp = Math.min((h.cur?.wins ?? 0) + (h.cur?.losses ?? 0), (aw.cur?.wins ?? 0) + (aw.cur?.losses ?? 0));
  if (form.length) out.push(`${gp >= 10 ? "Over the last 10 games" : "Since the start of the season"}: ${listEn(form)}${streaks.length ? ` (current streaks: ${streaks.join(", ")})` : ""}.`);

  if (!done) {
    const close = a.scenarios?.[1]?.p;
    if (close != null) out.push(close >= 0.38 ? `The model expects a close game: ${pctEn(close)} chance of a margin of 5 points or fewer.` : `A close game (margin of 5 points or fewer) happens in only ${pctEn(close)} of cases according to the model.`);
    const b2b = [h.b2b && g.home, aw.b2b && g.away].filter(Boolean);
    if (b2b.length) out.push(`Fatigue: ${listEn(b2b.map((t) => T(t)))} played the night before (back-to-back).`);
    const outs = [...(aw.inj?.out || []).map((i) => `${i.player} (${g.away.short})`), ...(h.inj?.out || []).map((i) => `${i.player} (${g.home.short})`)];
    if (outs.length) out.push(`Reported injuries: ${listEn(outs.slice(0, 6))}${outs.length > 6 ? "…" : ""}.`);
    out.push(`Prediction confidence: ${CONF_EN[a.confidence] || String(a.confidence).toLowerCase()}.`);
  }
  return out;
}

function teamSummaryEn({ team, me = {}, rank, conf, next = [], probs = {}, stats }) {
  const out = [];
  const confName = conf === "E" ? "Eastern" : "Western";
  const d1 = (x) => x.toFixed(1);
  if (me.gp) {
    out.push(`The ${team.name} are ${me.wins}-${me.losses} this NBA season${rank ? `, ${ord(rank)} in the ${confName} Conference` : ""}.`);
  } else {
    out.push(`The ${team.name} play in the NBA's ${confName} Conference.`);
  }
  const bits = [];
  if (stats?.ppg) bits.push(`${d1(stats.ppg)} points per game`);
  if (stats?.threePct != null) bits.push(`${d1(stats.threePct)}% from three`);
  if (me.gp && me.diff != null) bits.push(`an average margin of ${me.diff > 0 ? "+" : ""}${d1(me.diff)} point${Math.abs(me.diff) >= 2 ? "s" : ""} per game`);
  if (bits.length) out.push(`The team is averaging ${listEn(bits)}.`);
  if (me.last10 || me.streak) out.push(`Recent form: ${[me.last10 && `${me.last10} over the last 10 games`, me.streak && `current streak ${strEn(me.streak)}`].filter(Boolean).join(", ")}.`);
  const n = next[0];
  if (n) {
    const home = n.home.id === team.id;
    const opp = home ? n.away : n.home;
    const p = probs[n.id];
    const pTeam = p == null ? null : home ? p : 1 - p;
    out.push(`Next game: ${home ? "home against the" : "on the road at the"} ${opp.name} on ${fmtEn(n.date, { weekday: "long", month: "long", day: "numeric" })}${pTeam != null ? `, with a ${pctEn(pTeam)} chance to win according to Basketlog` : ""}.`);
  }
  return out;
}

// ——— Versiones en español (mismos datos, hora de España) ———
const fmtEs = (iso, o) => {
  try { return new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", ...o }).format(new Date(iso)); } catch { return ""; }
};
const pctEs = (p) => `${Math.round(p * 100)} %`;
const decEs = (x) => x.toFixed(1).replace(".", ",");
const listEs = (arr) => (arr.length < 2 ? arr.join("") : `${arr.slice(0, -1).join(", ")} y ${arr[arr.length - 1]}`);
const strEs = (s) => String(s || "").replace(/^W/, "V").replace(/^L/, "D");
const CONF_ES = { "Élevée": "alta", "Moyenne": "media", "Faible": "baja" };
const dayEs = (iso) => fmtEs(iso, { weekday: "long", day: "numeric", month: "long" }).replace(",", "");

function matchSummaryEs(a, league = "NBA") {
  const g = a.game;
  const h = a.home, aw = a.away;
  const nba = league === "NBA";
  const comp = nba ? "de la NBA" : "de la Euroliga";
  const T = (t, full = false) => (nba ? `los ${full ? t.name : t.short}` : t.name);
  const Tcap = (t, full = false) => { const x = T(t, full); return x.charAt(0).toUpperCase() + x.slice(1); };
  const v = (pl, sg) => (nba ? pl : sg);
  const out = [];
  const hr = rec(h), ar = rec(aw);
  const when = `el ${dayEs(g.date)} a las ${fmtEs(g.date, { hour: "2-digit", minute: "2-digit" })} (hora de España)`;

  if (g.hypothetical) {
    out.push(`${Tcap(g.home, true)} y ${T(g.away, true)} no se enfrentan en las próximas semanas. Este es un partido ${comp} hipotético, con ${T(g.home)} en casa.`);
  } else {
    out.push(`${Tcap(g.home, true)}${hr ? ` (${hr})` : ""} ${v("reciben", "recibe")} a ${T(g.away, true)}${ar ? ` (${ar})` : ""} ${when}${g.venue ? `, en el ${g.venue}` : ""}, en un partido ${comp}.`);
  }

  const done = !g.hypothetical && g.state === "post" && g.home.score != null;
  const fav = a.pHome >= 0.5 ? g.home : g.away;
  const pFav = Math.max(a.pHome, a.pAway);
  if (done) {
    const winner = g.home.score > g.away.score ? g.home : g.away;
    const ok = winner.id === fav.id;
    out.push(`Resultado final: ${g.away.short} ${g.away.score} – ${g.home.short} ${g.home.score}. Antes del partido, el modelo de Basketlog daba un ${pctEs(pFav)} de probabilidades de victoria a ${T(fav)}: pronóstico ${ok ? "acertado" : "fallado"}.`);
  } else {
    out.push(`El modelo de Basketlog da un ${pctEs(pFav)} de probabilidades de victoria a ${T(fav)} y proyecta un marcador de ${Math.round(a.awayPts)}-${Math.round(a.homePts)} (${g.away.short} – ${g.home.short}), es decir, unos ${Math.round(a.total)} puntos en total.`);
  }

  const split = [];
  if (h.cur?.home && h.cur.home !== "0-0") split.push(`${T(g.home)} ${v("llevan", "lleva")} un ${h.cur.home} en casa`);
  if (aw.cur?.road && aw.cur.road !== "0-0") split.push(`${T(g.away)}${split.length ? "" : ` ${v("llevan", "lleva")}`} un ${aw.cur.road} fuera`);
  if (split.length) out.push(`Esta temporada, ${listEs(split)}.`);

  const form = [];
  if (h.cur?.last10) form.push(`${h.cur.last10} para ${T(g.home)}`);
  if (aw.cur?.last10) form.push(`${aw.cur.last10} para ${T(g.away)}`);
  const streaks = [h.cur?.streak && `${g.home.short} ${strEs(h.cur.streak)}`, aw.cur?.streak && `${g.away.short} ${strEs(aw.cur.streak)}`].filter(Boolean);
  const gp = Math.min((h.cur?.wins ?? 0) + (h.cur?.losses ?? 0), (aw.cur?.wins ?? 0) + (aw.cur?.losses ?? 0));
  if (form.length) out.push(`${gp >= 10 ? "En los últimos 10 partidos" : "Desde el inicio de la temporada"}: ${listEs(form)}${streaks.length ? ` (rachas actuales: ${streaks.join(", ")})` : ""}.`);

  if (!done) {
    const close = a.scenarios?.[1]?.p;
    if (close != null) out.push(close >= 0.38 ? `El modelo espera un partido igualado: un ${pctEs(close)} de probabilidades de una diferencia de 5 puntos o menos.` : `Un partido igualado (diferencia de 5 puntos o menos) solo se da en el ${pctEs(close)} de los casos según el modelo.`);
    const b2b = [h.b2b && g.home, aw.b2b && g.away].filter(Boolean);
    if (b2b.length) out.push(`Cansancio: ${listEs(b2b.map((t) => T(t)))} ${b2b.length > 1 || nba ? "jugaron" : "jugó"} la noche anterior (back-to-back).`);
    const outs = [...(aw.inj?.out || []).map((i) => `${i.player} (${g.away.short})`), ...(h.inj?.out || []).map((i) => `${i.player} (${g.home.short})`)];
    if (outs.length) out.push(`Bajas comunicadas: ${listEs(outs.slice(0, 6))}${outs.length > 6 ? "…" : ""}.`);
    out.push(`Nivel de confianza del pronóstico: ${CONF_ES[a.confidence] || String(a.confidence).toLowerCase()}.`);
  }
  return out;
}

function teamSummaryEs({ team, me = {}, rank, conf, next = [], probs = {}, stats }) {
  const out = [];
  const confName = conf === "E" ? "Este" : "Oeste";
  if (me.gp) {
    out.push(`Los ${team.name} llevan ${me.wins} victoria${me.wins === 1 ? "" : "s"} y ${me.losses} derrota${me.losses === 1 ? "" : "s"} esta temporada en la NBA${rank ? `, ${rank}.º de la Conferencia ${confName}` : ""}.`);
  } else {
    out.push(`Los ${team.name} juegan en la Conferencia ${confName} de la NBA.`);
  }
  const bits = [];
  if (stats?.ppg) bits.push(`${decEs(stats.ppg)} puntos por partido`);
  if (stats?.threePct != null) bits.push(`un ${decEs(stats.threePct)} % de acierto en triples`);
  if (me.gp && me.diff != null) bits.push(`una diferencia media de ${me.diff > 0 ? "+" : ""}${decEs(me.diff)} punto${Math.abs(me.diff) >= 2 ? "s" : ""} por partido`);
  if (bits.length) out.push(`El equipo registra ${listEs(bits)}.`);
  if (me.last10 || me.streak) out.push(`Forma reciente: ${[me.last10 && `${me.last10} en los últimos 10 partidos`, me.streak && `racha actual ${strEs(me.streak)}`].filter(Boolean).join(", ")}.`);
  const n = next[0];
  if (n) {
    const home = n.home.id === team.id;
    const opp = home ? n.away : n.home;
    const p = probs[n.id];
    const pTeam = p == null ? null : home ? p : 1 - p;
    out.push(`Próximo partido: ${home ? "reciben a los" : "visitan a los"} ${opp.name} el ${dayEs(n.date)}${pTeam != null ? `, con un ${pctEs(pTeam)} de probabilidades de victoria según Basketlog` : ""}.`);
  }
  return out;
}
