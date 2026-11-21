import Link from "next/link";
import { simulateSeason } from "../../../lib/sim";
import { teamById } from "../../../lib/teams";
import { pVsAverage } from "../../../lib/model";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import QuickFaq from "../../../components/QuickFaq";
import CiteBox from "../../../components/CiteBox";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { numOf, pctOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches « nba remaining strength of schedule », « calendrier restant NBA », « calendario restante NBA » :
// force moyenne des adversaires restants de chaque équipe (modèle Basketlog), du plus dur au plus facile.
const monthYear = (L) => new Intl.DateTimeFormat(L.locale, { month: "long", year: "numeric", timeZone: L.tz }).format(new Date());

async function rowsOf() {
  const sim = await simulateSeason();
  const sos = sim.sos || {};
  return Object.entries(sos)
    .filter(([, x]) => x.n > 0 && x.opp != null)
    .map(([id, x]) => ({ id, ...x, team: teamById(id), sim: sim.teams[id] }))
    .filter((r) => r.team)
    .sort((a, b) => b.opp - a.opp);
}

export async function generateMetadata() {
  const L = await getL();
  const my = monthYear(L);
  return pageMeta({
    title: L.t(`Calendrier restant NBA : difficulté pour les 30 équipes (${my})`, `NBA remaining strength of schedule: all 30 teams (${my})`, `Calendario restante NBA: dificultad de los 30 equipos (${my})`, `Calendário restante da NBA: dificuldade dos 30 times (${my})`),
    description: L.t(
      "Quelle équipe NBA a le calendrier le plus dur d'ici la fin de la saison ? Force moyenne des adversaires restants, matchs à domicile et victoires projetées, mis à jour chaque jour.",
      "Which NBA team has the toughest schedule left? Average strength of remaining opponents, home games left and projected wins, updated daily.",
      "¿Qué equipo NBA tiene el calendario más difícil hasta el final de la temporada? Fuerza media de los rivales restantes, partidos en casa y victorias proyectadas, actualizado cada día.",
      "Qual time da NBA tem o calendário mais difícil até o fim da temporada? Força média dos adversários restantes, jogos em casa e vitórias projetadas, atualizado todo dia."
    ),
    path: "/app/calendrier-restant",
    L,
  });
}

export default async function RemainingSchedulePage() {
  const L = await getL();
  let rows = [];
  try { rows = await rowsOf(); } catch {}
  const sg = (x) => `${x > 0 ? "+" : ""}${numOf(x, L, 1)}`;
  const hard = rows[0], easy = rows[rows.length - 1];
  const faq = [
    hard && {
      q: L.t("Quelle équipe NBA a le calendrier restant le plus difficile ?", "Which NBA team has the hardest remaining schedule?", "¿Qué equipo NBA tiene el calendario restante más difícil?", "Qual time da NBA tem o calendário restante mais difícil?"),
      a: L.t(
        `Les ${hard.team.short} : leurs ${hard.n} adversaires restants valent en moyenne ${sg(hard.opp)} points face à une équipe moyenne. Le plus facile : les ${easy.team.short} (${sg(easy.opp)}).`,
        `The ${hard.team.short}: their ${hard.n} remaining opponents average ${sg(hard.opp)} points against an average team. The easiest: the ${easy.team.short} (${sg(easy.opp)}).`,
        `Los ${hard.team.short}: sus ${hard.n} rivales restantes valen de media ${sg(hard.opp)} puntos ante un equipo medio. El más fácil: los ${easy.team.short} (${sg(easy.opp)}).`,
        `O ${hard.team.short}: seus ${hard.n} adversários restantes valem em média ${sg(hard.opp)} pontos contra um time médio. O mais fácil: o ${easy.team.short} (${sg(easy.opp)}).`
      ),
    },
    {
      q: L.t("Comment se lit la difficulté du calendrier ?", "How do I read strength of schedule?", "¿Cómo se lee la dificultad del calendario?", "Como ler a dificuldade do calendário?"),
      a: L.t("C'est la force moyenne des adversaires restants, en points d'écart attendus face à une équipe moyenne sur terrain neutre. +2 veut dire que l'adversaire moyen bat une équipe moyenne de 2 points.", "It is the average strength of the remaining opponents, in expected points against an average team on a neutral court. +2 means the average opponent beats an average team by 2 points.", "Es la fuerza media de los rivales restantes, en puntos de diferencia esperados ante un equipo medio en campo neutral. +2 significa que el rival medio gana a un equipo medio por 2 puntos.", "É a força média dos adversários restantes, em pontos de saldo esperados contra um time médio em quadra neutra. +2 quer dizer que o adversário médio vence um time médio por 2 pontos."),
    },
  ];
  const url = `${SITE}${L.href("/app/calendrier-restant")}`;
  const title = L.t("Calendrier restant NBA : du plus dur au plus facile", "NBA remaining strength of schedule", "Calendario restante NBA: del más difícil al más fácil", "Calendário restante da NBA: do mais difícil ao mais fácil");
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t(`Les 30 équipes classées par la force moyenne de leurs adversaires restants (modèle Basketlog, ${monthYear(L)}).`, `All 30 teams ranked by the average strength of their remaining opponents (Basketlog model, ${monthYear(L)}).`, `Los 30 equipos según la fuerza media de sus rivales restantes (modelo de Basketlog, ${monthYear(L)}).`, `Os 30 times pela força média dos adversários restantes (modelo do Basketlog, ${monthYear(L)}).`)}</p>
      </div>
      {rows.length ? (
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr>
              <th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th>
              <th>{L.t("Matchs restants", "Games left", "Partidos restantes", "Jogos restantes")}</th>
              <th>{L.t("Dont à domicile", "At home", "En casa", "Em casa")}</th>
              <th>{L.t("Force des adversaires", "Opponent strength", "Fuerza de los rivales", "Força dos adversários")}</th>
              <th>{L.t("Adversaire moyen bat une équipe moyenne", "Avg. opponent beats avg. team", "Rival medio gana a un equipo medio", "Adversário médio vence time médio")}</th>
              <th>{L.t("Victoires projetées", "Projected wins", "Victorias proyectadas", "Vitórias projetadas")}</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm"><Link href={L.href(`/app/equipe/${r.id}/calendrier`)}><span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.team.logo} alt="" />{r.team.short}</span></Link></td>
                  <td>{r.n}</td><td>{r.home}</td>
                  <td className={r.opp > 0 ? "neg" : "pos"}>{sg(r.opp)}</td>
                  <td>{pctOf(pVsAverage(r.opp), L)}</td>
                  <td>{r.sim ? numOf(r.sim.projWins, L, 1) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="narr">{L.t("Calcul momentanément indisponible, réessaie dans quelques minutes.", "Temporarily unavailable, try again in a few minutes.", "No disponible por ahora, vuelve a intentarlo en unos minutos.", "Indisponível no momento, tente de novo em alguns minutos.")}</p>}
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs", "Playoff chances", "Opciones de playoffs", "Chances de playoffs")}</Link>{" · "}
        <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking", "Power rankings", "Power ranking", "Power ranking")}</Link>{" · "}
        <Link href={L.href("/app/back-to-back")}>{L.t("Back-to-back du soir", "Tonight's back-to-backs", "Back-to-back de hoy", "Back-to-back de hoje")}</Link>{" · "}
        <Link href={L.href("/app/draft")}>{L.t("Loterie de la draft", "Draft lottery odds", "Lotería del draft", "Loteria do draft")}</Link>
      </p>
      <CiteBox url={url} title={title} lang={L.lang} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: title, itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.team.name, url: `${SITE}${L.href(`/app/equipe/${r.id}/calendrier`)}` })) }} />
    </main>
  );
}
