import Link from "next/link";
import { getPlayerStats, getStandings, nbaToday, seasonForDate } from "../../../lib/espn";
import { royRace } from "../../../lib/awards";
import { teamById } from "../../../lib/teams";
import { playerPath } from "../../../lib/slug";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import QuickFaq from "../../../components/QuickFaq";
import CiteBox from "../../../components/CiteBox";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, numOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches « rookie of the year odds », « roy ladder », « rookie de l'année NBA », « novato del año » : meilleurs
// rookies du jour. Rookie = aucun match NBA les deux saisons précédentes (stats ESPN).
const seasonLabel = (y) => `${y - 1}-${String(y).slice(2)}`;
const dayOf = (L) => fmtDate(L, new Date().toISOString(), { day: "numeric", month: "long" });

async function load() {
  const season = seasonForDate(nbaToday());
  const [cur, prev, prev2, rec] = await Promise.all([getPlayerStats(season), getPlayerStats(season - 1), getPlayerStats(season - 2), getStandings(season).catch(() => ({}))]);
  return { season, rows: royRace(cur, prev, prev2, rec, 12) };
}

export async function generateMetadata() {
  const L = await getL();
  const { season, rows } = await load().catch(() => ({ season: seasonForDate(nbaToday()), rows: [] }));
  const s = seasonLabel(season), d = dayOf(L);
  const top = rows.slice(0, 3).map((r) => r.p.name).join(", ");
  return pageMeta({
    title: L.t(`Rookie de l'année NBA ${s} : la course au ${d}`, `NBA Rookie of the Year ladder ${s} (${d})`, `Novato del año NBA ${s}: la carrera al ${d}`, `Calouro do ano da NBA ${s}: a corrida em ${d}`),
    description: L.t(
      `Les meilleurs rookies de la saison NBA ${s}${top ? ` (${top}…)` : ""} : points, rebonds, passes et classement du jour pour le titre de rookie de l'année.`,
      `The best rookies of the ${s} NBA season${top ? ` (${top}…)` : ""}: points, rebounds, assists and today's Rookie of the Year ladder.`,
      `Los mejores novatos de la temporada NBA ${s}${top ? ` (${top}…)` : ""}: puntos, rebotes, asistencias y la clasificación de hoy al novato del año.`,
      `Os melhores calouros da temporada da NBA ${s}${top ? ` (${top}…)` : ""}: pontos, rebotes, assistências e a classificação de hoje pelo prêmio de calouro do ano.`
    ),
    path: "/app/rookie",
    L,
  });
}

