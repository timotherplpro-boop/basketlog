import Link from "next/link";
import { getPlayerStats, getStandings, nbaToday, seasonForDate } from "../../../lib/espn";
import { mvpRace, MVP_MIN_SHARE } from "../../../lib/awards";
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

// Recherches « nba mvp ladder », « mvp race », « course au MVP », « carrera al MVP » : top 15 du jour selon un indice
// public (production × victoires de l'équipe), à partir des stats ESPN.
const seasonLabel = (y) => `${y - 1}-${String(y).slice(2)}`;
const dayOf = (L) => fmtDate(L, new Date().toISOString(), { day: "numeric", month: "long" });

async function load() {
  const season = seasonForDate(nbaToday());
  const [stats, rec] = await Promise.all([getPlayerStats(season), getStandings(season).catch(() => ({}))]);
  return { season, rows: mvpRace(stats, rec, 15) };
}

export async function generateMetadata() {
  const L = await getL();
  const { season, rows } = await load().catch(() => ({ season: seasonForDate(nbaToday()), rows: [] }));
  const s = seasonLabel(season), d = dayOf(L);
  const top = rows.slice(0, 3).map((r) => r.p.name).join(", ");
  return pageMeta({
    title: L.t(`Course au MVP NBA ${s} : le classement au ${d}`, `NBA MVP ladder ${s}: top 15 as of ${d}`, `Carrera al MVP de la NBA ${s}: el top 15 al ${d}`, `Corrida pelo MVP da NBA ${s}: o top 15 em ${d}`),
    description: L.t(
      `Qui sera MVP de la NBA ${s} ? Le top 15 du jour${top ? ` (${top}…)` : ""}, classé par la production de chaque joueur et les victoires de son équipe. Mis à jour chaque jour.`,
      `Who will win NBA MVP in ${s}? Today's top 15${top ? ` (${top}…)` : ""}, ranked by each player's production and his team's wins. Updated daily.`,
      `¿Quién será el MVP de la NBA ${s}? El top 15 de hoy${top ? ` (${top}…)` : ""}, ordenado por la producción de cada jugador y las victorias de su equipo. Actualizado cada día.`,
      `Quem será o MVP da NBA ${s}? O top 15 de hoje${top ? ` (${top}…)` : ""}, ordenado pela produção de cada jogador e pelas vitórias do time. Atualizado todo dia.`
    ),
    path: "/app/mvp",
    L,
  });
}

