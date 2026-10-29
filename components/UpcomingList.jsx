import Link from "next/link";
import { mk, fmtDate, fmtTime } from "../lib/i18n";

const day = (iso, L) => fmtDate(L, iso, { weekday: "long", day: "numeric", month: "long" });
const parts = (iso, L) => [fmtDate(L, iso, { day: "2-digit", month: "2-digit" }), fmtTime(L, iso)];

// Liste des matchs façon "Prochains matchs", regroupés par jour (heure de Paris).
export default function UpcomingList({ games, title, grouped = true, href = (g) => `/app/match/${g.id}?d=${g.d}`, L = mk("fr") }) {
  if (title === undefined) title = L.t("Prochains matchs", "Upcoming games");
  if (!games.length) return <div className="empty">{L.t("Aucun match au programme.", "No games scheduled.")}</div>;
  const groups = [];
  for (const g of games) {
    const k = grouped ? day(g.date, L) : "";
    const last = groups[groups.length - 1];
    if (last && last.k === k) last.items.push(g);
    else groups.push({ k, items: [g] });
  }
  let n = 0;
  return (
    <div className="panel up-list">
      {title && <h3>{title}</h3>}
      {groups.map((gr) => (
        <div key={gr.k || "all"}>
          {gr.k && <div className="up-day">{gr.k}</div>}
          {gr.items.map((g) => {
            const [d, h] = parts(g.date, L);
            const favHome = g.pHome >= 0.5;
            const done = g.state === "post" && g.home.score != null;
            return (
              <Link key={g.id} href={L.href(href(g))} className="up-row" style={{ animationDelay: `${Math.min(n++, 12) * 50}ms` }}>
                <div className="when">{d}<b>{g.live ? <span className="live">LIVE</span> : done ? L.t("FIN", "FINAL") : h}</b></div>
                <div className="m">
                  <span className="t">
                    <span className={!favHome ? "fav" : ""}>{g.away.short}</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.away.logo} alt={g.away.name} />
                  </span>
                  <span className="vs">{done ? `${g.away.score}-${g.home.score}` : "@"}</span>
                  <span className="t">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.home.logo} alt={g.home.name} />
                    <span className={favHome ? "fav" : ""}>{g.home.short}</span>
                  </span>
                </div>
                <span className="p">{(favHome ? g.home : g.away).abbr} {Math.round(Math.max(g.pHome, 1 - g.pHome) * 100)}%</span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
