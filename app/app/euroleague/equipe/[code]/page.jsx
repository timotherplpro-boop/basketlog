import Link from "next/link";
import { notFound } from "next/navigation";
import { elContext, elAnalyze, elStandings } from "../../../../../lib/euroleague";
import { sized } from "../../../../../lib/img";
import AppTabs from "../../../../../components/AppTabs";
import { pageMeta, fitTitle } from "../../../../../lib/seo";
import { getL } from "../../../../../lib/lang-server";
import { fmtDate, numOf } from "../../../../../lib/i18n";
import { elPath } from "../../../../../lib/slug";
import Crumbs from "../../../../../components/Crumbs";

export const dynamic = "force-dynamic";

const toWL = (s) => (s ? s.replace(/^V/, "W").replace(/^D/, "L") : s);
const ord = (n) => { const m = n % 100; return `${n}${m >= 11 && m <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`; };

export async function generateMetadata({ params }) {
  const { code } = await params;
  const L = await getL();
  const ctx = await elContext();
  const { cur } = ctx;
  const t = cur[code];
  if (!t) return { title: L.t("Club EuroLeague – Basketlog", "EuroLeague club – Basketlog", "Club de la Euroliga – Basketlog", "Clube da Euroliga – Basketlog"), robots: { index: false } };
  // Prochain match et sa probabilité dans le titre et la description (comme les pages équipes NBA).
  const ng = ctx.games.find((g) => !g.played && (g.home.id === code || g.away.id === code));
  if (ng) {
    const a = elAnalyze(ng, cur, ctx.prev);
    const home = ng.home.id === code, opp = home ? ng.away : ng.home;
    const p = Math.round((home ? a.pHome : 1 - a.pHome) * 100);
    const d = fmtDate(L, ng.date, L.en ? { month: "short", day: "numeric" } : { day: "numeric", month: "short" }).replace(/\.$/, "");
    const pc = L.en ? `${p}%` : `${p}\u202f%`;
    return pageMeta({
      title: L.t(
        fitTitle(`Pronostic ${t.name} – ${opp.short} (${d}) : EuroLeague, prochain match`, `Pronostic ${t.short} – ${opp.short} (${d}) : Euroligue`, `Pronostic ${t.name} (EuroLeague)`),
        fitTitle(`${t.name} vs ${opp.short} prediction (${d}): EuroLeague win probability`, `${t.short} vs ${opp.short} prediction (${d}): EuroLeague`, `${t.name} EuroLeague predictions`),
        fitTitle(`Pronóstico ${t.name} – ${opp.short} (${d}): Euroliga, próximo partido`, `Pronóstico ${t.short} – ${opp.short} (${d}): Euroliga`, `Pronóstico ${t.name} (Euroliga)`), fitTitle(`Palpite ${t.name} x ${opp.short} (${d}): Euroliga, próximo jogo`, `Palpite ${t.short} x ${opp.short} (${d}): Euroliga`, `Palpite ${t.name} (Euroliga)`)
      ),
      description: L.t(
        `${t.name} (${t.wins}-${t.losses}) ${home ? "reçoit" : "se déplace chez"} ${opp.name} le ${d} : ${pc} de chances de victoire selon le modèle Basketlog. Classement, forme, calendrier et pronostic de chaque match d'EuroLeague.`,
        `${t.name} (${t.wins}-${t.losses}) ${home ? "host" : "visit"} ${opp.name} on ${d}: ${pc} win probability per the Basketlog model. Standing, form, schedule and a prediction for every EuroLeague game.`,
        `${t.name} (${t.wins}-${t.losses}) ${home ? "recibe a" : "visita a"} ${opp.name} el ${d}: ${pc} de probabilidades de victoria según el modelo de Basketlog. Clasificación, forma, calendario y pronóstico de cada partido de la Euroliga.`, `${t.name} (${t.wins}-${t.losses}) ${home ? "recebe o" : "visita o"} ${opp.name} em ${d}: ${pc} de probabilidade de vitória segundo o modelo do Basketlog. Classificação, fase, calendário e palpite de cada jogo da Euroliga.`
      ),
      path: `/app/euroleague/equipe/${code}`,
      L,
    });
  }
  return pageMeta({
    title: L.t(
      fitTitle(`Pronostic ${t.name} : EuroLeague, matchs et stats – Basketlog`, `Pronostic ${t.name} : EuroLeague, matchs et stats`, `Pronostic ${t.name} (EuroLeague)`),
      fitTitle(`${t.name} predictions: EuroLeague games and stats – Basketlog`, `${t.name} predictions: EuroLeague games and stats`, `${t.name} EuroLeague predictions`),
      fitTitle(`Pronóstico ${t.name}: Euroliga, partidos y estadísticas – Basketlog`, `Pronóstico ${t.name}: Euroliga, partidos y estadísticas`, `Pronóstico ${t.name} (Euroliga)`), fitTitle(`Palpite ${t.name}: Euroliga, jogos e estatísticas – Basketlog`, `Palpite ${t.name}: Euroliga, jogos e estatísticas`, `Palpite ${t.name} (Euroliga)`)
    ),
    description: L.t(
      `${t.name} en EuroLeague : bilan, classement, forme récente, calendrier et pronostic Basketlog pour chaque prochain match.`,
      `${t.name} in the EuroLeague: record, standing, recent form, schedule and a Basketlog prediction for every upcoming game.`, `${t.name} en la Euroliga: balance, clasificación, forma reciente, calendario y un pronóstico de Basketlog para cada próximo partido.`, `${t.name} na Euroliga: campanha, classificação, fase recente, calendário e um palpite do Basketlog para cada próximo jogo.`
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
    [L.t("Bilan", "Record", "Balance", "Campanha"), `${t.wins}-${t.losses}`],
    [L.t("Classement", "Standing", "Clasificación", "Classificação"), rank && t.gp ? L.t(rank === 1 ? "1er" : `${rank}e`, ord(rank), `${rank}.º`, `${rank}.º`) : "–"],
    [L.t("Points / match", "Points / game", "Puntos / partido", "Pontos / jogo"), numOf(t.ppg, L)],
    [L.t("Encaissés / match", "Allowed / game", "Encajados / partido", "Sofridos / jogo"), numOf(t.oppg, L)],
    [L.t("Écart / match", "Margin / game", "Diferencia / partido", "Saldo / jogo"), t.diff != null ? `${t.diff > 0 ? "+" : ""}${numOf(t.diff, L)}` : "–"],
    [L.t("À domicile", "Home", "En casa", "Em casa"), t.home],
    [L.t("À l'extérieur", "Road", "Fuera", "Fora"), t.road],
    [L.t("Saison passée", "Last season", "Temporada pasada", "Temporada passada"), prev?.gp ? `${prev.wins}-${prev.losses}` : "–"],
  ];

  return (
    <main className="app-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostic Euroligue", "EuroLeague predictions", "Pronósticos Euroliga", "Palpites Euroliga"), "/app/euroleague"], [L.t(`Pronostic ${t.name}`, `${t.name} predictions`, `Pronóstico ${t.name}`, `Palpite ${t.name}`), `/app/euroleague/equipe/${code}`]]} />
      <AppTabs active="euroleague" />
      <Link href={L.href("/app/euroleague")} className="back">← {L.t("EuroLeague", "EuroLeague", "Euroliga", "Euroliga")}</Link>
      <div className="card match-hero team-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {t.logo ? <img src={sized(t.logo, 330)} alt="" /> : <span />}
        <div>
          <span className="tag hot">{L.t("EuroLeague", "EuroLeague", "Euroliga", "Euroliga")}</span>
          <h1>{t.name}</h1>
          <p className="team-rec">{streak ? L.t(`Série en cours : ${streak}`, `Current streak: ${streak}`, `Racha actual: ${streak}`, `Sequência atual: ${streak}`) : L.t("Saison en cours", "Current season", "Temporada en curso", "Temporada atual")}{t.last10 ? L.t(` · 10 derniers : ${t.last10}`, ` · Last 10: ${t.last10}`, ` · Últimos 10: ${t.last10}`, ` · Últimos 10: ${t.last10}`) : ""}</p>
        </div>
      </div>
      <div className="kpis kpis8">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>
      <div className="grid2">
        <div className="card block">
          <h2>{L.t("Prochains matchs", "Upcoming games", "Próximos partidos", "Próximos jogos")}</h2>
          {next.length ? next.map(({ g, a }) => {
            const home = g.home.id === code;
            const opp = home ? g.away : g.home;
            const p = home ? a.pHome : 1 - a.pHome;
            return (
              <Link key={g.id} href={L.href(elPath(g))} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short}</span>
                <span className="s">{L.t(`${Math.round(p * 100)}\u202f% de victoire`, `${Math.round(p * 100)}% to win`, `${Math.round(p * 100)}\u202f% de victoria`, `${Math.round(p * 100)} % de vitória`)}</span>
              </Link>
            );
          }) : <p className="team-rec">{L.t("Aucun match à venir.", "No upcoming games.", "No hay partidos próximos.", "Nenhum jogo próximo.")}</p>}
        </div>
        <div className="card block">
          <h2>{L.t("Derniers résultats", "Recent results", "Últimos resultados", "Últimos resultados")}</h2>
          {past.length ? past.map((g) => {
            const home = g.home.id === code;
            const me = home ? g.home : g.away, opp = home ? g.away : g.home;
            const win = me.score > opp.score;
            return (
              <Link key={g.id} href={L.href(elPath(g))} className="h2h-row tl">
                <span className="d">{dfmt(g.date, { day: "numeric", month: "short" })}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <span className="t">{home ? "vs" : "@"} {opp.logo && <img src={opp.logo} alt="" />}{opp.short}</span>
                <span className={`s ${win ? "pos" : "neg"}`}>{win ? L.t("V", "W", "V", "V") : L.t("D", "L", "D", "D")} {me.score}-{opp.score}</span>
              </Link>
            );
          }) : <p className="team-rec">{L.t("Pas encore de match joué.", "No games played yet.", "Todavía no se ha jugado ningún partido.", "Nenhum jogo disputado ainda.")}</p>}
        </div>
      </div>
    </main>
  );
}
