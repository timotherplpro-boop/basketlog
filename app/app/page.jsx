import Link from "next/link";
import { analyzeDay } from "../../lib/data";
import { nbaToday, shiftDate, isValidDate } from "../../lib/espn";
import { GameCard } from "../../components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Matchs NBA du jour – HoopSight" };

function label(d, today) {
  if (d === today) return "Ce soir";
  if (d === shiftDate(today, 1)) return "Demain";
  if (d === shiftDate(today, -1)) return "Hier";
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(dt);
}

export default async function AppPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const today = nbaToday();
  const date = isValidDate(sp.d) ? sp.d : today;
  const { analyses } = await analyzeDay(date);
  const sorted = [...analyses].sort((x, y) => new Date(x.game.date) - new Date(y.game.date));

  return (
    <main className="wrap">
      <div className="app-head">
        <div>
          <div className="team-rec">Programme NBA · heures de Paris</div>
          <h1>{label(date, today)} · {analyses.length} match{analyses.length > 1 ? "s" : ""}</h1>
        </div>
        <div className="datenav">
          <Link href={`/app?d=${shiftDate(date, -1)}`} aria-label="Jour précédent">←</Link>
          <span>{label(date, today)}</span>
          <Link href={`/app?d=${shiftDate(date, 1)}`} aria-label="Jour suivant">→</Link>
        </div>
      </div>
      {sorted.length ? (
        <div className="games">
          {sorted.map((a) => (
            <GameCard key={a.id} a={a} date={date} />
          ))}
        </div>
      ) : (
        <div className="card empty" style={{ marginBottom: 60 }}>
          Pas de match NBA ce jour-là. <Link href={`/app?d=${shiftDate(date, 1)}`} style={{ color: "var(--orange)" }}>Voir le jour suivant →</Link>
        </div>
      )}
    </main>
  );
}
