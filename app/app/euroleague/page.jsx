import Link from "next/link";
import { elUpcoming, elStandings } from "../../../lib/euroleague";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Pronostics EuroLeague : matchs, analyses et classement – Basketlog",
  description: "Pronostics EuroLeague pour chaque journée : probabilités de victoire, score projeté et forme des 20 clubs, avec le classement à jour.",
  path: "/app/euroleague",
});

export default async function EuroLeaguePage() {
  const { list, cur, season } = await elUpcoming(10);
  const games = list.map(({ g, a }) => ({ id: g.id, date: g.date, state: a.game.state, live: g.live, home: g.home, away: g.away, pHome: a.pHome }));
  const table = elStandings(cur);
  const year = Number(season.slice(1));

  return (
    <main className="app-page wide">
      <AppTabs active="euroleague" />
      <div className="app-head">
        <h1>EuroLeague {year}-{String(year + 1).slice(2)}</h1>
        <p>Les 20 meilleurs clubs d&apos;Europe, analysés comme la NBA</p>
        <p className="note">Probabilités, score projeté et forme : clique sur un match pour l&apos;analyse complète.</p>
      </div>
      <div className="el-grid">
        <UpcomingList games={games} title="Prochains matchs" href={(g) => `/app/euroleague/match/${g.id}`} />
        <div className="panel">
          <div className="panel-label" style={{ marginBottom: 8 }}>CLASSEMENT</div>
          <table className="std-table">
            <thead><tr><th>#</th><th>Club</th><th>V-D</th><th>Écart</th><th>Série</th></tr></thead>
            <tbody>
              {table.map((t, i) => (
                <tr key={t.id} className={i === 6 || i === 10 ? "cut" : ""} style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm">
                    <Link href={`/app/euroleague/equipe/${t.id}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span>{t.logo && <img src={t.logo} alt="" />}{t.short}</span>
                    </Link>
                  </td>
                  <td>{t.wins}-{t.losses}</td>
                  <td className={t.diff > 0 ? "pos" : t.diff < 0 ? "neg" : ""}>{t.gp ? `${t.diff > 0 ? "+" : ""}${t.diff.toFixed(1)}` : "–"}</td>
                  <td>{t.streak || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="disclaimer" style={{ marginTop: 12 }}>Tirets : 1-6 qualifiés pour les playoffs, 7-10 play-in.</p>
        </div>
      </div>
    </main>
  );
}
