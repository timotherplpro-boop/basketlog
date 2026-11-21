import Link from "next/link";
import { simulateSeason } from "../../../lib/sim";
import { teamById } from "../../../lib/teams";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import QuickFaq from "../../../components/QuickFaq";
import CiteBox from "../../../components/CiteBox";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, numOf, pctOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches US très fortes de décembre à mai : « nba draft lottery odds », « 2027 draft order », « 3-2-1 lottery ».
// La NBA a changé de système le 28 mai 2026 : peu de sites calculent déjà les chances avec les nouvelles règles.
const NBA_PR = "https://pr.nba.com/nba-board-of-governors-approves-new-draft-lottery-system-to-address-tanking/";
const dayOf = (L) => fmtDate(L, new Date().toISOString(), { day: "numeric", month: "long" });

async function rowsOf() {
  const sim = await simulateSeason();
  return Object.values(sim.teams)
    .filter((r) => r.lottery != null && r.lottery >= 0.005)
    .sort((a, b) => b.pick1 - a.pick1 || (a.avgPick ?? 99) - (b.avgPick ?? 99))
    .map((r) => ({ ...r, team: teamById(r.id) }));
}

export async function generateMetadata() {
  const L = await getL();
  let top = [];
  try { top = (await rowsOf()).slice(0, 3).map((r) => r.team.short); } catch {}
  return pageMeta({
    title: L.t("Loterie de la draft NBA 2027 : chances du 1er choix (système 3-2-1)", "2027 NBA draft lottery odds: No. 1 pick chances (new 3-2-1 system)", "Lotería del draft NBA 2027: opciones del n.º 1 (sistema 3-2-1)", "Loteria do draft da NBA 2027: chances da 1ª escolha (sistema 3-2-1)"),
    description: L.t(
      `Ordre de la draft 2027 projeté et chances de chaque équipe d'obtenir le 1er choix avec la nouvelle loterie 3-2-1${top.length ? ` (${top.join(", ")}…)` : ""}. Des milliers de fins de saison simulées, mises à jour chaque jour.`,
      `Projected 2027 draft order and every team's chance at the No. 1 pick under the new 3-2-1 lottery${top.length ? ` (${top.join(", ")}…)` : ""}. Thousands of simulated seasons, updated daily.`,
      `Orden del draft 2027 proyectado y opciones de cada equipo de lograr el n.º 1 con la nueva lotería 3-2-1${top.length ? ` (${top.join(", ")}…)` : ""}. Miles de finales de temporada simulados, actualizados cada día.`,
      `Ordem do draft 2027 projetada e chances de cada time de ficar com a 1ª escolha na nova loteria 3-2-1${top.length ? ` (${top.join(", ")}…)` : ""}. Milhares de finais de temporada simulados, atualizados todo dia.`
    ),
    path: "/app/draft",
    L,
  });
}

