// Partie gratuite d'une analyse (forme, résumé rapide, scénario n° 1) : textes partagés par la fiche match
// et par les données des vidéos (/api/videos), pour que les deux disent exactement la même chose.
import { fmt } from "./model";
import { matchSummary } from "./summary";
import { deFr } from "./i18n";

export function formLabel(list, L) {
  if (!list.length) return L.t("⏳ Pas encore de match", "⏳ No games yet", "⏳ Todavía sin partidos", "⏳ Ainda sem jogos");
  const w = list.filter((x) => x.res === "W").length;
  const r = w / list.length;
  if (r >= 0.8) return L.t("🔥 En grande forme", "🔥 On fire", "🔥 En gran forma", "🔥 Em grande fase");
  if (r >= 0.6) return L.t("👍 En forme", "👍 In form", "👍 En forma", "👍 Em boa fase");
  if (r >= 0.4) return L.t("➖ Irrégulier", "➖ Up and down", "➖ Irregular", "➖ Irregular");
  return L.t("🧊 En difficulté", "🧊 Struggling", "🧊 En apuros", "🧊 Em dificuldade");
}

// Résumé rapide : le contexte du match, sans les chiffres du modèle (réservés à l'analyse complète).
const LOCKED_LINE = /%|^(Absences signalées|Reported injuries|Bajas comunicadas|Niveau de confiance|Prediction confidence|Nivel de confianza)/;
export const briefSummary = (a, league, L) => matchSummary(a, league, L).filter((x) => !LOCKED_LINE.test(x)).join(" ");

// Scénario n° 1 : le plus probable des scénarios étudiés, et ce qui porte surtout le favori (sans probabilité chiffrée).
export function scenarioOne(a, league, L) {
  const nba = league === "NBA";
  const s = [...a.scenarios].sort((x, y) => y.p - x.p)[0];
  const favHome = a.pHome >= 0.5;
  const fav = a.fav.team, dog = a.dog.team;
  const n = (t) => (nba ? t.short : t.name);
  const d = (x) => (L.en ? fmt(x) : fmt(x).replace(".", ","));
  const lead = [...a.factors].sort((x, y) => (favHome ? y.value - x.value : x.value - y.value))[0];
  const why = !lead || (favHome ? lead.value <= 0 : lead.value >= 0) ? null : {
    level: L.t(`un meilleur niveau sur la saison (écart de points de ${d(a.fav.diff)} par match, contre ${d(a.dog.diff)})`, `a stronger season so far (point differential of ${d(a.fav.diff)} per game, against ${d(a.dog.diff)})`, `un mejor nivel en la temporada (diferencia de puntos de ${d(a.fav.diff)} por partido, frente a ${d(a.dog.diff)})`, `um nível melhor na temporada (saldo de pontos de ${d(a.fav.diff)} por jogo, contra ${d(a.dog.diff)})`),
    home: L.t("l'avantage du terrain", "home-court advantage", "la ventaja de jugar en casa", "a vantagem de jogar em casa"),
    b2b: L.t(`la fatigue ${nba ? `des ${dog.short}, qui ont` : `${deFr(dog.name)}, qui a`} joué la veille`, `${nba ? `the ${dog.short}'` : `${dog.name}'s`} fatigue after playing the night before`, `el cansancio ${nba ? `de los ${dog.short}, que jugaron` : `de ${dog.name}, que jugó`} la víspera`, `o cansaço ${nba ? `do ${dog.short}, que jogou` : `do ${dog.name}, que jogou`} na véspera`),
    inj: L.t(`les absences ${nba ? `côté ${dog.short}` : deFr(dog.name)}`, `${nba ? `the ${dog.short}'` : `${dog.name}'s`} injuries`, `las bajas ${nba ? `de los ${dog.short}` : `de ${dog.name}`}`, `os desfalques ${nba ? `do ${dog.short}` : `do ${dog.name}`}`),
  }[lead.key];
  const team = s.key === "home10" ? a.home.team : s.key === "away10" ? a.away.team : null;
  const what = team
    ? L.t(`Victoire ${nba ? `des ${team.short}` : deFr(team.name)} par 10 points ou plus`, `${nba ? `The ${team.short}` : team.name} win${nba ? "" : "s"} by 10 points or more`, `Victoria ${nba ? `de los ${team.short}` : `de ${team.name}`} por 10 puntos o más`, `Vitória ${nba ? `do ${team.short}` : `do ${team.name}`} por 10 pontos ou mais`)
    : L.t("Un match serré, avec 5 points d'écart ou moins", "A close game, decided by 5 points or fewer", "Un partido igualado, con 5 puntos de diferencia o menos", "Um jogo equilibrado, com 5 pontos de diferença ou menos");
  return L.t(
    `${what} : c'est le scénario le plus probable parmi ceux étudiés par le modèle. ${nba ? `Les ${fav.short} partent favoris` : `${fav.name} part favori`}${why ? `, ${nba ? "portés" : "porté"} surtout par ${why}` : ""}. ${nba ? `Les ${dog.short} devront` : `${dog.name} devra`} faire mieux que ${nba ? "leurs" : "ses"} moyennes de la saison pour inverser la tendance.`,
    `${what}: the most likely of the scenarios the model looks at. ${nba ? `The ${fav.short} are` : `${fav.name} is`} favored${why ? `, driven mostly by ${why}` : ""}. ${nba ? `The ${dog.short}` : dog.name} will need to beat ${nba ? "their" : "its"} season averages to flip it.`,
    `${what}: es el escenario más probable entre los que estudia el modelo. ${nba ? `Los ${fav.short} parten como favoritos` : `${fav.name} parte como favorito`}${why ? `, ${nba ? "impulsados" : "impulsado"} sobre todo por ${why}` : ""}. ${nba ? `Los ${dog.short} tendrán` : `${dog.name} tendrá`} que superar sus promedios de la temporada para darle la vuelta.`, `${what}: é o cenário mais provável entre os que o modelo estuda. ${nba ? `O ${fav.short} é o favorito` : `O ${fav.name} é o favorito`}${why ? `, impulsionado sobretudo por ${why}` : ""}. ${nba ? `O ${dog.short} terá` : `O ${dog.name} terá`} que superar suas médias da temporada para virar o jogo.`
  );
}
