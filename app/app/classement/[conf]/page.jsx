import Link from "next/link";
import { notFound } from "next/navigation";
import { conferenceStandings } from "../../../../lib/data";
import AppTabs from "../../../../components/AppTabs";
import JsonLd from "../../../../components/JsonLd";
import Crumbs from "../../../../components/Crumbs";
import { pageMeta } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { nbaToday, seasonForDate } from "../../../../lib/espn";
import { fmtDate, numOf } from "../../../../lib/i18n";
import { simulateSeason } from "../../../../lib/sim";
import { probTxt } from "../../../../lib/probtxt";

// Une page par conférence : « classement conférence Est NBA », « clasificación Conferencia Oeste NBA »… avec, en plus
// des sites d'actualité, les chances de playoffs de chaque équipe (simulation Basketlog).
export const dynamic = "force-dynamic";
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };
const CONF = { east: "E", west: "W" };
const names = (L, c) => (c === "E" ? { short: L.t("Est", "East", "Este", "Leste"), full: L.t("conférence Est", "Eastern Conference", "Conferencia Este", "Conferência Leste") } : { short: L.t("Ouest", "West", "Oeste", "Oeste"), full: L.t("conférence Ouest", "Western Conference", "Conferencia Oeste", "Conferência Oeste") });

export async function generateMetadata({ params }) {
  const L = await getL();
  const c = CONF[(await params).conf];
  if (!c) return {};
  const n = names(L, c), s = seasonLabel();
  // Date du jour dans le titre (« au 20 novembre 2026 ») : sur cette recherche on est déjà en première page sans clic ;
  // Wikipédia et ESPN, devant nous, ne montrent pas de date : un classement visiblement à jour se distingue.
  const at = fmtDate(L, new Date().toISOString(), { day: "numeric", month: "long", year: "numeric" });
  return pageMeta({
    title: L.t(`Classement ${n.full} NBA au ${at} : bilan et playoffs`, `NBA ${n.full} standings (${at}): records and playoff odds`, `Clasificación ${n.full} NBA al ${at}: balance y playoffs`, `Classificação ${n.full} NBA em ${at}: campanha e playoffs`),
    description: L.t(`Classement à jour de la ${n.full} NBA ${s} : bilan, écart de points, série, 10 derniers matchs et chances de playoffs de chaque équipe selon le modèle Basketlog.`, `Up-to-date NBA ${n.full} standings ${s}: record, point differential, streak, last 10 games and each team's playoff odds from the Basketlog model.`, `Clasificación actualizada de la ${n.full} NBA ${s}: balance, diferencia de puntos, racha, últimos 10 partidos y opciones de playoffs de cada equipo según el modelo de Basketlog.`, `Classificação atualizada da ${n.full} NBA ${s}: campanha, saldo de pontos, sequência, últimos 10 jogos e chances de playoffs de cada time segundo o modelo do Basketlog.`),
    path: `/app/classement/${(await params).conf}`,
    L,
  });
}

