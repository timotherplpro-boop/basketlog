import { notFound } from "next/navigation";
import { analyzeDay } from "../../../lib/data";
import { recordPronosSoon } from "../../../lib/pronos";
import { scoreboardReachable, isValidDate } from "../../../lib/espn";
import MatchView from "../../../components/MatchView";
import { getL } from "../../../lib/lang-server";
import { matchMeta } from "../../../lib/match-meta";
import { parseNbaSlug, teamSlug, nbaPath } from "../../../lib/slug";

export const dynamic = "force-dynamic";

// Fiche de match NBA à adresse lisible : /nba/magic-vs-celtics-2026-11-16 (et /en/…, /es/…).
async function findBySlug(slug) {
  const s = parseNbaSlug(slug);
  if (!s || !isValidDate(s.date)) return null;
  const { analyses } = await analyzeDay(s.date);
  const a = analyses.find((x) => teamSlug(x.game?.away) === s.away && teamSlug(x.game?.home) === s.home);
  if (a) return { a, date: s.date };
  // ESPN injoignable : erreur temporaire (Google repassera), pas une page supprimée.
  if (!(await scoreboardReachable(s.date))) throw new Error("Données NBA momentanément indisponibles");
  return null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const found = await findBySlug(slug);
  if (!found) return { title: L.t("Match introuvable – Basketlog", "Game not found – Basketlog", "Partido no encontrado – Basketlog"), robots: { index: false } };
  return matchMeta(found.a, found.date, L, nbaPath(found.a.game, found.date));
}

export default async function NbaMatchPage({ params }) {
  const { slug } = await params;
  const found = await findBySlug(slug);
  if (!found) notFound();
  recordPronosSoon("NBA", [found.a]);
  return <MatchView a={found.a} backHref={`/app/matchs?d=${found.date}`} path={nbaPath(found.a.game, found.date)} />;
}
