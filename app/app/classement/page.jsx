import Link from "next/link";
import { conferenceStandings } from "../../../lib/data";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Classement NBA : conférences Est et Ouest – Basketlog", "NBA standings: Eastern and Western Conferences – Basketlog", "Clasificación NBA: Conferencias Este y Oeste – Basketlog"),
    description: L.t(
      "Classement NBA à jour des conférences Est et Ouest : bilan, pourcentage de victoires, écart de points, série en cours et forme de chaque équipe.",
      "Up-to-date NBA standings for the Eastern and Western Conferences: record, win percentage, point differential, current streak and form for every team.", "Clasificación NBA actualizada de las Conferencias Este y Oeste: balance, porcentaje de victorias, diferencia de puntos, racha actual y forma de cada equipo."
    ),
    path: "/app/classement",
    L,
  });
}

function Table({ title, rows, L }) {
  return (
    <div className="panel">
      <div className="panel-label" style={{ marginBottom: 8 }}>{title}</div>
      <table className="std-table">
        <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo")}</th><th>{L.t("V-D", "W-L", "V-D")}</th><th>%</th><th>{L.t("Écart", "Diff", "Dif.")}</th><th>{L.t("Série", "Streak", "Racha")}</th></tr></thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.id} className={i === 6 || i === 10 ? "cut" : ""} style={{ animationDelay: `${i * 35}ms` }}>
              <td className="rk">{i + 1}</td>
              <td className="tm">
                <Link href={L.href(`/app/equipe/${t.id}`)}>
                  <span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.logo} alt="" />
                    {t.short}
                  </span>
                </Link>
              </td>
              <td>{t.wins}-{t.losses}</td>
              <td>{t.gp ? (L.en ? t.pct.toFixed(3).replace(/^0/, "") : t.pct.toFixed(3).replace(".", ",")) : "–"}</td>
              <td className={t.diff > 0 ? "pos" : t.diff < 0 ? "neg" : ""}>{t.diff == null || !t.gp ? "–" : `${t.diff > 0 ? "+" : ""}${L.en ? t.diff.toFixed(1) : t.diff.toFixed(1).replace(".", ",")}`}</td>
              <td>{(t.streak && (L.en ? t.streak.replace(/^V/, "W").replace(/^D/, "L") : t.streak.replace(/^W/, "V").replace(/^L/, "D"))) || "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ClassementPage() {
  const L = await getL();
  const { east, west } = await conferenceStandings();
  return (
    <main className="app-page wide">
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t("Classement NBA", "NBA standings", "Clasificación NBA")}</h1>
        <p>{L.t("Découvre les conférences en cours", "Explore the current conferences", "Descubre las conferencias en curso")}</p>
        <p className="note">{L.t("Clique sur une équipe pour voir sa fiche : stats, joueurs, calendrier.", "Click a team to see its page: stats, players, schedule.", "Haz clic en un equipo para ver su ficha: estadísticas, jugadores, calendario.")}</p>
      </div>
      <div className="std-grid">
        <Table title={L.t("CONFÉRENCE EST", "EASTERN CONFERENCE", "CONFERENCIA ESTE")} rows={east} L={L} />
        <Table title={L.t("CONFÉRENCE OUEST", "WESTERN CONFERENCE", "CONFERENCIA OESTE")} rows={west} L={L} />
      </div>
      <p className="disclaimer">{L.t("Tirets : 1-6 qualifiés directement, 7-10 play-in. En début de saison, l'ordre départage aussi par la saison passée.", "Dividers: seeds 1-6 qualify directly, 7-10 go to the play-in. Early in the season, ties are also broken by last season.", "Separadores: del 1 al 6 se clasifican directamente, del 7 al 10 van al play-in. A principio de temporada, los empates también se deshacen con la temporada pasada.")}</p>
    </main>
  );
}
