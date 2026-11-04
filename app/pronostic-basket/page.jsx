import Link from "next/link";
import { upcomingGames } from "../../lib/data";
import { elUpcoming } from "../../lib/euroleague";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate, shiftDate } from "../../lib/espn";
import { confText } from "../../lib/matchtext";
import JsonLd from "../../components/JsonLd";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import { getL } from "../../lib/lang-server";
import { pctOf, fmtDate, fmtTime } from "../../lib/i18n";

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
      "Pronósticos de baloncesto gratis de hoy: NBA y Euroliga – Basketlog"
    ),
    description: L.t(
      "Pronostic basket gratuit pour chaque match NBA et EuroLeague d'aujourd'hui et de demain : favori, probabilités de victoire, score projeté et total de points.",
      "Free basketball predictions for every NBA and EuroLeague game today and tomorrow: favorite, win probabilities, projected score and total points.",
      "Pronósticos de baloncesto gratis para cada partido de la NBA y la Euroliga de hoy y mañana: favorito, probabilidades de victoria, marcador proyectado y total de puntos."
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
        {L.t("Favori", "Favorite", "Favorito")}{L.fr ? " :" : ":"} <b>{fav.short} {pctOf(p, L)}</b>
        {g.confidence ? <small>{L.t("Confiance", "Confidence", "Confianza")} {confText(g.confidence, L).toLowerCase()}</small> : null}
      </span>
      <span className="pk-score">{L.t("Score projeté", "Projected score", "Marcador proyectado")} <b>{Math.round(g.awayPts)}-{Math.round(g.homePts)}</b> · {L.t("total", "total", "total")} <b>{Math.round(g.total)}</b></span>
    </Link>
  );
}

