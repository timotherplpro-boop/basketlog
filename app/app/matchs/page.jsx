import Link from "next/link";
import { analyzeDay } from "../../../lib/data";
import { recordPronosSoon } from "../../../lib/pronos";
import { nbaToday, shiftDate, isValidDate } from "../../../lib/espn";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

export const dynamic = "force-dynamic";

function longDay(d, L) {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat(L.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dt);
}

// FR : « de ce soir », « de demain », « du mercredi 29 octobre » · EN : "tonight", "tomorrow", "for Wednesday, October 29"
function labelOf(d, today, L) {
  if (L.es) {
    if (d === today) return "de esta noche";
    if (d === shiftDate(today, 1)) return "de mañana";
    if (d === shiftDate(today, -1)) return "de ayer";
    return `del ${longDay(d, L)}`;
  }
  if (L.en) {
    if (d === today) return "tonight";
    if (d === shiftDate(today, 1)) return "tomorrow";
    if (d === shiftDate(today, -1)) return "yesterday";
    return `for ${longDay(d, L)}`;
  }
  if (d === today) return "de ce soir";
  if (d === shiftDate(today, 1)) return "de demain";
  if (d === shiftDate(today, -1)) return "d'hier";
  return `du ${longDay(d, L)}`;
}

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const today = nbaToday();
  const date = isValidDate(sp.d) ? sp.d : today;
  let n = 0;
  try { n = (await analyzeDay(date)).analyses.length; } catch {}
  const when = labelOf(date, today, L);
  const isToday = date === today && !sp.d;
  const title = L.t(
    isToday ? "Pronostic NBA ce soir : matchs du jour et probabilités – Basketlog" : `Pronostic NBA ${when} – Basketlog`,
    isToday ? "NBA predictions tonight: today's games and win probabilities – Basketlog" : `NBA predictions ${when} – Basketlog`,
    isToday ? "Pronóstico NBA esta noche: partidos de hoy y probabilidades – Basketlog" : `Pronósticos NBA ${when} – Basketlog`
  );
  const description = L.t(
    n ? `Pronostic NBA gratuit pour les ${n} matchs ${when} : favori, probabilités de victoire, score projeté et heure de chaque match (heure de Paris).` : `Matchs NBA ${when} : pronostic gratuit, probabilités de victoire, score projeté et heure de chaque match (heure de Paris).`,
    n ? `All ${n} NBA games ${when} analyzed: win probabilities, projected score and the favorite in every matchup, in Eastern Time.` : `NBA games ${when}: win probabilities, projected score and the favorite in every matchup, in Eastern Time.`,
    n ? `Los ${n} partidos de la NBA ${when} analizados: probabilidades de victoria, marcador proyectado y favorito de cada encuentro, en hora de España.` : `Partidos de la NBA ${when}: probabilidades de victoria, marcador proyectado y favorito de cada encuentro, en hora de España.`
  );
  return pageMeta({
    title,
    description,
    path: isToday ? "/app/matchs" : `/app/matchs?d=${date}`,
    // Jour précis sans match (ou date invalide) : page vide, inutile dans Google. La page du jour reste toujours indexée.
    noindex: (!!sp.d && !isValidDate(sp.d)) || (n === 0 && !isToday),
    L,
  });
}

export default async function MatchsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const today = nbaToday();
  const date = isValidDate(sp.d) ? sp.d : today;
  const { analyses } = await analyzeDay(date);
  recordPronosSoon("NBA", analyses); // pronostic d'avant-match enregistré pour le bilan réel
  const games = analyses
    .map((a) => ({ id: a.game.id, d: date, date: a.game.date, state: a.game.state, postponed: a.game.postponed || null, live: a.game.state === "in", home: a.game.home, away: a.game.away, pHome: a.pHome, confidence: a.confidence }))
    .sort((x, y) => new Date(x.date) - new Date(y.date));

  return (
    <main className="app-page">
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Matchs NBA ${labelOf(date, today, L)}`, `NBA games ${labelOf(date, today, L)}`, `Partidos de la NBA ${labelOf(date, today, L)}`)}</h1>
        <p>{L.t(
          `${games.length} match${games.length > 1 ? "s" : ""} NBA · pronostics gratuits · heures de Paris`,
          `${games.length} NBA game${games.length > 1 ? "s" : ""} · free predictions · Eastern Time`,
          `${games.length} partido${games.length > 1 ? "s" : ""} de la NBA · pronósticos gratis · hora de España`
        )}</p>
        <p className="note"><Link href={L.href("/pronostic-basket")}>{L.t("Pronostic basket du jour : NBA et EuroLeague →", "Today's basketball predictions: NBA and EuroLeague →", "Pronósticos de baloncesto de hoy: NBA y Euroliga →")}</Link></p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
        <Link className="btn-white" href={L.href(`/app/matchs?d=${shiftDate(date, -1)}`)}>{L.t("← Veille", "← Previous day", "← Día anterior")}</Link>
        <Link className="btn-white" href={L.href(`/app/matchs?d=${shiftDate(date, 1)}`)}>{L.t("Lendemain →", "Next day →", "Día siguiente →")}</Link>
      </div>
      <UpcomingList games={games} title="" grouped={false} L={L} />
    </main>
  );
}
