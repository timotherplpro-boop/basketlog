import Link from "next/link";
import { notFound } from "next/navigation";
import { elContext, elAnalyze, elStandings } from "../../../../../lib/euroleague";
import AppTabs from "../../../../../components/AppTabs";
import { pageMeta } from "../../../../../lib/seo";
import { getL } from "../../../../../lib/lang-server";
import { fmtDate } from "../../../../../lib/i18n";

export const dynamic = "force-dynamic";

const toWL = (s) => (s ? s.replace(/^V/, "W").replace(/^D/, "L") : s);
const ord = (n) => { const m = n % 100; return `${n}${m >= 11 && m <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`; };

export async function generateMetadata({ params }) {
  const { code } = await params;
  const L = await getL();
  const { cur } = await elContext();
  const t = cur[code];
  if (!t) return { title: L.t("Club EuroLeague – Basketlog", "EuroLeague club – Basketlog"), robots: { index: false } };
  return pageMeta({
    title: L.t(`${t.name} : EuroLeague, stats et pronostics – Basketlog`, `${t.name}: EuroLeague stats and predictions – Basketlog`),
    description: L.t(
      `${t.name} en EuroLeague : bilan, classement, forme récente, calendrier et pronostic Basketlog pour chaque prochain match.`,
      `${t.name} in the EuroLeague: record, standing, recent form, schedule and a Basketlog prediction for every upcoming game.`
    ),
    path: `/app/euroleague/equipe/${code}`,
    L,
  });
}

export default async function ELTeamPage({ params }) {
  const { code } = await params;
  const L = await getL();
  const dfmt = (iso, o) => fmtDate(L, iso, o);
  const ctx = await elContext();
  const t = ctx.cur[code];
  if (!t) notFound();
  const streak = L.en ? toWL(t.streak) : t.streak;
  const table = elStandings(ctx.cur);
  const rank = table.findIndex((r) => r.id === t.id) + 1;
  const prev = ctx.prev[code];
  const mine = ctx.games.filter((g) => g.home.id === code || g.away.id === code);
  const next = mine.filter((g) => !g.played).slice(0, 6).map((g) => ({ g, a: elAnalyze(g, ctx.cur, ctx.prev) }));
  const past = mine.filter((g) => g.played).slice(-8).reverse();

  const kpis = [
    [L.t("Bilan", "Record"), `${t.wins}-${t.losses}`],
    [L.t("Classement", "Standing"), rank && t.gp ? (L.en ? ord(rank) : `${rank}e`) : "–"],
    [L.t("Points / match", "Points / game"), t.ppg != null ? t.ppg.toFixed(1) : "–"],
    [L.t("Encaissés / match", "Allowed / game"), t.oppg != null ? t.oppg.toFixed(1) : "–"],
    [L.t("Écart / match", "Margin / game"), t.diff != null ? `${t.diff > 0 ? "+" : ""}${t.diff.toFixed(1)}` : "–"],
    [L.t("À domicile", "Home"), t.home],
    [L.t("À l'extérieur", "Road"), t.road],
    [L.t("Saison passée", "Last season"), prev?.gp ? `${prev.wins}-${prev.losses}` : "–"],
  ];

  return (
    <main className="app-page">
      <AppTabs active="euroleague" />
      <Link href={L.href("/app/euroleague")} className="back">← EuroLeague</Link>
      <div className="card match-hero team-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {t.logo ? <img src={t.logo} alt="" /> : <span />}
        <div>
          <span className="tag hot">EuroLeague</span>
          <h1>{t.name}</h1>
          <p className="team-rec">{streak ? L.t(`Série en cours : ${streak}`, `Current streak: ${streak}`) : L.t("Saison en cours", "Current season")}{t.last10 ? L.t(` · 10 derniers : ${t.last10}`, ` · Last 10: ${t.last10}`) : ""}</p>
        </div>
      </div>
      <div className="kpis kpis8">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>
      <div className="grid2">
        <div className="card block">
          <h2>{L.t("Prochains matchs", "Upcoming games")}</h2>
          {next.length ? next.map(({ g, a }) => {
            const home = g.home.id === code;
            const opp = home ? g.away : g.home;
            const p = home ? a.pHome : 1 - a.pHome;
            return (
              <Link key={g.id} href={L.href(`/app/euroleague/match/${g.id}`)} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short}</span>
                <span className="s">{L.t(`${Math.round(p * 100)}% victoire`, `${Math.round(p * 100)}% to win`)}</span>
              </Link>
            );
          }) : <p className="team-rec">{L.t("Aucun match à venir.", "No upcoming games.")}</p>}
        </div>
        <div className="card block">
          <h2>{L.t("Derniers résultats", "Recent results")}</h2>
          {past.length ? past.map((g) => {
            const home = g.home.id === code;
            const me = home ? g.home : g.away, opp = home ? g.away : g.home;
            const win = me.score > opp.score;
            return (
              <Link key={g.id} href={L.href(`/app/euroleague/match/${g.id}`)} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short}</span>
                <span className={`s ${win ? "pos" : "neg"}`}>{win ? L.t("V", "W") : L.t("D", "L")} {me.score}-{opp.score}</span>
              </Link>
            );
          }) : <p className="team-rec">{L.t("Pas encore de match joué.", "No games played yet.")}</p>}
        </div>
      </div>
    </main>
  );
}
