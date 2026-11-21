import Link from "next/link";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate } from "../../lib/espn";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import JsonLd from "../../components/JsonLd";
import Crumbs from "../../components/Crumbs";
import QuickFaq from "../../components/QuickFaq";
import { getL } from "../../lib/lang-server";
import { pctOf } from "../../lib/i18n";

// Recherches « meilleur site pronostic NBA », « best free nba prediction sites », « mejor web de pronósticos NBA ».
// Comparatif honnête : critères vérifiables, et transparence sur le fait que la page est publiée par Basketlog.
// Seulement des faits sûrs sur les autres sources (pas d'affirmation sur leurs résultats). Aucune affiliation.
export const dynamic = "force-dynamic";

const seasonLabel = (y) => `${y - 1}-${String(y).slice(2)}`;

export async function generateMetadata() {
  const L = await getL();
  const s = seasonLabel(seasonForDate(nbaToday()));
  return pageMeta({
    title: L.t(`Meilleurs sites de pronostics NBA gratuits (${s}) : comment choisir`, `Best free NBA prediction sites (${s}): how to choose`, `Mejores webs de pronósticos NBA gratis (${s}): cómo elegir`, `Melhores sites de palpites NBA grátis (${s}): como escolher`),
    description: L.t(
      "Où trouver des pronostics NBA gratuits et fiables ? Les critères qui comptent (probabilités, bilan public, calibration) et les principales sources comparées : Basketlog, ESPN, Basketball-Reference.",
      "Where can you find free, reliable NBA predictions? The criteria that matter (probabilities, public record, calibration) and the main sources compared: Basketlog, ESPN, Basketball-Reference.",
      "¿Dónde encontrar pronósticos NBA gratis y fiables? Los criterios que cuentan (probabilidades, balance público, calibración) y las principales fuentes comparadas: Basketlog, ESPN, Basketball-Reference.",
      "Onde encontrar palpites NBA grátis e confiáveis? Os critérios que importam (probabilidades, histórico público, calibração) e as principais fontes comparadas: Basketlog, ESPN, Basketball-Reference."
    ),
    path: "/meilleurs-sites-pronostics-nba",
    L,
  });
}

