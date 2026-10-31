import Link from "next/link";
import { notFound } from "next/navigation";
import { teamById } from "../../../../lib/teams";
import { conferenceStandings, upcomingAnalyses } from "../../../../lib/data";
import { getTeamStats, getTeamSchedule, getRoster, getSummary, nbaDateOf, nbaToday, seasonForDate } from "../../../../lib/espn";
import AppTabs from "../../../../components/AppTabs";
import { teamSummary } from "../../../../lib/summary";
import { pageMeta } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { fmtDate, fmtTime, numOf } from "../../../../lib/i18n";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const L = await getL();
  const t = teamById(id);
  if (!t) return { title: L.t("Équipe – Basketlog", "Team – Basketlog", "Equipo – Basketlog"), robots: { index: false } };
  return pageMeta({
    title: L.t(`${t.name} : stats, calendrier et pronostics – Basketlog`, `${t.name}: stats, schedule and predictions – Basketlog`, `${t.name}: estadísticas, calendario y pronósticos – Basketlog`),
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

  return (
    <main className="app-page">
      <AppTabs active="classement" />
      <Link href={L.href("/app/classement")} className="back">← {L.t("Classement", "Standings", "Clasificación")}</Link>
      <div className="card match-hero team-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt="" />
        <div>
          <span className="tag hot">{L.t(`Conférence ${confName}`, `${confName}ern Conference`, `Conferencia ${confName}`)}</span>
          <h1>{team.name}</h1>
          <p className="team-rec">{streak ? L.t(`Série en cours : ${streak}`, `Current streak: ${streak}`, `Racha actual: ${streak}`) : L.t(`Saison ${seasonLabel}`, `${seasonLabel} season`, `Temporada ${seasonLabel}`)}{me.last10 ? L.t(` · 10 derniers : ${me.last10}`, ` · Last 10: ${me.last10}`, ` · Últimos 10: ${me.last10}`) : ""}</p>
        </div>
        <Link href={L.href(`/app?team=${team.id}`)} className="btn-solid">{L.t("Analyser un duel", "Analyze a matchup", "Analizar un duelo")}</Link>
      </div>

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
              <Link key={g.id} href={L.href(`/app/match/${g.id}?d=${nbaDateOf(g.date)}`)} className="h2h-row tl">
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
              <Link key={g.id} href={L.href(`/app/match/${g.id}?d=${nbaDateOf(g.date)}`)} className="h2h-row tl">
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
    </main>
  );
}
