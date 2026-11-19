import Link from "next/link";
import { upcomingGames } from "../../../lib/data";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import { pageMeta, topFavorites, oddsImage } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { SITE } from "../../../lib/site";
import { nbaPath } from "../../../lib/slug";
import Crumbs from "../../../components/Crumbs";
import { simulateCup } from "../../../lib/sim";
import { teamById } from "../../../lib/teams";
import { fmtDate } from "../../../lib/i18n";
import { probTxt } from "../../../lib/probtxt";

// Dates officielles 2026 (NBA.com) : fin des groupes le 27 nov., quarts les 4-5 déc. et demies les 8-9 déc. chez
// la mieux classée, finale le 11 déc. à Hinkle Fieldhouse (Indianapolis).
const DATES = { groups: "2026-11-27T12:00:00Z", qf: "2026-12-04T12:00:00Z", sf: "2026-12-08T12:00:00Z", final: "2026-12-11T12:00:00Z" };

export const dynamic = "force-dynamic";

// Recherche US de saison (novembre-décembre) : « nba cup predictions ». Les matchs de la NBA Cup sont repérés
// grâce à la mention ESPN du match (« Emirates NBA Cup - East Group B »…).
const isCup = (g) => /cup/i.test(g.note || "");
const yearOf = () => new Date().getFullYear();

export async function generateMetadata() {
  const L = await getL();
  const y = yearOf();
  let image = null;
  try {
    const top = Object.entries((await simulateCup()).odds).sort((a, b) => b[1].cup - a[1].cup).map(([id, o]) => [teamById(id)?.short || id, o.cup]);
    if (top.length) image = oddsImage(L.t(`Qui va gagner la NBA Cup ${y} ?`, `Who will win the ${y} NBA Cup?`, `¿Quién ganará la NBA Cup ${y}?`, `Quem vai ganhar a NBA Cup ${y}?`), L.t("Chances de victoire, 6 000 simulations", "Odds to win, 6,000 simulations", "Opciones de ganar, 6.000 simulaciones", "Chances de vitória, 6.000 simulações"), top);
  } catch {}
  return pageMeta({
    image,
    title: L.t(`NBA Cup ${y} : pronostic, groupes et qui va gagner la Coupe`, `NBA Cup ${y} predictions: groups, odds and who will win`, `NBA Cup ${y}: pronóstico, grupos y quién ganará la Copa`, `NBA Cup ${y}: palpite, grupos e quem vai ganhar a Copa`),
    description: L.t(
      `NBA Cup ${y} : classement des 6 groupes, chances de qualification pour les quarts et de victoire finale de chaque équipe (6 000 simulations), et pronostic de chaque match. Finale le 11 décembre à Indianapolis.`,
      `${y} NBA Cup: all 6 group standings, every team's chances to reach the quarterfinals and win the Cup (6,000 simulations), and a prediction for every game. Final on Dec. 11 in Indianapolis.`,
      `NBA Cup ${y}: clasificación de los 6 grupos, opciones de cada equipo de llegar a cuartos y de ganar la Copa (6.000 simulaciones) y pronóstico de cada partido. Final el 11 de diciembre en Indianápolis.`, `NBA Cup ${y}: classificação dos 6 grupos, chances de cada time chegar às quartas e ganhar a Copa (6.000 simulações) e palpite de cada jogo. Final em 11 de dezembro em Indianápolis.`
    ),
    path: "/app/nba-cup",
    L,
  });
}

