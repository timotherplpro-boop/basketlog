import Link from "next/link";
import { upcomingGames } from "../../lib/data";
import { elUpcoming } from "../../lib/euroleague";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate, shiftDate } from "../../lib/espn";
import { confText } from "../../lib/matchtext";
import JsonLd from "../../components/JsonLd";
import { pageMeta, topFavorites } from "../../lib/seo";
import { SITE } from "../../lib/site";
import { getL } from "../../lib/lang-server";
import { pctOf, fmtDate, fmtTime } from "../../lib/i18n";
import { nbaPath, elPath } from "../../lib/slug.js";

// Page d'entrée Google pour « pronostic basket » (aujourd'hui, gratuit, demain…) : les pronostics du jour NBA et EuroLeague
// avec favori, probabilité, score projeté et total de points, chaque ligne menant à la fiche du match.
export const dynamic = "force-dynamic";

const PATH = "/pronostic-basket";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t(
      "Pronostic basket gratuit du jour : NBA et EuroLeague – Basketlog",
      "Free basketball predictions today: NBA and EuroLeague – Basketlog",
      "Pronósticos de baloncesto hoy gratis: NBA y Euroliga – Basketlog", "Palpites de basquete hoje grátis: NBA e Euroliga – Basketlog"
    ),
    description: L.t(
      "Pronostic basket gratuit pour chaque match NBA et EuroLeague d'aujourd'hui et de demain : favori, probabilités de victoire, score projeté et total de points.",
      "Free basketball predictions for every NBA and EuroLeague game today and tomorrow: favorite, win probabilities, projected score and total points.",
      "Pronósticos de baloncesto gratis para cada partido de la NBA y la Euroliga de hoy y mañana: favorito, probabilidades de victoria, marcador proyectado y total de puntos.", "Palpites de basquete grátis para cada jogo da NBA e da Euroliga de hoje e amanhã: favorito, probabilidades de vitória, placar projetado e total de pontos."
    ),
    path: PATH,
    L,
  });
}

// Une ligne de pronostic : heure, affiche (visiteur @ domicile), favori et sa probabilité, score projeté, total, confiance.
function PickRow({ g, href, L }) {
  const favHome = g.pHome >= 0.5;
  const fav = favHome ? g.home : g.away;
  const p = favHome ? g.pHome : 1 - g.pHome;
  return (
    <Link href={L.href(href)} className="pk-row">
      <span className="pk-time">{g.live ? <span className="live">LIVE</span> : fmtTime(L, g.date)}</span>
      <span className="pk-match">{g.away.short} <i>@</i> {g.home.short}</span>
      <span className="pk-fav">
        {L.t("Favori", "Favorite", "Favorito", "Favorito")}{L.fr ? " :" : ":"} <b>{fav.short} {pctOf(p, L)}</b>
        {g.confidence ? <small>{L.t("Confiance", "Confidence", "Confianza", "Confiança")} {confText(g.confidence, L).toLowerCase()}</small> : null}
      </span>
      <span className="pk-score">{L.t("Score projeté", "Projected score", "Marcador proyectado", "Placar projetado")} <b>{Math.round(g.awayPts)}-{Math.round(g.homePts)}</b> · {L.t("total", "total", "total", "total")} <b>{Math.round(g.total)}</b></span>
    </Link>
  );
}

// Lignes regroupées par jour (fuseau de la langue de la page).
function PickList({ games, href, L }) {
  if (!games.length) return <div className="empty">{L.t("Aucun match au programme pour le moment.", "No games scheduled right now.", "No hay partidos programados por ahora.", "Não há jogos programados no momento.")}</div>;
  const groups = [];
  for (const g of games) {
    const k = fmtDate(L, g.date, { weekday: "long", day: "numeric", month: "long" });
    const last = groups[groups.length - 1];
    if (last && last.k === k) last.items.push(g);
    else groups.push({ k, items: [g] });
  }
  return (
    <div className="panel pk-list">
      {groups.map((gr) => (
        <div key={gr.k}>
          <div className="up-day">{gr.k}</div>
          {gr.items.map((g) => <PickRow key={g.id} g={g} href={href(g)} L={L} />)}
        </div>
      ))}
    </div>
  );
}

