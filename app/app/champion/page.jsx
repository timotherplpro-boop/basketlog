import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import PrefSource from "../../../components/PrefSource";
import { pageMeta, oddsImage } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, numOf } from "../../../lib/i18n";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { teamById } from "../../../lib/teams";
import { simulateSeason } from "../../../lib/sim";
import { probTxt } from "../../../lib/probtxt";
import CiteBox from "../../../components/CiteBox";
import { SITE as SITE_URL } from "../../../lib/site";

// « Qui va être champion NBA 2027 ? », « favoritos al anillo NBA », « quem vai ser campeão da NBA » : les favoris au
// titre selon la simulation de la saison (lib/sim.js), avec le chemin de chacun (playoffs, finale de conférence, Finales).
export const dynamic = "force-dynamic";
const year = () => seasonForDate(nbaToday());

export async function generateMetadata() {
  const L = await getL();
  const y = year();
  let image = null;
  try {
    const top = Object.values((await simulateSeason()).teams).sort((a, b) => b.title - a.title).map((r) => [teamById(r.id)?.short || r.id, r.title]);
    image = oddsImage(L.t(`Qui sera champion NBA en ${y} ?`, `Who will win the ${y} NBA title?`, `¿Quién ganará el anillo NBA ${y}?`, `Quem vai ser campeão da NBA em ${y}?`), L.t("Chances de titre selon Basketlog", "Title chances from Basketlog", "Opciones de título según Basketlog", "Chances de título segundo o Basketlog"), top);
  } catch {}
  return pageMeta({
    image,
    title: L.t(`Qui va être champion NBA en ${y} ? Les favoris au titre selon notre modèle`, `Who will win the ${y} NBA championship? Title favorites by our model`, `¿Quién ganará el anillo de la NBA ${y}? Favoritos al título`, `Quem vai ser campeão da NBA em ${y}? Favoritos ao título`),
    description: L.t(`Les favoris pour le titre NBA ${y} et les chances de chaque équipe d'être championne, mises à jour chaque jour à partir de 4 000 simulations de la fin de saison et des playoffs.`, `The favorites for the ${y} NBA title and every team's chance to win the championship, updated daily from 4,000 simulations of the rest of the season and the playoffs.`, `Los favoritos al título de la NBA ${y} y las opciones de cada equipo de ser campeón, actualizadas cada día a partir de 4.000 simulaciones del resto de la temporada y los playoffs.`, `Os favoritos ao título da NBA ${y} e as chances de cada time ser campeão, atualizadas todo dia a partir de 4.000 simulações do resto da temporada e dos playoffs.`),
    path: "/app/champion",
    L,
  });
}

