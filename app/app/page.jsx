import { upcomingAnalyses } from "../../lib/data";
import { TEAMS, teamById } from "../../lib/teams";
import DuelForm from "../../components/DuelForm";
import UpcomingList from "../../components/UpcomingList";
import AppTabs from "../../components/AppTabs";
import { pageMeta } from "../../lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Analyse de match NBA : choisis deux équipes – Basketlog",
  description: "Choisis deux équipes NBA et obtiens le pronostic du match : probabilités de victoire, score projeté, forme, absences et fatigue. Prochains matchs de la semaine.",
  path: "/app",
});

export default async function AnalysePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const up = await upcomingAnalyses(7);
  const initial = teamById(sp.team);
  const list = (initial ? up.filter((g) => g.home.id === initial.id || g.away.id === initial.id) : up)
    .slice(0, 14)
    .map(({ a, ...g }) => ({ ...g, state: g.live ? "in" : "pre" }));

  return (
    <main className="app-page">
      <AppTabs active="analyse" />
      <div className="app-head">
        <h1>Analyse de match NBA</h1>
        <p>Entre les équipes que tu veux analyser</p>
        <p className="note">Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.</p>
      </div>
      <DuelForm teams={TEAMS} initialHome={initial} />
      <UpcomingList games={list} title={initial ? `Prochains matchs · ${initial.short}` : "Prochains matchs"} />
    </main>
  );
}