function faqOf(L, s, favs = []) {
  const rate = s.n > 0
    ? L.t(
      `Cette saison, le modèle a trouvé le bon vainqueur dans ${pctOf(s.pct, L)} des ${s.n} matchs NBA terminés. Tout le détail, match par match, est sur la page Bilan.`,
      `This season, the model has picked the right winner in ${pctOf(s.pct, L)} of ${s.n} completed NBA games. The full game-by-game detail is on the Track record page.`,
      `Esta temporada, el modelo ha acertado el ganador en el ${pctOf(s.pct, L)} de los ${s.n} partidos NBA terminados. Todo el detalle, partido a partido, está en la página Balance.`, `Nesta temporada, o modelo acertou o vencedor em ${pctOf(s.pct, L)} dos ${s.n} jogos da NBA encerrados. Todo o detalhe, jogo a jogo, está na página Desempenho.`
    )
    : L.t("Tout le détail, match par match, est sur la page Bilan.", "The full game-by-game detail is on the Track record page.", "Todo el detalle, partido a partido, está en la página Balance.", "Todo o detalhe, jogo a jogo, está na página Desempenho.");
  // Question du jour, calculée à partir des matchs déjà chargés (« favoritos para hoy nba » dans la Search Console).
  const today = favs.length ? [{
    q: L.t("Quels sont les favoris NBA du jour ?", "Who are today's NBA favorites?", "¿Cuáles son los favoritos de la NBA hoy?", "Quais são os favoritos da NBA hoje?"),
    a: L.t(
      `Selon le modèle de Basketlog, les plus gros favoris des prochains matchs NBA sont : ${favs.join(", ")}. Le pourcentage est la probabilité de victoire de chaque équipe.`,
      `According to Basketlog's model, the biggest favorites in the next NBA games are: ${favs.join(", ")}. The percentage is each team's win probability.`,
      `Según el modelo de Basketlog, los grandes favoritos de los próximos partidos de la NBA son: ${favs.join(", ")}. El porcentaje es la probabilidad de victoria de cada equipo.`, `Segundo o modelo do Basketlog, os grandes favoritos dos próximos jogos da NBA são: ${favs.join(", ")}. A porcentagem é a probabilidade de vitória de cada time.`
    ),
  }] : [];
  return [
    ...today,
    {
      q: L.t("Les pronostics basket de Basketlog sont-ils gratuits ?", "Are Basketlog's basketball predictions free?", "¿Los pronósticos de baloncesto de Basketlog son gratis?", "Os palpites de basquete do Basketlog são grátis?"),
      a: L.t(
        "Oui : le favori, les probabilités de victoire, le score projeté et le total de points de chaque match NBA et EuroLeague sont gratuits, sans inscription. L'analyse complète de chaque match est incluse dans Basketlog Pro.",
        "Yes: the favorite, win probabilities, projected score and total points for every NBA and EuroLeague game are free, no sign-up needed. The full analysis of each game comes with Basketlog Pro.",
        "Sí: el favorito, las probabilidades de victoria, el marcador proyectado y el total de puntos de cada partido de la NBA y la Euroliga son gratis, sin registro. El análisis completo de cada partido está incluido en Basketlog Pro.", "Sim: o favorito, as probabilidades de vitória, o placar projetado e o total de pontos de cada jogo da NBA e da Euroliga são grátis, sem cadastro. A análise completa de cada jogo está incluída no Basketlog Pro."
      ),
    },
    {
      q: L.t("Comment sont calculés ces pronostics ?", "How are these predictions calculated?", "¿Cómo se calculan estos pronósticos?", "Como esses palpites são calculados?"),
      a: L.t(
        "Par un modèle statistique : niveau réel des équipes, avantage du terrain et, en NBA, fatigue des back-to-back et absences pesées selon la production de chaque joueur. Le détail est sur la page Méthode.",
        "With a statistical model: each team's real strength, home-court advantage and, in the NBA, back-to-back fatigue and injuries weighted by each player's production. The details are on the Methodology page.",
        "Con un modelo estadístico: nivel real de los equipos, ventaja de jugar en casa y, en la NBA, cansancio de los back-to-back y bajas ponderadas según la producción de cada jugador. El detalle está en la página Metodología.", "Com um modelo estatístico: nível real dos times, vantagem de jogar em casa e, na NBA, cansaço dos back-to-backs e desfalques ponderados pela produção de cada jogador. O detalhe está na página Metodologia."
      ),
    },
    {
      q: L.t("Le score projeté, c'est un score exact ?", "Is the projected score an exact score?", "¿El marcador proyectado es un marcador exacto?", "O placar projetado é um placar exato?"),
      a: L.t(
        "Non : c'est le score le plus probable selon le modèle, qui croise l'attaque de chaque équipe et la défense de son adversaire. En NBA, l'écart final s'éloigne en moyenne d'une douzaine de points de l'écart prévu, c'est pourquoi Basketlog donne aussi les chances de chaque scénario.",
        "No: it's the most likely score according to the model, which combines each team's offense with its opponent's defense. In the NBA, the final margin misses the expected margin by about a dozen points on average, which is why Basketlog also gives the chances of each scenario.",
        "No: es el marcador más probable según el modelo, que cruza el ataque de cada equipo con la defensa de su rival. En la NBA, la diferencia final se aleja de media una docena de puntos de la prevista; por eso Basketlog también da las probabilidades de cada escenario.", "Não: é o placar mais provável segundo o modelo, que cruza o ataque de cada time com a defesa do adversário. Na NBA, a diferença final se afasta em média uma dúzia de pontos da prevista; por isso o Basketlog também dá as probabilidades de cada cenário."
      ),
    },
    {
      q: L.t("À quelle heure sont les matchs ?", "What time are the games?", "¿A qué hora son los partidos?", "Que horas são os jogos?"),
      a: L.t(
        "Les heures sont données à l'heure de Paris. La plupart des matchs NBA se jouent dans la nuit, les matchs d'EuroLeague en soirée.",
        "Times are shown in Eastern Time. Most NBA games tip off in the evening, EuroLeague games in the early afternoon.",
        "Las horas se indican en hora de España. La mayoría de los partidos de la NBA se juegan de madrugada y los de la Euroliga por la tarde-noche.", "Os horários estão no horário de Brasília. A maioria dos jogos da NBA acontece à noite e os da Euroliga à tarde."
      ),
    },
    {
      q: L.t("Quel est le taux de réussite des pronostics ?", "What is the predictions' track record?", "¿Cuál es el porcentaje de acierto de los pronósticos?", "Qual é a taxa de acerto dos palpites?"),
      a: rate,
    },
    {
      q: L.t("Basketlog est-il un site de paris sportifs ?", "Is Basketlog a sports betting site?", "¿Basketlog es una web de apuestas deportivas?", "O Basketlog é um site de apostas esportivas?"),
      a: L.t(
        "Non. Basketlog ne prend aucun pari : c'est un outil d'analyse. Un pronostic reste une estimation, jamais une certitude. Les jeux d'argent sont réservés aux 18 ans et plus.",
        "No. Basketlog takes no bets: it's an analysis tool. A prediction is an estimate, never a certainty. Gambling is for adults 18 and over.",
        "No. Basketlog no acepta apuestas: es una herramienta de análisis. Un pronóstico es una estimación, nunca una certeza. El juego está reservado a mayores de 18 años.", "Não. O Basketlog não aceita apostas: é uma ferramenta de análise. Um palpite é uma estimativa, nunca uma certeza. Apostas são proibidas para menores de 18 anos."
      ),
    },
  ];
}

