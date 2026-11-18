import Link from "next/link";
import { notFound } from "next/navigation";
import { teamById } from "../../../../lib/teams";
import { sized } from "../../../../lib/img";
import { conferenceStandings, upcomingAnalyses } from "../../../../lib/data";
import { getTeamStats, getTeamSchedule, getRoster, getSummary, nbaDateOf, nbaToday, seasonForDate } from "../../../../lib/espn";
import AppTabs from "../../../../components/AppTabs";
import { teamSummary } from "../../../../lib/summary";
import { pageMeta, fitTitle } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { fmtDate, fmtTime, numOf } from "../../../../lib/i18n";
import { nbaPath } from "../../../../lib/slug.js";
import JsonLd from "../../../../components/JsonLd";
import { SITE } from "../../../../lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const L = await getL();
  const t = teamById(id);
  if (!t) return { title: L.t("Équipe – Basketlog", "Team – Basketlog", "Equipo – Basketlog"), robots: { index: false } };
  return pageMeta({
    // « Pronostic » en tête : c'est ce que tapent ceux qui cherchent le prochain match d'une équipe.
    title: L.t(
      fitTitle(`Pronostic ${t.name} : prochains matchs et stats – Basketlog`, `Pronostic ${t.name} : prochains matchs et stats`),
      fitTitle(`${t.name} predictions: next game win probability – Basketlog`, `${t.name} predictions: next game win probability`),
      fitTitle(`Pronóstico ${t.name}: próximos partidos y estadísticas – Basketlog`, `Pronóstico ${t.name}: próximos partidos y estadísticas`)
    ),
    description: L.t(
      `${t.name} : bilan, stats de la saison NBA, joueurs clés, calendrier et pronostic Basketlog pour chaque prochain match.`,
      `${t.name}: record, NBA season stats, key players, schedule and a Basketlog prediction for every upcoming game.`, `${t.name}: balance, estadísticas de la temporada NBA, jugadores clave, calendario y un pronóstico de Basketlog para cada próximo partido.`
    ),
    path: `/app/equipe/${t.id}`,
    L,
  });
}

const catLabel = (c, L) => L.t({ Points: "pts / match", Rebounds: "rebonds", Assists: "passes" }, { Points: "pts / game", Rebounds: "rebounds", Assists: "assists" }, { Points: "pts / partido", Rebounds: "rebotes", Assists: "asistencias" })[c] || c;
const ord = (n) => { const m = n % 100; return `${n}${m >= 11 && m <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`; };
const toVD = (s) => (s ? s.replace(/^W/, "V").replace(/^L/, "D") : s);
const toWL = (s) => (s ? s.replace(/^V/, "W").replace(/^D/, "L") : s);

