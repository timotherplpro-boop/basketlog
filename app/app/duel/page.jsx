import { notFound, redirect } from "next/navigation";
import { analyzeDuel } from "../../../lib/data";
import { teamById } from "../../../lib/teams";
import MatchView from "../../../components/MatchView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const h = teamById(sp.home), a = teamById(sp.away);
  // Combinaisons d'équipes infinies : pages utiles aux visiteurs, mais pas à indexer.
  return { title: h && a ? `${a.short} – ${h.short} : analyse – Basketlog` : "Analyse de match – Basketlog", robots: { index: false, follow: true } };
}

export default async function DuelPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const res = await analyzeDuel(sp.home, sp.away);
  if (!res) notFound();
  if (res.fixture) redirect(`/app/match/${res.fixture.id}?d=${res.fixture.d}`);
  return <MatchView a={res.analysis} backHref="/app" />;
}
