// Titre, description et adresses d'une fiche de match NBA (partagé entre /nba/<slug> et l'ancienne /app/match/<id>).
import { analyzeDay } from "./data";
import { nbaToday, isValidDate, shiftDate, scoreboardReachable } from "./espn";
import { pageMeta, dayLong, dayShort, pctTxt, fitTitle } from "./seo";

export async function findAnalysis(id, d) {
  const today = nbaToday();
  const candidates = isValidDate(d) ? [d] : [today, shiftDate(today, 1), shiftDate(today, -1)];
  for (const date of candidates) {
    const { analyses } = await analyzeDay(date);
    const a = analyses.find((x) => x.id === String(id));
    if (a) return { a, date };
  }
  // Introuvable parce qu'ESPN ne répond pas : erreur temporaire (Google repassera), pas une page supprimée.
  if (!(await scoreboardReachable(candidates[0]))) throw new Error("Données NBA momentanément indisponibles");
  return null;
}

// Image de partage propre au match (équipes, probabilités, score projeté ou final) : /api/og/match?…
function withMatchImage(m, a, L) {
  const g = a.game;
  const done = g.state === "post" && g.home.score != null;
  const q = new URLSearchParams({
    lang: L.lang, a: g.away.short, h: g.home.short, pa: String(Math.round(a.pAway * 100)),
    s: done ? `${g.away.score}-${g.home.score}` : `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`,
    d: dayShort(g.date, L),
    ...(done ? { f: "1" } : {}),
    ...(g.away.logo ? { la: g.away.logo } : {}),
    ...(g.home.logo ? { lh: g.home.logo } : {}),
  });
  const img = { url: `/api/og/match?${q}`, width: 1200, height: 630, alt: m.openGraph?.title || "" };
  return { ...m, openGraph: { ...m.openGraph, images: [img] }, twitter: { ...m.twitter, images: [img.url] } };
}

export function matchMeta(a, date, L, path) {
  return withMatchImage(matchMetaBase(a, date, L, path), a, L);
}

function matchMetaBase(a, date, L, path) {
  const g = a.game;
  const pFav = Math.max(a.pHome, a.pAway);
  const done = g.state === "post" && g.home.score != null;
  if (L.es) return pageMeta({
    title: fitTitle(
      `Pronóstico NBA ${g.away.name} – ${g.home.name} (${dayShort(g.date, L)}) – Basketlog`,
      `Pronóstico ${g.away.name} – ${g.home.name} (${dayShort(g.date, L)}) – Basketlog`,
      `Pronóstico ${g.away.name} – ${g.home.name} (${dayShort(g.date, L)})`,
      `Pronóstico ${g.away.short} – ${g.home.short} (${dayShort(g.date, L)}): análisis NBA – Basketlog`
    ),
    description: done
      ? `${g.away.name} – ${g.home.name}, ${dayLong(g.date, L)}: resultado final ${g.away.score}-${g.home.score}. El pronóstico de Basketlog antes del partido, sus probabilidades y su análisis.`
      : `${g.away.name} – ${g.home.name}, ${dayLong(g.date, L)}: ${a.fav.team.name}, favorito al ${pctTxt(pFav, L)}. Marcador proyectado ${Math.round(a.awayPts)}-${Math.round(a.homePts)}, bajas, forma y escenarios del partido.`,
    path,
    L,
  });
  if (L.en) return pageMeta({
    title: fitTitle(
      `${g.away.name} vs ${g.home.name} prediction (${dayShort(g.date, L)}) – Basketlog`,
      `${g.away.name} vs ${g.home.name} prediction (${dayShort(g.date, L)})`,
      `${g.away.short} vs ${g.home.short} prediction (${dayShort(g.date, L)}): NBA analysis – Basketlog`
    ),
    description: done
      ? `${g.away.name} vs ${g.home.name}, ${dayLong(g.date, L)}: final score ${g.away.score}-${g.home.score}. Basketlog's pregame prediction, its probabilities and analysis.`
      : `${g.away.name} vs ${g.home.name}, ${dayLong(g.date, L)}: ${a.fav.team.name} favored at ${pctTxt(pFav, L)}. Projected score ${Math.round(a.awayPts)}-${Math.round(a.homePts)}, injuries, form and game scenarios.`,
    path,
    L,
  });
  return pageMeta({
    title: fitTitle(
      `Pronostic NBA ${g.away.name} – ${g.home.name} (${dayShort(g.date)}) – Basketlog`,
      `Pronostic ${g.away.name} – ${g.home.name} (${dayShort(g.date)}) – Basketlog`,
      `Pronostic ${g.away.name} – ${g.home.name} (${dayShort(g.date)})`,
      `Pronostic ${g.away.short} – ${g.home.short} (${dayShort(g.date)}) : analyse NBA – Basketlog`
    ),
    description: done
      ? `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : score final ${g.away.score}-${g.home.score}. Le pronostic Basketlog d'avant-match, ses probabilités et son analyse.`
      : `${g.away.name} – ${g.home.name}, ${dayLong(g.date)} : ${a.fav.team.name} favori à ${pctTxt(pFav)}. Score projeté ${Math.round(a.awayPts)}-${Math.round(a.homePts)}, absences, forme et scénarios du match.`,
    path,
  });
}