export default async function TeamPage({ params }) {
  const { id } = await params;
  const L = await getL();
  const team = teamById(id);
  if (!team) notFound();
  const dfmt = (iso, o) => fmtDate(L, iso, o);
  const confName = team.conf === "E" ? L.t("Est", "East", "Este") : L.t("Ouest", "West", "Oeste");

  const [std, stats, sched, roster, up] = await Promise.all([
    conferenceStandings(), getTeamStats(team.id), getTeamSchedule(team.id), getRoster(team.id, L.lang), upcomingAnalyses(7),
  ]);
  const confRows = team.conf === "E" ? std.east : std.west;
  const rank = confRows.findIndex((r) => r.id === team.id) + 1;
  const me = confRows.find((r) => r.id === team.id) || {};
  const regular = sched.filter((g) => g.type !== "pre");
  const past = sched.filter((g) => g.state === "post" && g.home.score != null).slice(-8).reverse();
  const next = regular.filter((g) => g.state !== "post").slice(0, 6);
  const probs = Object.fromEntries(up.map((g) => [g.id, g.pHome]));
  const summary = next[0] ? await getSummary(next[0].id) : null;
  const nextG = next[0] || null;
  const nextHome = nextG ? nextG.home.id === team.id : false;
  const nextOpp = nextG ? (nextHome ? nextG.away : nextG.home) : null;
  const nextMine = nextG && probs[nextG.id] != null ? (nextHome ? probs[nextG.id] : 1 - probs[nextG.id]) : null;
  const leaders = summary?.leaders?.[team.id] || [];

  const streak = L.en ? toWL(me.streak) : toVD(me.streak);
  const sz = seasonForDate(nbaToday());
  const seasonLabel = `${sz - 1}-${String(sz).slice(2)}`;
  const kpis = [
    [L.t("Bilan", "Record", "Balance"), `${me.wins ?? 0}-${me.losses ?? 0}`],
    [L.t("Classement", "Standing", "Clasificación"), rank ? L.t(`${rank === 1 ? "1re" : `${rank}e`} ${confName}`, `${ord(rank)} ${confName}`, `${rank}.º ${confName}`) : "–"],
    [L.t("Points / match", "Points / game", "Puntos / partido"), numOf(stats?.ppg, L)],
    [L.t("Adresse à 3 pts", "3-point %", "% de triples"), stats?.threePct != null ? (L.en ? `${stats.threePct.toFixed(1)}%` : `${stats.threePct.toFixed(1).replace(".", ",")}\u202f%`) : "–"],
    [L.t("Rebonds / match", "Rebounds / game", "Rebotes / partido"), numOf(stats?.reb, L)],
    [L.t("Passes / match", "Assists / game", "Asistencias / partido"), numOf(stats?.ast, L)],
    [L.t("Écart / match", "Margin / game", "Diferencia / partido"), me.gp && me.diff != null ? `${me.diff > 0 ? "+" : ""}${numOf(me.diff, L)}` : "–"],
    [L.t("Saison passée", "Last season", "Temporada pasada"), me.prev || "–"],
  ];

  // Questions-réponses (« will the lakers win tonight », « lakers next game », « lakers record ») : visibles et en FAQPage.
  const pc = (p) => (L.en ? `${Math.round(p * 100)}%` : `${Math.round(p * 100)}\u202f%`);
  const when = (g) => `${dfmt(g.date, { weekday: "long", month: "long", day: "numeric" })} ${L.t("à", "at", "a las")} ${fmtTime(L, g.date)} ${L.tzLabel}`;
  const oppOf = (g) => (g.home.id === team.id ? g.away : g.home);
  const mineOf = (g) => (probs[g.id] == null ? null : g.home.id === team.id ? probs[g.id] : 1 - probs[g.id]);
  const withP = next.filter((g) => mineOf(g) != null);
  const favN = withP.filter((g) => mineOf(g) >= 0.5).length;
  const faq = [];
  if (nextG) {
    faq.push({
      q: L.t(`Les ${team.short} vont-ils gagner leur prochain match ?`, `Will the ${team.short} win their next game?`, `¿Ganarán los ${team.short} su próximo partido?`),
      a: nextMine != null
        ? L.t(`Les ${team.short} affrontent les ${nextOpp.short} ${when(nextG)} (${nextHome ? "à domicile" : "à l'extérieur"}). Le modèle Basketlog leur donne ${pc(nextMine)} de chances de victoire : ${nextMine >= 0.5 ? "ils partent favoris" : "ils ne partent pas favoris"}.`,
            `The ${team.short} play the ${nextOpp.short} on ${when(nextG)} (${nextHome ? "at home" : "on the road"}). The Basketlog model gives them ${/^(8\d?|11|18)$/.test(String(Math.round(nextMine * 100))) ? "an" : "a"} ${pc(nextMine)} chance to win, so they are ${nextMine >= 0.5 ? "the favorite" : "the underdog"}.`,
            `Los ${team.short} se enfrentan a los ${nextOpp.short} el ${when(nextG)} (${nextHome ? "en casa" : "a domicilio"}). El modelo de Basketlog les da un ${pc(nextMine)} de probabilidades de victoria: ${nextMine >= 0.5 ? "parten como favoritos" : "no parten como favoritos"}.`)
        : L.t(`Les ${team.short} affrontent les ${nextOpp.short} ${when(nextG)}. Le pronostic Basketlog est publié quelques jours avant le match.`, `The ${team.short} play the ${nextOpp.short} on ${when(nextG)}. The Basketlog prediction is published a few days before the game.`, `Los ${team.short} se enfrentan a los ${nextOpp.short} el ${when(nextG)}. El pronóstico de Basketlog se publica unos días antes del partido.`),
    });
    faq.push({
      q: L.t(`Quels sont les prochains matchs des ${team.short} ?`, `When do the ${team.short} play next?`, `¿Cuándo juegan los próximos partidos los ${team.short}?`),
      a: next.slice(0, 3).map((g) => `${g.home.id === team.id ? "vs" : "@"} ${oppOf(g).short}, ${dfmt(g.date, { weekday: "short", month: "short", day: "numeric" })}${mineOf(g) != null ? ` (${pc(mineOf(g))})` : ""}`).join(" · ") + ".",
    });
  }
  if (me.gp) faq.push({
    q: L.t(`Quel est le bilan des ${team.short} cette saison ?`, `What is the ${team.name} record this season?`, `¿Cuál es el balance de los ${team.short} esta temporada?`),
    a: L.t(`${me.wins}-${me.losses}${rank ? `, ${rank === 1 ? "1re" : `${rank}e`} de la conférence ${confName}` : ""}${me.last10 ? `, ${me.last10} sur les 10 derniers matchs` : ""}${me.diff != null ? `, écart moyen de ${me.diff > 0 ? "+" : ""}${numOf(me.diff, L)} points par match` : ""}.`,
      `${me.wins}-${me.losses}${rank ? `, ${ord(rank)} in the ${confName}ern Conference` : ""}${me.last10 ? `, ${me.last10} over the last 10 games` : ""}${me.diff != null ? `, with an average margin of ${me.diff > 0 ? "+" : ""}${numOf(me.diff, L)} points per game` : ""}.`,
      `${me.wins}-${me.losses}${rank ? `, ${rank}.º de la Conferencia ${confName}` : ""}${me.last10 ? `, ${me.last10} en los últimos 10 partidos` : ""}${me.diff != null ? `, con una diferencia media de ${me.diff > 0 ? "+" : ""}${numOf(me.diff, L)} puntos por partido` : ""}.`),
  });
  if (withP.length >= 2) faq.push({
    q: L.t(`Dans combien de leurs prochains matchs les ${team.short} sont-ils favoris ?`, `How many of their upcoming games are the ${team.short} favored in?`, `¿En cuántos de sus próximos partidos son favoritos los ${team.short}?`),
    a: L.t(`D'après le modèle Basketlog, les ${team.short} sont favoris dans ${favN} de leurs ${withP.length} prochains matchs.`, `According to the Basketlog model, the ${team.short} are favored in ${favN} of their next ${withP.length} games.`, `Según el modelo de Basketlog, los ${team.short} son favoritos en ${favN} de sus próximos ${withP.length} partidos.`),
  });

  return (
    <main className="app-page">
      <AppTabs active="classement" />
      {faq.length > 0 && <JsonLd data={{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) }} />}
      <Link href={L.href("/app/classement")} className="back">← {L.t("Classement", "Standings", "Clasificación")}</Link>
      <div className="card match-hero team-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sized(team.logo, 330)} alt="" />
        <div>
          <span className="tag hot">{L.t(`Conférence ${confName}`, `${confName}ern Conference`, `Conferencia ${confName}`)}</span>
          <h1>{L.t(`Pronostics ${team.name}`, `${team.name} predictions`, `Pronósticos ${team.name}`)}</h1>
          <p className="team-rec">{streak ? L.t(`Série en cours : ${streak}`, `Current streak: ${streak}`, `Racha actual: ${streak}`) : L.t(`Saison ${seasonLabel}`, `${seasonLabel} season`, `Temporada ${seasonLabel}`)}{me.last10 ? L.t(` · 10 derniers : ${me.last10}`, ` · Last 10: ${me.last10}`, ` · Últimos 10: ${me.last10}`) : ""}</p>
        </div>
        <Link href={L.href(`/app?team=${team.id}`)} className="btn-solid">{L.t("Analyser un duel", "Analyze a matchup", "Analizar un duelo")}</Link>
      </div>

      {nextG && (
        // Prochain match en tête : répond à « heat next game prediction » / « pronostic prochain match ».
        <Link href={L.href(nbaPath(nextG, nbaDateOf(nextG.date)))} className="card block next-game">
          <h2>{L.t("Prochain match", "Next game", "Próximo partido")}</h2>
          <p className="narr">
            <b>{nextHome ? `${team.short} vs ${nextOpp.short || nextOpp.abbr}` : `${team.short} @ ${nextOpp.short || nextOpp.abbr}`}</b>
            {" · "}{dfmt(nextG.date, { weekday: "long", day: "numeric", month: "long" })} · {fmtTime(L, nextG.date)}
            {nextMine != null ? <>{" · "}<b>{L.t(`${Math.round(nextMine * 100)}\u202f% de chances de victoire`, `${Math.round(nextMine * 100)}% win probability`, `${Math.round(nextMine * 100)}\u202f% de probabilidad de victoria`)}</b></> : null}
            {" → "}{L.t("voir l'analyse", "see the full prediction", "ver el análisis")}
          </p>
        </Link>
      )}
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "SportsTeam", name: team.name, sport: "Basketball", logo: team.logo,
        memberOf: { "@type": "SportsOrganization", name: "NBA" }, url: `${SITE}${L.href(`/app/equipe/${team.id}`)}`,
      }} />

      <div className="kpis kpis8">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>

      <div className="card block">
        <h2>{L.t("En bref", "At a glance", "En resumen")}</h2>
        <p className="narr">{teamSummary({ team, me: { ...me, streak: streak || null }, rank, conf: team.conf, next, probs, stats, L }).join(" ")}</p>
      </div>

      {leaders.length > 0 && (
        <div className="card block">
          <h2>{L.t("Joueurs clés", "Key players", "Jugadores clave")}</h2>
          <div className="lead3">
            {leaders.map((p) => (
              <div className="pl-row" key={p.cat}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.head ? <img className="pl-head" src={p.head} alt="" /> : <span className="pl-head ph" />}
                <span className="pl-id"><b>{p.name}</b><small>{p.pos}{p.jersey ? ` · #${p.jersey}` : ""}</small></span>
                <span className="pl-val"><strong>{p.value == null ? "–" : L.en ? p.value : String(p.value).replace(".", ",")}</strong><small>{catLabel(p.cat, L)}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid2">
        <div className="card block">
          <h2>{L.t("Prochains matchs", "Upcoming games", "Próximos partidos")}</h2>
          {next.length ? next.map((g) => {
            const home = g.home.id === team.id;
            const opp = home ? g.away : g.home;
            const p = probs[g.id];
            const mine = p == null ? null : home ? p : 1 - p;
            return (
              <Link key={g.id} href={L.href(nbaPath(g, nbaDateOf(g.date)))} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short || opp.abbr}</span>
                <span className="s">{mine != null ? L.t(`${Math.round(mine * 100)}\u202f% de victoire`, `${Math.round(mine * 100)}% to win`, `${Math.round(mine * 100)}\u202f% de victoria`) : fmtTime(L, g.date)}</span>
              </Link>
            );
          }) : <p className="team-rec">{L.t("Aucun match à venir.", "No upcoming games.", "No hay partidos próximos.")}</p>}
        </div>
        <div className="card block">
          <h2>{L.t("Derniers résultats", "Recent results", "Últimos resultados")}</h2>
          {past.length ? past.map((g) => {
            const home = g.home.id === team.id;
            const me2 = home ? g.home : g.away, opp = home ? g.away : g.home;
            const win = me2.winner || (me2.score > opp.score);
            return (
              <Link key={g.id} href={L.href(nbaPath(g, nbaDateOf(g.date)))} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short || opp.abbr}{g.type === "pre" ? <small className="team-rec"> · {L.t("présaison", "preseason", "pretemporada")}</small> : null}</span>
                <span className={`s ${win ? "pos" : "neg"}`}>{win ? L.t("V", "W", "V") : L.t("D", "L", "D")} {me2.score}-{opp.score}</span>
              </Link>
            );
          }) : <p className="team-rec">{L.t("Pas encore de match joué.", "No games played yet.", "Todavía no se ha jugado ningún partido.")}</p>}
        </div>
      </div>

      {stats && (
        <div className="card block">
          <h2>{L.t("Statistiques de la saison", "Season stats", "Estadísticas de la temporada")}</h2>
          <div className="statgrid">
            {[
              [L.t("Adresse aux tirs", "Field goal %", "% de tiros de campo"), stats.fgPct, "%"], [L.t("Adresse à 3 pts", "3-point %", "% de triples"), stats.threePct, "%"], [L.t("3 pts réussis / match", "3-pointers made / game", "Triples anotados / partido"), stats.threeMade, ""],
              [L.t("Lancers francs", "Free throw %", "% de tiros libres"), stats.ftPct, "%"], [L.t("Rebonds offensifs", "Offensive rebounds", "Rebotes ofensivos"), stats.oreb, ""], [L.t("Interceptions", "Steals", "Robos"), stats.stl, ""],
              [L.t("Contres", "Blocks", "Tapones"), stats.blk, ""], [L.t("Balles perdues", "Turnovers", "Pérdidas"), stats.tov, ""], [L.t("Matchs joués", "Games played", "Partidos jugados"), stats.gp, ""],
            ].filter(([, v]) => v != null).map(([l, v, u]) => (
              <div key={l}><span>{l}</span><b>{Number.isInteger(v) ? v : numOf(v, L)}{u && (L.en ? u : `\u202f${u}`)}</b></div>
            ))}
          </div>
        </div>
      )}

      {roster.length > 0 && (
        <div className="card block">
          <h2>{L.t("Effectif", "Roster", "Plantilla")}</h2>
          <div className="roster">
            {roster.map((p) => (
              <div className="rp" key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.head ? <img src={p.head} alt="" loading="lazy" /> : <span className="ph" />}
                <b>{p.name}</b>
                <small>{p.pos}{p.jersey ? ` · #${p.jersey}` : ""}{p.height ? ` · ${p.height}` : ""}</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`${team.short} : l'essentiel`, `${team.short}: quick answers`, `${team.short}: lo esencial`)}</h2>
          {faq.map((f) => (
            <div key={f.q} className="mfaq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p className="mfaq-more"><Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA →", "NBA power rankings →", "Power ranking NBA →")}</Link></p>
        </section>
      )}
    </main>
  );
}
