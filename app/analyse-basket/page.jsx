import Link from "next/link";
import { upcomingGames } from "../../lib/data";
import { elUpcoming } from "../../lib/euroleague";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate } from "../../lib/espn";
import UpcomingList from "../../components/UpcomingList";
import JsonLd from "../../components/JsonLd";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import { getL } from "../../lib/lang-server";
import { pctOf } from "../../lib/i18n";

// Page d'entrée Google pour « analyse basket » : les analyses du moment (liens vers chaque fiche match),
// ce que contient une analyse Basketlog, comment la lire, et les questions fréquentes.
export const dynamic = "force-dynamic";

const PATH = "/analyse-basket";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t(
      "Analyse basket : NBA et EuroLeague, match par match – Basketlog",
      "Basketball analysis: NBA and EuroLeague, game by game – Basketlog",
      "Análisis de baloncesto: NBA y Euroliga, partido a partido – Basketlog"
    ),
    description: L.t(
      "Analyse basket gratuite de chaque match NBA et EuroLeague : probabilités de victoire, score projeté, scénarios, forme, absences et fatigue. Bilan public.",
      "Free basketball analysis for every NBA and EuroLeague game: win probabilities, projected score, scenarios, form, injuries and fatigue. Public track record.",
      "Análisis de baloncesto gratis de cada partido de la NBA y la Euroliga: probabilidades de victoria, marcador proyectado, escenarios, forma, bajas y cansancio."
    ),
    path: PATH,
    L,
  });
}

function faqOf(L) {
  return [
    {
      q: L.t("L'analyse basket de Basketlog est-elle gratuite ?", "Is Basketlog's basketball analysis free?", "¿El análisis de baloncesto de Basketlog es gratis?"),
      a: L.t(
        "Oui pour l'essentiel : les probabilités de victoire de tous les matchs NBA et EuroLeague sont gratuites, sans inscription, avec la forme récente, un résumé rapide, le scénario n° 1 et la confiance du modèle. L'analyse complète (argumentation du modèle, tous les scénarios, stats comparées, joueurs, infirmerie, actualités en temps réel) est incluse dans Basketlog Pro.",
        "Mostly, yes: win probabilities for every NBA and EuroLeague game are free, no sign-up needed, along with recent form, a quick summary, the #1 scenario and the model's confidence. The full analysis (the model's reasoning, every scenario, stat comparison, players, injury report, real-time news) comes with Basketlog Pro.",
        "En lo esencial, sí: las probabilidades de victoria de todos los partidos de la NBA y la Euroliga son gratis, sin registro, con la forma reciente, un resumen rápido, el escenario n.º 1 y la confianza del modelo. El análisis completo (argumentación del modelo, todos los escenarios, estadísticas comparadas, jugadores, parte médico, noticias en tiempo real) está incluido en Basketlog Pro."
      ),
    },
    {
      q: L.t("Quels matchs sont analysés ?", "Which games are analyzed?", "¿Qué partidos se analizan?"),
      a: L.t(
        "Chaque match NBA et chaque match d'EuroLeague, plusieurs jours avant le coup d'envoi. L'analyse se met à jour jusqu'au match, par exemple quand un joueur est déclaré absent.",
        "Every NBA game and every EuroLeague game, several days before tip-off. The analysis keeps updating until the game, for example when a player is ruled out.",
        "Cada partido de la NBA y cada partido de la Euroliga, varios días antes del salto inicial. El análisis se actualiza hasta el partido, por ejemplo cuando se confirma la baja de un jugador."
      ),
    },
    {
      q: L.t("Où trouver une analyse NBA pour ce soir ?", "Where can I find an NBA analysis for tonight?", "¿Dónde encuentro un análisis NBA para esta noche?"),
      a: L.t(
        "Chaque match NBA de ce soir a sa fiche d'analyse sur Basketlog : probabilités, score projeté, forme, absences. La liste complète est sur la page Pronostics NBA du jour, et les matchs NBA et EuroLeague du jour sont réunis sur la page Pronostic basket.",
        "Every NBA game tonight has its own analysis page on Basketlog: probabilities, projected score, form, injuries. The full list is on the Today's NBA predictions page, and the day's NBA and EuroLeague games are gathered on the Basketball predictions page.",
        "Cada partido de la NBA de esta noche tiene su ficha de análisis en Basketlog: probabilidades, marcador proyectado, forma, bajas. La lista completa está en la página Pronósticos NBA de hoy, y los partidos de la NBA y la Euroliga del día están reunidos en la página Pronósticos de baloncesto."
      ),
    },
    {
      q: L.t("Quelle différence entre une analyse et un pronostic ?", "What's the difference between an analysis and a prediction?", "¿Qué diferencia hay entre un análisis y un pronóstico?"),
      a: L.t(
        "Un pronostic donne un vainqueur ; une analyse explique pourquoi et avec quelles chances. Basketlog donne les deux : le favori, sa probabilité de gagner et les facteurs qui la font bouger.",
        "A prediction names a winner; an analysis explains why and with what chances. Basketlog gives you both: the favorite, its win probability and the factors that move it.",
        "Un pronóstico da un ganador; un análisis explica por qué y con qué probabilidades. Basketlog da las dos cosas: el favorito, su probabilidad de ganar y los factores que la mueven."
      ),
    },
    {
      q: L.t("D'où viennent les données ?", "Where does the data come from?", "¿De dónde salen los datos?"),
      a: L.t(
        "Des flux publics de la NBA et de l'EuroLeague : calendrier, scores, statistiques, classements et liste des joueurs blessés, mis à jour en continu.",
        "From the public NBA and EuroLeague feeds: schedule, scores, stats, standings and injury reports, updated continuously.",
        "De las fuentes públicas de la NBA y la Euroliga: calendario, resultados, estadísticas, clasificaciones y parte médico, actualizados continuamente."
      ),
    },
    {
      q: L.t("Basketlog permet-il de parier ?", "Can I bet on Basketlog?", "¿Se puede apostar en Basketlog?"),
      a: L.t(
        "Non. Basketlog est un outil d'analyse pour mieux comprendre les matchs. Aucune prise de pari ne se fait ici et aucune probabilité n'est une garantie.",
        "No. Basketlog is an analysis tool to understand games better. No bets are taken here and no probability is a guarantee.",
        "No. Basketlog es una herramienta de análisis para entender mejor los partidos. Aquí no se aceptan apuestas y ninguna probabilidad es una garantía."
      ),
    },
  ];
}

