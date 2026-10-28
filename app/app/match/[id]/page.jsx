import { notFound } from "next/navigation";
import { analyzeDay } from "../../../../lib/data";
import { nbaToday, isValidDate, shiftDate } from "../../../../lib/espn";
import MatchView from "../../../../components/MatchView";
import { pageMeta, dayLong, dayShort, pctTxt } from "../../../../lib/seo";

export const dynamic = "force-dynamic";

async function findAnalysis(id, d) {
  const today = nbaToday();
  const candidates = isValidDate(d) ? [d] : [today, shiftDate(today, 1), shiftDate(today, -1)];
  for (const date of candidates) {
    const { analyses } = await analyzeDay(date);
    const a = analyses.find((x) => x.id === String(id));
    if (a) return { a, date };
  }
  return null;
}

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const found = await findAnalysis(id, sp.d);
  if (!found) return { title: "Match introuvable – Basketlog", robots: { index: false } };
  const { a, date } = found;
  const g = a.game;
  const pFav = Math.max(a.pHome, a.pAway);
  const done = g.state === "post" && g.home.score != null;
  return pageMeta({
    title: `Pronostic ${g.away.short} – ${g.home.short} (${dayShort(g.date)}) : analyse NBA – Basketlog`,
    description: done
      ? `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : score final ${g.away.score}-${g.home.score}. Le pronostic Basketlog d'avant-match, ses probabilités et son analyse.`
      : `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : ${a.fav.team.name} favori à ${pctTxt(pFav)}. Score projeté ${Math.round(a.awayPts)}-${Math.round(a.homePts)}, absences, forme et scénarios du match.`,
    path: `/app/match/${id}?d=${date}`,
  });
}

export default async function MatchPage({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const found = await findAnalysis(id, sp.d);
  if (!found) notFound();
  return <MatchView a={found.a} backHref={`/app/matchs?d=${found.date}`} path={`/app/match/${id}?d=${found.date}`} />;
}
