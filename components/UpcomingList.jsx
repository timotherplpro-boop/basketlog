import Link from "next/link";

function day(iso) {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" }).format(new Date(iso));
}
function parts(iso) {
  const d = new Date(iso);
  return [
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(d),
    new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d),
  ];
}

// Liste des matchs façon "Prochains matchs", regroupés par jour (heure de Paris).
export default function UpcomingList({ games, title = "Prochains matchs", grouped = true }) {
  if (!games.length) return <div className="empty">Aucun match au programme.</div>;
  const groups = [];
  for (const g of games) {
    const k = grouped ? day(g.date) : "";
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
            const [d, h] = parts(g.date);
            const favHome = g.pHome >= 0.5;
            const done = g.state === "post" && g.home.score != null;
            return (
              <Link key={g.id} href={`/app/match/${g.id}?d=${g.d}`} className="up-row" style={{ animationDelay: `${Math.min(n++, 12) * 50}ms` }}>
                <div className="when">{d}<b>{g.live ? <span className="live">LIVE</span> : done ? "FIN" : h}</b></div>
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
