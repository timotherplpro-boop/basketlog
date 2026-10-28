import Link from "next/link";
import { notFound } from "next/navigation";
import { elContext, elAnalyze, elStandings } from "../../../../../lib/euroleague";
import AppTabs from "../../../../../components/AppTabs";
import { pageMeta } from "../../../../../lib/seo";

export const dynamic = "force-dynamic";

const dfmt = (iso, o) => { try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...o }).format(new Date(iso)); } catch { return ""; } };

export async function generateMetadata({ params }) {
  const { code } = await params;
  const { cur } = await elContext();
  const t = cur[code];
  if (!t) return { title: "Club EuroLeague – Basketlog", robots: { index: false } };
  return pageMeta({
    title: `${t.name} : EuroLeague, stats et pronostics – Basketlog`,
    description: `${t.name} en EuroLeague : bilan, classement, forme récente, calendrier et pronostic Basketlog pour chaque prochain match.`,
    path: `/app/euroleague/equipe/${code}`,
  });
}

export default async function ELTeamPage({ params }) {
  const { code } = await params;
  const ctx = await elContext();
  const t = ctx.cur[code];
  if (!t) notFound();
  const table = elStandings(ctx.cur);
  const rank = table.findIndex((r) => r.id === t.id) + 1;
  const prev = ctx.prev[code];
  const mine = ctx.games.filter((g) => g.home.id === code || g.away.id === code);
  const next = mine.filter((g) => !g.played).slice(0, 6).map((g) => ({ g, a: elAnalyze(g, ctx.cur, ctx.prev) }));
  const past = mine.filter((g) => g.played).slice(-8).reverse();

  const kpis = [
    ["Bilan", `${t.wins}-${t.losses}`],
    ["Classement", rank && t.gp ? `${rank}e` : "–"],
    ["Points / match", t.ppg != null ? t.ppg.toFixed(1) : "–"],
    ["Encaissés / match", t.oppg != null ? t.oppg.toFixed(1) : "–"],
    ["Écart / match", t.diff != null ? `${t.diff > 0 ? "+" : ""}${t.diff.toFixed(1)}` : "–"],
    ["À domicile", t.home],
    ["À l'extérieur", t.road],
    ["Saison passée", prev?.gp ? `${prev.wins}-${prev.losses}` : "–"],
  ];

  return (
    <main className="app-page">
      <AppTabs active="euroleague" />
      <Link href="/app/euroleague" className="back">← EuroLeague</Link>
      <div className="card match-hero team-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {t.logo ? <img src={t.logo} alt="" /> : <span />}
        <div>
          <span className="tag hot">EuroLeague</span>
          <h1>{t.name}</h1>
          <p className="team-rec">{t.streak ? `Série en cours : ${t.streak}` : "Saison en cours"}{t.last10 ? ` · 10 derniers : ${t.last10}` : ""}</p>
        </div>
      </div>
      <div className="kpis kpis8">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>
      <div className="grid2">
        <div className="card block">
          <h2>Prochains matchs</h2>
          {next.length ? next.map(({ g, a }) => {
            const home = g.home.id === code;
            const opp = home ? g.away : g.home;
            const p = home ? a.pHome : 1 - a.pHome;
            return (
              <Link key={g.id} href={`/app/euroleague/match/${g.id}`} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short}</span>
                <span className="s">{Math.round(p * 100)}% victoire</span>
              </Link>
            );
          }) : <p className="team-rec">Aucun match à venir.</p>}
        </div>
        <div className="card block">
          <h2>Derniers résultats</h2>
          {past.length ? past.map((g) => {
            const home = g.home.id === code;
            const me = home ? g.home : g.away, opp = home ? g.away : g.home;
            const win = me.score > opp.score;
            return (
              <Link key={g.id} href={`/app/euroleague/match/${g.id}`} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short}</span>
                <span className={`s ${win ? "pos" : "neg"}`}>{win ? "V" : "D"} {me.score}-{opp.score}</span>
              </Link>
            );
          }) : <p className="team-rec">Pas encore de match joué.</p>}
        </div>
      </div>
    </main>
  );
}
