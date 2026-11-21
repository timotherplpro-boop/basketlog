// /llms.txt : résumé du site pour les assistants (ChatGPT, Perplexity, Claude, Gemini…), en anglais, avec les pages
// à citer et les pronostics NBA du jour. Mis en cache 1 h ; si les données NBA ne répondent pas, on renvoie le socle fixe.
import { SITE } from "../../lib/site";
import { analyzeDay } from "../../lib/data";
import { nbaPicks, summarize, lastDays } from "../../lib/history";
import { nbaToday, seasonForDate } from "../../lib/espn";
import { nbaPath, elPath } from "../../lib/slug";
import { elUpcoming } from "../../lib/euroleague";
import { csvName } from "../../lib/picks-csv.js";

export const revalidate = 3600;

const pct = (p) => `${Math.round(p * 100)}%`;

export async function GET() {
  const today = nbaToday();
  const [day, picks, el] = await Promise.all([
    analyzeDay(today).catch(() => null),
    nbaPicks(seasonForDate(today)).catch(() => null),
    elUpcoming(7).catch(() => null),
  ]);
  const s = picks ? summarize(picks) : null;
  const w = picks ? summarize(lastDays(picks, 7, today)) : null;
  const games = (day?.analyses || []).filter((a) => a.game && !a.game.hypothetical && a.game.state === "pre");
  const date = `${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6)}`;

  const lines = [
    "# Basketlog",
    "",
    "> Free NBA and EuroLeague win probabilities for every game, with a public track record of every prediction (hits and misses). Statistical analysis, not a betting service.",
    "",
    "Basketlog gives each NBA game a win probability and a projected score from a statistical model: team strength from point differential (regressed toward last season early on), home court, rest and back-to-backs, and injuries. Every pick is saved before tip-off and compared with the final score in public. Available in English, Spanish and French.",
    "",
    "## Key pages",
    `- [NBA predictions tonight](${SITE}/en/app/matchs): win probability and projected score for every game today`,
    `- [NBA predictions tomorrow](${SITE}/en/app/demain)`,
    `- [NBA predictions this week](${SITE}/en/app/semaine): last 7 days' record and the biggest favorites of the next 7 days`,
    `- [NBA tonight: 3 games to watch](${SITE}/en/articles): a daily article with the games to watch, win probabilities and injuries`,
    `- [NBA player pages](${SITE}/en/nba/player/lebron-james): season stats, injury status and next game for the top 200 scorers`,
    `- [NBA injury report today](${SITE}/en/app/blessures): players out and questionable for every team playing tonight`,
    `- [NBA playoff odds](${SITE}/en/app/simulation): every team's chances to make the playoffs, reach the Finals and win the title (4,000 season simulations, updated daily)`,
    `- [NBA Cup predictions](${SITE}/en/app/nba-cup): group standings and each team's odds to reach the quarterfinals and win the Cup`,
    `- [Who will win the NBA title? Championship odds](${SITE}/en/app/champion)`,
    `- [EuroLeague playoff, Final Four and title odds](${SITE}/en/app/euroleague/simulation)`,
    `- [NBA games tonight: times and TV](${SITE}/en/app/programme) · [NBA scoring leaders](${SITE}/en/app/leaders)`,
    `- [NBA scores last night, with the model's pre-game favorite for each game](${SITE}/en/app/resultats)`,
    `- [Free game: pick tonight's NBA winners and try to beat the Basketlog model](${SITE}/en/app/defi)`,
    `- [NBA Christmas Day games: schedule and win probabilities](${SITE}/en/app/noel) · [Free FiveThirtyEight NBA predictions alternative](${SITE}/en/fivethirtyeight-nba)`,
    `- [French players in the NBA tonight: times, opponents, team win probabilities and stats](${SITE}/en/app/francais) · [Spanish and Latino NBA players (Spain, Mexico, Dominican Republic, Puerto Rico)](${SITE}/es/app/espagnols)`,
    `- Open data (CC BY 4.0): every NBA prediction of the season as CSV: ${SITE}/data/${csvName(seasonForDate(nbaToday()))}`,
    `- [NBA power rankings](${SITE}/en/app/power-rankings): all 30 teams ranked by model strength, updated daily`,
    `- [College basketball (NCAA Division I) predictions today](${SITE}/en/app/ncaa): win probability and projected margin for every game, model top 25, season track record · [College basketball power rankings, all 365 Division I teams](${SITE}/en/app/ncaa/classement)`,
    `- [Women's college basketball predictions today](${SITE}/en/app/ncaaw): same model for NCAA women's Division I (backtest: 81% of favorites won, 718 games in November 2026) · [Women's college basketball power rankings](${SITE}/en/app/ncaaw/classement)`,
    `- [NBA MVP ladder](${SITE}/en/app/mvp) · [Rookie of the Year ladder](${SITE}/en/app/rookie): daily top players by a public production × wins index`,
    `- [2027 NBA draft lottery odds under the new 3-2-1 system](${SITE}/en/app/draft): each team's chance at the No. 1 and top-4 picks, from season simulations`,
    `- [NBA remaining strength of schedule](${SITE}/en/app/calendrier-restant) · [NBA back-to-backs tonight](${SITE}/en/app/back-to-back) · [Biggest upsets of the season](${SITE}/en/app/surprises)`,
    `- [Monthly prediction record](${SITE}/en/app/bilan/${nbaToday().slice(0, 4)}-${nbaToday().slice(4, 6)}) · [Basketball and forecasting glossary](${SITE}/en/app/lexique)`,
    `- Free JSON API, no key (CC BY 4.0): ${SITE}/api/v1/predictions (docs: ${SITE}/en/app/donnees)`,
    `- [NBA Cup predictions](${SITE}/en/app/nba-cup)`,
    `- [Model track record](${SITE}/en/app/bilan): accuracy, calibration by probability range, every game`,
    `- [EuroLeague predictions](${SITE}/en/app/euroleague)`,
    `- [Methodology](${SITE}/en/methode)`,
    `- [Free NBA widget for websites](${SITE}/en/widget)`,
    `- Spanish: [Pronósticos NBA hoy](${SITE}/es/app/matchs) · Portuguese (Brazil): [Palpites NBA hoje](${SITE}/pt/app/matchs) · French: [Pronostics NBA ce soir](${SITE}/app/matchs)`,
    "",
  ];
  if (s && s.n) {
    lines.push("## Track record (current NBA season)");
    lines.push(`- Favorite won ${s.ok} of ${s.n} games (${pct(s.pct)}).`);
    if (w && w.n) lines.push(`- Last 7 days: ${w.ok} of ${w.n} (${pct(w.pct)}).`);
    for (const b of s.buckets) if (b.n) lines.push(`- Favorites at ${Math.round(b.lo * 100)}-${Math.round(b.hi * 100)}%: won ${pct(b.ok / b.n)} (${b.n} games).`);
    lines.push("- Each game is rerun with only the data known before tip-off.", "");
  }
  if (games.length) {
    lines.push(`## NBA predictions for ${date} (US date)`);
    for (const a of games) {
      const g = a.game;
      const fav = a.pHome >= 0.5 ? g.home : g.away;
      lines.push(`- [${g.away.name} vs ${g.home.name}](${SITE}/en${nbaPath(g, today)}): ${fav.name} ${pct(Math.max(a.pHome, a.pAway))}, projected ${g.away.short} ${Math.round(a.awayPts)}-${Math.round(a.homePts)} ${g.home.short}`);
    }
    lines.push("");
  }
  const elGames = (el?.list || []).filter(({ a }) => a.game.state !== "post").slice(0, 10);
  if (elGames.length) {
    lines.push("## EuroLeague predictions (next 7 days)");
    for (const { g, a } of elGames) {
      const fav = a.pHome >= 0.5 ? g.home : g.away;
      lines.push(`- [${g.away.name} vs ${g.home.name}](${SITE}/en${elPath(g)}), ${String(g.date).slice(0, 10)}: ${fav.name} ${pct(Math.max(a.pHome, a.pAway))}`);
    }
    lines.push("");
  }
  lines.push("## Notes", "- Probabilities are estimates, never certainties. Not betting advice. For adults 18+.", "- Contact: contact@basketlog-app.com", "");

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