export default async function DraftPage() {
  const L = await getL();
  let rows = [];
  try { rows = await rowsOf(); } catch {}
  const pc = (p) => (p == null ? "–" : p < 0.005 ? "<1" + (L.en ? "%" : " %") : pctOf(p, L));
  const lead = rows[0];
  const faq = [
    {
      q: L.t("Comment fonctionne la nouvelle loterie de la draft ?", "How does the new NBA draft lottery work?", "¿Cómo funciona la nueva lotería del draft?", "Como funciona a nova loteria do draft?"),
      a: L.t(
        "Depuis la draft 2027, 16 équipes participent et les 16 premiers choix sont tirés au sort. Les équipes ni qualifiées ni en play-in ont 3 boules, sauf les 3 plus mauvais bilans (2 boules, et pas plus bas que le 12e choix). Les 9e et 10e de chaque conférence ont 2 boules, les perdants des matchs 7e-8e une seule.",
        "Starting with the 2027 draft, 16 teams take part and the first 16 picks are drawn. Teams outside the playoffs and the play-in get 3 balls, except the 3 worst records (2 balls, and no lower than pick 12). The No. 9 and 10 seeds in each conference get 2 balls, the losers of the 7-vs-8 games just one.",
        "Desde el draft 2027 participan 16 equipos y se sortean las 16 primeras elecciones. Los equipos fuera de playoffs y play-in tienen 3 bolas, salvo los 3 peores balances (2 bolas, y nunca más abajo del puesto 12). Los 9.º y 10.º de cada conferencia tienen 2 bolas, los perdedores de los partidos 7.º-8.º solo una.",
        "A partir do draft 2027, 16 times participam e as 16 primeiras escolhas são sorteadas. Os times fora dos playoffs e do play-in têm 3 bolas, exceto as 3 piores campanhas (2 bolas, e nunca abaixo da 12ª escolha). O 9º e o 10º de cada conferência têm 2 bolas, os perdedores dos jogos 7º-8º só uma."
      ),
    },
    lead && {
      q: L.t("Qui a le plus de chances d'avoir le 1er choix de la draft 2027 ?", "Who has the best odds at the No. 1 pick in 2027?", "¿Quién tiene más opciones del n.º 1 del draft 2027?", "Quem tem mais chances da 1ª escolha do draft 2027?"),
      a: L.t(
        `Au ${dayOf(L)}, les ${lead.team.short} : ${pc(lead.pick1)} de chances d'obtenir le 1er choix et ${pc(lead.top4)} d'être dans le top 4, d'après nos simulations de fin de saison.`,
        `As of ${dayOf(L)}, the ${lead.team.short}: a ${pc(lead.pick1)} chance at the No. 1 pick and ${pc(lead.top4)} at a top-4 pick, based on our season simulations.`,
        `Al ${dayOf(L)}, los ${lead.team.short}: ${pc(lead.pick1)} de opciones del n.º 1 y ${pc(lead.top4)} de estar en el top 4, según nuestras simulaciones.`,
        `Em ${dayOf(L)}, o ${lead.team.short}: ${pc(lead.pick1)} de chance da 1ª escolha e ${pc(lead.top4)} de ficar no top 4, segundo nossas simulações.`
      ),
    },
    {
      q: L.t("Pourquoi le plus mauvais bilan n'a-t-il plus le plus de chances ?", "Why doesn't the worst team have the best odds anymore?", "¿Por qué el peor equipo ya no tiene más opciones?", "Por que o pior time não tem mais as maiores chances?"),
      a: L.t("C'est le but de la réforme : décourager les équipes de perdre exprès. Les 3 derniers sont « relégués » avec une boule de moins que les équipes juste au-dessus d'eux.", "That is the point of the reform: discouraging teams from losing on purpose. The bottom 3 are 'relegated' with one fewer ball than the teams just above them.", "Es el objetivo de la reforma: desanimar a los equipos de perder a propósito. Los 3 últimos quedan «relegados» con una bola menos que los equipos justo por encima.", "É o objetivo da reforma: desestimular os times de perder de propósito. Os 3 últimos são \"rebaixados\" com uma bola a menos que os times logo acima."),
    },
  ];
  const url = `${SITE}${L.href("/app/draft")}`;
  const title = L.t("Loterie de la draft NBA 2027 : les chances de chaque équipe", "2027 NBA draft lottery odds", "Lotería del draft NBA 2027: las opciones de cada equipo", "Loteria do draft da NBA 2027: as chances de cada time");
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t(
          `Nouvelle loterie 3-2-1, appliquée pour la première fois en 2027. Chances calculées au ${dayOf(L)} sur des milliers de fins de saison simulées avec le modèle Basketlog, puis un tirage de la loterie dans chacune.`,
          `New 3-2-1 lottery, used for the first time in 2027. Odds as of ${dayOf(L)} from thousands of season endings simulated with the Basketlog model, each followed by a lottery draw.`,
          `Nueva lotería 3-2-1, aplicada por primera vez en 2027. Opciones al ${dayOf(L)} a partir de miles de finales de temporada simulados con el modelo de Basketlog, cada uno con un sorteo.`,
          `Nova loteria 3-2-1, usada pela primeira vez em 2027. Chances em ${dayOf(L)} a partir de milhares de finais de temporada simulados com o modelo do Basketlog, cada um com um sorteio.`
        )}</p>
      </div>
      {rows.length ? (
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr>
              <th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("Bilan", "Record", "Balance", "Campanha")}</th>
              <th>{L.t("Victoires projetées", "Projected wins", "Victorias proyectadas", "Vitórias projetadas")}</th>
              <th>{L.t("Dans la loterie", "In lottery", "En la lotería", "Na loteria")}</th>
              <th title={L.t("Chances d'être parmi les 3 plus mauvais bilans (2 boules au lieu de 3)", "Chance of a bottom-3 record (2 balls instead of 3)", "Opciones de estar entre los 3 peores balances (2 bolas en vez de 3)", "Chance de ficar entre as 3 piores campanhas (2 bolas em vez de 3)")}>{L.t("Relégué", "Relegated", "Relegado", "Rebaixado")}</th>
              <th>{L.t("1er choix", "No. 1 pick", "N.º 1", "1ª escolha")}</th><th>{L.t("Top 4", "Top 4", "Top 4", "Top 4")}</th>
              <th>{L.t("Choix moyen", "Avg. pick", "Elección media", "Escolha média")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="tm"><Link href={L.href(`/app/equipe/${r.id}`)}><span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.team.logo} alt="" />{r.team.short}</span></Link></td>
                  <td>{r.record[0]}-{r.record[1]}</td>
                  <td>{numOf(r.projWins, L, 1)}</td>
                  <td>{pc(r.lottery)}</td>
                  <td>{pc(r.relegated)}</td>
                  <td className="pos">{pc(r.pick1)}</td>
                  <td>{pc(r.top4)}</td>
                  <td>{r.avgPick == null ? "–" : numOf(r.avgPick, L, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="narr">{L.t("Simulation momentanément indisponible, réessaie dans quelques minutes.", "Simulation temporarily unavailable, try again in a few minutes.", "Simulación no disponible por ahora, vuelve a intentarlo en unos minutos.", "Simulação indisponível no momento, tente de novo em alguns minutos.")}</p>}
      <div className="card block">
        <h2>{L.t("Les boules de la loterie 3-2-1", "The 3-2-1 lottery balls", "Las bolas de la lotería 3-2-1", "As bolas da loteria 3-2-1")}</h2>
        <ul className="narr">
          <li>{L.t("Équipes ni qualifiées ni en play-in : 3 boules.", "Teams outside the playoffs and play-in: 3 balls.", "Equipos fuera de playoffs y play-in: 3 bolas.", "Times fora dos playoffs e do play-in: 3 bolas.")}</li>
          <li>{L.t("Les 3 plus mauvais bilans (« relégués ») : 2 boules, pas plus bas que le 12e choix.", "The 3 worst records ('relegated'): 2 balls, no lower than pick 12.", "Los 3 peores balances («relegados»): 2 bolas, nunca más abajo del puesto 12.", "As 3 piores campanhas (\"rebaixados\"): 2 bolas, nunca abaixo da 12ª escolha.")}</li>
          <li>{L.t("9e et 10e de chaque conférence : 2 boules.", "No. 9 and 10 seeds in each conference: 2 balls.", "9.º y 10.º de cada conferencia: 2 bolas.", "9º e 10º de cada conferência: 2 bolas.")}</li>
          <li>{L.t("Perdants des matchs 7e contre 8e : 1 boule.", "Losers of the 7-vs-8 play-in games: 1 ball.", "Perdedores de los partidos 7.º contra 8.º: 1 bola.", "Perdedores dos jogos 7º contra 8º: 1 bola.")}</li>
        </ul>
        <p className="note">{L.t("Source : ", "Source: ", "Fuente: ", "Fonte: ")}<a href={NBA_PR} rel="noopener" target="_blank">NBA Communications, 28/05/2026</a>. {L.t("Non simulés : les échanges de choix entre équipes et l'interdiction d'avoir le 1er choix deux drafts de suite.", "Not simulated: traded picks and the rule barring a No. 1 pick in two consecutive drafts.", "No simulados: los traspasos de elecciones y la prohibición de tener el n.º 1 dos drafts seguidos.", "Não simulados: escolhas trocadas entre times e a proibição de ter a 1ª escolha em dois drafts seguidos.")}</p>
      </div>
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs", "Playoff chances", "Opciones de playoffs", "Chances de playoffs")}</Link>{" · "}
        <Link href={L.href("/app/calendrier-restant")}>{L.t("Calendrier restant", "Remaining schedule", "Calendario restante", "Calendário restante")}</Link>{" · "}
        <Link href={L.href("/app/rookie")}>{L.t("Rookie de l'année", "Rookie of the Year", "Novato del año", "Calouro do ano")}</Link>{" · "}
        <Link href={L.href("/app/classement")}>{L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA")}</Link>
      </p>
      <CiteBox url={url} title={title} lang={L.lang} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: title, itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.team.name, url: `${SITE}${L.href(`/app/equipe/${r.id}`)}` })) }} />
      <p className="disclaimer">{L.t("Estimations indépendantes de Basketlog, sans lien avec la NBA. Une probabilité n'est jamais une certitude.", "Independent Basketlog estimates, not affiliated with the NBA. A probability is never a certainty.", "Estimaciones independientes de Basketlog, sin relación con la NBA. Una probabilidad nunca es una certeza.", "Estimativas independentes do Basketlog, sem relação com a NBA. Uma probabilidade nunca é uma certeza.")}</p>
    </main>
  );
}
