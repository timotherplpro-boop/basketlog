import Link from "next/link";
import { notFound } from "next/navigation";
import { teamById } from "../../../../lib/teams";
import { conferenceStandings, upcomingAnalyses } from "../../../../lib/data";
import { getTeamStats, getTeamSchedule, getRoster, getSummary, nbaDateOf } from "../../../../lib/espn";
import AppTabs from "../../../../components/AppTabs";
import { teamSummary } from "../../../../lib/summary";
import { pageMeta } from "../../../../lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const t = teamById(id);
  if (!t) return { title: "Équipe – Basketlog", robots: { index: false } };
  return pageMeta({
    title: `${t.name} : stats, calendrier et pronostics – Basketlog`,
    description: `${t.name} : bilan, stats de la saison NBA, joueurs clés, calendrier et pronostic Basketlog pour chaque prochain match.`,
    path: `/app/equipe/${t.id}`,
  });
}

const dfmt = (iso, o) => { try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...o }).format(new Date(iso)); } catch { return ""; } };
const catFr = (c) => ({ Points: "pts / match", Rebounds: "rebonds", Assists: "passes" }[c] || c);

export default async function TeamPage({ params }) {
  const { id } = await params;
  const team = teamById(id);
  if (!team) notFound();

  const [std, stats, sched, roster, up] = await Promise.all([
    conferenceStandings(), getTeamStats(team.id), getTeamSchedule(team.id), getRoster(team.id), upcomingAnalyses(7),
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

  const kpis = [
    ["Bilan", `${me.wins ?? 0}-${me.losses ?? 0}`],
    ["Classement", rank ? `${rank}e ${team.conf === "E" ? "Est" : "Ouest"}` : "–"],
    ["Points / match", stats?.ppg?.toFixed(1) ?? "–"],
    ["Adresse à 3 pts", stats?.threePct != null ? `${stats.threePct.toFixed(1)} %` : "–"],
    ["Rebonds / match", stats?.reb?.toFixed(1) ?? "–"],
    ["Passes / match", stats?.ast?.toFixed(1) ?? "–"],
    ["Écart / match", me.gp && me.diff != null ? `${me.diff > 0 ? "+" : ""}${me.diff.toFixed(1)}` : "–"],
    ["Saison passée", me.prev || "–"],
  ];

  return (
    <main className="app-page">
      <AppTabs active="classement" />
      <Link href="/app/classement" className="back">← Classement</Link>
      <div className="card match-hero team-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.logo} alt="" />
        <div>
          <span className="tag hot">Conférence {team.conf === "E" ? "Est" : "Ouest"}</span>
          <h1>{team.name}</h1>
          <p className="team-rec">{me.streak ? `Série en cours : ${me.streak}` : "Saison 2026-27"}{me.last10 ? ` · 10 derniers : ${me.last10}` : ""}</p>
        </div>
        <Link href={`/app?team=${team.id}`} className="btn-solid">Analyser un duel</Link>
      </div>

      <div className="kpis kpis8">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>

      <div className="card block">
        <h2>En bref</h2>
        <p className="narr">{teamSummary({ team, me: { ...me, streak: me.streak ? me.streak.replace(/^W/, "V").replace(/^L/, "D") : null }, rank, conf: team.conf, next, probs, stats }).join(" ")}</p>
      </div>

      {leaders.length > 0 && (
        <div className="card block">
          <h2>Joueurs clés</h2>
          <div className="lead3">
            {leaders.map((p) => (
              <div className="pl-row" key={p.cat}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {p.head ? <img className="pl-head" src={p.head} alt="" /> : <span className="pl-head ph" />}
                <span className="pl-id"><b>{p.name}</b><small>{p.pos}{p.jersey ? ` · #${p.jersey}` : ""}</small></span>
                <span className="pl-val"><strong>{p.value}</strong><small>{catFr(p.cat)}</small></span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid2">
        <div className="card block">
          <h2>Prochains matchs</h2>
          {next.length ? next.map((g) => {
            const home = g.home.id === team.id;
            const opp = home ? g.away : g.home;
            const p = probs[g.id];
            const mine = p == null ? null : home ? p : 1 - p;
            return (
              <Link key={g.id} href={`/app/match/${g.id}?d=${nbaDateOf(g.date)}`} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short || opp.abbr}</span>
                <span className="s">{mine != null ? `${Math.round(mine * 100)}% victoire` : dfmt(g.date, { hour: "2-digit", minute: "2-digit" })}</span>
              </Link>
            );
          }) : <p className="team-rec">Aucun match à venir.</p>}
        </div>
        <div className="card block">
          <h2>Derniers résultats</h2>
          {past.length ? past.map((g) => {
            const home = g.home.id === team.id;
            const me2 = home ? g.home : g.away, opp = home ? g.away : g.home;
            const win = me2.winner || (me2.score > opp.score);
            return (
              <Link key={g.id} href={`/app/match/${g.id}?d=${nbaDateOf(g.date)}`} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short || opp.abbr}{g.type === "pre" ? <small className="team-rec"> · présaison</small> : null}</span>
                <span className={`s ${win ? "pos" : "neg"}`}>{win ? "V" : "D"} {me2.score}-{opp.score}</span>
              </Link>
            );
          }) : <p className="team-rec">Pas encore de match joué.</p>}
        </div>
      </div>

      {stats && (
        <div className="card block">
          <h2>Statistiques de la saison</h2>
          <div className="statgrid">
            {[
              ["Adresse aux tirs", stats.fgPct, "%"], ["Adresse à 3 pts", stats.threePct, "%"], ["3 pts réussis / match", stats.threeMade, ""],
              ["Lancers francs", stats.ftPct, "%"], ["Rebonds offensifs", stats.oreb, ""], ["Interceptions", stats.stl, ""],
              ["Contres", stats.blk, ""], ["Balles perdues", stats.tov, ""], ["Matchs joués", stats.gp, ""],
            ].filter(([, v]) => v != null).map(([l, v, u]) => (
              <div key={l}><span>{l}</span><b>{Number.isInteger(v) ? v : v.toFixed(1)}{u && ` ${u}`}</b></div>
            ))}
          </div>
        </div>
      )}

      {roster.length > 0 && (
        <div className="card block">
          <h2>Effectif</h2>
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
