import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import { pageMeta, oddsImage } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, numOf } from "../../../lib/i18n";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { teamById } from "../../../lib/teams";
import { simulateSeason } from "../../../lib/sim";
import { probTxt } from "../../../lib/probtxt";
import CiteBox from "../../../components/CiteBox";
import { SITE as SITE_URL } from "../../../lib/site";

// Chances de playoffs et de titre de chaque équipe NBA, par simulation de la fin de saison (lib/sim.js).
// Recherches visées : « nba playoff odds », « chances playoffs NBA », « probabilidades playoffs NBA », « favorito título NBA ».
export const dynamic = "force-dynamic";
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };

export async function generateMetadata() {
  const L = await getL();
  const s = seasonLabel();
  let image = null;
  try {
    const top = Object.values((await simulateSeason()).teams).sort((a, b) => b.title - a.title).map((r) => [teamById(r.id)?.short || r.id, r.title]);
    image = oddsImage(L.t(`Chances de titre NBA ${s}`, `NBA title odds ${s}`, `Opciones de título NBA ${s}`, `Chances de título NBA ${s}`), L.t("4 000 simulations de la fin de saison", "4,000 simulations of the rest of the season", "4.000 simulaciones del resto de la temporada", "4.000 simulações do resto da temporada"), top);
  } catch {}
  return pageMeta({
    image,
    title: L.t(`Chances de playoffs NBA ${s} : probabilités de qualification et de titre`, `NBA playoff odds ${s}: playoff and title chances for every team`, `Probabilidades de playoffs NBA ${s}: opciones de clasificación y de título`, `Chances de playoffs da NBA ${s}: probabilidade de classificação e de título`),
    description: L.t(
      `Les chances de chaque équipe NBA de finir dans le top 6, de se qualifier pour les playoffs, d'aller en finale et de gagner le titre ${s}, selon 4 000 simulations de la fin de saison par le modèle Basketlog.`,
      `Each NBA team's chances of a top-6 seed, a playoff spot, a Finals trip and the ${s} title, from 4,000 simulations of the rest of the season with the Basketlog model.`,
      `Las opciones de cada equipo NBA de acabar en el top 6, clasificarse para los playoffs, llegar a las Finales y ganar el título ${s}, según 4.000 simulaciones del resto de la temporada con el modelo de Basketlog.`,
      `As chances de cada time da NBA de terminar no top 6, se classificar para os playoffs, chegar às Finais e ganhar o título ${s}, segundo 4.000 simulações do resto da temporada com o modelo do Basketlog.`
    ),
    path: "/app/simulation",
    L,
  });
}

