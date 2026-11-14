import { analyzeDay } from "../../../lib/data";
import { nbaToday, shiftDate } from "../../../lib/espn";
import { SITE } from "../../../lib/site";
import { widgetGames, widgetHtml, widgetLang, widgetTheme } from "../../../lib/widget";

// Widget « Probabilités NBA du soir » à intégrer dans une iframe (voir /widget). Réponse gardée 15 minutes par le CDN,
// donc un seul calcul par langue et par thème toutes les 15 minutes, quel que soit le nombre de sites qui l'affichent.
// S'il n'y a plus de match à venir aujourd'hui, on montre ceux de demain.
export async function GET(req) {
  const sp = req.nextUrl.searchParams;
  const lang = widgetLang(sp.get("lang"));
  const theme = widgetTheme(sp.get("theme"));
  let analyses = [], tomorrow = false;
  try {
    const today = nbaToday();
    analyses = (await analyzeDay(today)).analyses;
    if (!widgetGames(analyses).length) {
      const next = (await analyzeDay(shiftDate(today, 1))).analyses;
      if (widgetGames(next).length) { analyses = next; tomorrow = true; }
    }
  } catch {
    analyses = [];
  }
  const ok = analyses.length > 0 || tomorrow;
  return new Response(widgetHtml({ analyses, lang, theme, site: SITE, tomorrow }), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Données NBA indisponibles : réponse gardée peu de temps, pour réessayer vite.
      "cache-control": ok ? "public, max-age=300, s-maxage=900, stale-while-revalidate=3600" : "public, max-age=60, s-maxage=120",
      "x-robots-tag": "noindex",
    },
  });
}
