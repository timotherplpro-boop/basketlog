import Link from "next/link";
import AppTabs from "../../../../components/AppTabs";
import JsonLd from "../../../../components/JsonLd";
import Crumbs from "../../../../components/Crumbs";
import { pageMeta } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { fmtDate, numOf } from "../../../../lib/i18n";
import { simulateEL } from "../../../../lib/sim";
import { probTxt } from "../../../../lib/probtxt";

// Chances de playoffs, de Final Four et de titre en EuroLeague, par simulation de la fin de saison (lib/sim.js).
// Recherches visées : « favori Euroligue », « probabilidades Euroliga Final Four », « EuroLeague odds ».
export const dynamic = "force-dynamic";
const label = (code) => { const y = Number(String(code || "").slice(1)) || new Date().getFullYear(); return `${y}-${String(y + 1).slice(2)}`; };

export async function generateMetadata() {
  const L = await getL();
  let s = "";
  try { s = label((await simulateEL()).season); } catch {}
  return pageMeta({
    title: L.t(`EuroLeague ${s} : chances de playoffs, de Final Four et de titre`, `EuroLeague ${s} odds: playoff, Final Four and title chances`, `Euroliga ${s}: probabilidades de playoffs, Final Four y título`, `Euroliga ${s}: chances de playoffs, Final Four e título`),
    description: L.t("Les chances de chaque club d'Euroligue de finir dans le top 6, d'aller en playoffs, au Final Four et de gagner le titre, selon 5 000 simulations de la fin de saison par le modèle Basketlog.", "Each EuroLeague club's chances of a top-6 finish, a playoff spot, a Final Four trip and the title, from 5,000 simulations of the rest of the season with the Basketlog model.", "Las opciones de cada club de la Euroliga de acabar en el top 6, llegar a los playoffs, a la Final Four y ganar el título, según 5.000 simulaciones del resto de la temporada con el modelo de Basketlog.", "As chances de cada clube da Euroliga de terminar no top 6, ir aos playoffs, à Final Four e ganhar o título, segundo 5.000 simulações do resto da temporada com o modelo do Basketlog."),
    path: "/app/euroleague/simulation",
    L,
  });
}