export default async function ChampionPage() {
  const L = await getL();
  const y = year();
  let sim = null;
  try { sim = await simulateSeason(); } catch {}
  const rows = sim ? Object.values(sim.teams).map((r) => ({ ...r, team: teamById(r.id) })).filter((r) => r.team && r.title > 0.0005).sort((a, b) => b.title - a.title) : [];
  const p = (x) => probTxt(x, L);
  const when = sim ? fmtDate(L, sim.at, { day: "numeric", month: "long" }) : "";
  const east = rows.filter((r) => r.conf === "E"), west = rows.filter((r) => r.conf === "W");
  const sumTop = rows.slice(0, 4).reduce((t, r) => t + r.title, 0);
  const faq = rows.length >= 4 ? [
    {
      q: L.t(`Qui va être champion NBA en ${y} ?`, `Who will win the ${y} NBA championship?`, `¿Quién ganará el anillo de la NBA ${y}?`, `Quem vai ser campeão da NBA em ${y}?`),
      a: L.t(`Personne ne peut le dire à coup sûr, mais selon le modèle Basketlog le favori est ${rows[0].team.name} (${p(rows[0].title)}), devant ${rows[1].team.name} (${p(rows[1].title)}) et ${rows[2].team.name} (${p(rows[2].title)}). Les quatre premiers totalisent ${p(sumTop)} des titres simulés.`,
        `No one can say for sure, but according to the Basketlog model the favorite is the ${rows[0].team.name} (${p(rows[0].title)}), ahead of the ${rows[1].team.name} (${p(rows[1].title)}) and the ${rows[2].team.name} (${p(rows[2].title)}). The top four account for ${p(sumTop)} of simulated titles.`,
        `Nadie puede saberlo con certeza, pero según el modelo de Basketlog el favorito es ${rows[0].team.name} (${p(rows[0].title)}), por delante de ${rows[1].team.name} (${p(rows[1].title)}) y ${rows[2].team.name} (${p(rows[2].title)}). Los cuatro primeros suman el ${p(sumTop)} de los títulos simulados.`,
        `Ninguém pode dizer com certeza, mas segundo o modelo do Basketlog o favorito é o ${rows[0].team.name} (${p(rows[0].title)}), à frente de ${rows[1].team.name} (${p(rows[1].title)}) e ${rows[2].team.name} (${p(rows[2].title)}). Os quatro primeiros somam ${p(sumTop)} dos títulos simulados.`),
    },
    ...(east[0] && west[0] ? [{
      q: L.t("Qui est favori dans chaque conférence ?", "Who is the favorite in each conference?", "¿Quién es el favorito en cada conferencia?", "Quem é o favorito em cada conferência?"),
      a: L.t(`À l'Est : ${east[0].team.short} (${p(east[0].finals)} de chances d'aller en Finales NBA). À l'Ouest : ${west[0].team.short} (${p(west[0].finals)}).`, `East: the ${east[0].team.short} (${p(east[0].finals)} chance to reach the NBA Finals). West: the ${west[0].team.short} (${p(west[0].finals)}).`, `En el Este: ${east[0].team.short} (${p(east[0].finals)} de opciones de llegar a las Finales). En el Oeste: ${west[0].team.short} (${p(west[0].finals)}).`, `No Leste: ${east[0].team.short} (${p(east[0].finals)} de chance de chegar às Finais). No Oeste: ${west[0].team.short} (${p(west[0].finals)}).`),
    }] : []),
    {
      q: L.t("Ces chances changent-elles pendant la saison ?", "Do these chances change during the season?", "¿Cambian estas probabilidades durante la temporada?", "Essas chances mudam durante a temporada?"),
      a: L.t("Oui, chaque jour : après chaque soirée, le modèle reprend les résultats, la force de chaque équipe et le calendrier restant, puis rejoue toute la fin de saison et les playoffs 4 000 fois.", "Yes, daily: after every night of games the model updates results, team strength and the remaining schedule, then replays the rest of the season and the playoffs 4,000 times.", "Sí, cada día: después de cada jornada el modelo actualiza resultados, fuerza de cada equipo y calendario restante, y vuelve a jugar el resto de la temporada y los playoffs 4.000 veces.", "Sim, todo dia: depois de cada rodada o modelo atualiza resultados, força de cada time e calendário restante, e joga de novo o resto da temporada e os playoffs 4.000 vezes."),
    },
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Chances de playoffs", "Playoff chances", "Probabilidades de playoffs", "Chances de playoffs"), "/app/simulation"], [L.t(`Champion NBA ${y}`, `${y} NBA champion`, `Campeón NBA ${y}`, `Campeão da NBA ${y}`), "/app/champion"]]} />
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Qui va être champion NBA en ${y} ?`, `Who will win the ${y} NBA title?`, `¿Quién ganará el anillo NBA ${y}?`, `Quem vai ser campeão da NBA em ${y}?`)}</h1>
        <p>{L.t("Les chances de titre de chaque équipe selon le modèle Basketlog, et son chemin jusqu'au trophée.", "Every team's title chances from the Basketlog model, and its path to the trophy.", "Las opciones de título de cada equipo según el modelo de Basketlog, y su camino hasta el trofeo.", "As chances de título de cada time segundo o modelo do Basketlog, e o caminho até o troféu.")}{when ? L.t(` Mis à jour le ${when}.`, ` Updated ${when}.`, ` Actualizado el ${when}.`, ` Atualizado em ${when}.`) : ""}</p>
      </div>
      {rows.length ? (
        <div className="card block tbl-scroll">
          <table className="std-table sim-table">
            <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th><th>{L.t("Playoffs", "Playoffs", "Playoffs", "Playoffs")}</th><th>{L.t("Fin. conf.", "Conf. finals", "Final conf.", "Final conf.")}</th><th>{L.t("Finales", "Finals", "Finales", "Finais")}</th><th>{L.t("Titre", "Title", "Título", "Título")}</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm"><Link href={L.href(`/app/equipe/${r.id}`)}><span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.team.logo} alt="" />{r.team.short}</span></Link></td>
                  <td>{r.record[0]}-{r.record[1]}</td>
                  <td>{p(r.playoffs)}</td>
                  <td>{p(r.confFinal)}</td>
                  <td>{p(r.finals)}</td>
                  <td className="pos">{p(r.title)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{L.t("Simulation indisponible pour le moment.", "Simulation unavailable right now.", "Simulación no disponible por el momento.", "Simulação indisponível no momento.")}</p>
      )}
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`Champion NBA ${y} : l'essentiel`, `${y} NBA champion: quick answers`, `Campeón NBA ${y}: lo esencial`, `Campeão da NBA ${y}: o essencial`)}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more"><Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs de toutes les équipes →", "Playoff chances for every team →", "Probabilidades de playoffs de todos los equipos →", "Chances de playoffs de todos os times →")}</Link>{" · "}<Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA →", "NBA power rankings →", "Power ranking NBA →", "Power ranking NBA →")}</Link>{" · "}<Link href={L.href("/app/nba-cup")}>{L.t("NBA Cup →", "NBA Cup →", "NBA Cup →", "NBA Cup →")}</Link></p>
        </section>
      )}
      <p className="disclaimer">{L.t("Probabilités estimées par le modèle statistique Basketlog (4 000 simulations), jamais une certitude. Les équipes sous 0,1 % ne sont pas affichées.", "Probabilities estimated by the Basketlog statistical model (4,000 simulations), never a certainty. Teams under 0.1% are not shown.", "Probabilidades estimadas por el modelo estadístico de Basketlog (4.000 simulaciones), nunca una certeza. No se muestran los equipos por debajo del 0,1 %.", "Probabilidades estimadas pelo modelo estatístico do Basketlog (4.000 simulações), nunca uma certeza. Times abaixo de 0,1 % não aparecem.")}</p>
      <PrefSource L={L} />
      <CiteBox url={`${SITE_URL}${L.href("/app/champion")}`} title={L.t("Favoris au titre NBA (Basketlog)", "NBA title chances (Basketlog)", "Favoritos al título NBA (Basketlog)", "Favoritos ao título da NBA (Basketlog)")} lang={L.lang} />
    </main>
  );
}