export default async function MvpPage() {
  const L = await getL();
  const { season, rows } = await load();
  const s = seasonLabel(season);
  const n = (x) => numOf(x, L);
  const lead = rows[0], second = rows[1];
  const pct = Math.round(MVP_MIN_SHARE * 100);
  const faq = [
    lead && {
      q: L.t(`Qui est favori pour le MVP ${s} ?`, `Who is the ${s} MVP favorite?`, `¿Quién es el favorito al MVP ${s}?`, `Quem é o favorito ao MVP ${s}?`),
      a: L.t(
        `Au ${dayOf(L)}, ${lead.p.name} est en tête de notre classement (${n(lead.p.ppg)} points, ${n(lead.p.reb)} rebonds, ${n(lead.p.ast)} passes, ${lead.wins}-${lead.losses} pour son équipe)${second ? `, devant ${second.p.name}` : ""}.`,
        `As of ${dayOf(L)}, ${lead.p.name} leads our ladder (${n(lead.p.ppg)} points, ${n(lead.p.reb)} rebounds, ${n(lead.p.ast)} assists, ${lead.wins}-${lead.losses} team record)${second ? `, ahead of ${second.p.name}` : ""}.`,
        `Al ${dayOf(L)}, ${lead.p.name} lidera nuestra clasificación (${n(lead.p.ppg)} puntos, ${n(lead.p.reb)} rebotes, ${n(lead.p.ast)} asistencias, ${lead.wins}-${lead.losses} su equipo)${second ? `, por delante de ${second.p.name}` : ""}.`,
        `Em ${dayOf(L)}, ${lead.p.name} lidera nossa classificação (${n(lead.p.ppg)} pontos, ${n(lead.p.reb)} rebotes, ${n(lead.p.ast)} assistências, ${lead.wins}-${lead.losses} o time)${second ? `, à frente de ${second.p.name}` : ""}.`
      ),
    },
    {
      q: L.t("Comment est calculé ce classement ?", "How is this ladder calculated?", "¿Cómo se calcula esta clasificación?", "Como esta classificação é calculada?"),
      a: L.t(
        `Production par match (points + 1,2 × rebonds + 1,5 × passes) multipliée par un bonus de victoires (0,6 + 0,8 × pourcentage de victoires de l'équipe). Il faut avoir joué au moins ${pct} % des matchs de son équipe, comme la règle des 65 matchs ramenée à la saison en cours. Ce n'est pas un vote officiel.`,
        `Per-game production (points + 1.2 × rebounds + 1.5 × assists) times a winning bonus (0.6 + 0.8 × team win percentage). A player must have played at least ${pct}% of his team's games, like the 65-game rule scaled to the season so far. It is not an official vote.`,
        `Producción por partido (puntos + 1,2 × rebotes + 1,5 × asistencias) multiplicada por un bonus de victorias (0,6 + 0,8 × porcentaje de victorias del equipo). Hay que haber jugado al menos el ${pct} % de los partidos del equipo, como la regla de los 65 partidos adaptada a la temporada en curso. No es una votación oficial.`,
        `Produção por jogo (pontos + 1,2 × rebotes + 1,5 × assistências) multiplicada por um bônus de vitórias (0,6 + 0,8 × aproveitamento do time). É preciso ter jogado pelo menos ${pct} % dos jogos do time, como a regra dos 65 jogos adaptada à temporada em curso. Não é uma votação oficial.`
      ),
    },
    {
      q: L.t("Qui vote pour le MVP ?", "Who votes for MVP?", "¿Quién vota el MVP?", "Quem vota no MVP?"),
      a: L.t("Un panel d'une centaine de journalistes et commentateurs, à la fin de la saison régulière. Le trophée est remis pendant les playoffs.", "A panel of about 100 media members votes at the end of the regular season. The award is announced during the playoffs.", "Un panel de unos cien periodistas y comentaristas, al final de la temporada regular. El premio se anuncia durante los playoffs.", "Um painel de cerca de cem jornalistas e comentaristas, no fim da temporada regular. O prêmio é anunciado durante os playoffs."),
    },
  ];
  const url = `${SITE}${L.href("/app/mvp")}`;
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Course au MVP NBA ${s}`, `NBA MVP ladder ${s}`, `Carrera al MVP de la NBA ${s}`, `Corrida pelo MVP da NBA ${s}`)}</h1>
        <p>{L.t(`Le top 15 au ${dayOf(L)} : la production de chaque joueur, pondérée par les victoires de son équipe.`, `Top 15 as of ${dayOf(L)}: each player's production, weighted by his team's wins.`, `El top 15 al ${dayOf(L)}: la producción de cada jugador, ponderada por las victorias de su equipo.`, `O top 15 em ${dayOf(L)}: a produção de cada jogador, ponderada pelas vitórias do time.`)}</p>
      </div>
      {rows.length ? (
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr><th>#</th><th>{L.t("Joueur", "Player", "Jugador", "Jogador")}</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("Pts", "Pts", "Pts", "Pts")}</th><th>{L.t("Reb", "Reb", "Reb", "Reb")}</th><th>{L.t("Pd", "Ast", "Ast", "Ast")}</th><th>{L.t("Bilan", "Record", "Balance", "Campanha")}</th><th>{L.t("Indice", "Score", "Índice", "Índice")}</th></tr></thead>
            <tbody>
              {rows.map((r, i) => {
                const t = teamById(r.p.team);
                return (
                  <tr key={r.p.id}>
                    <td className="rk">{i + 1}</td>
                    <td className="tm"><Link href={L.href(playerPath(r.p.name))}><span>{r.p.name}</span></Link></td>
                    <td>{t ? <Link href={L.href(`/app/equipe/${t.id}`)}>{t.abbr}</Link> : "–"}</td>
                    <td>{n(r.p.ppg)}</td><td>{n(r.p.reb)}</td><td>{n(r.p.ast)}</td>
                    <td>{r.wins}-{r.losses}</td>
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
        <Link href={L.href("/app/rookie")}>{L.t("Course au rookie de l'année", "Rookie of the Year ladder", "Carrera al novato del año", "Corrida pelo calouro do ano")}</Link>{" · "}
        <Link href={L.href("/app/leaders")}>{L.t("Meilleurs marqueurs", "Scoring leaders", "Máximos anotadores", "Cestinhas")}</Link>{" · "}
        <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking", "Power rankings", "Power ranking", "Power ranking")}</Link>{" · "}
        <Link href={L.href("/app/champion")}>{L.t("Favoris au titre", "Title favorites", "Favoritos al título", "Favoritos ao título")}</Link>
      </p>
      <CiteBox url={url} title={L.t(`Course au MVP NBA ${s}`, `NBA MVP ladder ${s}`, `Carrera al MVP de la NBA ${s}`, `Corrida pelo MVP da NBA ${s}`)} lang={L.lang} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: L.t(`Course au MVP NBA ${s}`, `NBA MVP ladder ${s}`, `Carrera al MVP de la NBA ${s}`, `Corrida pelo MVP da NBA ${s}`), itemListElement: rows.map((r, i) => ({ "@type": "ListItem", position: i + 1, name: r.p.name, url: `${SITE}${L.href(playerPath(r.p.name))}` })) }} />
      <p className="disclaimer">{L.t("Classement indépendant calculé par Basketlog à partir des statistiques ESPN de la saison régulière. Aucun lien avec la NBA ni avec le vote officiel.", "Independent ladder computed by Basketlog from ESPN regular-season stats. Not affiliated with the NBA or the official vote.", "Clasificación independiente calculada por Basketlog con las estadísticas de ESPN de la temporada regular. Sin relación con la NBA ni con la votación oficial.", "Classificação independente calculada pelo Basketlog com as estatísticas da ESPN da temporada regular. Sem relação com a NBA nem com a votação oficial.")}</p>
    </main>
  );
}
