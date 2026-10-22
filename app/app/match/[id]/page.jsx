import { notFound } from "next/navigation";
import { analyzeDay } from "../../../../lib/data";
import { nbaToday, isValidDate, shiftDate } from "../../../../lib/espn";
import MatchView from "../../../../components/MatchView";

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
  if (!found) return { title: "Match introuvable – Basketlog" };
  const g = found.a.game;
  return { title: `${g.away.short} @ ${g.home.short} : analyse et probabilités – Basketlog` };
}

export default async function MatchPage({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const found = await findAnalysis(id, sp.d);
  if (!found) notFound();
  return <MatchView a={found.a} backHref={`/app/matchs?d=${found.date}`} />;
}
