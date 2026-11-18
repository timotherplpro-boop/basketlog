// Questions-réponses d'une fiche de match NBA, visibles gratuitement : elles reprennent les questions que l'on tape
// dans Google (« who will win Celtics vs Nuggets », « Celtics vs Nuggets predicted score », « what time… ») avec des
// réponses propres au match. Aucun chiffre réservé à l'analyse complète : seulement ce que la fiche montre déjà
// (probabilités arrondies, score projeté, confiance), plus l'heure, la salle, la télé et le bilan du modèle.
import { fmtDate, fmtTime, pctOf } from "./i18n.js";
// Même traduction que confText (lib/matchtext) : recopiée ici pour garder ce module sans dépendance.
const confText = (c, L) => (L.fr ? c : (L.es ? { "Très élevée": "Muy alta", "Élevée": "Alta", "Moyenne": "Media", "Faible": "Baja" } : { "Très élevée": "Very high", "Élevée": "High", "Moyenne": "Medium", "Faible": "Low" })[c] || c);

// « an 86% », « an 11% » : article anglais devant un pourcentage.
const anA = (p) => (/^(8\d?|11|18)$/.test(String(Math.round(p * 100))) ? "an" : "a");

export function matchFaq(a, L, acc = null) {
  const g = a.game;
  if (!g || g.hypothetical) return [];
  const A = g.away, H = g.home;
  const fav = a.pHome >= 0.5 ? H : A, dog = fav.id === H.id ? A : H;
  const pFav = Math.max(a.pHome, a.pAway), pDog = 1 - pFav;
  const conf = confText(a.confidence, L).toLowerCase();
  const day = fmtDate(L, g.date, { weekday: "long", month: "long", day: "numeric" });
  const time = `${L.fr ? fmtTime(L, g.date).replace(":", " h ") : fmtTime(L, g.date)} ${L.tzLabel}`;
  const proj = `${A.short} ${Math.round(a.awayPts)} – ${H.short} ${Math.round(a.homePts)}`;
  const done = g.state === "post" && H.score != null && !g.postponed;
  const out = [];
  const q = (fr, en, es, rfr, ren, res) => out.push({ q: L.t(fr, en, es), a: L.t(rfr, ren, res) });

  if (done) {
    const win = H.score > A.score ? H : A, lose = win.id === H.id ? A : H;
    const ok = win.id === fav.id;
    const score = `${Math.max(H.score, A.score)}-${Math.min(H.score, A.score)}`;
    q(`Qui a gagné ${A.short} – ${H.short} ?`, `Who won ${A.short} vs ${H.short}?`, `¿Quién ganó el ${A.short} – ${H.short}?`,
      `Les ${win.short} ont battu les ${lose.short} ${score}. Avant le match, Basketlog donnait ${pctOf(pFav, L)} de chances aux ${fav.short} : pronostic ${ok ? "réussi" : "manqué"}.`,
      `The ${win.short} beat the ${lose.short} ${score}. Before tip-off, Basketlog gave the ${fav.short} ${anA(pFav)} ${pctOf(pFav, L)} chance to win: the pick was ${ok ? "right" : "wrong"}.`,
      `Los ${win.short} ganaron a los ${lose.short} por ${score}. Antes del partido, Basketlog daba un ${pctOf(pFav, L)} de probabilidades a los ${fav.short}: pronóstico ${ok ? "acertado" : "fallado"}.`);
    q(`Quel score Basketlog avait-il projeté ?`, `What score did Basketlog project?`, `¿Qué marcador proyectaba Basketlog?`,
      `${proj} (score projeté avant le match). Score final : ${A.short} ${A.score} – ${H.short} ${H.score}.`,
      `${proj} (projected before tip-off). Final score: ${A.short} ${A.score} – ${H.short} ${H.score}.`,
      `${proj} (proyectado antes del partido). Resultado final: ${A.short} ${A.score} – ${H.short} ${H.score}.`);
  } else {
    q(`Qui va gagner ${A.short} – ${H.short} ?`, `Who will win ${A.short} vs ${H.short}?`, `¿Quién ganará el ${A.short} – ${H.short}?`,
      `Le modèle Basketlog voit les ${fav.short} favoris, avec ${pctOf(pFav, L)} de chances de victoire contre ${pctOf(pDog, L)} pour les ${dog.short}. Confiance du modèle : ${conf}.`,
      `The Basketlog model has the ${fav.short} as the favorite, with ${anA(pFav)} ${pctOf(pFav, L)} win probability against ${pctOf(pDog, L)} for the ${dog.short}. Model confidence: ${conf}.`,
      `El modelo de Basketlog ve favoritos a los ${fav.short}, con un ${pctOf(pFav, L)} de probabilidades de victoria frente al ${pctOf(pDog, L)} de los ${dog.short}. Confianza del modelo: ${conf}.`);
    q(`Quel est le score prévu de ${A.short} – ${H.short} ?`, `What is the predicted score for ${A.short} vs ${H.short}?`, `¿Cuál es el marcador previsto del ${A.short} – ${H.short}?`,
      `Score projeté par Basketlog : ${proj}.`,
      `Basketlog's projected score: ${proj}.`,
      `Marcador proyectado por Basketlog: ${proj}.`);
    q(`À quelle heure et sur quelle chaîne ?`, `What time is ${A.short} vs ${H.short} and where to watch?`, `¿A qué hora es y dónde verlo?`,
      `${day[0].toUpperCase() + day.slice(1)} à ${time}${g.venue ? `, à ${g.venue}` : ""}${g.broadcast ? ` (diffusion US : ${g.broadcast})` : ""}.`,
      `${day[0].toUpperCase() + day.slice(1)} at ${time}${g.venue ? ` at ${g.venue}` : ""}${g.broadcast ? `, on ${g.broadcast}` : ""}.`,
      `${day[0].toUpperCase() + day.slice(1)} a las ${time}${g.venue ? `, en el ${g.venue}` : ""}${g.broadcast ? ` (televisión en EE. UU.: ${g.broadcast})` : ""}.`);
  }
  if (acc && acc.n >= 20) {
    const r = pctOf(acc.ok / acc.n, L);
    q(`Le modèle Basketlog est-il fiable ?`, `How accurate is the Basketlog model?`, `¿Es fiable el modelo de Basketlog?`,
      `Cette saison, le favori désigné par Basketlog a gagné ${acc.ok} matchs NBA sur ${acc.n} (${r}). Chaque pronostic est enregistré avant le match puis vérifié en public, dans le bilan.`,
      `This season, the favorite picked by Basketlog won ${acc.ok} of ${acc.n} NBA games (${r}). Every pick is saved before tip-off and checked in public on the track record page.`,
      `Esta temporada, el favorito elegido por Basketlog ganó ${acc.ok} de ${acc.n} partidos de la NBA (${r}). Cada pronóstico se guarda antes del partido y se comprueba en público en el balance.`);
  }
  return out;
}
