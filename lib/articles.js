// Article quotidien « Les 3 matchs NBA à suivre ce soir » (/articles/nba-2026-11-18) : contenu frais chaque jour,
// fait pour Google Discover (grande image 1200 px, données NewsArticle, titre daté) et les recherches
// « nba tonight », « partidos nba hoy », « nba ce soir ». Tout est tiré des pronostics du jour, sans rien inventer.
import { analyzeDay } from "./data";
import { nbaToday, shiftDate, isValidDate } from "./espn";
import { nbaPath } from "./slug.js";
import { pctOf, fmtDate, fmtTime } from "./i18n";
import { matchImageUrl } from "./match-meta";

export const articleSlug = (date) => `nba-${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`;
export const articlePath = (date) => `/articles/${articleSlug(date)}`;
export function parseArticleSlug(slug) {
  const m = /^nba-(\d{4})-(\d{2})-(\d{2})$/.exec(String(slug || ""));
  if (!m) return null;
  const d = `${m[1]}${m[2]}${m[3]}`;
  return isValidDate(d) ? d : null;
}
// Jours publiés : de la mise en ligne (18 nov. 2026) à aujourd'hui, jamais dans le futur.
export const FIRST_ARTICLE = "20261118";
export function articleDates(n = 30) {
  const out = [];
  for (let d = nbaToday(), i = 0; i < n && d >= FIRST_ARTICLE; i++, d = shiftDate(d, -1)) out.push(d);
  return out;
}

const iso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;
export const dayLabel = (L, d, long = false) => fmtDate(L, iso(d), long ? { weekday: "long", day: "numeric", month: "long" } : (L.en ? { month: "short", day: "numeric" } : { day: "numeric", month: "short" }));

export function articleTitle(L, d) {
  const x = dayLabel(L, d);
  return L.t(`NBA ce soir (${x}) : les 3 matchs à suivre et nos pronostics`, `NBA tonight (${x}): 3 games to watch and our predictions`, `NBA hoy (${x}): los 3 partidos a seguir y nuestros pronósticos`, `NBA hoje (${x}): os 3 jogos para acompanhar e nossos palpites`);
}

const outOf = (s) => (s?.inj?.out || []).filter((i) => i.ppg != null && i.ppg >= 8);
const hurt = (a) => outOf(a.home).concat(outOf(a.away)).reduce((t, i) => t + i.ppg, 0);

export async function buildArticle(date, L) {
  const { analyses } = await analyzeDay(date);
  const games = (analyses || []).filter((a) => a.game && !a.game.hypothetical && !a.game.postponed);
  if (!games.length) return { date, games: [], picks: [] };
  const fav = (a) => Math.max(a.pHome, a.pAway);
  const picks = [];
  const take = (a, kind) => { if (a && !picks.some((p) => p.a.game.id === a.game.id)) picks.push({ a, kind }); };
  take([...games].sort((x, y) => Math.abs(x.pHome - 0.5) - Math.abs(y.pHome - 0.5))[0], "close");
  take([...games].sort((x, y) => fav(y) - fav(x))[0], "fav");
  take([...games].filter((a) => hurt(a) > 0).sort((x, y) => hurt(y) - hurt(x))[0], "inj");
  for (const a of [...games].sort((x, y) => Math.abs(x.pHome - 0.5) - Math.abs(y.pHome - 0.5))) if (picks.length < 3) take(a, "close2");
  return { date, games, picks, image: matchImageUrl(picks[0].a, L) };
}

// Texte d'une section (sans balisage) : probabilité, score projeté, absences connues, résultat si joué.
export function sectionText(a, kind, L) {
  const g = a.game, H = g.home, A = g.away;
  const f = a.pHome >= 0.5 ? H : A, d = f.id === H.id ? A : H, pf = Math.max(a.pHome, a.pAway);
  const proj = `${A.short} ${Math.round(a.awayPts)} – ${H.short} ${Math.round(a.homePts)}`;
  const why = {
    close: L.t("Le match le plus serré du soir selon le modèle.", "The closest game of the night according to the model.", "El partido más igualado de la noche según el modelo.", "O jogo mais equilibrado da noite segundo o modelo."),
    close2: L.t("Un autre match à suivre de près ce soir.", "Another game worth watching tonight.", "Otro partido a seguir de cerca esta noche.", "Outro jogo para acompanhar de perto esta noite."),
    fav: L.t("Le plus gros favori de la soirée.", "The biggest favorite of the night.", "El gran favorito de la noche.", "O grande favorito da noite."),
    inj: L.t("Le match le plus touché par les absences.", "The game most affected by injuries.", "El partido más afectado por las bajas.", "O jogo mais afetado pelos desfalques."),
  }[kind];
  const lines = [why];
  lines.push(L.t(
    `Le modèle Basketlog donne ${pctOf(pf, L)} de chances de victoire aux ${f.short}, contre ${pctOf(1 - pf, L)} aux ${d.short}. Score projeté : ${proj}.`,
    `The Basketlog model gives the ${f.short} a ${pctOf(pf, L)} chance to win, against ${pctOf(1 - pf, L)} for the ${d.short}. Projected score: ${proj}.`,
    `El modelo de Basketlog da a los ${f.short} un ${pctOf(pf, L)} de probabilidades de victoria, frente al ${pctOf(1 - pf, L)} de los ${d.short}. Marcador proyectado: ${proj}.`, `O modelo do Basketlog dá ao ${f.short} ${pctOf(pf, L)} de probabilidade de vitória, contra ${pctOf(1 - pf, L)} do ${d.short}. Placar projetado: ${proj}.`));
  const outs = outOf(a.home).map((i) => ({ ...i, t: H })).concat(outOf(a.away).map((i) => ({ ...i, t: A }))).sort((x, y) => y.ppg - x.ppg).slice(0, 3);
  if (outs.length) {
    const n = (x) => (L.en ? x.toFixed(1) : x.toFixed(1).replace(".", ","));
    lines.push(L.t("Absents : ", "Out: ", "Bajas: ", "Desfalques: ") + outs.map((i) => `${i.player} (${i.t.short}, ${n(i.ppg)} ${L.t("pts", "ppg", "pts", "pts")})`).join(", ") + ".");
  }
  if (g.state === "post" && H.score != null) {
    const w = H.score > A.score ? H : A;
    const ok = w.id === f.id;
    lines.push(L.t(
      `Résultat : ${A.short} ${A.score} – ${H.short} ${H.score}. Pronostic ${ok ? "réussi" : "manqué"}.`,
      `Final: ${A.short} ${A.score} – ${H.short} ${H.score}. The pick was ${ok ? "right" : "wrong"}.`,
      `Resultado: ${A.short} ${A.score} – ${H.short} ${H.score}. Pronóstico ${ok ? "acertado" : "fallado"}.`, `Resultado: ${A.short} ${A.score} – ${H.short} ${H.score}. Palpite ${ok ? "certo" : "errado"}.`));
  }
  return lines;
}

export const sectionHead = (a, L) => {
  const g = a.game;
  return `${L.t(`${g.away.short} – ${g.home.short}`, `${g.away.short} @ ${g.home.short}`, `${g.away.short} – ${g.home.short}`, `${g.away.short} x ${g.home.short}`)} · ${fmtTime(L, g.date)} ${L.tzLabel}`;
};
export const gamePath = (a, date) => nbaPath(a.game, date);
