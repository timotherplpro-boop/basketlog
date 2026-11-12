import Link from "next/link";
import { analyzeDay } from "../../../lib/data";
import { recordPronosSoon } from "../../../lib/pronos";
import { nbaToday, shiftDate, isValidDate } from "../../../lib/espn";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import { pageMeta, topFavorites } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import JsonLd from "../../../components/JsonLd";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

function longDay(d, L) {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat(L.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dt);
}

// « Nov 12 » / « 12 nov » / « 12 nov. » : date courte dans les titres (Google montre la fraîcheur de la page).
function shortDay(d, L) {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat(L.locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(dt).replace(/\.$/, "");
}

// FR : « de ce soir », « de demain », « du mercredi 29 octobre » · EN : "tonight", "tomorrow", "for Wednesday, October 29"
function labelOf(d, today, L) {
  if (L.es) {
    if (d === today) return "de hoy"; // en Espagne, les matchs NBA se jouent dans la nuit : on cherche « pronósticos NBA hoy »
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
  // Titres calés sur les recherches vues dans la Search Console : « nba predictions today » (US), « pronósticos nba hoy » (ES).
  const title = L.t(
    isToday ? "Pronostic NBA ce soir : matchs du jour et probabilités – Basketlog" : `Pronostic NBA ${when} – Basketlog`,
    isToday ? `NBA predictions today (${shortDay(date, L)}): win probabilities for every game` : `NBA predictions ${when} – Basketlog`,
    isToday ? `Pronósticos NBA hoy (${shortDay(date, L)}): probabilidades de cada partido` : `Pronósticos NBA ${when} – Basketlog`
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

  const favs = topFavorites(games, L);
  // Liste des matchs du jour pour Google : chaque affiche renvoie à sa page de pronostic.
  const ld = games.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: L.t(`Pronostics NBA ${labelOf(date, today, L)}`, `NBA predictions ${labelOf(date, today, L)}`, `Pronósticos NBA ${labelOf(date, today, L)}`),
    itemListElement: games.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: L.t(`${g.away.name} – ${g.home.name}`, `${g.away.name} vs ${g.home.name}`, `${g.away.name} – ${g.home.name}`),
      url: `${SITE}${L.href(`/app/match/${g.id}?d=${date}`)}`,
    })),
  } : null;

  return (
    <main className="app-page">
      {ld && <JsonLd data={ld} />}
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Pronostics NBA ${labelOf(date, today, L)}`, `NBA predictions ${labelOf(date, today, L)}`, `Pronósticos NBA ${labelOf(date, today, L)}`)}</h1>
        <p>{L.t(
          `${games.length} match${games.length > 1 ? "s" : ""} NBA · pronostics gratuits · heures de Paris`,
          `${games.length} NBA game${games.length > 1 ? "s" : ""} · free predictions · Eastern Time`,
          `${games.length} partido${games.length > 1 ? "s" : ""} de la NBA · pronósticos gratis · hora de España`
        )}</p>
        {favs.length > 0 && (
          <p className="note">{L.t(
            `Plus gros favoris ${labelOf(date, today, L)} : ${favs.join(", ")}`,
            `Biggest favorites ${labelOf(date, today, L)}: ${favs.join(", ")}`,
            `Favoritos NBA ${labelOf(date, today, L)}: ${favs.join(", ")}`
          )}</p>
        )}
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