export default async function ConfPage({ params }) {
  const L = await getL();
  const slug = (await params).conf;
  const c = CONF[slug];
  if (!c) notFound();
  const n = names(L, c), season = seasonLabel();
  const std = await conferenceStandings();
  const rows = c === "E" ? std.east : std.west;
  let sim = null;
  try { sim = (await simulateSeason()).teams; } catch {}
  const today = fmtDate(L, new Date(), { day: "numeric", month: "long" });
  const rec = (t) => `${t.wins}-${t.losses}`;
  const strk = (x) => (x ? (L.en ? x.replace(/^V/, "W").replace(/^D/, "L") : x.replace(/^W/, "V").replace(/^L/, "D")) : "–");
  const started = rows.some((t) => t.gp);
  const other = c === "E" ? "west" : "east";
  const faq = started ? [
    {
      q: L.t(`Qui est premier de la ${n.full} NBA ?`, `Who leads the NBA ${n.full}?`, `¿Quién lidera la ${n.full} de la NBA?`, `Quem lidera a ${n.full} da NBA?`),
      a: L.t(`Au ${today}, les ${rows[0].short} sont premiers avec ${rec(rows[0])}, devant les ${rows[1].short} (${rec(rows[1])}) et les ${rows[2].short} (${rec(rows[2])}).`, `As of ${today}, the ${rows[0].short} lead at ${rec(rows[0])}, ahead of the ${rows[1].short} (${rec(rows[1])}) and the ${rows[2].short} (${rec(rows[2])}).`, `Al ${today}, los ${rows[0].short} son primeros con ${rec(rows[0])}, por delante de los ${rows[1].short} (${rec(rows[1])}) y los ${rows[2].short} (${rec(rows[2])}).`, `Em ${today}, o ${rows[0].short} lidera com ${rec(rows[0])}, à frente de ${rows[1].short} (${rec(rows[1])}) e ${rows[2].short} (${rec(rows[2])}).`),
    },
    ...(sim ? [{
      q: L.t(`Quelles équipes de l'${n.short} iront en playoffs ?`, `Which ${n.short} teams will make the playoffs?`, `¿Qué equipos del ${n.short} irán a los playoffs?`, `Quais times do ${n.short} vão aos playoffs?`),
      a: (() => {
        const top = rows.map((t) => ({ t, p: sim[t.id]?.playoffs ?? 0 })).sort((a, b) => b.p - a.p).slice(0, 8);
        const txt = top.map((x) => `${x.t.short} (${probTxt(x.p, L)})`).join(", ");
        return L.t(`Selon 4 000 simulations du modèle Basketlog, les plus probables sont : ${txt}.`, `Based on 4,000 simulations of the Basketlog model, the most likely are: ${txt}.`, `Según 4.000 simulaciones del modelo de Basketlog, los más probables son: ${txt}.`, `Segundo 4.000 simulações do modelo do Basketlog, os mais prováveis são: ${txt}.`);
      })(),
    }] : []),
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA"), "/app/classement"], [n.full, `/app/classement/${slug}`]]} />
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Classement ${n.full} NBA ${season}`, `NBA ${n.full} standings ${season}`, `Clasificación ${n.full} NBA ${season}`, `Classificação ${n.full} NBA ${season}`)}</h1>
        <p>{L.t(`Mis à jour le ${today}. Dernière colonne : chances de playoffs (play-in compris) selon le modèle Basketlog.`, `Updated ${today}. Last column: playoff odds (play-in included) from the Basketlog model.`, `Actualizada el ${today}. Última columna: opciones de playoffs (play-in incluido) según el modelo de Basketlog.`, `Atualizada em ${today}. Última coluna: chances de playoffs (play-in incluído) segundo o modelo do Basketlog.`)}</p>
        <p className="cup-dates"><Link href={L.href(`/app/classement/${other}`)}>{L.t(`Classement ${names(L, c === "E" ? "W" : "E").full} →`, `${names(L, c === "E" ? "W" : "E").full} standings →`, `Clasificación ${names(L, c === "E" ? "W" : "E").full} →`, `Classificação ${names(L, c === "E" ? "W" : "E").full} →`)}</Link><Link href={L.href("/app/classement")}>{L.t("Les deux conférences →", "Both conferences →", "Las dos conferencias →", "As duas conferências →")}</Link></p>
      </div>
      <div className="card block tbl-scroll">
        <table className="std-table sim-table">
          <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th><th>{L.t("Écart", "Diff", "Dif.", "Saldo")}</th><th>{L.t("10 der.", "L10", "Últ. 10", "Últ. 10")}</th><th>{L.t("Série", "Strk", "Racha", "Seq.")}</th><th>{L.t("Playoffs", "Playoffs", "Playoffs", "Playoffs")}</th></tr></thead>
          <tbody>
            {rows.map((t, i) => (
              <tr key={t.id} className={i === 6 || i === 10 ? "cut" : ""}>
                <td className="rk">{i + 1}</td>
                <td className="tm"><Link href={L.href(`/app/equipe/${t.id}`)}><span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={t.logo} alt="" />{t.short}</span></Link></td>
                <td>{t.wins}-{t.losses}</td>
                <td className={t.diff > 0 ? "pos" : t.diff < 0 ? "neg" : ""}>{t.diff == null || !t.gp ? "–" : `${t.diff > 0 ? "+" : ""}${numOf(t.diff, L)}`}</td>
                <td>{t.last10 || "–"}</td>
                <td>{strk(t.streak)}</td>
                <td className={(sim?.[t.id]?.playoffs ?? 0) >= 0.5 ? "pos" : ""}>{sim ? probTxt(sim[t.id]?.playoffs, L) : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`Classement ${n.full} : l'essentiel`, `${n.full} standings: quick answers`, `Clasificación ${n.full}: lo esencial`, `Classificação ${n.full}: o essencial`)}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more"><Link href={L.href("/app/simulation")}>{L.t("Toutes les chances de playoffs et de titre →", "All playoff and title odds →", "Todas las probabilidades de playoffs y título →", "Todas as chances de playoffs e título →")}</Link>{" · "}<Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link></p>
        </section>
      )}
      <p className="disclaimer">{L.t("Tirets : 1-6 qualifiés directement, 7-10 play-in.", "Dividers: seeds 1-6 qualify directly, 7-10 go to the play-in.", "Separadores: del 1 al 6 clasificados directamente, del 7 al 10 play-in.", "Divisórias: do 1 ao 6 classificados direto, do 7 ao 10 play-in.")}</p>
    </main>
  );
}
