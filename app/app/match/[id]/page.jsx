import { notFound, permanentRedirect } from "next/navigation";
import { recordPronosSoon } from "../../../../lib/pronos";
import MatchView from "../../../../components/MatchView";
import { getL } from "../../../../lib/lang-server";
import { findAnalysis, matchMeta } from "../../../../lib/match-meta";
import { nbaPath } from "../../../../lib/slug";

export const dynamic = "force-dynamic";

// Ancienne adresse des fiches NBA (/app/match/<id>?d=<date>) : redirige (308) vers /nba/<équipe>-vs-<équipe>-<date>.
export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const L = await getL();
  const found = await findAnalysis(id, sp.d);
  if (!found) return { title: L.t("Match introuvable – Basketlog", "Game not found – Basketlog", "Partido no encontrado – Basketlog", "Jogo não encontrado – Basketlog"), robots: { index: false } };
  return matchMeta(found.a, found.date, L, nbaPath(found.a.game, found.date));
}

export default async function MatchPage({ params, searchParams }) {
  const { id } = await params;
  const sp = (await searchParams) || {};
  const found = await findAnalysis(id, sp.d);
  if (!found) notFound();
  const path = nbaPath(found.a.game, found.date);
  if (path.startsWith("/nba/")) {
    const L = await getL();
    permanentRedirect(L.href(path));
  }
  recordPronosSoon("NBA", [found.a]);
  return <MatchView a={found.a} backHref={`/app/matchs?d=${found.date}`} path={path} />;
}
