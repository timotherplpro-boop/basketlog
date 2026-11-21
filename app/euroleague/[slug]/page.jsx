import { notFound } from "next/navigation";
import { elContext, elAnalyze, elTable } from "../../../lib/euroleague";
import { recordPronosSoon } from "../../../lib/pronos";
import MatchView from "../../../components/MatchView";
import ELExtras from "../../../components/ELExtras";
import { pageMeta, dayLong, dayShort, pctTxt, fitTitle } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { elPath, parseElSlug, elMatches } from "../../../lib/slug";

// Fiche EuroLeague à adresse lisible : /euroleague/dubai-vs-asvel-2026-11-19 (et /en/…, /es/…).
const findGame = (ctx, slug) => { const s = parseElSlug(slug); return s ? ctx.games.find((x) => elMatches(x, s)) || null : null; };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const ctx = await elContext();
  const g = findGame(ctx, slug);
  if (!g) return { title: L.t("Match EuroLeague – Basketlog", "EuroLeague game – Basketlog", "Partido de la Euroliga – Basketlog", "Jogo da Euroliga – Basketlog"), robots: { index: false } };
  const before = g.played ? elTable(ctx.games.filter((x) => x.played && new Date(x.date) < new Date(g.date))) : ctx.cur;
  const a = elAnalyze(g, before, ctx.prev);
  const done = g.played && g.home.score != null;
  if (L.pt) return pageMeta({
    title: fitTitle(
      `Palpite ${g.away.name} x ${g.home.name} (${dayShort(g.date, L)}): Euroliga – Basketlog`,
      `Palpite ${g.away.name} x ${g.home.name} (${dayShort(g.date, L)}) – Basketlog`,
      `Palpite ${g.away.name} x ${g.home.name} (${dayShort(g.date, L)})`,
      `Palpite ${g.away.short} x ${g.home.short} (${dayShort(g.date, L)}): análise Euroliga – Basketlog`
    ),
    description: done
      ? `${g.away.name} x ${g.home.name}, ${dayLong(g.date, L)}: resultado final ${g.away.score}-${g.home.score}. O palpite do Basketlog antes do jogo e sua análise da Euroliga.`
      : `${g.away.name} x ${g.home.name}, ${dayLong(g.date, L)}: ${a.fav.team.name}, favorito com ${pctTxt(Math.max(a.pHome, a.pAway), L)}. Placar projetado, fase e cenários deste jogo da Euroliga.`,
    path: elPath(g),
    L,
  });
  if (L.es) return pageMeta({
    title: fitTitle(
      `Pronóstico ${g.away.name} – ${g.home.name} (${dayShort(g.date, L)}): Euroliga – Basketlog`,
      `Pronóstico ${g.away.name} – ${g.home.name} (${dayShort(g.date, L)}) – Basketlog`,
      `Pronóstico ${g.away.name} – ${g.home.name} (${dayShort(g.date, L)})`,
      `Pronóstico ${g.away.short} – ${g.home.short} (${dayShort(g.date, L)}): análisis Euroliga – Basketlog`
    ),
    description: done
      ? `${g.away.name} – ${g.home.name}, ${dayLong(g.date, L)}: resultado final ${g.away.score}-${g.home.score}. El pronóstico de Basketlog antes del partido y su análisis de la Euroliga.`
      : `${g.away.name} – ${g.home.name}, ${dayLong(g.date, L)}: ${a.fav.team.name}, favorito al ${pctTxt(Math.max(a.pHome, a.pAway), L)}. Marcador proyectado, forma y escenarios de este partido de la Euroliga.`,
    path: elPath(g),
    L,
  });
  if (L.en) return pageMeta({
    // Recherches réelles : « dubai vs milan preview », « dubai vs virtus bologna prediction » (Search Console, nov. 2026).
    title: fitTitle(
      ...(done ? [] : [
        `${g.away.name} vs ${g.home.name} prediction & preview (${dayShort(g.date, L)}): ${a.fav.team.short || a.fav.team.name} ${pctTxt(Math.max(a.pHome, a.pAway), L)}`,
        `${g.away.short} vs ${g.home.short} prediction & preview (${dayShort(g.date, L)}): ${a.fav.team.short || a.fav.team.name} ${pctTxt(Math.max(a.pHome, a.pAway), L)}`,
        `${g.away.short} vs ${g.home.short} prediction (${dayShort(g.date, L)}): ${a.fav.team.short || a.fav.team.name} ${pctTxt(Math.max(a.pHome, a.pAway), L)}`,
      ]),
      `${g.away.name} vs ${g.home.name} prediction (${dayShort(g.date, L)}): EuroLeague – Basketlog`,
      `${g.away.name} vs ${g.home.name} prediction (${dayShort(g.date, L)}) – Basketlog`,
      `${g.away.name} vs ${g.home.name} prediction (${dayShort(g.date, L)})`,
      `${g.away.short} vs ${g.home.short} prediction (${dayShort(g.date, L)}): EuroLeague analysis – Basketlog`
    ),
    description: done
      ? `${g.away.name} vs ${g.home.name}, ${dayLong(g.date, L)}: final score ${g.away.score}-${g.home.score}. Basketlog's pregame prediction and its EuroLeague analysis.`
      : `${g.away.name} vs ${g.home.name}, ${dayLong(g.date, L)}: ${a.fav.team.name} favored at ${pctTxt(Math.max(a.pHome, a.pAway), L)}. Projected score, form and scenarios for this EuroLeague game.`,
    path: elPath(g),
    L,
  });
  return pageMeta({
    title: fitTitle(
      `Pronostic ${g.away.name} – ${g.home.name} (${dayShort(g.date)}) : EuroLeague – Basketlog`,
      `Pronostic ${g.away.name} – ${g.home.name} (${dayShort(g.date)}) – Basketlog`,
      `Pronostic ${g.away.name} – ${g.home.name} (${dayShort(g.date)})`,
      `Pronostic ${g.away.short} – ${g.home.short} (${dayShort(g.date)}) : analyse EuroLeague – Basketlog`
    ),
    description: done
      ? `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : score final ${g.away.score}-${g.home.score}. Le pronostic Basketlog d'avant-match et son analyse EuroLeague.`
      : `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : ${a.fav.team.name} favori à ${pctTxt(Math.max(a.pHome, a.pAway))}. Score projeté, forme et scénarios du match d'EuroLeague.`,
    path: elPath(g),
  });
}

export default async function ELMatchPage({ params }) {
  const { slug } = await params;
  const ctx = await elContext();
  const g = findGame(ctx, slug);
  if (!g) notFound();
  // Match terminé : pronostic recalculé avec les seuls matchs joués avant lui.
  const before = g.played ? elTable(ctx.games.filter((x) => x.played && new Date(x.date) < new Date(g.date))) : ctx.cur;
  const a = elAnalyze(g, before, ctx.prev);
  recordPronosSoon("EL", [a]);
  const L = await getL();
  // Les autres matchs de la même journée : maillage interne entre fiches EuroLeague.
  const others = ctx.games
    .filter((x) => x.id !== g.id && x.round === g.round && x.phase === g.phase)
    .slice(0, 12)
    .map((x) => {
      const b = x.played ? elTable(ctx.games.filter((y) => y.played && new Date(y.date) < new Date(x.date))) : ctx.cur;
      return { a: elAnalyze(x, b, ctx.prev), path: elPath(x) };
    });
  return (
    <MatchView
      others={others}
      a={a}
      league="EL"
      backHref="/app/euroleague"
      path={elPath(g)}
      extras={<ELExtras a={a} games={ctx.games} prevGames={ctx.prevGames} L={L} />}
    />
  );
}
