import { upcomingAnalyses, resolveDuel } from "../../lib/data";
import { TEAMS, teamById } from "../../lib/teams";
import DuelForm from "../../components/DuelForm";
import UpcomingList from "../../components/UpcomingList";
import AppTabs from "../../components/AppTabs";
import AnalysisResult from "../../components/AnalysisResult";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const meta = pageMeta({
    title: L.t("Analyse de match NBA : choisis deux équipes – Basketlog", "NBA game analysis: pick two teams – Basketlog", "Análisis de partidos NBA: elige dos equipos – Basketlog"),
    description: L.t(
      "Choisis deux équipes NBA et obtiens le pronostic du match : probabilités de victoire, score projeté, forme, absences et fatigue. Prochains matchs de la semaine.",
      "Pick two NBA teams and get the game prediction: win probabilities, projected score, form, injuries and fatigue. This week's upcoming games.", "Elige dos equipos de la NBA y obtén el pronóstico del partido: probabilidades de victoria, marcador proyectado, forma, bajas y cansancio. Los próximos partidos de la semana."
    ),
    path: "/app",
    L,
  });
  // Résultat d'une analyse (deux équipes choisies) : utile au visiteur, pas à indexer.
  return sp.home && sp.away ? { ...meta, robots: { index: false, follow: true } } : meta;
}

// « Analyse de match », comme Visifoot : on choisit deux équipes, on lance l'analyse,
// et le résultat s'affiche sous le formulaire.
export default async function AnalysePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const home = teamById(sp.home || sp.team);
  const away = teamById(sp.away);
  const duel = home && away && home.id !== away.id ? await resolveDuel(home.id, away.id) : null;
  const up = duel ? [] : await upcomingAnalyses(7);
  const list = up
    .filter((g) => !home || g.home.id === home.id || g.away.id === home.id)
    .slice(0, 14)
    .map(({ a, ...g }) => ({ ...g, state: g.live ? "in" : "pre" }));

  return (
    <main className="app-page">
      <AppTabs active="analyse" />
      <div className="app-head">
        <h1>{L.t("Analyse de match", "Game analysis", "Análisis de partido")}</h1>
        <p>{L.t("Entre les équipes que tu veux analyser", "Between the teams you want to analyze", "Entre los equipos que quieres analizar")}</p>
        <p className="note">{L.t("Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.", "Our model combines strength, form, injuries and fatigue for every prediction.", "Nuestro modelo combina nivel, forma, bajas y cansancio en cada pronóstico.")}</p>
      </div>
      <DuelForm teams={TEAMS} initialHome={home} initialAway={away} key={`${home?.id || ""}-${away?.id || ""}`} />
      {duel ? (
        <div id="resultat">
          <AnalysisResult a={duel.a} league="NBA" L={L} mode="analyzer" path={duel.path} />
          <p className="disclaimer">{L.t(
            "Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles. Elles ne constituent ni une certitude ni un conseil de pari.",
            "Probabilities estimated by the Basketlog model from available public data. They are neither a certainty nor betting advice.",
            "Probabilidades estimadas por el modelo de Basketlog a partir de los datos públicos disponibles. No constituyen ni una certeza ni un consejo de apuestas."
          )}</p>
        </div>
      ) : (
        <UpcomingList games={list} L={L} title={home ? `${L.t("Prochains matchs", "Upcoming games", "Próximos partidos")} · ${home.short}` : L.t("Prochains matchs", "Upcoming games", "Próximos partidos")} />
      )}
    </main>
  );
}
