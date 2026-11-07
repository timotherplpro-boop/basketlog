import Link from "next/link";
import { upcomingAnalyses, resolveDuel } from "../../lib/data";
import { sureRecordSoon, RECORD_MIN, VERY_HIGH } from "../../lib/sure";
import { pctOf } from "../../lib/i18n";
import { TEAMS, teamById } from "../../lib/teams";
import DuelForm from "../../components/DuelForm";
import UpcomingList from "../../components/UpcomingList";
import AppTabs from "../../components/AppTabs";
import AnalysisResult from "../../components/AnalysisResult";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const meta = pageMeta({
    title: L.t("Analyse de match NBA : choisis deux équipes – Basketlog", "NBA game analysis: pick two teams – Basketlog", "Análisis de partidos NBA: elige dos equipos – Basketlog"),
    description: L.t(
      "Choisis deux équipes NBA et obtiens le pronostic du match : probabilités de victoire, score projeté, forme, absences et fatigue. Prochains matchs de la semaine.",
      "Pick two NBA teams and get the game prediction: win probabilities, projected score, form, injuries and fatigue. This week's upcoming games.", "Elige dos equipos de la NBA y obtén el pronóstico del partido: probabilidades de victoria, marcador proyectado, forma, bajas y cansancio. Los próximos partidos de la semana."
    ),
    path: "/app",
    L,
  });
  // Résultat d'une analyse (deux équipes choisies) : utile au visiteur, pas à indexer.
  return sp.home && sp.away ? { ...meta, robots: { index: false, follow: true } } : meta;
}

// « Analyse de match », comme Visifoot : on choisit deux équipes, on lance l'analyse,
// et le résultat s'affiche sous le formulaire.
export default async function AnalysePage({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const home = teamById(sp.home || sp.team);
  const away = teamById(sp.away);
  const duel = home && away && home.id !== away.id ? await resolveDuel(home.id, away.id) : null;
  const up = duel ? [] : await upcomingAnalyses(7);
  const list = up
    .filter((g) => !home || g.home.id === home.id || g.away.id === home.id)
    .slice(0, 14)
    .map(({ a, ...g }) => ({ ...g, state: g.live ? "in" : "pre" }));
  // Confiance très élevée (favori à 88 % et plus) des 7 prochains jours, rappelée en tête avec le bilan réel de ce niveau.
  const sure = home ? [] : up.filter((g) => !g.live && g.confidence === VERY_HIGH).map(({ a, ...g }) => ({ ...g, state: "pre" }));
  const rec = sure.length ? (await sureRecordSoon())?.nba : null;
  const seasonLabel = (y) => `${y - 1}-${String(y).slice(2)}`;

  return (
    <main className="app-page">
      <AppTabs active="analyse" />
      <div className="app-head">
        <h1>{L.t("Analyse de match", "Game analysis", "Análisis de partido")}</h1>
        <p>{L.t("Entre les équipes que tu veux analyser", "Between the teams you want to analyze", "Entre los equipos que quieres analizar")}</p>
        <p className="note">{L.t("Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.", "Our model combines strength, form, injuries and fatigue for every prediction.", "Nuestro modelo combina nivel, forma, bajas y cansancio en cada pronóstico.")}</p>
      </div>
      <DuelForm teams={TEAMS} initialHome={home} initialAway={away} key={`${home?.id || ""}-${away?.id || ""}`} />
      {duel ? (
        <div id="resultat">
          <AnalysisResult a={duel.a} league="NBA" L={L} mode="analyzer" path={duel.path} />
          <p className="disclaimer">{L.t(
            "Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles. Elles ne constituent ni une certitude ni un conseil de pari.",
            "Probabilities estimated by the Basketlog model from available public data. They are neither a certainty nor betting advice.",
            "Probabilidades estimadas por el modelo de Basketlog a partir de los datos públicos disponibles. No constituyen ni una certeza ni un consejo de apuestas."
          )}</p>
        </div>
      ) : (
        <>
          {sure.length > 0 && (
            <UpcomingList games={sure} L={L} className="sure-panel" title={<><span className="dot" />{L.t("Confiance très élevée", "Very high confidence", "Confianza muy alta")}</>}>
              <p className="su-note">
                {rec && rec.n >= RECORD_MIN
                  ? L.t(
                    `Favoris à 88 % et plus. À ce niveau : ${rec.ok} pronostics justes sur ${rec.n} en NBA depuis la saison ${seasonLabel(rec.since)} (${pctOf(rec.ok / rec.n, L)}). `,
                    `Favorites at 88%+. At this level: ${rec.ok} of ${rec.n} NBA picks right since the ${seasonLabel(rec.since)} season (${pctOf(rec.ok / rec.n, L)}). `,
                    `Favoritos al 88 % o más. En este nivel: ${rec.ok} pronósticos acertados de ${rec.n} en la NBA desde la temporada ${seasonLabel(rec.since)} (${pctOf(rec.ok / rec.n, L)}). `)
                  : L.t("Favoris à 88 % et plus. ", "Favorites at 88%+. ", "Favoritos al 88 % o más. ")}
                <Link href={L.href("/app/bilan")}>{L.t("Voir le bilan", "See the track record", "Ver el balance")}</Link>
              </p>
            </UpcomingList>
          )}
          <UpcomingList games={list} L={L} title={home ? `${L.t("Prochains matchs", "Upcoming games", "Próximos partidos")} · ${home.short}` : L.t("Prochains matchs", "Upcoming games", "Próximos partidos")} />
        </>
      )}
    </main>
  );
}