export default async function PronosticBasketPage() {
  const L = await getL();
  const today = nbaToday();
  const season = seasonForDate(today);
  const [nbaAll, el, picks] = await Promise.all([
    upcomingGames(2).catch(() => []),
    elUpcoming(4).catch(() => ({ list: [] })),
    nbaPicks(season).catch(() => []),
  ]);
  // NBA : matchs de ce soir et de demain (dates NBA), dans l'ordre des heures.
  const tomorrow = shiftDate(today, 1);
  const nba = (nbaAll || []).filter((g) => g.d === today || g.d === tomorrow).slice(0, 20);
  const elGames = (el.list || []).slice(0, 12).map(({ g, a }) => ({
    id: g.id, date: g.date, live: g.live, home: g.home, away: g.away,
    pHome: a.pHome, homePts: a.homePts, awayPts: a.awayPts, total: a.total, confidence: a.confidence,
  }));
  const s = summarize(picks || []);
  const faq = faqOf(L, s, topFavorites(nba, L));
  const url = `${SITE}${L.href(PATH)}`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: L.t("Pronostic basket gratuit du jour : NBA et EuroLeague", "Free basketball predictions today: NBA and EuroLeague", "Pronósticos de baloncesto gratis de hoy: NBA y Euroliga", "Palpites de basquete grátis de hoje: NBA e Euroliga"),
      inLanguage: L.hreflang,
      isPartOf: { "@id": `${SITE}/#site` },
      publisher: { "@id": `${SITE}/#organisation` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Basketlog", item: `${SITE}${L.href("/")}` },
          { "@type": "ListItem", position: 2, name: L.t("Pronostic basket", "Basketball predictions", "Pronósticos de baloncesto", "Palpites de basquete"), item: url },
        ],
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <main className="app-page prose-page">
      <JsonLd data={ld} />
      <div className="app-head">
        <h1>{L.t("Pronostic basket du jour : NBA et EuroLeague", "Today's basketball predictions: NBA and EuroLeague", "Pronósticos de baloncesto de hoy: NBA y Euroliga", "Palpites de basquete de hoje: NBA e Euroliga")}</h1>
        <p>{L.t(
          "Le favori, ses chances de victoire, le score projeté et le total de points de chaque match, gratuitement et sans inscription.",
          "The favorite, its win chances, the projected score and total points for every game, free and with no sign-up.",
          "El favorito, sus probabilidades de victoria, el marcador proyectado y el total de puntos de cada partido, gratis y sin registro.", "O favorito, suas probabilidades de vitória, o placar projetado e o total de pontos de cada jogo, grátis e sem cadastro."
        )}</p>
        <p className="note">{L.t("Heures à l'heure de Paris", "All times Eastern (ET)", "Horas en hora de España", "Horários de Brasília")}</p>
      </div>

      <h2 className="ab-sec">{L.t("Pronostic NBA : ce soir et demain", "NBA predictions: tonight and tomorrow", "Pronósticos NBA: esta noche y mañana", "Palpites NBA: esta noite e amanhã")}</h2>
      <PickList games={nba} href={(g) => nbaPath(g, g.d)} L={L} />
      <p className="ab-more"><Link href={L.href("/app/matchs")}>{L.t("Tous les pronostics NBA du jour", "All of today's NBA predictions", "Todos los pronósticos NBA de hoy", "Todos os palpites NBA de hoje")}</Link></p>

      <h2 className="ab-sec">{L.t("Pronostic EuroLeague (Euroligue) : les prochains matchs", "EuroLeague predictions: upcoming games", "Pronósticos de la Euroliga: próximos partidos", "Palpites da Euroliga: próximos jogos")}</h2>
      <PickList games={elGames} href={(g) => elPath(g)} L={L} />
      <p className="ab-more"><Link href={L.href("/app/euroleague")}>{L.t("Tous les pronostics EuroLeague", "All EuroLeague predictions", "Todos los pronósticos de la Euroliga", "Todos os palpites da Euroliga")}</Link></p>

      <div className="card block">
        <h2>{L.t("Comment lire un pronostic basket", "How to read a basketball prediction", "Cómo leer un pronóstico de baloncesto", "Como ler um palpite de basquete")}</h2>
        <p className="narr">{L.t(
          "Le pourcentage est la probabilité que le favori gagne le match. Le score projeté est le score le plus probable, et le total, la somme des points attendus des deux équipes. La confiance indique à quel point le match est déséquilibré selon le modèle.",
          "The percentage is the probability that the favorite wins the game. The projected score is the most likely score, and the total is the sum of both teams' expected points. Confidence shows how lopsided the game is according to the model.",
          "El porcentaje es la probabilidad de que el favorito gane el partido. El marcador proyectado es el marcador más probable, y el total, la suma de los puntos esperados de los dos equipos. La confianza indica hasta qué punto el partido está desequilibrado según el modelo.", "A porcentagem é a probabilidade de o favorito vencer o jogo. O placar projetado é o placar mais provável, e o total é a soma dos pontos esperados dos dois times. A confiança indica o quanto o jogo é desequilibrado segundo o modelo."
        )}</p>
        <p className="narr" style={{ marginTop: 12 }}>{L.t(
          <>Une probabilité n&apos;est jamais une certitude : un favori à 70&nbsp;% perd environ trois fois sur dix. Pour comprendre chaque facteur du match, voir l&apos;<Link href="/analyse-basket">analyse basket</Link> et la <Link href="/methode">méthode</Link>.</>,
          <>A probability is never a certainty: a 70% favorite loses about three times out of ten. To understand every factor in a game, see the <Link href="/en/analyse-basket">basketball analysis</Link> page and the <Link href="/en/methode">methodology</Link>.</>,
          <>Una probabilidad nunca es una certeza: un favorito al 70&nbsp;% pierde unas tres veces de cada diez. Para entender cada factor del partido, consulta el <Link href="/es/analyse-basket">análisis de baloncesto</Link> y la <Link href="/es/methode">metodología</Link>.</>, <>Uma probabilidade nunca é uma certeza: um favorito a 70&nbsp;% perde cerca de três vezes em cada dez. Para entender cada fator do jogo, veja a <Link href="/pt/analyse-basket">análise de basquete</Link> e a <Link href="/pt/methode">metodologia</Link>.</>
        )}</p>
      </div>

      <div className="card block ab-faq">
        <h2>{L.t("Questions fréquentes sur les pronostics basket", "Basketball predictions FAQ", "Preguntas frecuentes sobre los pronósticos de baloncesto", "Perguntas frequentes sobre os palpites de basquete")}</h2>
        {faq.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p className="narr">{f.a}</p>
          </div>
        ))}
        <p className="narr" style={{ marginTop: 18 }}>
          <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du jour", "Today's NBA predictions", "Pronósticos NBA de hoy", "Palpites NBA de hoje")}</Link> · <Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague", "EuroLeague predictions", "Pronósticos Euroliga", "Palpites Euroliga")}</Link> · <Link href={L.href("/app/bilan")}>{L.t("Taux de réussite", "Track record", "Porcentaje de acierto", "Taxa de acerto")}</Link>
        </p>
      </div>
    </main>
  );
}