export default async function RookiePage() {
  const L = await getL();
  const { season, rows } = await load();
  const s = seasonLabel(season);
  const n = (x) => numOf(x, L);
  const lead = rows[0];
  const faq = [
    lead && {
      q: L.t(`Qui est favori pour le titre de rookie de l'année ${s} ?`, `Who is the ${s} Rookie of the Year favorite?`, `¿Quién es el favorito a novato del año ${s}?`, `Quem é o favorito a calouro do ano ${s}?`),
      a: L.t(
        `Au ${dayOf(L)}, ${lead.p.name} est le rookie le plus productif (${n(lead.p.ppg)} points, ${n(lead.p.reb)} rebonds, ${n(lead.p.ast)} passes en ${lead.p.gp} matchs).`,
        `As of ${dayOf(L)}, ${lead.p.name} is the most productive rookie (${n(lead.p.ppg)} points, ${n(lead.p.reb)} rebounds, ${n(lead.p.ast)} assists in ${lead.p.gp} games).`,
        `Al ${dayOf(L)}, ${lead.p.name} es el novato más productivo (${n(lead.p.ppg)} puntos, ${n(lead.p.reb)} rebotes, ${n(lead.p.ast)} asistencias en ${lead.p.gp} partidos).`,
        `Em ${dayOf(L)}, ${lead.p.name} é o calouro mais produtivo (${n(lead.p.ppg)} pontos, ${n(lead.p.reb)} rebotes, ${n(lead.p.ast)} assistências em ${lead.p.gp} jogos).`
      ),
    },
    {
      q: L.t("Comment est calculé ce classement ?", "How is this ladder calculated?", "¿Cómo se calcula esta clasificación?", "Como esta classificação é calculada?"),
      a: L.t("Production par match : points + 1,2 × rebonds + 1,5 × passes. Sont comptés les joueurs sans aucun match NBA les deux saisons précédentes, avec au moins la moitié des matchs de leur équipe.", "Per-game production: points + 1.2 × rebounds + 1.5 × assists. Players with no NBA game in the previous two seasons count, if they have played at least half of their team's games.", "Producción por partido: puntos + 1,2 × rebotes + 1,5 × asistencias. Cuentan los jugadores sin partidos NBA en las dos temporadas anteriores, con al menos la mitad de los partidos de su equipo.", "Produção por jogo: pontos + 1,2 × rebotes + 1,5 × assistências. Contam os jogadores sem jogos na NBA nas duas temporadas anteriores, com pelo menos metade dos jogos do time."),
    },
  ];
  const url = `${SITE}${L.href("/app/rookie")}`;
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Rookie de l'année NBA ${s} : la course`, `NBA Rookie of the Year ladder ${s}`, `Novato del año NBA ${s}: la carrera`, `Calouro do ano da NBA ${s}: a corrida`)}</h1>
        <p>{L.t(`Les rookies les plus productifs au ${dayOf(L)}.`, `The most productive rookies as of ${dayOf(L)}.`, `Los novatos más productivos al ${dayOf(L)}.`, `Os calouros mais produtivos em ${dayOf(L)}.`)}</p>
      </div>
      {rows.length ? (
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr><th>#</th><th>{L.t("Joueur", "Player", "Jugador", "Jogador")}</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("Matchs", "GP", "PJ", "J")}</th><th>{L.t("Pts", "Pts", "Pts", "Pts")}</th><th>{L.t("Reb", "Reb", "Reb", "Reb")}</th><th>{L.t("Pd", "Ast", "Ast", "Ast")}</th><th>{L.t("Indice", "Score", "Índice", "Índice")}</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const t = teamById(r.p.team);
                return (
                  <tr key={r.p.id}>
                    <td className="rk">{i + 1}</td>
                    <td className="tm"><Link href={L.href(playerPath(r.p.name))}><span>{r.p.name}</span></Link></td>
                    <td>{t ? <Link href={L.href(`/app/equipe/${t.id}`)}>{t.abbr}</Link> : "–"}</td>
                    <td>{r.p.gp}</td><td>{n(r.p.ppg)}</td><td>{n(r.p.reb)}</td><td>{n(r.p.ast)}</td>
                    <td className="pos">{n(r.score)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="narr">{L.t("Statistiques momentanément indisponibles, réessaie dans quelques minutes.", "Stats temporarily unavailable, try again in a few minutes.", "Estadísticas no disponibles por ahora, vuelve a intentarlo en unos minutos.", "Estatísticas indisponíveis no momento, tente de novo em alguns minutos.")}</p>}
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/mvp")}>{L.t("Course au MVP", "MVP ladder", "Carrera al MVP", "Corrida pelo MVP")}</Link>{" · "}
        <Link href={L.href("/app/draft")}>{L.t("Loterie de la draft 2027", "2027 draft lottery odds", "Lotería del draft 2027", "Loteria do draft 2027")}</Link>{" · "}
        <Link href={L.href(L.es || L.pt ? "/app/espagnols" : "/app/francais")}>{L.t("Les Français en NBA", "French players in the NBA", "Españoles y latinos en la NBA", "Espanhóis e latinos na NBA")}</Link>
      </p>
      <CiteBox url={url} title={L.t(`Rookie de l'année NBA ${s} : la course`, `NBA Rookie of the Year ladder ${s}`, `Novato del año NBA ${s}`, `Calouro do ano da NBA ${s}`)} lang={L.lang} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: L.t(`Rookie de l'année NBA ${s}`, `NBA Rookie of the Year ladder ${s}`, `Novato del año NBA ${s}`, `Calouro do ano da NBA ${s}`), itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.p.name, url: `${SITE}${L.href(playerPath(r.p.name))}` })) }} />
      <p className="disclaimer">{L.t("Classement indépendant calculé par Basketlog à partir des statistiques ESPN. Aucun lien avec la NBA ni avec le vote officiel.", "Independent ladder computed by Basketlog from ESPN stats. Not affiliated with the NBA or the official vote.", "Clasificación independiente calculada por Basketlog con estadísticas de ESPN. Sin relación con la NBA ni con la votación oficial.", "Classificação independente calculada pelo Basketlog com estatísticas da ESPN. Sem relação com a NBA nem com a votação oficial.")}</p>
    </main>
  );
}
