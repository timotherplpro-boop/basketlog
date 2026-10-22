import Link from "next/link";
import { conferenceStandings } from "../../../lib/data";
import AppTabs from "../../../components/AppTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Classement NBA – Basketlog" };

function Table({ title, rows }) {
  return (
    <div className="panel">
      <div className="panel-label" style={{ marginBottom: 8 }}>{title}</div>
      <table className="std-table">
        <thead><tr><th>#</th><th>Équipe</th><th>V-D</th><th>%</th><th>Écart</th><th>Série</th></tr></thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.id} className={i === 6 || i === 10 ? "cut" : ""} style={{ animationDelay: `${i * 35}ms` }}>
              <td className="rk">{i + 1}</td>
              <td className="tm">
                <Link href={`/app/equipe/${t.id}`}>
                  <span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.logo} alt="" />
                    {t.short}
                  </span>
                </Link>
              </td>
              <td>{t.wins}-{t.losses}</td>
              <td>{t.gp ? t.pct.toFixed(3).replace(/^0/, "") : "–"}</td>
              <td className={t.diff > 0 ? "pos" : t.diff < 0 ? "neg" : ""}>{t.diff == null || !t.gp ? "–" : `${t.diff > 0 ? "+" : ""}${t.diff.toFixed(1)}`}</td>
              <td>{t.streak || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ClassementPage() {
  const { east, west } = await conferenceStandings();
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>Classement</h1>
        <p>Découvre les conférences en cours</p>
        <p className="note">Clique sur une équipe pour voir sa fiche : stats, joueurs, calendrier.</p>
      </div>
      <div className="std-grid">
        <Table title="CONFÉRENCE EST" rows={east} />
        <Table title="CONFÉRENCE OUEST" rows={west} />
      </div>
      <p className="disclaimer">Tirets : 1-6 qualifiés directement, 7-10 play-in. En début de saison, l&apos;ordre départage aussi par la saison passée.</p>
    </main>
  );
}
