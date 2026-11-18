import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerStats, getInjuries, getTeamSchedule, nbaToday, nbaDateOf, seasonForDate } from "../../../../lib/espn";
import { upcomingAnalyses } from "../../../../lib/data";
import { teamById } from "../../../../lib/teams";
import { slugify, nbaPath, playerPath } from "../../../../lib/slug";
import { getL } from "../../../../lib/lang-server";
import { pageMeta, fitTitle } from "../../../../lib/seo";
import { fmtDate, fmtTime, numOf, pctOf } from "../../../../lib/i18n";
import AppTabs from "../../../../components/AppTabs";
import JsonLd from "../../../../components/JsonLd";
import Crumbs from "../../../../components/Crumbs";
import { SITE } from "../../../../lib/site";

export const dynamic = "force-dynamic";

// Page joueur (/nba/player/lebron-james) : recherches « lebron james stats », « estadísticas de luka doncic »,
// « wembanyama stats ce soir ». Stats de la saison, statut médical du jour, prochain match de son équipe et sa probabilité.
const season = () => seasonForDate(nbaToday());
const seasonLabel = () => `${season() - 1}-${String(season()).slice(2)}`;

async function findPlayer(slug) {
  const [cur, prev] = await Promise.all([getPlayerStats(season()), getPlayerStats(season() - 1)]);
  const all = Object.values(cur || {}).filter((p) => slugify(p.name) === slug).sort((a, b) => (b.gp || 0) - (a.gp || 0));
  const p = all[0];
  if (!p) return null;
  return { p, prev: prev?.[p.id] || null, team: p.team ? teamById(p.team) : null, cur };
}

async function nextGame(team) {
  if (!team) return null;
  const [sched, up] = await Promise.all([getTeamSchedule(team.id).catch(() => []), upcomingAnalyses(7).catch(() => [])]);
  const g = sched.filter((x) => x.type !== "pre" && x.state !== "post" && !x.postponed).sort((x, y) => new Date(x.date) - new Date(y.date))[0];
  if (!g) return null;
  const home = g.home.id === team.id;
  const u = up.find((x) => x.id === g.id);
  return { g, home, opp: home ? g.away : g.home, p: u ? (home ? u.pHome : 1 - u.pHome) : null, path: nbaPath(g, nbaDateOf(g.date)) };
}

const n1 = (x, L) => (x == null ? "–" : numOf(x, L));

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await findPlayer(slug).catch(() => null);
  if (!f) return { title: L.t("Joueur introuvable – Basketlog", "Player not found – Basketlog", "Jugador no encontrado – Basketlog"), robots: { index: false } };
  const { p, team } = f;
  const s = seasonLabel();
  const line = `${n1(p.ppg, L)} pts, ${n1(p.reb, L)} reb, ${n1(p.ast, L)} ${L.t("pd", "ast", "ast")}`;
  return pageMeta({
    title: L.t(
      fitTitle(`${p.name} : stats ${s} et prochain match${team ? ` (${team.short})` : ""}`, `${p.name} : stats ${s} et prochain match`),
      fitTitle(`${p.name} stats ${s}: points, rebounds, next game${team ? ` (${team.short})` : ""}`, `${p.name} stats ${s} and next game`),
      fitTitle(`${p.name}: estadísticas ${s} y próximo partido${team ? ` (${team.short})` : ""}`, `${p.name}: estadísticas ${s} y próximo partido`)
    ),
    description: L.t(
      `${p.name}${team ? ` (${team.name})` : ""} cette saison : ${line} en ${p.gp} matchs. Statut médical du jour et prochain match avec la probabilité de victoire Basketlog.`,
      `${p.name}${team ? ` (${team.name})` : ""} this season: ${line} in ${p.gp} games. Today's injury status and next game with the Basketlog win probability.`,
      `${p.name}${team ? ` (${team.name})` : ""} esta temporada: ${line} en ${p.gp} partidos. Estado físico de hoy y próximo partido con la probabilidad de victoria de Basketlog.`
    ),
    path: playerPath(p.name),
    L,
  });
}