// Lignes regroupées par jour (fuseau de la langue de la page).
function PickList({ games, href, L }) {
  if (!games.length) return <div className="empty">{L.t("Aucun match au programme pour le moment.", "No games scheduled right now.", "No hay partidos programados por ahora.")}</div>;
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

function faqOf(L, s) {
  const rate = s.n > 0
    ? L.t(
      `Cette saison, le modèle a trouvé le bon vainqueur dans ${pctOf(s.pct, L)} des ${s.n} matchs NBA terminés. Tout le détail, match par match, est sur la page Bilan.`,
      `This season, the model has picked the right winner in ${pctOf(s.pct, L)} of ${s.n} completed NBA games. The full game-by-game detail is on the Track record page.`,
      `Esta temporada, el modelo ha acertado el ganador en el ${pctOf(s.pct, L)} de los ${s.n} partidos NBA terminados. Todo el detalle, partido a partido, está en la página Balance.`
    )
    : L.t("Tout le détail, match par match, est sur la page Bilan.", "The full game-by-game detail is on the Track record page.", "Todo el detalle, partido a partido, está en la página Balance.");
  return [
    {
      q: L.t("Les pronostics basket de Basketlog sont-ils gratuits ?", "Are Basketlog's basketball predictions free?", "¿Los pronósticos de baloncesto de Basketlog son gratis?"),
      a: L.t(
        "Oui : le favori, les probabilités de victoire, le score projeté et le total de points de chaque match NBA et EuroLeague sont gratuits, sans inscription. L'analyse complète de chaque match est incluse dans Basketlog Pro.",
        "Yes: the favorite, win probabilities, projected score and total points for every NBA and EuroLeague game are free, no sign-up needed. The full analysis of each game comes with Basketlog Pro.",
        "Sí: el favorito, las probabilidades de victoria, el marcador proyectado y el total de puntos de cada partido de la NBA y la Euroliga son gratis, sin registro. El análisis completo de cada partido está incluido en Basketlog Pro."
      ),
    },
    {
      q: L.t("Comment sont calculés ces pronostics ?", "How are these predictions calculated?", "¿Cómo se calculan estos pronósticos?"),
      a: L.t(
        "Par un modèle statistique : niveau réel des équipes, avantage du terrain et, en NBA, fatigue des back-to-back et absences pesées selon la production de chaque joueur. Le détail est sur la page Méthode.",
        "With a statistical model: each team's real strength, home-court advantage and, in the NBA, back-to-back fatigue and injuries weighted by each player's production. The details are on the Methodology page.",
        "Con un modelo estadístico: nivel real de los equipos, ventaja de jugar en casa y, en la NBA, cansancio de los back-to-back y bajas ponderadas según la producción de cada jugador. El detalle está en la página Metodología."
      ),
    },
    {
      q: L.t("Le score projeté, c'est un score exact ?", "Is the projected score an exact score?", "¿El marcador proyectado es un marcador exacto?"),
      a: L.t(
        "Non : c'est le score le plus probable selon le modèle, qui croise l'attaque de chaque équipe et la défense de son adversaire. En NBA, l'écart final s'éloigne en moyenne d'une douzaine de points de l'écart prévu, c'est pourquoi Basketlog donne aussi les chances de chaque scénario.",
        "No: it's the most likely score according to the model, which combines each team's offense with its opponent's defense. In the NBA, the final margin misses the expected margin by about a dozen points on average, which is why Basketlog also gives the chances of each scenario.",
        "No: es el marcador más probable según el modelo, que cruza el ataque de cada equipo con la defensa de su rival. En la NBA, la diferencia final se aleja de media una docena de puntos de la prevista; por eso Basketlog también da las probabilidades de cada escenario."
      ),
    },
    {
      q: L.t("À quelle heure sont les matchs ?", "What time are the games?", "¿A qué hora son los partidos?"),
      a: L.t(
        "Les heures sont données à l'heure de Paris. La plupart des matchs NBA se jouent dans la nuit, les matchs d'EuroLeague en soirée.",
        "Times are shown in Eastern Time. Most NBA games tip off in the evening, EuroLeague games in the early afternoon.",
        "Las horas se indican en hora de España. La mayoría de los partidos de la NBA se juegan de madrugada y los de la Euroliga por la tarde-noche."
      ),
    },
    {
      q: L.t("Quel est le taux de réussite des pronostics ?", "What is the predictions' track record?", "¿Cuál es el porcentaje de acierto de los pronósticos?"),
      a: rate,
    },
    {
      q: L.t("Basketlog est-il un site de paris sportifs ?", "Is Basketlog a sports betting site?", "¿Basketlog es una web de apuestas deportivas?"),
      a: L.t(
        "Non. Basketlog ne prend aucun pari : c'est un outil d'analyse. Un pronostic reste une estimation, jamais une certitude. Les jeux d'argent sont réservés aux 18 ans et plus.",
        "No. Basketlog takes no bets: it's an analysis tool. A prediction is an estimate, never a certainty. Gambling is for adults 18 and over.",
        "No. Basketlog no acepta apuestas: es una herramienta de análisis. Un pronóstico es una estimación, nunca una certeza. El juego está reservado a mayores de 18 años."
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
  const faq = faqOf(L, s);
  const url = `${SITE}${L.href(PATH)}`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#page`,
      url,
      name: L.t("Pronostic basket gratuit du jour : NBA et EuroLeague", "Free basketball predictions today: NBA and EuroLeague", "Pronósticos de baloncesto gratis de hoy: NBA y Euroliga"),
      inLanguage: L.hreflang,
      isPartOf: { "@id": `${SITE}/#site` },
      publisher: { "@id": `${SITE}/#organisation` },
      breadcrumb: {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Basketlog", item: `${SITE}${L.href("/")}` },
          { "@type": "ListItem", position: 2, name: L.t("Pronostic basket", "Basketball predictions", "Pronósticos de baloncesto"), item: url },
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
        <h1>{L.t("Pronostic basket du jour : NBA et EuroLeague", "Today's basketball predictions: NBA and EuroLeague", "Pronósticos de baloncesto de hoy: NBA y Euroliga")}</h1>
        <p>{L.t(
          "Le favori, ses chances de victoire, le score projeté et le total de points de chaque match, gratuitement et sans inscription.",
          "The favorite, its win chances, the projected score and total points for every game, free and with no sign-up.",
          "El favorito, sus probabilidades de victoria, el marcador proyectado y el total de puntos de cada partido, gratis y sin registro."
        )}</p>
        <p className="note">{L.t("Heures à l'heure de Paris", "All times Eastern (ET)", "Horas en hora de España")}</p>
      </div>

      <h2 className="ab-sec">{L.t("Pronostic NBA : ce soir et demain", "NBA predictions: tonight and tomorrow", "Pronósticos NBA: esta noche y mañana")}</h2>
      <PickList games={nba} href={(g) => `/app/match/${g.id}?d=${g.d}`} L={L} />
      <p className="ab-more"><Link href={L.href("/app/matchs")}>{L.t("Tous les pronostics NBA du jour", "All of today's NBA predictions", "Todos los pronósticos NBA de hoy")}</Link></p>

      <h2 className="ab-sec">{L.t("Pronostic EuroLeague (Euroligue) : les prochains matchs", "EuroLeague predictions: upcoming games", "Pronósticos de la Euroliga: próximos partidos")}</h2>
      <PickList games={elGames} href={(g) => `/app/euroleague/match/${g.id}`} L={L} />
      <p className="ab-more"><Link href={L.href("/app/euroleague")}>{L.t("Tous les pronostics EuroLeague", "All EuroLeague predictions", "Todos los pronósticos de la Euroliga")}</Link></p>

      <div className="card block">
        <h2>{L.t("Comment lire un pronostic basket", "How to read a basketball prediction", "Cómo leer un pronóstico de baloncesto")}</h2>
        <p className="narr">{L.t(
          "Le pourcentage est la probabilité que le favori gagne le match. Le score projeté est le score le plus probable, et le total, la somme des points attendus des deux équipes. La confiance indique à quel point le match est déséquilibré selon le modèle.",
          "The percentage is the probability that the favorite wins the game. The projected score is the most likely score, and the total is the sum of both teams' expected points. Confidence shows how lopsided the game is according to the model.",
          "El porcentaje es la probabilidad de que el favorito gane el partido. El marcador proyectado es el marcador más probable, y el total, la suma de los puntos esperados de los dos equipos. La confianza indica hasta qué punto el partido está desequilibrado según el modelo."
        )}</p>
        <p className="narr" style={{ marginTop: 12 }}>{L.t(
          <>Une probabilité n&apos;est jamais une certitude : un favori à 70&nbsp;% perd environ trois fois sur dix. Pour comprendre chaque facteur du match, voir l&apos;<Link href="/analyse-basket">analyse basket</Link> et la <Link href="/methode">méthode</Link>.</>,
          <>A probability is never a certainty: a 70% favorite loses about three times out of ten. To understand every factor in a game, see the <Link href="/en/analyse-basket">basketball analysis</Link> page and the <Link href="/en/methode">methodology</Link>.</>,
          <>Una probabilidad nunca es una certeza: un favorito al 70&nbsp;% pierde unas tres veces de cada diez. Para entender cada factor del partido, consulta el <Link href="/es/analyse-basket">análisis de baloncesto</Link> y la <Link href="/es/methode">metodología</Link>.</>
        )}</p>
      </div>

      <div className="card block ab-faq">
        <h2>{L.t("Questions fréquentes sur les pronostics basket", "Basketball predictions FAQ", "Preguntas frecuentes sobre los pronósticos de baloncesto")}</h2>
        {faq.map((f) => (
          <div key={f.q}>
            <h3>{f.q}</h3>
            <p className="narr">{f.a}</p>
          </div>
        ))}
        <p className="narr" style={{ marginTop: 18 }}>
          <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du jour", "Today's NBA predictions", "Pronósticos NBA de hoy")}</Link> · <Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague", "EuroLeague predictions", "Pronósticos Euroliga")}</Link> · <Link href={L.href("/app/bilan")}>{L.t("Taux de réussite", "Track record", "Porcentaje de acierto")}</Link>
        </p>
      </div>
    </main>
  );
}