export default async function ELSimPage() {
  const L = await getL();
  let sim = null;
  try { sim = await simulateEL(); } catch {}
  const rows = sim ? Object.values(sim.teams).map((r) => ({ ...r, c: sim.clubs[r.id] })).filter((r) => r.c).sort((a, b) => b.projWins - a.projWins || b.title - a.title) : [];
  const season = label(sim?.season);
  const top = [...rows].sort((a, b) => b.title - a.title);
  const p = (x) => probTxt(x, L);
  const when = sim ? fmtDate(L, sim.at, { day: "numeric", month: "long" }) : "";
  const faq = rows.length >= 4 ? [
    {
      q: L.t(`Qui est favori pour gagner l'Euroligue ${season} ?`, `Who is the favorite to win the ${season} EuroLeague?`, `¿Quién es el favorito para ganar la Euroliga ${season}?`, `Quem é o favorito para ganhar a Euroliga ${season}?`),
      a: L.t(`Selon le modèle Basketlog, ${top[0].c.name} a ${p(top[0].title)} de chances de gagner le titre, devant ${top.slice(1, 4).map((r) => `${r.c.name} (${p(r.title)})`).join(", ")}.`, `According to the Basketlog model, ${top[0].c.name} has a ${p(top[0].title)} chance to win the title, ahead of ${top.slice(1, 4).map((r) => `${r.c.name} (${p(r.title)})`).join(", ")}.`, `Según el modelo de Basketlog, ${top[0].c.name} tiene un ${p(top[0].title)} de opciones de ganar el título, por delante de ${top.slice(1, 4).map((r) => `${r.c.name} (${p(r.title)})`).join(", ")}.`, `Segundo o modelo do Basketlog, o ${top[0].c.name} tem ${p(top[0].title)} de chance de ganhar o título, à frente de ${top.slice(1, 4).map((r) => `${r.c.name} (${p(r.title)})`).join(", ")}.`),
    },
    {
      q: L.t("Quels clubs iront au Final Four ?", "Which clubs will reach the Final Four?", "¿Qué clubes llegarán a la Final Four?", "Quais clubes vão chegar à Final Four?"),
      a: (() => { const f = [...rows].sort((a, b) => b.f4 - a.f4).slice(0, 6).map((r) => `${r.c.name} (${p(r.f4)})`).join(", "); return L.t(`Les plus probables : ${f}.`, `Most likely: ${f}.`, `Los más probables: ${f}.`, `Os mais prováveis: ${f}.`); })(),
    },
    {
      q: L.t("Comment sont calculées ces probabilités ?", "How are these odds calculated?", "¿Cómo se calculan estas probabilidades?", "Como essas probabilidades são calculadas?"),
      a: L.t(`Le modèle joue les ${numOf(sim.remaining, L, 0)} matchs restants de saison régulière 5 000 fois (force de chaque club, avantage du terrain, part de hasard), puis le play-in (7 à 10), les playoffs au meilleur des 5 et le Final Four.`, `The model plays the ${numOf(sim.remaining, L, 0)} remaining regular-season games 5,000 times (club strength, home court, randomness), then the play-in (7 to 10), best-of-5 playoffs and the Final Four.`, `El modelo juega los ${numOf(sim.remaining, L, 0)} partidos restantes de temporada regular 5.000 veces (fuerza de cada club, ventaja de campo, azar), luego el play-in (7 a 10), los playoffs al mejor de 5 y la Final Four.`, `O modelo joga os ${numOf(sim.remaining, L, 0)} jogos restantes da temporada regular 5.000 vezes (força de cada clube, mando de quadra, acaso), depois o play-in (7 a 10), os playoffs melhor de 5 e a Final Four.`),
    },
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostic Euroligue", "EuroLeague predictions", "Pronósticos Euroliga", "Palpites Euroliga"), "/app/euroleague"], [L.t("Chances de titre", "Title odds", "Probabilidades de título", "Chances de título"), "/app/euroleague/simulation"]]} />
      <AppTabs active="euroleague" />
      <div className="app-head">
        <h1>{L.t(`EuroLeague ${season} : chances de playoffs et de titre`, `EuroLeague ${season} playoff and title odds`, `Euroliga ${season}: probabilidades de playoffs y título`, `Euroliga ${season}: chances de playoffs e título`)}</h1>
        <p>{L.t("Selon 5 000 simulations de la fin de saison par le modèle Basketlog.", "From 5,000 simulations of the rest of the season with the Basketlog model.", "Según 5.000 simulaciones del resto de la temporada con el modelo de Basketlog.", "Segundo 5.000 simulações do resto da temporada com o modelo do Basketlog.")}{when ? L.t(` Mis à jour le ${when}.`, ` Updated ${when}.`, ` Actualizado el ${when}.`, ` Atualizado em ${when}.`) : ""}</p>
      </div>
      {rows.length ? (
        <div className="card block tbl-scroll">
          <table className="std-table sim-table">
            <thead><tr><th>#</th><th>{L.t("Club", "Club", "Club", "Clube")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th><th>{L.t("V proj.", "Proj. W", "V proy.", "V proj.")}</th><th>{L.t("Top 6", "Top 6", "Top 6", "Top 6")}</th><th>{L.t("Playoffs", "Playoffs", "Playoffs", "Playoffs")}</th><th>{L.t("Final Four", "Final Four", "Final Four", "Final Four")}</th><th>{L.t("Titre", "Title", "Título", "Título")}</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} className={i === 6 || i === 10 ? "cut" : ""}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm"><Link href={L.href(`/app/euroleague/equipe/${r.id}`)}><span>{r.c.logo ? <img src={r.c.logo} alt="" /> : null}{r.c.short || r.c.name}</span></Link></td>
                  <td>{r.record[0]}-{r.record[1]}</td>
                  <td>{numOf(r.projWins, L, 1)}</td>
                  <td>{p(r.top6)}</td>
                  <td className={r.playoffs >= 0.5 ? "pos" : ""}>{p(r.playoffs)}</td>
                  <td>{p(r.f4)}</td>
                  <td className={r.title >= 0.1 ? "pos" : ""}>{p(r.title)}</td>
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
          <h2>{L.t("EuroLeague : l'essentiel", "EuroLeague odds: quick answers", "Euroliga: lo esencial", "Euroliga: o essencial")}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more"><Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague et classement →", "EuroLeague predictions and standings →", "Pronósticos Euroliga y clasificación →", "Palpites Euroliga e classificação →")}</Link>{" · "}<Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs NBA →", "NBA playoff odds →", "Probabilidades de playoffs NBA →", "Chances de playoffs da NBA →")}</Link></p>
        </section>
      )}
      <p className="disclaimer">{L.t("Probabilités estimées par le modèle statistique Basketlog, jamais une certitude. Égalités départagées au hasard (règles officielles simplifiées).", "Probabilities estimated by the Basketlog statistical model, never a certainty. Ties broken at random (simplified official rules).", "Probabilidades estimadas por el modelo estadístico de Basketlog, nunca una certeza. Empates resueltos al azar (reglas oficiales simplificadas).", "Probabilidades estimadas pelo modelo estatístico do Basketlog, nunca uma certeza. Empates decididos ao acaso (regras oficiais simplificadas).")}</p>
    </main>
  );
}