export default async function PlayerPage({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await findPlayer(slug);
  if (!f) notFound();
  const { p, prev, team, cur } = f;
  const [inj, nx] = await Promise.all([getInjuries().catch(() => ({})), nextGame(team)]);
  const status = team ? (inj[String(team.id)] || []).find((i) => i.id === p.id || i.player === p.name) : null;
  const mates = team ? Object.values(cur).filter((x) => x.team === p.team && (x.gp || 0) >= 3).sort((a, b) => (b.ppg || 0) - (a.ppg || 0)) : [];
  const rankTeam = mates.findIndex((x) => x.id === p.id) + 1;
  const s = seasonLabel();
  const when = (g) => `${fmtDate(L, g.date, { weekday: "long", day: "numeric", month: "long" })} · ${fmtTime(L, g.date)} ${L.tzLabel}`;
  const stTxt = status ? L.t(`Statut du jour : ${/out/i.test(status.status) ? "absent" : "incertain"}${status.detail && L.en ? ` (${status.detail})` : ""}.`, `Today's status: ${status.status}${status.detail ? ` (${status.detail})` : ""}.`, `Estado de hoy: ${/out/i.test(status.status) ? "baja" : "en duda"}.`) : L.t("Aucune blessure signalée aujourd'hui.", "No injury reported today.", "Sin lesión comunicada hoy.");

  const faq = [
    {
      q: L.t(`Combien de points marque ${p.name} cette saison ?`, `How many points is ${p.name} averaging this season?`, `¿Cuántos puntos promedia ${p.name} esta temporada?`),
      a: L.t(`${p.name} tourne à ${n1(p.ppg, L)} points, ${n1(p.reb, L)} rebonds et ${n1(p.ast, L)} passes décisives par match en ${p.gp} matchs (saison ${s})${rankTeam ? `, ${rankTeam === 1 ? "meilleur marqueur" : `${rankTeam}e marqueur`} des ${team.short}` : ""}.`,
        `${p.name} is averaging ${n1(p.ppg, L)} points, ${n1(p.reb, L)} rebounds and ${n1(p.ast, L)} assists per game over ${p.gp} games (${s} season)${rankTeam ? `, ${rankTeam === 1 ? "the top scorer" : `No. ${rankTeam} scorer`} on the ${team.short}` : ""}.`,
        `${p.name} promedia ${n1(p.ppg, L)} puntos, ${n1(p.reb, L)} rebotes y ${n1(p.ast, L)} asistencias por partido en ${p.gp} partidos (temporada ${s})${rankTeam ? `, ${rankTeam === 1 ? "máximo anotador" : `${rankTeam}.º anotador`} de los ${team.short}` : ""}.`),
    },
    {
      q: L.t(`${p.name} joue-t-il ce soir ?`, `Is ${p.name} playing tonight?`, `¿Juega ${p.name} hoy?`),
      a: stTxt + (nx ? " " + L.t(`Prochain match des ${team.short} : ${nx.home ? "contre" : "chez"} les ${nx.opp.short}, ${when(nx.g)}.`, `The ${team.short}' next game: ${nx.home ? "vs" : "at"} the ${nx.opp.short}, ${when(nx.g)}.`, `Próximo partido de los ${team.short}: ${nx.home ? "contra" : "en casa de"} los ${nx.opp.short}, el ${when(nx.g)}.`) : ""),
    },
  ];
  if (nx && nx.p != null) faq.push({
    q: L.t(`Les ${team.short} vont-ils gagner leur prochain match ?`, `Will the ${team.short} win their next game?`, `¿Ganarán los ${team.short} su próximo partido?`),
    a: L.t(`Le modèle Basketlog donne ${pctOf(nx.p, L)} de chances de victoire aux ${team.short} face aux ${nx.opp.short}.`, `The Basketlog model gives the ${team.short} a ${pctOf(nx.p, L)} chance to win against the ${nx.opp.short}.`, `El modelo de Basketlog da a los ${team.short} un ${pctOf(nx.p, L)} de probabilidades de victoria ante los ${nx.opp.short}.`),
  });
  const url = `${SITE}${L.href(playerPath(p.name))}`;
  const ld = [
    { "@context": "https://schema.org", "@type": "Person", name: p.name, url, ...(p.head ? { image: p.head } : {}), ...(team ? { memberOf: { "@type": "SportsTeam", name: team.name } } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
  ];
  const kpis = [
    [L.t("Points", "Points", "Puntos"), n1(p.ppg, L)],
    [L.t("Rebonds", "Rebounds", "Rebotes"), n1(p.reb, L)],
    [L.t("Passes", "Assists", "Asistencias"), n1(p.ast, L)],
    [L.t("Minutes", "Minutes", "Minutos"), n1(p.mpg, L)],
    [L.t("Matchs", "Games", "Partidos"), p.gp ?? "–"],
    [L.t("Saison passée", "Last season", "Temporada pasada"), prev?.ppg != null ? `${n1(prev.ppg, L)} pts` : "–"],
  ];

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio"), "/"], team ? [L.t(`Pronostic ${team.name}`, `${team.name} predictions`, `Pronóstico ${team.name}`), `/app/equipe/${team.id}`] : [L.t("Classement NBA", "NBA standings", "Clasificación NBA"), "/app/classement"], [p.name, playerPath(p.name)]]} />
      <AppTabs active="classement" />
      <div className="app-head pl-head-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.head && <img className="pl-photo" src={p.head} alt={p.name} width="120" height="88" />}
        <div>
          <h1>{L.t(`${p.name} : stats ${s} et prochain match`, `${p.name} stats ${s} and next game`, `${p.name}: estadísticas ${s} y próximo partido`)}</h1>
          <p>{p.pos}{p.jersey ? ` · #${p.jersey}` : ""}{team ? <> · <Link href={L.href(`/app/equipe/${team.id}`)}>{team.name}</Link></> : null}</p>
          <p className="note">{stTxt}</p>
        </div>
      </div>
      <div className="kpis">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>
      {nx && (
        <Link href={L.href(nx.path)} className="card block next-game">
          <h2>{L.t("Prochain match", "Next game", "Próximo partido")}</h2>
          <p><b>{nx.g.away.short} @ {nx.g.home.short}</b> · {when(nx.g)}{nx.p != null ? <> · <b>{team.short} {pctOf(nx.p, L)}</b></> : null} → {L.t("voir le pronostic", "see the prediction", "ver el pronóstico")}</p>
        </Link>
      )}
      <section className="card block match-faq">
        <h2>{L.t(`${p.name} : l'essentiel`, `${p.name}: quick answers`, `${p.name}: lo esencial`)}</h2>
        {faq.map((x) => <div key={x.q} className="mfaq-item"><h3>{x.q}</h3><p>{x.a}</p></div>)}
      </section>
      {mates.length > 1 && (
        <section className="card block">
          <h2>{L.t(`Les autres joueurs des ${team.short}`, `Other ${team.short} players`, `Otros jugadores de los ${team.short}`)}</h2>
          <ul className="wk-list">
            {mates.filter((x) => x.id !== p.id).slice(0, 8).map((x) => <li key={x.id}><Link href={L.href(playerPath(x.name))}>{x.name}</Link><span className="mono"> · {n1(x.ppg, L)} pts</span></li>)}
          </ul>
        </section>
      )}
      <p className="disclaimer">{L.t("Statistiques de la saison régulière (source : ESPN), mises à jour chaque jour.", "Regular-season stats (source: ESPN), updated daily.", "Estadísticas de la temporada regular (fuente: ESPN), actualizadas cada día.")}</p>
    </main>
  );
}
