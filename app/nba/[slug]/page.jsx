import { notFound, permanentRedirect } from "next/navigation";
import { analyzeDay, recentAccuracy } from "../../../lib/data";
import { recordPronosSoon } from "../../../lib/pronos";
import { scoreboardReachable, isValidDate } from "../../../lib/espn";
import MatchView from "../../../components/MatchView";
import { getL } from "../../../lib/lang-server";
import { matchMeta } from "../../../lib/match-meta";
import { parseNbaSlug, teamSlug, nbaPath } from "../../../lib/slug";
import { parsePair } from "../../../lib/matchup";
import MatchupView, { matchupData } from "../../../components/MatchupView";
import { pageMeta } from "../../../lib/seo";

export const dynamic = "force-dynamic";

// Fiche de match NBA à adresse lisible : /nba/magic-vs-celtics-2026-11-16 (et /en/…, /es/…).
async function findBySlug(slug) {
  const s = parseNbaSlug(slug);
  if (!s || !isValidDate(s.date)) return null;
  const { analyses } = await analyzeDay(s.date);
  const a = analyses.find((x) => teamSlug(x.game?.away) === s.away && teamSlug(x.game?.home) === s.home);
  if (a) return { a, date: s.date, day: analyses };
  // ESPN injoignable : erreur temporaire (Google repassera), pas une page supprimée.
  if (!(await scoreboardReachable(s.date))) throw new Error("Données NBA momentanément indisponibles");
  return null;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const pair = parsePair(slug);
  if (pair) {
    const { x, y } = pair;
    const vs = L.t(`${x.short} – ${y.short}`, `${x.short} vs ${y.short}`, `${x.short} – ${y.short}`);
    return pageMeta({
      title: L.t(`Pronostic ${vs} : prochaine rencontre et bilan de la saison`, `${vs} prediction: next game win probability and season series`, `Pronóstico ${vs}: próximo partido y serie de la temporada`),
      description: L.t(
        `${x.name} – ${y.name} : probabilité de victoire et score projeté de la prochaine rencontre, et toutes les rencontres de la saison avec le pronostic Basketlog et le résultat.`,
        `${x.name} vs ${y.name}: win probability and projected score for the next game, plus every meeting this season with the Basketlog prediction and the result.`,
        `${x.name} – ${y.name}: probabilidad de victoria y marcador proyectado del próximo partido, y todos los partidos de la temporada con el pronóstico de Basketlog y el resultado.`
      ),
      path: `/nba/${pair.canonical}`,
      L,
    });
  }
  const found = await findBySlug(slug);
  if (!found) return { title: L.t("Match introuvable – Basketlog", "Game not found – Basketlog", "Partido no encontrado – Basketlog"), robots: { index: false } };
  return matchMeta(found.a, found.date, L, nbaPath(found.a.game, found.date));
}

export default async function NbaMatchPage({ params }) {
  const { slug } = await params;
  const pair = parsePair(slug);
  if (pair) {
    if (slug !== pair.canonical) {
      const L = await getL();
      permanentRedirect(L.href(`/nba/${pair.canonical}`));
    }
    return <MatchupView x={pair.x} y={pair.y} data={await matchupData(pair.x, pair.y)} />;
  }
  const found = await findBySlug(slug);
  if (!found) notFound();
  recordPronosSoon("NBA", [found.a]);
  // Pour Google et le visiteur : réponses propres au match et liens vers les autres matchs du même soir.
  const acc = await recentAccuracy(400).catch(() => null);
  const others = found.day
    .filter((x) => x !== found.a && x.game && !x.game.hypothetical)
    .map((x) => ({ a: x, path: nbaPath(x.game, found.date) }));
  return <MatchView a={found.a} backHref={`/app/matchs?d=${found.date}`} path={nbaPath(found.a.game, found.date)} acc={acc} others={others} />;
}
