import Link from "next/link";
import { elUpcoming, elStandings } from "../../../lib/euroleague";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Pronostics EuroLeague : matchs, analyses et classement – Basketlog", "EuroLeague predictions: games, analysis and standings – Basketlog"),
    description: L.t(
      "Pronostics EuroLeague pour chaque journée : probabilités de victoire, score projeté et forme des 20 clubs, avec le classement à jour.",
      "EuroLeague predictions for every round: win probabilities, projected score and form for all 20 clubs, with up-to-date standings."
    ),
    path: "/app/euroleague",
    L,
  });
}

const toWL = (s) => (s ? s.replace(/^V/, "W").replace(/^D/, "L") : s);

export default async function EuroLeaguePage() {
  const L = await getL();
  const { list, cur, season } = await elUpcoming(10);
  const games = list.map(({ g, a }) => ({ id: g.id, date: g.date, state: a.game.state, live: g.live, home: g.home, away: g.away, pHome: a.pHome }));
  const table = elStandings(cur);
  const year = Number(season.slice(1));

  return (
    <main className="app-page wide">
      <AppTabs active="euroleague" />
      <div className="app-head">
        <h1>EuroLeague {year}-{String(year + 1).slice(2)}</h1>
        <p>{L.t("Les 20 meilleurs clubs d'Europe, analysés comme la NBA", "Europe's top 20 clubs, analyzed like the NBA")}</p>
        <p className="note">{L.t("Probabilités, score projeté et forme : clique sur un match pour l'analyse complète.", "Probabilities, projected score and form: click a game for the full analysis.")}</p>
      </div>
      <div className="el-grid">
        <UpcomingList games={games} L={L} href={(g) => `/app/euroleague/match/${g.id}`} />
        <div className="panel">
          <div className="panel-label" style={{ marginBottom: 8 }}>{L.t("CLASSEMENT", "STANDINGS")}</div>
          <table className="std-table">
            <thead><tr><th>#</th><th>Club</th><th>{L.t("V-D", "W-L")}</th><th>{L.t("Écart", "Diff")}</th><th>{L.t("Série", "Streak")}</th></tr></thead>
            <tbody>
              {table.map((t, i) => (
                <tr key={t.id} className={i === 6 || i === 10 ? "cut" : ""} style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm">
                    <Link href={L.href(`/app/euroleague/equipe/${t.id}`)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span>{t.logo && <img src={t.logo} alt="" />}{t.short}</span>
                    </Link>
                  </td>
                  <td>{t.wins}-{t.losses}</td>
                  <td className={t.diff > 0 ? "pos" : t.diff < 0 ? "neg" : ""}>{t.gp ? `${t.diff > 0 ? "+" : ""}${t.diff.toFixed(1)}` : "–"}</td>
                  <td>{(L.en ? toWL(t.streak) : t.streak) || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="disclaimer" style={{ marginTop: 12 }}>{L.t("Tirets : 1-6 qualifiés pour les playoffs, 7-10 play-in.", "Dividers: 1-6 qualify for the playoffs, 7-10 go to the play-in.")}</p>
        </div>
      </div>
    </main>
  );
}