function GroupTable({ g, i, odds, L }) {
  // Numéro d'ordre seulement (pas la lettre officielle, que la source ne donne pas).
  const letter = (g.conf === "E" ? i : i - 3) + 1;
  const confName = g.conf === "E" ? L.t("Est", "East", "Este", "Leste") : L.t("Ouest", "West", "Oeste", "Oeste");
  return (
    <div className="panel">
      <div className="panel-label" style={{ marginBottom: 8 }}>{L.t(`GROUPE ${confName.toUpperCase()} N° ${letter}`, `${confName.toUpperCase()} GROUP #${letter}`, `GRUPO ${confName.toUpperCase()} N.º ${letter}`, `GRUPO ${confName.toUpperCase()} N.º ${letter}`)} · {L.t(`${g.played}/${g.total} matchs joués`, `${g.played}/${g.total} games played`, `${g.played}/${g.total} partidos jugados`, `${g.played}/${g.total} jogos disputados`)}</div>
      <div className="tbl-scroll">
        <table className="std-table sim-table" style={{ minWidth: 0 }}>
          <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th><th>{L.t("Écart", "Diff", "Dif.", "Saldo")}</th><th>{L.t("Quarts", "QF", "Cuartos", "Quartas")}</th><th>{L.t("Coupe", "Cup", "Copa", "Copa")}</th></tr></thead>
          <tbody>
            {g.table.map((r, k) => {
              const t = teamById(r.id);
              const o = odds[r.id] || {};
              return (
                <tr key={r.id}>
                  <td className="rk">{k + 1}</td>
                  <td className="tm"><Link href={L.href(`/app/equipe/${r.id}`)}><span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={t?.logo} alt="" />{t?.short}</span></Link></td>
                  <td>{r.w}-{r.l}</td>
                  <td className={r.diff > 0 ? "pos" : r.diff < 0 ? "neg" : ""}>{r.diff > 0 ? "+" : ""}{r.diff}</td>
                  <td className={o.qf >= 0.5 ? "pos" : ""}>{probTxt(o.qf, L)}</td>
                  <td>{probTxt(o.cup, L)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function NbaCupPage() {
  const L = await getL();
  let games = [];
  try { games = (await upcomingGames(21)).filter(isCup); } catch {}
  let cup = null;
  try { cup = await simulateCup(); } catch {}
  const favs = topFavorites(games, L);
  const y = yearOf();
  const d = (iso, long = false) => fmtDate(L, iso, long ? { weekday: "long", day: "numeric", month: "long" } : { day: "numeric", month: "long" });
  const odds = cup?.odds || {};
  const groups = cup?.groups || [];
  const ranked = Object.entries(odds).map(([id, o]) => ({ id, ...o, team: teamById(id) })).filter((x) => x.team).sort((a, b) => b.cup - a.cup);
  const p = (x) => probTxt(x, L);
  const fav3 = ranked.slice(0, 3).map((x) => `${x.team.short} (${p(x.cup)})`).join(", ");
  const sure = ranked.filter((x) => x.qf > 0.995).map((x) => x.team.short);
  const groupsDone = groups.length && groups.every((g) => g.played === g.total);
  const faq = ranked.length ? [
    {
      q: L.t(`Qui va gagner la NBA Cup ${y} ?`, `Who will win the ${y} NBA Cup?`, `¿Quién ganará la NBA Cup ${y}?`, `Quem vai ganhar a NBA Cup ${y}?`),
      a: L.t(`Selon 6 000 simulations du modèle Basketlog, les favoris sont ${fav3}. Ces chances tiennent compte des matchs de groupe déjà joués.`, `According to 6,000 simulations of the Basketlog model, the favorites are ${fav3}. These odds account for the group games already played.`, `Según 6.000 simulaciones del modelo de Basketlog, los favoritos son ${fav3}. Estas opciones tienen en cuenta los partidos de grupo ya jugados.`, `Segundo 6.000 simulações do modelo do Basketlog, os favoritos são ${fav3}. Essas chances levam em conta os jogos de grupo já disputados.`),
    },
    {
      q: L.t(`Quand ont lieu les quarts, les demies et la finale de la NBA Cup ${y} ?`, `When are the ${y} NBA Cup quarterfinals, semifinals and final?`, `¿Cuándo son los cuartos, las semifinales y la final de la NBA Cup ${y}?`, `Quando são as quartas, as semifinais e a final da NBA Cup ${y}?`),
      a: L.t(`La phase de groupes se termine le ${d(DATES.groups)}. Quarts de finale les 4 et 5 décembre, demi-finales les 8 et 9 décembre, chez l'équipe la mieux classée. Finale le ${d(DATES.final, true)} au Hinkle Fieldhouse d'Indianapolis.`,
        `Group play ends on ${d(DATES.groups)}. Quarterfinals on Dec. 4-5 and semifinals on Dec. 8-9, at the higher seed's arena. The final is on ${d(DATES.final, true)} at Hinkle Fieldhouse in Indianapolis.`,
        `La fase de grupos termina el ${d(DATES.groups)}. Cuartos de final el 4 y 5 de diciembre, semifinales el 8 y 9 de diciembre, en la cancha del mejor clasificado. Final el ${d(DATES.final, true)} en el Hinkle Fieldhouse de Indianápolis.`,
        `A fase de grupos termina em ${d(DATES.groups)}. Quartas de final em 4 e 5 de dezembro, semifinais em 8 e 9 de dezembro, na casa do mais bem classificado. Final em ${d(DATES.final, true)} no Hinkle Fieldhouse, em Indianápolis.`),
    },
    {
      q: L.t("Comment se qualifier pour les quarts de finale ?", "How do teams qualify for the quarterfinals?", "¿Cómo se clasifican los equipos para cuartos?", "Como os times se classificam para as quartas?"),
      a: L.t("Les 6 premiers de groupe et un repêché par conférence (le meilleur deuxième) vont en quarts. Départage : confrontation directe, écart de points en phase de groupes (les prolongations comptent 0), points marqués, bilan de la saison passée.",
        "The 6 group winners plus one wild card per conference (the best second-place team) reach the quarterfinals. Tiebreakers: head-to-head, group-play point differential (overtime counts as 0), points scored, last season's record.",
        "Los 6 primeros de grupo y un comodín por conferencia (el mejor segundo) pasan a cuartos. Desempate: enfrentamiento directo, diferencia de puntos en la fase de grupos (las prórrogas cuentan 0), puntos anotados, balance de la temporada pasada.",
        "Os 6 primeiros de grupo e um repescado por conferência (o melhor segundo colocado) vão às quartas. Desempate: confronto direto, saldo de pontos na fase de grupos (prorrogações contam 0), pontos marcados, campanha da temporada passada."),
    },
    ...(sure.length ? [{
      q: L.t("Quelles équipes sont déjà quasi qualifiées ?", "Which teams have all but clinched a quarterfinal spot?", "¿Qué equipos están prácticamente clasificados?", "Quais times estão praticamente classificados?"),
      a: L.t(`Plus de 99 % de chances de jouer les quarts : ${sure.join(", ")}.`, `Over 99% chance to play in the quarterfinals: ${sure.join(", ")}.`, `Más de un 99 % de opciones de jugar los cuartos: ${sure.join(", ")}.`, `Mais de 99 % de chance de jogar as quartas: ${sure.join(", ")}.`),
    }] : []),
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const event = { "@context": "https://schema.org", "@type": "SportsEvent", name: `NBA Cup ${y} Championship`, startDate: "2026-12-11", sport: "Basketball", location: { "@type": "Place", name: "Hinkle Fieldhouse", address: "Indianapolis, IN, USA" } };
  let ei = 0, wi = 0;
  return (
    <main className="app-page wide">
      <JsonLd data={ld} />
      <JsonLd data={event} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"], ["NBA Cup", "/app/nba-cup"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`NBA Cup ${y} : pronostic et chances de chaque équipe`, `NBA Cup ${y} predictions and odds`, `NBA Cup ${y}: pronóstico y opciones de cada equipo`, `NBA Cup ${y}: palpite e chances de cada time`)}</h1>
        {fav3 && <p>{L.t(`Favoris pour gagner la Coupe : ${fav3}.`, `Favorites to win the Cup: ${fav3}.`, `Favoritos para ganar la Copa: ${fav3}.`, `Favoritos para ganhar a Copa: ${fav3}.`)}</p>}
        <div className="cup-dates">
          <span><b>{L.t("Fin des groupes", "Group play ends", "Fin de grupos", "Fim dos grupos")}</b> {d(DATES.groups)}</span>
          <span><b>{L.t("Quarts", "Quarterfinals", "Cuartos", "Quartas")}</b> {L.t("4-5 déc.", "Dec. 4-5", "4-5 dic.", "4-5 dez.")}</span>
          <span><b>{L.t("Demies", "Semifinals", "Semifinales", "Semifinais")}</b> {L.t("8-9 déc.", "Dec. 8-9", "8-9 dic.", "8-9 dez.")}</span>
          <span><b>{L.t("Finale", "Final", "Final", "Final")}</b> {L.t("11 déc., Indianapolis", "Dec. 11, Indianapolis", "11 dic., Indianápolis", "11 dez., Indianápolis")}</span>
        </div>
      </div>
      {groups.length > 0 && (
        <>
          <h2 className="sec-h">{groupsDone ? L.t("Classement final des groupes", "Final group standings", "Clasificación final de los grupos", "Classificação final dos grupos") : L.t("Classement des groupes et chances de qualification", "Group standings and qualifying odds", "Clasificación de los grupos y opciones de clasificación", "Classificação dos grupos e chances de classificação")}</h2>
          <div className="cup-groups">
            {groups.map((g) => <GroupTable key={g.ids.join("-")} g={g} i={g.conf === "E" ? ei++ : 3 + wi++} odds={odds} L={L} />)}
          </div>
        </>
      )}
      {games.length > 0 && (
        <>
          <h2 className="sec-h">{L.t("Prochains matchs de NBA Cup", "Upcoming NBA Cup games", "Próximos partidos de NBA Cup", "Próximos jogos da NBA Cup")}</h2>
          {favs.length > 0 && <p>{L.t("Plus gros favoris : ", "Biggest favorites: ", "Grandes favoritos: ", "Grandes favoritos: ")}{favs.join(", ")}</p>}
          <UpcomingList games={games} title="" L={L} />
        </>
      )}
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("NBA Cup : l'essentiel", "NBA Cup: quick answers", "NBA Cup: lo esencial", "NBA Cup: o essencial")}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
        </section>
      )}
      <p className="team-rec">
        <Link href={L.href("/app/matchs")}>{L.t("Tous les matchs NBA du soir", "All of tonight's NBA games", "Todos los partidos NBA de hoy", "Todos os jogos da NBA de hoje")}</Link>
        {" · "}
        <Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs NBA", "NBA playoff odds", "Probabilidades de playoffs NBA", "Chances de playoffs da NBA")}</Link>
        {" · "}
        <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA")}</Link>
      </p>
      <p className="disclaimer">{L.t("Chances calculées par 6 000 simulations du modèle Basketlog (matchs restants joués au hasard selon les probabilités du modèle). Une probabilité n'est jamais une certitude.", "Odds from 6,000 simulations of the Basketlog model (remaining games played at random according to the model's probabilities). A probability is never a certainty.", "Opciones calculadas con 6.000 simulaciones del modelo de Basketlog (partidos restantes jugados al azar según las probabilidades del modelo). Una probabilidad nunca es una certeza.", "Chances calculadas com 6.000 simulações do modelo do Basketlog (jogos restantes disputados ao acaso segundo as probabilidades do modelo). Uma probabilidade nunca é uma certeza.")}</p>
      {games.length > 0 && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "ItemList",
          name: L.t("Pronostics NBA Cup", "NBA Cup predictions", "Pronósticos NBA Cup", "Palpites NBA Cup"),
          itemListElement: games.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${L.href(nbaPath(g, g.d))}`, name: `${g.away.name} vs ${g.home.name}` })),
        }} />
      )}
    </main>
  );
}
