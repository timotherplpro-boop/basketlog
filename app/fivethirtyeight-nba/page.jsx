import Link from "next/link";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate } from "../../lib/espn";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import JsonLd from "../../components/JsonLd";
import Crumbs from "../../components/Crumbs";
import { getL } from "../../lib/lang-server";

// Recherches orphelines « fivethirtyeight nba predictions », « 538 nba predictions », « 538 nba odds » : FiveThirtyEight
// a arrêté ses prévisions NBA en juin 2023 (Awful Announcing, 23 juin 2023) et ABC News a fermé le site en mars 2025.
// Page qui présente Basketlog comme alternative gratuite, avec le bilan réel de la saison. Aucune affiliation.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Prévisions NBA FiveThirtyEight (538) : l'alternative gratuite", "FiveThirtyEight NBA predictions are gone: a free 538 alternative", "Predicciones NBA de FiveThirtyEight (538): la alternativa gratis", "Previsões NBA do FiveThirtyEight (538): a alternativa grátis"),
    description: L.t(
      "FiveThirtyEight a arrêté ses prévisions NBA en 2023 et le site a fermé en 2025. Basketlog publie gratuitement une probabilité de victoire pour chaque match, les chances de playoffs et un bilan public.",
      "FiveThirtyEight stopped its NBA forecasts in 2023 and the site closed in 2025. Basketlog publishes free win probabilities for every game, playoff odds and a public track record.",
      "FiveThirtyEight dejó de publicar sus predicciones NBA en 2023 y el sitio cerró en 2025. Basketlog publica gratis la probabilidad de victoria de cada partido, las opciones de playoffs y un balance público.",
      "O FiveThirtyEight parou suas previsões da NBA em 2023 e o site fechou em 2025. O Basketlog publica de graça a chance de vitória de cada jogo, as chances de playoffs e um histórico público."
    ),
    path: "/fivethirtyeight-nba",
    L,
  });
}