function Table({ title, rows, L }) {
  return (
    <div className="panel">
      <div className="panel-label" style={{ marginBottom: 8 }}>{title}</div>
      <div className="tbl-scroll">
        <table className="std-table sim-table">
          <thead><tr>
            <th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("V-D", "W-L", "V-D", "V-D")}</th>
            <th title={L.t("Victoires projetées sur 82 matchs", "Projected wins over 82 games", "Victorias proyectadas en 82 partidos", "Vitórias projetadas em 82 jogos")}>{L.t("V proj.", "Proj. W", "V proy.", "V proj.")}</th>
            <th>{L.t("Top 6", "Top 6", "Top 6", "Top 6")}</th><th>{L.t("Playoffs", "Playoffs", "Playoffs", "Playoffs")}</th>
            <th>{L.t("Finale", "Finals", "Finales", "Finais")}</th><th>{L.t("Titre", "Title", "Título", "Título")}</th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={i === 6 || i === 10 ? "cut" : ""}>
                <td className="rk">{i + 1}</td>
                <td className="tm"><Link href={L.href(`/app/equipe/${r.id}`)}><span>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={r.team.logo} alt="" />{r.team.short}</span></Link></td>
                <td>{r.record[0]}-{r.record[1]}</td>
                <td>{numOf(r.projWins, L, 1)}</td>
                <td>{probTxt(r.top6, L)}</td>
                <td className={r.playoffs >= 0.5 ? "pos" : ""}>{probTxt(r.playoffs, L)}</td>
                <td>{probTxt(r.finals, L)}</td>
                <td className={r.title >= 0.1 ? "pos" : ""}>{probTxt(r.title, L)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function SimulationPage() {
  const L = await getL();
  let sim = null;
  try { sim = await simulateSeason(); } catch {}
  const season = seasonLabel();
  const rows = sim ? Object.values(sim.teams).map((r) => ({ ...r, team: teamById(r.id) })).filter((r) => r.team) : [];
  const by = (conf) => rows.filter((r) => r.conf === conf).sort((a, b) => b.projWins - a.projWins || b.playoffs - a.playoffs);
  const east = by("E"), west = by("W");
  const top = [...rows].sort((a, b) => b.title - a.title);
  const when = sim ? fmtDate(L, sim.at, { day: "numeric", month: "long" }) : "";
  const p = (x) => probTxt(x, L);
  const bubble = rows.filter((r) => r.playoffs >= 0.35 && r.playoffs <= 0.65).sort((a, b) => b.playoffs - a.playoffs).slice(0, 5);
  const list = (arr) => arr.map((r) => `${r.team.short} (${p(r.title)})`).join(", ");
  const faq = rows.length ? [
    {
      q: L.t(`Qui est favori pour le titre NBA ${season} ?`, `Who is the favorite to win the ${season} NBA title?`, `¿Quién es el favorito para el título NBA ${season}?`, `Quem é o favorito ao título da NBA ${season}?`),
      a: L.t(`Selon le modèle Basketlog, les ${top[0].team.short} ont ${p(top[0].title)} de chances de gagner le titre, devant ${list(top.slice(1, 4))}.`,
        `According to the Basketlog model, the ${top[0].team.short} have a ${p(top[0].title)} chance to win the title, ahead of ${list(top.slice(1, 4))}.`,
        `Según el modelo de Basketlog, los ${top[0].team.short} tienen un ${p(top[0].title)} de opciones de ganar el título, por delante de ${list(top.slice(1, 4))}.`,
        `Segundo o modelo do Basketlog, o ${top[0].team.short} tem ${p(top[0].title)} de chance de ganhar o título, à frente de ${list(top.slice(1, 4))}.`),
    },
    {
      q: L.t("Quelles équipes sont les plus incertaines pour les playoffs ?", "Which teams are on the playoff bubble?", "¿Qué equipos están en el límite de los playoffs?", "Quais times estão na briga pelos playoffs?"),
      a: bubble.length
        ? L.t(`Les équipes autour de 50 % : ${bubble.map((r) => `${r.team.short} (${p(r.playoffs)})`).join(", ")}.`, `Teams near 50%: ${bubble.map((r) => `${r.team.short} (${p(r.playoffs)})`).join(", ")}.`, `Los equipos cerca del 50 %: ${bubble.map((r) => `${r.team.short} (${p(r.playoffs)})`).join(", ")}.`, `Os times perto de 50 %: ${bubble.map((r) => `${r.team.short} (${p(r.playoffs)})`).join(", ")}.`)
        : L.t("Pour l'instant, aucune équipe n'est autour de 50 %.", "No team is currently near 50%.", "Por ahora, ningún equipo está cerca del 50 %.", "Por enquanto, nenhum time está perto de 50 %."),
    },
    {
      q: L.t("Comment sont calculées ces probabilités ?", "How are these odds calculated?", "¿Cómo se calculan estas probabilidades?", "Como essas probabilidades são calculadas?"),
      a: L.t(
        `Le modèle Basketlog joue ${numOf(sim.remaining, L, 0)} matchs restants 4 000 fois, avec la force de chaque équipe (écart de points, saison passée), l'avantage du terrain et une part de hasard sur le vrai niveau de chaque équipe. Puis il joue le play-in et les playoffs (séries au meilleur des 7). Les chiffres sont la part des simulations où l'équipe atteint chaque étape.`,
        `The Basketlog model plays the ${numOf(sim.remaining, L, 0)} remaining games 4,000 times, using each team's strength (point differential, last season), home-court advantage and some uncertainty about each team's true level. It then plays the play-in and the playoffs (best-of-7 series). The numbers are the share of simulations in which a team reaches each stage.`,
        `El modelo de Basketlog juega los ${numOf(sim.remaining, L, 0)} partidos restantes 4.000 veces, con la fuerza de cada equipo (diferencia de puntos, temporada pasada), la ventaja de campo y una parte de incertidumbre sobre el nivel real de cada equipo. Después juega el play-in y los playoffs (series al mejor de 7). Las cifras son la parte de simulaciones en las que el equipo alcanza cada etapa.`,
        `O modelo do Basketlog joga os ${numOf(sim.remaining, L, 0)} jogos restantes 4.000 vezes, com a força de cada time (saldo de pontos, temporada passada), a vantagem de jogar em casa e uma margem de incerteza sobre o nível real de cada time. Depois joga o play-in e os playoffs (séries melhor de 7). Os números são a parte das simulações em que o time chega a cada fase.`),
    },
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  return (
    <main className="app-page wide">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA"), "/app/classement"], [L.t("Chances de playoffs", "Playoff odds", "Probabilidades de playoffs", "Chances de playoffs"), "/app/simulation"]]} />
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Chances de playoffs NBA ${season}`, `NBA playoff odds ${season}`, `Probabilidades de playoffs NBA ${season}`, `Chances de playoffs da NBA ${season}`)}</h1>
        <p>{L.t("Les chances de chaque équipe d'aller en playoffs, en finale et de gagner le titre, selon 4 000 simulations de la fin de saison.", "Each team's chances to make the playoffs, reach the Finals and win the title, from 4,000 simulations of the rest of the season.", "Las opciones de cada equipo de llegar a los playoffs, a las Finales y de ganar el título, según 4.000 simulaciones del resto de la temporada.", "As chances de cada time de ir aos playoffs, chegar às Finais e ganhar o título, segundo 4.000 simulações do resto da temporada.")}</p>
        {when && <p className="note">{L.t(`Mis à jour le ${when}. « Playoffs » inclut les qualifiés via le play-in.`, `Updated ${when}. "Playoffs" includes teams that get in through the play-in.`, `Actualizado el ${when}. «Playoffs» incluye a los clasificados por el play-in.`, `Atualizado em ${when}. «Playoffs» inclui os classificados pelo play-in.`)}</p>}
      </div>
      {rows.length ? (
        <div className="std-grid">
          <Table title={L.t("CONFÉRENCE EST", "EASTERN CONFERENCE", "CONFERENCIA ESTE", "CONFERÊNCIA LESTE")} rows={east} L={L} />
          <Table title={L.t("CONFÉRENCE OUEST", "WESTERN CONFERENCE", "CONFERENCIA OESTE", "CONFERÊNCIA OESTE")} rows={west} L={L} />
        </div>
      ) : (
        <p className="empty">{L.t("Simulation indisponible pour le moment. Réessaie dans quelques minutes.", "Simulation unavailable right now. Try again in a few minutes.", "Simulación no disponible por el momento. Vuelve a intentarlo en unos minutos.", "Simulação indisponível no momento. Tente novamente em alguns minutos.")}</p>
      )}
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("Chances de playoffs : l'essentiel", "Playoff odds: quick answers", "Probabilidades de playoffs: lo esencial", "Chances de playoffs: o essencial")}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more">
            <Link href={L.href("/app/champion")}>{L.t("Qui sera champion NBA ? →", "Who will win the NBA title? →", "¿Quién ganará el anillo? →", "Quem vai ser campeão? →")}</Link>{" · "}
            <Link href={L.href("/app/classement")}>{L.t("Classement NBA →", "NBA standings →", "Clasificación NBA →", "Classificação NBA →")}</Link>{" · "}
            <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA →", "NBA power rankings →", "Power ranking NBA →", "Power ranking NBA →")}</Link>{" · "}
            <Link href={L.href("/app/nba-cup")}>{L.t("NBA Cup →", "NBA Cup →", "NBA Cup →", "NBA Cup →")}</Link>{" · "}
            <Link href={L.href("/methode")}>{L.t("Méthode →", "Methodology →", "Metodología →", "Metodologia →")}</Link>
          </p>
        </section>
      )}
      <p className="disclaimer">{L.t("Probabilités estimées par le modèle statistique Basketlog, jamais une certitude. Égalités au classement départagées au hasard (règles officielles simplifiées).", "Probabilities estimated by the Basketlog statistical model, never a certainty. Ties in the standings are broken at random (simplified official rules).", "Probabilidades estimadas por el modelo estadístico de Basketlog, nunca una certeza. Empates en la clasificación resueltos al azar (reglas oficiales simplificadas).", "Probabilidades estimadas pelo modelo estatístico do Basketlog, nunca uma certeza. Empates na classificação decididos ao acaso (regras oficiais simplificadas).")}</p>
      <CiteBox url={`${SITE_URL}${L.href("/app/simulation")}`} title={L.t("Chances de playoffs NBA (simulation Basketlog)", "NBA playoff odds (Basketlog simulation)", "Opciones de playoffs NBA (simulación de Basketlog)", "Chances de playoffs da NBA (simulação do Basketlog)")} lang={L.lang} />
    </main>
  );
}
