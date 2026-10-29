import { notFound } from "next/navigation";
import { elContext, elAnalyze, elTable } from "../../../../../lib/euroleague";
import MatchView from "../../../../../components/MatchView";
import ELExtras from "../../../../../components/ELExtras";
import { pageMeta, dayLong, dayShort, pctTxt } from "../../../../../lib/seo";
import { getL } from "../../../../../lib/lang-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { code } = await params;
  const L = await getL();
  const ctx = await elContext();
  const g = ctx.games.find((x) => x.id === String(code));
  if (!g) return { title: L.t("Match EuroLeague – Basketlog", "EuroLeague game – Basketlog"), robots: { index: false } };
  const before = g.played ? elTable(ctx.games.filter((x) => x.played && new Date(x.date) < new Date(g.date))) : ctx.cur;
  const a = elAnalyze(g, before, ctx.prev);
  const done = g.played && g.home.score != null;
  if (L.en) return pageMeta({
    title: `${g.away.short} vs ${g.home.short} prediction (${dayShort(g.date, L)}): EuroLeague analysis – Basketlog`,
    description: done
      ? `${g.away.name} vs ${g.home.name}, ${dayLong(g.date, L)}: final score ${g.away.score}-${g.home.score}. Basketlog's pregame prediction and its EuroLeague analysis.`
      : `${g.away.name} vs ${g.home.name}, ${dayLong(g.date, L)}: ${a.fav.team.name} favored at ${pctTxt(Math.max(a.pHome, a.pAway), L)}. Projected score, form and scenarios for this EuroLeague game.`,
    path: `/app/euroleague/match/${code}`,
    L,
  });
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
  const L = await getL();
  return (
    <MatchView
      a={a}
      league="EL"
      backHref="/app/euroleague"
      path={`/app/euroleague/match/${code}`}
      extras={<ELExtras a={a} games={ctx.games} prevGames={ctx.prevGames} L={L} />}
    />
  );
}