export default async function AnalyseBasketPage() {
  const L = await getL();
  const season = seasonForDate(nbaToday());
  const [nbaAll, el, picks] = await Promise.all([
    upcomingGames(2).catch(() => []),
    elUpcoming(7).catch(() => ({ list: [] })),
    nbaPicks(season).catch(() => []),
  ]);
  const nba = (nbaAll || []).slice(0, 12);
  const elGames = (el.list || [])
    .slice(0, 10)
    .map(({ g, a }) => ({ id: g.id, date: g.date, state: a.game.state, live: g.live, home: g.home, away: g.away, pHome: a.pHome }));
  const s = summarize(picks || []);
  const faq = faqOf(L);
  const url = `${SITE}${L.href(PATH)}`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: L.t("Analyse basket : NBA et EuroLeague, match par match", "Basketball analysis: NBA and EuroLeague, game by game", "Análisis de baloncesto: NBA y Euroliga, partido a partido"),
      inLanguage: L.hreflang,
      isPartOf: { "@id": `${SITE}/#site` },
      publisher: { "@id": `${SITE}/#organisation` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Basketlog", item: `${SITE}${L.href("/")}` },
          { "@type": "ListItem", position: 2, name: L.t("Analyse basket", "Basketball analysis", "Análisis de baloncesto"), item: url },
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
        <h1>{L.t("Analyse basket : chaque match NBA et EuroLeague, avant le coup d'envoi", "Basketball analysis: every NBA and EuroLeague game, before tip-off", "Análisis de baloncesto: cada partido de la NBA y la Euroliga, antes del salto inicial")}</h1>
        <p>{L.t(
          "Basketlog analyse chaque match avec un modèle statistique transparent, vérifié en public. Les probabilités sont gratuites, sans inscription.",
          "Basketlog analyzes every game with a transparent statistical model, verified in public. Probabilities are free, no sign-up needed.",
          "Basketlog analiza cada partido con un modelo estadístico transparente, verificado en público. Las probabilidades son gratis, sin registro."
        )}</p>
      </div>

      <h2 className="ab-sec">{L.t("Analyse NBA : les matchs à venir", "NBA analysis: upcoming games", "Análisis NBA: próximos partidos")}</h2>
      <UpcomingList games={nba} title="" L={L} />
      <p className="ab-more"><Link href={L.href("/app/matchs")}>{L.t("Tous les pronostics NBA du jour", "All of today's NBA predictions", "Todos los pronósticos NBA de hoy")}</Link> · <Link href={L.href("/pronostic-basket")}>{L.t("Pronostic basket du jour", "Today's basketball predictions", "Pronósticos de baloncesto de hoy")}</Link></p>

      <h2 className="ab-sec">{L.t("Analyse EuroLeague : les matchs à venir", "EuroLeague analysis: upcoming games", "Análisis de la Euroliga: próximos partidos")}</h2>
      <UpcomingList games={elGames} title="" L={L} href={(g) => `/app/euroleague/match/${g.id}`} />
      <p className="ab-more"><Link href={L.href("/app/euroleague")}>{L.t("Tous les pronostics EuroLeague", "All EuroLeague predictions", "Todos los pronósticos de la Euroliga")}</Link></p>

      <div className="card block">
        <h2>{L.t("Ce que contient une analyse basket Basketlog", "What a Basketlog basketball analysis includes", "Qué incluye un análisis de baloncesto de Basketlog")}</h2>
        <p className="narr">{L.t(
          "Pour chaque match, Basketlog estime l'écart de points attendu entre les deux équipes, puis le transforme en chances de victoire. Chaque analyse donne :",
          "For every game, Basketlog estimates the expected point margin between the two teams, then turns it into win chances. Every analysis gives you:",
          "Para cada partido, Basketlog estima la diferencia de puntos esperada entre los dos equipos y luego la convierte en probabilidades de victoria. Cada análisis incluye:"
        )}</p>
        <ul className="narr ab-list">
          <li>{L.t("la probabilité de victoire de chaque équipe ;", "each team's win probability;", "la probabilidad de victoria de cada equipo;")}</li>
          <li>{L.t("le score projeté, qui croise l'attaque de chaque équipe et la défense de son adversaire ;", "the projected score, which combines each team's offense with its opponent's defense;", "el marcador proyectado, que cruza el ataque de cada equipo con la defensa de su rival;")}</li>
          <li>{L.t("les scénarios du match : match serré (5 points d'écart ou moins), victoire de 6 à 9 points ou large victoire (10 points ou plus) ;", "the game scenarios: a close game (5 points or fewer), a 6-to-9-point win or a blowout (10 points or more);", "los escenarios del partido: partido igualado (5 puntos o menos), victoria por 6 a 9 puntos o victoria amplia (10 puntos o más);")}</li>
          <li>{L.t("la forme récente et le niveau réel des deux équipes ;", "both teams' recent form and real strength;", "la forma reciente y el nivel real de los dos equipos;")}</li>
          <li>{L.t("en NBA, les facteurs du jour : avantage du terrain, fatigue des back-to-back et absences, pesées selon la production de chaque joueur absent ;", "in the NBA, the factors of the day: home-court advantage, back-to-back fatigue and injuries, weighted by each missing player's production;", "en la NBA, los factores del día: ventaja de jugar en casa, cansancio de los back-to-back y bajas, ponderadas según la producción de cada jugador ausente;")}</li>
          <li>{L.t("le niveau de confiance du modèle.", "the model's confidence level.", "el nivel de confianza del modelo.")}</li>
        </ul>
        <p className="narr" style={{ marginTop: 12 }}>{L.t(
          <>Les probabilités, la forme récente, un résumé rapide, le scénario n° 1 et la confiance du modèle sont gratuits. L&apos;analyse complète fait partie de <Link href="/pro">Basketlog Pro</Link>.</>,
          <>Probabilities, recent form, a quick summary, the #1 scenario and the model&apos;s confidence are free. The full analysis comes with <Link href="/en/pro">Basketlog Pro</Link>.</>,
          <>Las probabilidades, la forma reciente, un resumen rápido, el escenario n.º 1 y la confianza del modelo son gratis. El análisis completo forma parte de <Link href="/es/pro">Basketlog Pro</Link>.</>
        )}</p>
      </div>

      <div className="card block">
        <h2>{L.t("Comment lire une analyse basket", "How to read a basketball analysis", "Cómo leer un análisis de baloncesto")}</h2>
        <p className="narr">{L.t(
          "Une probabilité n'est jamais une certitude : un favori à 70 % perd environ trois fois sur dix. L'intérêt d'une analyse est de savoir à quel point un match est déséquilibré, et pourquoi.",
          "A probability is never a certainty: a 70% favorite loses about three times out of ten. The point of an analysis is to know how lopsided a game is, and why.",
          "Una probabilidad nunca es una certeza: un favorito al 70 % pierde unas tres veces de cada diez. Lo interesante de un análisis es saber hasta qué punto un partido está desequilibrado, y por qué."
        )}</p>
        <p className="narr" style={{ marginTop: 12 }}>
          {L.t(
            <>Chaque pronostic est ensuite comparé au score final sur la page <Link href="/app/bilan">Bilan du modèle</Link>{s.n > 0 ? <> : cette saison, le modèle a trouvé le bon vainqueur dans <b>{pctOf(s.pct, L)}</b> des {s.n} matchs NBA terminés.</> : "."}</>,
            <>Every prediction is then compared with the final score on the <Link href="/en/app/bilan">Model track record</Link> page{s.n > 0 ? <>: this season, the model has picked the right winner in <b>{pctOf(s.pct, L)}</b> of {s.n} completed NBA games.</> : "."}</>,
            <>Después, cada pronóstico se compara con el resultado final en la página <Link href="/es/app/bilan">Balance del modelo</Link>{s.n > 0 ? <>: esta temporada, el modelo ha acertado el ganador en el <b>{pctOf(s.pct, L)}</b> de los {s.n} partidos NBA terminados.</> : "."}</>
          )}
        </p>
      </div>

      <div className="card block">
        <h2>{L.t("Analyse basket NBA et EuroLeague : ce qui change", "NBA vs EuroLeague analysis: what changes", "Análisis NBA y Euroliga: qué cambia")}</h2>
        <p className="narr">{L.t(
          <>En NBA, le modèle tient compte du niveau des équipes, de l&apos;avantage du terrain (environ 2,3 points), de la fatigue des équipes qui ont joué la veille et des absences. En EuroLeague, il s&apos;appuie sur le niveau des clubs et sur l&apos;avantage du terrain, bien plus marqué en Europe (environ 3,2 points). Tout le détail du calcul est sur la page <Link href="/methode">Méthode</Link>.</>,
          <>In the NBA, the model accounts for team strength, home-court advantage (about 2.3 points), fatigue for teams that played the night before, and injuries. In the EuroLeague, it relies on club strength and home-court advantage, which matters far more in Europe (about 3.2 points). The full calculation is explained on the <Link href="/en/methode">Methodology</Link> page.</>,
          <>En la NBA, el modelo tiene en cuenta el nivel de los equipos, la ventaja de jugar en casa (unos 2,3 puntos), el cansancio de los equipos que jugaron la noche anterior y las bajas. En la Euroliga, se apoya en el nivel de los clubes y en la ventaja de jugar en casa, mucho más marcada en Europa (unos 3,2 puntos). Todo el detalle del cálculo está en la página <Link href="/es/methode">Metodología</Link>.</>
        )}</p>
      </div>

      <div className="card block ab-faq">
        <h2>{L.t("Questions fréquentes sur l'analyse basket", "Basketball analysis FAQ", "Preguntas frecuentes sobre el análisis de baloncesto")}</h2>
        {faq.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p className="narr">{f.a}</p>
          </div>
        ))}
        <p className="narr" style={{ marginTop: 18 }}>
          <Link href={L.href("/app/matchs")}>{L.t("Voir les analyses de ce soir", "See tonight's analyses", "Ver los análisis de esta noche")}</Link> · <Link href={L.href("/methode")}>{L.t("Méthode", "Methodology", "Metodología")}</Link> · <Link href={L.href("/app/bilan")}>{L.t("Taux de réussite", "Track record", "Porcentaje de acierto")}</Link>
        </p>
      </div>
    </main>
  );
}
