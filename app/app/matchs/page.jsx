import Link from "next/link";
import { analyzeDay } from "../../../lib/data";
import { nbaToday, shiftDate, isValidDate } from "../../../lib/espn";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Matchs NBA du jour – Basketlog" };

function label(d, today) {
  if (d === today) return "Ce soir";
  if (d === shiftDate(today, 1)) return "Demain";
  if (d === shiftDate(today, -1)) return "Hier";
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dt);
}

export default async function MatchsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const today = nbaToday();
  const date = isValidDate(sp.d) ? sp.d : today;
  const { analyses } = await analyzeDay(date);
  const games = analyses
    .map((a) => ({ id: a.game.id, d: date, date: a.game.date, state: a.game.state, live: a.game.state === "in", home: a.game.home, away: a.game.away, pHome: a.pHome }))
    .sort((x, y) => new Date(x.date) - new Date(y.date));

  return (
    <main className="app-page">
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{label(date, today)}</h1>
        <p>{games.length} match{games.length > 1 ? "s" : ""} NBA · heures de Paris</p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
        <Link className="btn-white" href={`/app/matchs?d=${shiftDate(date, -1)}`}>← Veille</Link>
        <Link className="btn-white" href={`/app/matchs?d=${shiftDate(date, 1)}`}>Lendemain →</Link>
      </div>
      <UpcomingList games={games} title="" grouped={false} />
    </main>
  );
}
