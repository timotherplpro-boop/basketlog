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
import { pageMeta, fitTitle, dayShort, pctTxt } from "../../../lib/seo";

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
    const vs = L.t(`${x.short} – ${y.short}`, `${x.short} vs ${y.short}`, `${x.short} – ${y.short}`, `${x.short} x ${y.short}`);
    // Date du prochain match et favori dans le titre : un duel visiblement à jour attire le clic (26 nov. : les fiches
    // datées n'étaient jamais affichées par Google, ces pages duel sans date prennent le relais).
    let next = null;
    try { next = (await matchupData(x, y)).rows.find((r) => r.g.state !== "post" && !r.g.postponed) || null; } catch {}
    const fav = next && next.pHome != null ? (next.pHome >= 0.5 ? { t: next.g.home, p: next.pHome } : { t: next.g.away, p: 1 - next.pHome }) : null;
    const d = next ? dayShort(next.g.date, L) : "";
    const generic = L.t(`Pronostic ${vs} : prochaine rencontre et bilan de la saison`, `${vs} prediction: next game win probability and season series`, `Pronóstico ${vs}: próximo partido y serie de la temporada`, `Palpite ${vs}: próximo jogo e confrontos da temporada`);
    const title = !next ? generic : fav
      ? fitTitle(
        L.t(`Pronostic ${vs} (${d}) : ${fav.t.short} ${pctTxt(fav.p, L)}, bilan de la saison`, `${vs} prediction (${d}): ${fav.t.short} ${pctTxt(fav.p, L)} to win, season series`, `Pronóstico ${vs} (${d}): ${fav.t.short} ${pctTxt(fav.p, L)}, serie de la temporada`, `Palpite ${vs} (${d}): ${fav.t.short} ${pctTxt(fav.p, L)}, confrontos da temporada`),
        L.t(`Pronostic ${vs} (${d}) : ${fav.t.short} ${pctTxt(fav.p, L)}`, `${vs} prediction (${d}): ${fav.t.short} ${pctTxt(fav.p, L)} to win`, `Pronóstico ${vs} (${d}): ${fav.t.short} ${pctTxt(fav.p, L)}`, `Palpite ${vs} (${d}): ${fav.t.short} ${pctTxt(fav.p, L)}`))
      : fitTitle(L.t(`Pronostic ${vs} (${d}) : prochaine rencontre et bilan de la saison`, `${vs} prediction (${d}): next game and season series`, `Pronóstico ${vs} (${d}): próximo partido y serie de la temporada`, `Palpite ${vs} (${d}): próximo jogo e confrontos da temporada`), generic);
    const lead = fav ? L.t(`Prochain match le ${d} : ${fav.t.short} favoris à ${pctTxt(fav.p, L)}. `, `Next game ${d}: ${fav.t.short} favored at ${pctTxt(fav.p, L)}. `, `Próximo partido el ${d}: ${fav.t.short} favoritos con un ${pctTxt(fav.p, L)}. `, `Próximo jogo em ${d}: ${fav.t.short} favorito com ${pctTxt(fav.p, L)}. `) : "";
    return pageMeta({
      title,
      description: lead + L.t(
        `${x.name} – ${y.name} : probabilité de victoire et score projeté de la prochaine rencontre, et toutes les rencontres de la saison avec le pronostic Basketlog et le résultat.`,
        `${x.name} vs ${y.name}: win probability and projected score for the next game, plus every meeting this season with the Basketlog prediction and the result.`,
        `${x.name} – ${y.name}: probabilidad de victoria y marcador proyectado del próximo partido, y todos los partidos de la temporada con el pronóstico de Basketlog y el resultado.`, `${x.name} x ${y.name}: probabilidade de vitória e placar projetado do próximo jogo, e todos os jogos da temporada com o palpite do Basketlog e o resultado.`
      ),
      path: `/nba/${pair.canonical}`,
      L,
    });
  }
  const found = await findBySlug(slug);
  if (!found) return { title: L.t("Match introuvable – Basketlog", "Game not found – Basketlog", "Partido no encontrado – Basketlog", "Jogo não encontrado – Basketlog"), robots: { index: false } };
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
