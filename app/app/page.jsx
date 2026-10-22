import { upcomingAnalyses } from "../../lib/data";
import { TEAMS, teamById } from "../../lib/teams";
import DuelForm from "../../components/DuelForm";
import UpcomingList from "../../components/UpcomingList";
import AppTabs from "../../components/AppTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analyse de match – Basketlog" };

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
        <h1>Analyse de match</h1>
        <p>Entre les équipes que tu veux analyser</p>
        <p className="note">Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.</p>
      </div>
      <DuelForm teams={TEAMS} initialHome={initial} />
      <UpcomingList games={list} title={initial ? `Prochains matchs · ${initial.short}` : "Prochains matchs"} />
    </main>
  );
}