export default async function FiveThirtyEightPage() {
  const L = await getL();
  const season = seasonForDate(nbaToday());
  const picks = await nbaPicks(season).catch(() => null);
  const s = summarize(picks || []);
  const pct = (x) => (x == null ? "–" : L.en ? `${Math.round(x * 100)}%` : `${Math.round(x * 100)} %`);
  const num = (x) => (x == null ? "–" : x.toFixed(1).replace(".", L.en ? "." : ","));
  const label = `${season - 1}-${String(season).slice(2)}`;
  const faq = [
    {
      q: L.t("FiveThirtyEight publie-t-il encore des prévisions NBA ?", "Does FiveThirtyEight still do NBA predictions?", "¿FiveThirtyEight sigue publicando predicciones NBA?", "O FiveThirtyEight ainda publica previsões da NBA?"),
      a: L.t("Non. Ses prévisions sportives ne sont plus mises à jour depuis juin 2023, et ABC News a fermé le site en mars 2025.", "No. Its sports forecasts stopped updating in June 2023, and ABC News shut the site down in March 2025.", "No. Sus predicciones deportivas dejaron de actualizarse en junio de 2023, y ABC News cerró el sitio en marzo de 2025.", "Não. As previsões esportivas pararam de ser atualizadas em junho de 2023, e a ABC News fechou o site em março de 2025."),
    },
    {
      q: L.t("Où trouver des probabilités de victoire NBA aujourd'hui ?", "Where can I find NBA win probabilities now?", "¿Dónde encontrar probabilidades de victoria NBA ahora?", "Onde encontrar chances de vitória da NBA agora?"),
      a: L.t("Basketlog publie chaque jour une probabilité de victoire et un score projeté pour chaque match NBA et EuroLeague, ainsi que les chances de playoffs et de titre de chaque équipe, gratuitement.", "Basketlog publishes a win probability and a projected score for every NBA and EuroLeague game each day, plus every team's playoff and title odds, for free.", "Basketlog publica cada día la probabilidad de victoria y el marcador proyectado de cada partido NBA y de la Euroliga, además de las opciones de playoffs y de título de cada equipo, gratis.", "O Basketlog publica todo dia a chance de vitória e o placar projetado de cada jogo da NBA e da Euroliga, além das chances de playoffs e de título de cada time, de graça."),
    },
    ...(s.n ? [{
      q: L.t("Le modèle Basketlog est-il fiable ?", "How accurate is the Basketlog model?", "¿Es fiable el modelo de Basketlog?", "O modelo do Basketlog é confiável?"),
      a: L.t(`Cette saison (${label}), le favori du modèle a gagné ${pct(s.pct)} des ${s.n} matchs terminés. Chaque match est recalculé avec les seuls résultats connus avant le coup d'envoi, et tout est public, ratés compris.`, `This season (${label}), the model's favorite has won ${pct(s.pct)} of ${s.n} completed games. Every game is recomputed using only results known before tip-off, and everything is public, misses included.`, `Esta temporada (${label}), el favorito del modelo ganó el ${pct(s.pct)} de ${s.n} partidos terminados. Cada partido se recalcula solo con los resultados conocidos antes del inicio, y todo es público, fallos incluidos.`, `Nesta temporada (${label}), o favorito do modelo venceu ${pct(s.pct)} de ${s.n} jogos encerrados. Cada jogo é recalculado só com os resultados conhecidos antes do início, e tudo é público, erros incluídos.`),
    }] : []),
  ];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  const art = {
    "@context": "https://schema.org", "@type": "Article",
    headline: L.t("Prévisions NBA FiveThirtyEight : l'alternative gratuite", "FiveThirtyEight NBA predictions: a free alternative", "Predicciones NBA de FiveThirtyEight: la alternativa gratis", "Previsões NBA do FiveThirtyEight: a alternativa grátis"),
    inLanguage: L.hreflang, url: `${SITE}${L.href("/fivethirtyeight-nba")}`,
    author: { "@id": `${SITE}/#organisation` }, publisher: { "@id": `${SITE}/#organisation` }, isPartOf: { "@id": `${SITE}/#site` },
  };
  return (
    <main className="app-page prose-page">
      <JsonLd data={art} />
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Alternative à FiveThirtyEight", "FiveThirtyEight alternative", "Alternativa a FiveThirtyEight", "Alternativa ao FiveThirtyEight"), "/fivethirtyeight-nba"]]} />
      <div className="app-head">
        <h1>{L.t("Les prévisions NBA de FiveThirtyEight n'existent plus. Voici une alternative gratuite.", "FiveThirtyEight's NBA predictions are gone. Here's a free alternative.", "Las predicciones NBA de FiveThirtyEight ya no existen. Aquí tienes una alternativa gratis.", "As previsões da NBA do FiveThirtyEight acabaram. Aqui está uma alternativa grátis.")}</h1>
        <p>{L.t("Probabilités de victoire match par match, chances de playoffs et bilan public.", "Game-by-game win probabilities, playoff odds and a public track record.", "Probabilidades de victoria partido a partido, opciones de playoffs y balance público.", "Chances de vitória jogo a jogo, chances de playoffs e histórico público.")}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Ce qui s'est passé", "What happened", "Qué pasó", "O que aconteceu")}</h2>
        <p className="narr">{L.t(
          "Pendant des années, FiveThirtyEight a publié des probabilités de victoire pour chaque match NBA et les chances de playoffs de chaque équipe. Ses prévisions sportives ne sont plus mises à jour depuis juin 2023, après des licenciements chez ABC News, et le site lui-même a fermé en mars 2025. Beaucoup de fans cherchent encore ces chiffres.",
          "For years, FiveThirtyEight published a win probability for every NBA game and every team's playoff odds. Its sports forecasts stopped updating in June 2023 after layoffs at ABC News, and the site itself was shut down in March 2025. Plenty of fans still look for those numbers.",
          "Durante años, FiveThirtyEight publicó la probabilidad de victoria de cada partido NBA y las opciones de playoffs de cada equipo. Sus predicciones deportivas dejaron de actualizarse en junio de 2023, tras despidos en ABC News, y el sitio cerró en marzo de 2025. Muchos aficionados siguen buscando esas cifras.",
          "Durante anos, o FiveThirtyEight publicou a chance de vitória de cada jogo da NBA e as chances de playoffs de cada time. As previsões esportivas pararam de ser atualizadas em junho de 2023, após demissões na ABC News, e o site fechou em março de 2025. Muitos fãs ainda procuram esses números."
        )}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Ce que Basketlog propose, gratuitement", "What Basketlog offers, for free", "Lo que ofrece Basketlog, gratis", "O que o Basketlog oferece, de graça")}</h2>
        <ul className="narr">
          <li><Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du soir", "Tonight's NBA predictions", "Pronósticos NBA de hoy", "Palpites NBA de hoje")}</Link>{L.fr ? " : " : ": "}{L.t("probabilité de victoire et score projeté de chaque match.", "win probability and projected score for every game.", "probabilidad de victoria y marcador proyectado de cada partido.", "chance de vitória e placar projetado de cada jogo.")}</li>
          <li><Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs", "Playoff odds", "Opciones de playoffs", "Chances de playoffs")}</Link> {L.t("et", "and", "y", "e")} <Link href={L.href("/app/champion")}>{L.t("favoris au titre", "title odds", "favoritos al título", "favoritos ao título")}</Link>{L.fr ? " : " : ": "}{L.t("des milliers de fins de saison simulées, play-in et séries comprises.", "thousands of simulated seasons, play-in and series included.", "miles de finales de temporada simulados, play-in y series incluidos.", "milhares de finais de temporada simulados, play-in e séries incluídos.")}</li>
          <li><Link href={L.href("/app/power-rankings")}>{L.t("Power ranking", "Power rankings", "Power ranking", "Power ranking")}</Link>, <Link href={L.href("/app/nba-cup")}>NBA Cup</Link>, <Link href={L.href("/app/euroleague")}>EuroLeague</Link>.</li>
        </ul>
      </div>

      {s.n > 0 && (
        <div className="card block">
          <h2>{L.t("Vérifié en public", "Checked in public", "Verificado en público", "Verificado em público")}</h2>
          <p className="narr">{L.t(`Saison ${label} : le favori du modèle a gagné ${pct(s.pct)} des ${s.n} matchs terminés, avec un écart moyen de ${num(s.mae)} points sur la marge.`, `${label} season: the model's favorite has won ${pct(s.pct)} of ${s.n} completed games, with an average margin error of ${num(s.mae)} points.`, `Temporada ${label}: el favorito del modelo ganó el ${pct(s.pct)} de ${s.n} partidos terminados, con un error medio de ${num(s.mae)} puntos en el margen.`, `Temporada ${label}: o favorito do modelo venceu ${pct(s.pct)} de ${s.n} jogos encerrados, com erro médio de ${num(s.mae)} pontos na margem.`)}</p>
          <div className="tbl-scroll">
            <table className="std-table">
              <thead><tr><th>{L.t("Probabilité annoncée", "Stated probability", "Probabilidad anunciada", "Probabilidade anunciada")}</th><th>{L.t("Matchs", "Games", "Partidos", "Jogos")}</th><th>{L.t("Favori gagnant", "Favorite won", "Ganó el favorito", "Favorito venceu")}</th></tr></thead>
              <tbody>
                {s.buckets.filter((b) => b.n).map((b) => (
                  <tr key={b.lo}><td className="tm">{Math.round(b.lo * 100)}-{Math.round(b.hi * 100)}{L.en ? "%" : " %"}</td><td>{b.n}</td><td className="pos">{pct(b.ok / b.n)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="narr" style={{ marginTop: 12 }}><Link href={L.href("/app/bilan")}>{L.t("Tous les matchs, ratés compris →", "Every game, misses included →", "Todos los partidos, fallos incluidos →", "Todos os jogos, erros incluídos →")}</Link></p>
        </div>
      )}

      <div className="card block">
        <h2>{L.t("En quoi le modèle diffère", "How the model differs", "En qué se diferencia el modelo", "Como o modelo é diferente")}</h2>
        <p className="narr">{L.t(
          "FiveThirtyEight s'appuyait sur des notes individuelles de joueurs. Basketlog part du niveau de chaque équipe (écart de points, mêlé à la saison passée en début de saison), puis ajoute l'avantage du terrain, la fatigue des matchs consécutifs et les absences, pondérées selon la production de chaque joueur.",
          "FiveThirtyEight leaned on individual player ratings. Basketlog starts from team strength (point differential, blended with last season early on), then adds home court, back-to-back fatigue and injuries, each absence weighted by the player's production.",
          "FiveThirtyEight se basaba en valoraciones individuales de jugadores. Basketlog parte del nivel de cada equipo (diferencia de puntos, mezclada con la temporada anterior al principio), y suma la ventaja de jugar en casa, el cansancio de los partidos consecutivos y las bajas, ponderadas según la producción de cada jugador.",
          "O FiveThirtyEight se apoiava em notas individuais de jogadores. O Basketlog parte do nível de cada time (saldo de pontos, misturado com a temporada anterior no início), e soma a vantagem de jogar em casa, o cansaço dos jogos seguidos e os desfalques, ponderados pela produção de cada jogador."
        )} <Link href={L.href("/methode")}>{L.t("La méthode en détail →", "Full methodology →", "La metodología en detalle →", "A metodologia em detalhe →")}</Link></p>
      </div>

      <section className="card block match-faq">
        <h2>{L.t("Questions fréquentes", "FAQ", "Preguntas frecuentes", "Perguntas frequentes")}</h2>
        {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
      </section>
      <p className="disclaimer">{L.t("Basketlog n'est pas affilié à FiveThirtyEight ni à ABC News. Probabilités estimées, jamais une certitude.", "Basketlog is not affiliated with FiveThirtyEight or ABC News. Probabilities are estimates, never certainties.", "Basketlog no está afiliado a FiveThirtyEight ni a ABC News. Probabilidades estimadas, nunca certezas.", "O Basketlog não é afiliado ao FiveThirtyEight nem à ABC News. Probabilidades estimadas, nunca certezas.")}</p>
    </main>
  );
}