export default async function BestSitesPage() {
  const L = await getL();
  const season = seasonForDate(nbaToday());
  const picks = await nbaPicks(season).catch(() => null);
  const s = summarize(picks || []);
  const label = seasonLabel(season);
  const criteria = [
    [L.t("Une probabilité, pas un simple nom", "A probability, not just a name", "Una probabilidad, no solo un nombre", "Uma probabilidade, não só um nome"), L.t("« Celtics » ne dit rien ; « Celtics 62 % » dit à quel point le match est ouvert.", "'Celtics' tells you nothing; 'Celtics 62%' tells you how open the game is.", "«Celtics» no dice nada; «Celtics 62 %» dice lo abierto que está el partido.", "\"Celtics\" não diz nada; \"Celtics 62 %\" diz quão aberto está o jogo.")],
    [L.t("Publiée avant le match", "Published before tip-off", "Publicada antes del partido", "Publicada antes do jogo"), L.t("Un pronostic n'a de valeur que s'il est connu avant le coup d'envoi, et qu'il ne change pas après.", "A prediction only counts if it is public before tip-off and never edited afterwards.", "Un pronóstico solo vale si se conoce antes del inicio y no cambia después.", "Um palpite só vale se for conhecido antes do início e não mudar depois.")],
    [L.t("Un bilan public, ratés compris", "A public record, misses included", "Un balance público, fallos incluidos", "Um histórico público, erros incluídos"), L.t("Méfiance envers les sites qui n'affichent que leurs réussites.", "Be wary of sites that only show their hits.", "Desconfía de las webs que solo muestran sus aciertos.", "Desconfie dos sites que só mostram os acertos.")],
    [L.t("Une calibration vérifiable", "Verifiable calibration", "Una calibración verificable", "Uma calibração verificável"), L.t("Les équipes données à 70 % doivent gagner environ 70 % du temps.", "Teams given 70% should win about 70% of the time.", "Los equipos con un 70 % deben ganar alrededor del 70 % de las veces.", "Os times com 70 % devem vencer cerca de 70 % das vezes.")],
  ];
  const sources = [
    {
      name: "Basketlog", href: L.href("/app/matchs"), internal: true,
      txt: L.t(
        `Probabilité de victoire et score projeté pour chaque match NBA et EuroLeague, en français, anglais, espagnol et portugais. Bilan public match par match${s.n ? ` (saison ${label} : ${pctOf(s.pct, L)} sur ${s.n} matchs)` : ""}, calibration, chances de playoffs, données téléchargeables.`,
        `Win probability and projected score for every NBA and EuroLeague game, in English, French, Spanish and Portuguese. Public game-by-game record${s.n ? ` (${label} season: ${pctOf(s.pct, L)} over ${s.n} games)` : ""}, calibration, playoff odds, downloadable data.`,
        `Probabilidad de victoria y marcador proyectado de cada partido NBA y de la Euroliga, en español, inglés, francés y portugués. Balance público partido a partido${s.n ? ` (temporada ${label}: ${pctOf(s.pct, L)} en ${s.n} partidos)` : ""}, calibración, opciones de playoffs, datos descargables.`,
        `Probabilidade de vitória e placar projetado de cada jogo da NBA e da Euroliga, em português, inglês, francês e espanhol. Histórico público jogo a jogo${s.n ? ` (temporada ${label}: ${pctOf(s.pct, L)} em ${s.n} jogos)` : ""}, calibração, chances de playoffs, dados para baixar.`
      ),
    },
    {
      name: "ESPN (BPI, Matchup Predictor)", href: "https://www.espn.com/nba/bpi",
      txt: L.t("L'indice BPI d'ESPN et la probabilité affichée sur les fiches de match, surtout en anglais.", "ESPN's BPI rating and the win probability shown on game pages, mostly in English.", "El índice BPI de ESPN y la probabilidad que aparece en las fichas de partido, sobre todo en inglés.", "O índice BPI da ESPN e a probabilidade mostrada nas páginas de jogo, sobretudo em inglês."),
    },
    {
      name: "Basketball-Reference", href: "https://www.basketball-reference.com/",
      txt: L.t("La référence des statistiques historiques, avec un rapport de probabilités de playoffs. En anglais.", "The reference for historical stats, with a playoff probabilities report. In English.", "La referencia de las estadísticas históricas, con un informe de probabilidades de playoffs. En inglés.", "A referência das estatísticas históricas, com um relatório de probabilidades de playoffs. Em inglês."),
    },
    {
      name: "FiveThirtyEight", href: L.href("/fivethirtyeight-nba"), internal: true,
      txt: L.t("Ses prévisions NBA ne sont plus mises à jour depuis 2023 et le site a fermé en mars 2025.", "Its NBA forecasts stopped updating in 2023 and the site closed in March 2025.", "Sus predicciones NBA dejaron de actualizarse en 2023 y la web cerró en marzo de 2025.", "As previsões da NBA pararam de ser atualizadas em 2023 e o site fechou em março de 2025."),
    },
  ];
  const faq = [
    { q: L.t("Quel est le meilleur site de pronostics NBA gratuit ?", "What is the best free NBA prediction site?", "¿Cuál es la mejor web de pronósticos NBA gratis?", "Qual é o melhor site de palpites NBA grátis?"), a: L.t("Celui qui publie une probabilité avant chaque match et un bilan complet, ratés compris, que tu peux vérifier toi-même. C'est ce que fait Basketlog, gratuitement et en quatre langues.", "The one that publishes a probability before every game and a full record, misses included, that you can check yourself. That is what Basketlog does, for free and in four languages.", "La que publica una probabilidad antes de cada partido y un balance completo, fallos incluidos, que puedes comprobar tú mismo. Es lo que hace Basketlog, gratis y en cuatro idiomas.", "O que publica uma probabilidade antes de cada jogo e um histórico completo, erros incluídos, que você pode conferir. É o que o Basketlog faz, de graça e em quatro idiomas.") },
    { q: L.t("Un pronostic à 100 % existe-t-il ?", "Is there such a thing as a 100% sure prediction?", "¿Existe un pronóstico seguro al 100 %?", "Existe palpite 100 % certo?"), a: L.t("Non. Même un favori à 90 % perd environ un match sur dix. Un site qui promet des certitudes ne dit pas la vérité.", "No. Even a 90% favorite loses about one game in ten. A site that promises certainty is not telling the truth.", "No. Incluso un favorito al 90 % pierde uno de cada diez partidos. Una web que promete certezas no dice la verdad.", "Não. Mesmo um favorito com 90 % perde cerca de um jogo em dez. Um site que promete certezas não está dizendo a verdade.") },
  ];
  return (
    <main className="app-page prose-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Meilleurs sites de pronostics NBA", "Best NBA prediction sites", "Mejores webs de pronósticos NBA", "Melhores sites de palpites NBA"), "/meilleurs-sites-pronostics-nba"]]} />
      <div className="app-head">
        <h1>{L.t("Meilleurs sites de pronostics NBA gratuits : comment choisir", "Best free NBA prediction sites: how to choose", "Mejores webs de pronósticos NBA gratis: cómo elegir", "Melhores sites de palpites NBA grátis: como escolher")}</h1>
        <p>{L.t("Cette page est publiée par Basketlog : nous ne sommes pas neutres. C'est pour ça qu'elle part de critères que tu peux vérifier toi-même.", "This page is published by Basketlog, so we are not neutral. That is why it starts from criteria you can check yourself.", "Esta página la publica Basketlog: no somos neutrales. Por eso parte de criterios que puedes comprobar tú mismo.", "Esta página é publicada pelo Basketlog: não somos neutros. Por isso ela parte de critérios que você pode conferir.")}</p>
      </div>
      <div className="card block">
        <h2>{L.t("Les 4 critères qui comptent", "The 4 criteria that matter", "Los 4 criterios que cuentan", "Os 4 critérios que importam")}</h2>
        <ol className="narr">{criteria.map(([h, t]) => <li key={h}><b>{h}.</b> {t}</li>)}</ol>
      </div>
      <div className="card block">
        <h2>{L.t("Les principales sources gratuites", "The main free sources", "Las principales fuentes gratis", "As principais fontes grátis")}</h2>
        <ul className="narr">
          {sources.map((x) => <li key={x.name}>{x.internal ? <Link href={x.href}><b>{x.name}</b></Link> : <a href={x.href} rel="noopener" target="_blank"><b>{x.name}</b></a>} : {x.txt}</li>)}
        </ul>
        <p className="narr"><Link href={L.href("/app/bilan")}>{L.t("Vérifier le bilan Basketlog, ratés compris →", "Check the Basketlog record, misses included →", "Comprobar el balance de Basketlog, fallos incluidos →", "Conferir o histórico do Basketlog, erros incluídos →")}</Link></p>
      </div>
      <QuickFaq L={L} items={faq} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Article", headline: L.t("Meilleurs sites de pronostics NBA gratuits", "Best free NBA prediction sites", "Mejores webs de pronósticos NBA gratis", "Melhores sites de palpites NBA grátis"), inLanguage: L.hreflang, url: `${SITE}${L.href("/meilleurs-sites-pronostics-nba")}`, author: { "@id": `${SITE}/#organisation` }, publisher: { "@id": `${SITE}/#organisation` } }} />
      <p className="disclaimer">{L.t("Basketlog n'est affilié à aucun des sites cités. Probabilités estimées, jamais une certitude.", "Basketlog is not affiliated with any of the sites mentioned. Probabilities are estimates, never certainties.", "Basketlog no está afiliado a ninguna de las webs citadas. Probabilidades estimadas, nunca certezas.", "O Basketlog não é afiliado a nenhum dos sites citados. Probabilidades estimadas, nunca certezas.")}</p>
    </main>
  );
}
