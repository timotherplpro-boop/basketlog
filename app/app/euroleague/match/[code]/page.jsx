import { notFound } from "next/navigation";
import { elContext, elAnalyze } from "../../../../../lib/euroleague";
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
  const a = elAnalyze(g, ctx.cur, ctx.prev);
  return (
    <MatchView
      a={a}
      league="EL"
      backHref="/app/euroleague"
      extras={<ELExtras a={a} games={ctx.games} prevGames={ctx.prevGames} />}
    />
  );
}
