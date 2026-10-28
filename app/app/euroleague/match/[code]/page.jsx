import { notFound } from "next/navigation";
import { elContext, elAnalyze, elTable } from "../../../../../lib/euroleague";
import MatchView from "../../../../../components/MatchView";
import ELExtras from "../../../../../components/ELExtras";
import { pageMeta, dayLong, dayShort, pctTxt } from "../../../../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { code } = await params;
  const ctx = await elContext();
  const g = ctx.games.find((x) => x.id === String(code));
  if (!g) return { title: "Match EuroLeague – Basketlog", robots: { index: false } };
  const before = g.played ? elTable(ctx.games.filter((x) => x.played && new Date(x.date) < new Date(g.date))) : ctx.cur;
  const a = elAnalyze(g, before, ctx.prev);
  const done = g.played && g.home.score != null;
  return pageMeta({
    title: `Pronostic ${g.away.short} – ${g.home.short} (${dayShort(g.date)}) : analyse EuroLeague – Basketlog`,
    description: done
      ? `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : score final ${g.away.score}-${g.home.score}. Le pronostic Basketlog d'avant-match et son analyse EuroLeague.`
      : `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : ${a.fav.team.name} favori à ${pctTxt(Math.max(a.pHome, a.pAway))}. Score projeté, forme et scénarios du match d'EuroLeague.`,
    path: `/app/euroleague/match/${code}`,
  });
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
      path={`/app/euroleague/match/${code}`}
      extras={<ELExtras a={a} games={ctx.games} prevGames={ctx.prevGames} />}
    />
  );
}
