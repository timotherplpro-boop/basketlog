import Link from "next/link";
import { conferenceStandings } from "../../../lib/data";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import JsonLd from "../../../components/JsonLd";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { fmtDate } from "../../../lib/i18n";
import Crumbs from "../../../components/Crumbs";

// « 2026-27 » : saison NBA en cours.
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t(`Classement NBA ${seasonLabel()} : conférence Est et conférence Ouest à jour`, `NBA standings ${seasonLabel()}: Eastern and Western Conference (updated daily)`, `Clasificación NBA ${seasonLabel()}: Conferencia Este y Oeste actualizada`, `Classificação NBA ${seasonLabel()}: Conferência Leste e Oeste atualizada`),
    description: L.t(
      "Classement NBA à jour de la conférence Est et de la conférence Ouest : bilan, pourcentage de victoires, écart de points, série en cours, places en playoffs et en play-in.",
      "Up-to-date NBA standings for the Eastern and Western Conference: record, win percentage, point differential, streak, playoff and play-in spots.", "Clasificación NBA actualizada de la Conferencia Este y la Conferencia Oeste: balance, porcentaje de victorias, diferencia de puntos, racha, puestos de playoffs y play-in.", "Classificação NBA atualizada da Conferência Leste e da Conferência Oeste: campanha, aproveitamento, saldo de pontos, sequência, vagas nos playoffs e no play-in."
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
        <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th><th>%</th><th>{L.t("Écart", "Diff", "Dif.", "Saldo")}</th><th>{L.t("Série", "Streak", "Racha", "Sequência")}</th></tr></thead>
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
  const season = seasonLabel();
  const today = fmtDate(L, new Date(), { day: "numeric", month: "long" });
  const rec = (t) => `${t.wins}-${t.losses}`;
  const names = (rows) => rows.map((t) => t.short).join(", ");
  const started = east.some((t) => t.gp) || west.some((t) => t.gp);
  const faq = started ? [
    {
      q: L.t("Qui est premier de la conférence Est en NBA ?", "Who leads the NBA Eastern Conference?", "¿Quién lidera la Conferencia Este de la NBA?", "Quem lidera a Conferência Leste da NBA?"),
      a: L.t(`Au ${today}, les ${east[0].short} mènent la conférence Est avec un bilan de ${rec(east[0])}, devant les ${east[1].short} (${rec(east[1])}) et les ${east[2].short} (${rec(east[2])}).`,
        `As of ${today}, the ${east[0].short} lead the Eastern Conference at ${rec(east[0])}, ahead of the ${east[1].short} (${rec(east[1])}) and the ${east[2].short} (${rec(east[2])}).`,
        `Al ${today}, los ${east[0].short} lideran la Conferencia Este con un balance de ${rec(east[0])}, por delante de los ${east[1].short} (${rec(east[1])}) y los ${east[2].short} (${rec(east[2])}).`, `Em ${today}, o ${east[0].short} lidera a Conferência Leste com campanha de ${rec(east[0])}, à frente de ${east[1].short} (${rec(east[1])}) e ${east[2].short} (${rec(east[2])}).`),
    },
    {
      q: L.t("Qui est premier de la conférence Ouest en NBA ?", "Who leads the NBA Western Conference?", "¿Quién lidera la Conferencia Oeste de la NBA?", "Quem lidera a Conferência Oeste da NBA?"),
      a: L.t(`Au ${today}, les ${west[0].short} mènent la conférence Ouest avec un bilan de ${rec(west[0])}, devant les ${west[1].short} (${rec(west[1])}) et les ${west[2].short} (${rec(west[2])}).`,
        `As of ${today}, the ${west[0].short} lead the Western Conference at ${rec(west[0])}, ahead of the ${west[1].short} (${rec(west[1])}) and the ${west[2].short} (${rec(west[2])}).`,
        `Al ${today}, los ${west[0].short} lideran la Conferencia Oeste con un balance de ${rec(west[0])}, por delante de los ${west[1].short} (${rec(west[1])}) y los ${west[2].short} (${rec(west[2])}).`, `Em ${today}, o ${west[0].short} lidera a Conferência Oeste com campanha de ${rec(west[0])}, à frente de ${west[1].short} (${rec(west[1])}) e ${west[2].short} (${rec(west[2])}).`),
    },
    {
      q: L.t("Quelles équipes sont en position de play-in ?", "Which teams are in play-in position?", "¿Qué equipos están en puestos de play-in?", "Quais times estão na zona de play-in?"),
      a: L.t(`À l'Est : ${names(east.slice(6, 10))}. À l'Ouest : ${names(west.slice(6, 10))} (places 7 à 10).`,
        `East: ${names(east.slice(6, 10))}. West: ${names(west.slice(6, 10))} (seeds 7 to 10).`,
        `En el Este: ${names(east.slice(6, 10))}. En el Oeste: ${names(west.slice(6, 10))} (puestos 7 a 10).`, `No Leste: ${names(east.slice(6, 10))}. No Oeste: ${names(west.slice(6, 10))} (posições 7 a 10).`),
    },
    {
      q: L.t("Combien d'équipes se qualifient pour les playoffs NBA ?", "How many teams make the NBA playoffs?", "¿Cuántos equipos se clasifican para los playoffs de la NBA?", "Quantos times se classificam para os playoffs da NBA?"),
      a: L.t("Huit par conférence : les six premiers sont qualifiés directement, les équipes classées de 7 à 10 passent par le play-in pour les deux dernières places.",
        "Eight per conference: the top six qualify directly, and seeds 7 to 10 play the play-in tournament for the last two spots.",
        "Ocho por conferencia: los seis primeros se clasifican directamente y los puestos 7 a 10 disputan el play-in por las dos últimas plazas.", "Oito por conferência: os seis primeiros se classificam direto e as posições 7 a 10 disputam o play-in pelas duas últimas vagas."),
    },
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  return (
    <main className="app-page wide">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA"), "/app/classement"]]} />
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Classement NBA ${season} : conférence Est et Ouest`, `NBA standings ${season}: East and West`, `Clasificación NBA ${season}: Conferencia Este y Oeste`, `Classificação NBA ${season}: Conferência Leste e Oeste`)}</h1>
        <p>{L.t(`Mis à jour le ${today}, après chaque soirée de matchs.`, `Updated ${today}, after every night of games.`, `Actualizada el ${today}, después de cada jornada.`, `Atualizada em ${today}, depois de cada rodada.`)}</p>
        <p><Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA selon le modèle →", "NBA power rankings by our model →", "Power ranking NBA según el modelo →", "Power ranking NBA segundo o modelo →")}</Link></p>
        <p className="note">{L.t("Clique sur une équipe pour voir sa fiche : stats, joueurs, calendrier.", "Click a team to see its page: stats, players, schedule.", "Haz clic en un equipo para ver su ficha: estadísticas, jugadores, calendario.", "Clique em um time para ver sua página: estatísticas, jogadores, calendário.")}</p>
      </div>
      <div className="std-grid">
        <Table title={L.t("CONFÉRENCE EST", "EASTERN CONFERENCE", "CONFERENCIA ESTE", "CONFERÊNCIA LESTE")} rows={east} L={L} />
        <Table title={L.t("CONFÉRENCE OUEST", "WESTERN CONFERENCE", "CONFERENCIA OESTE", "CONFERÊNCIA OESTE")} rows={west} L={L} />
      </div>
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("Classement NBA : l'essentiel", "NBA standings: quick answers", "Clasificación NBA: lo esencial", "Classificação NBA: o essencial")}</h2>
          {faq.map((f) => (
            <div key={f.q} className="mfaq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p className="mfaq-more"><Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link>{" · "}<Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA →", "NBA power rankings →", "Power ranking NBA →", "Power ranking NBA →")}</Link></p>
        </section>
      )}
      <p className="disclaimer">{L.t("Tirets : 1-6 qualifiés directement, 7-10 play-in. En début de saison, l'ordre départage aussi par la saison passée.", "Dividers: seeds 1-6 qualify directly, 7-10 go to the play-in. Early in the season, ties are also broken by last season.", "Separadores: del 1 al 6 se clasifican directamente, del 7 al 10 van al play-in. A principio de temporada, los empates también se deshacen con la temporada pasada.", "Divisórias: do 1 ao 6 se classificam direto, do 7 ao 10 vão para o play-in. No início da temporada, os empates também são desfeitos pela temporada passada.")}</p>
    </main>
  );
}
