import { upcomingAnalyses } from "../../lib/data";
import { TEAMS, teamById } from "../../lib/teams";
import DuelForm from "../../components/DuelForm";
import UpcomingList from "../../components/UpcomingList";
import AppTabs from "../../components/AppTabs";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Analyse de match NBA : choisis deux équipes – Basketlog", "NBA game analysis: pick two teams – Basketlog", "Análisis de partidos NBA: elige dos equipos – Basketlog"),
    description: L.t(
      "Choisis deux équipes NBA et obtiens le pronostic du match : probabilités de victoire, score projeté, forme, absences et fatigue. Prochains matchs de la semaine.",
      "Pick two NBA teams and get the game prediction: win probabilities, projected score, form, injuries and fatigue. This week's upcoming games.", "Elige dos equipos de la NBA y obtén el pronóstico del partido: probabilidades de victoria, marcador proyectado, forma, bajas y cansancio. Los próximos partidos de la semana."
    ),
    path: "/app",
    L,
  });
}

export default async function AnalysePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const up = await upcomingAnalyses(7);
  const initial = teamById(sp.team);
  const list = (initial ? up.filter((g) => g.home.id === initial.id || g.away.id === initial.id) : up)
    .slice(0, 14)
    .map(({ a, ...g }) => ({ ...g, state: g.live ? "in" : "pre" }));

  return (
    <main className="app-page">
      <AppTabs active="analyse" />
      <div className="app-head">
        <h1>{L.t("Analyse de match NBA", "NBA game analysis", "Análisis de partidos NBA")}</h1>
        <p>{L.t("Entre les équipes que tu veux analyser", "Between the teams you want to analyze", "Entre los equipos que quieres analizar")}</p>
        <p className="note">{L.t("Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.", "Our model combines strength, form, injuries and fatigue for every prediction.", "Nuestro modelo combina nivel, forma, bajas y cansancio en cada pronóstico.")}</p>
      </div>
      <DuelForm teams={TEAMS} initialHome={initial} />
      <UpcomingList games={list} L={L} title={initial ? `${L.t("Prochains matchs", "Upcoming games", "Próximos partidos")} · ${initial.short}` : L.t("Prochains matchs", "Upcoming games", "Próximos partidos")} />
    </main>
  );
}
