import { notFound } from "next/navigation";
import { elContext, elAnalyze, elTable } from "../../../../../lib/euroleague";
import MatchView from "../../../../../components/MatchView";
import ELExtras from "../../../../../components/ELExtras";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { code } = await params;
  const { games } = await elContext();
  const g = games.find((x) => x.id === String(code));
  return { title: g ? `${g.away.short} @ ${g.home.short} : analyse EuroLeague – Basketlog` : "Match EuroLeague – Basketlog" };
}

export default async function ELMatchPage({ params }) {
  const { code } = await params;
  const ctx = await elContext();
  const g = ctx.games.find((x) => x.id === String(code));
  if (!g) notFound();
  // Match terminé : pronostic recalculé avec les seuls matchs joués avant lui.
  const before = g.played ? elTable(ctx.games.filter((x) => x.played && new Date(x.date) < new Date(g.date))) : ctx.cur;
  const a = elAnalyze(g, before, ctx.prev);
  return (
    <MatchView
      a={a}
      league="EL"
      backHref="/app/euroleague"
      extras={<ELExtras a={a} games={ctx.games} prevGames={ctx.prevGames} />}
    />
  );
}
