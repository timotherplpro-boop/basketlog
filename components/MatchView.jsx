import Link from "next/link";
import { pctOf } from "../lib/i18n";
import { TeamLogo, ProbBar, StatusTag } from "./ui";
import AppTabs from "./AppTabs";
import JsonLd from "./JsonLd";
import AnalysisResult from "./AnalysisResult";
import { SITE } from "../lib/site";
import { dayLong } from "../lib/seo";
import { getL } from "../lib/lang-server";

export default async function MatchView({ a, backHref = "/app", league = "NBA", extras = null, path = null }) {
  const L = await getL();
  const isNBA = league === "NBA";
  const teamHref = (t) => L.href(isNBA ? `/app/equipe/${t.id}` : `/app/euroleague/equipe/${t.id}`);
  const g = a.game;
  const showScore = g.state !== "pre" && g.home.score != null;

  // Données structurées : le match (événement sportif) et la page, dont l'analyse détaillée est réservée aux abonnés.
  const url = path ? `${SITE}${L.href(path)}` : null;
  const team = (t) => ({ "@type": "SportsTeam", name: t.name, ...(t.logo ? { logo: t.logo } : {}) });
  const ld = g.hypothetical || !url ? null : [
    {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: `${g.away.name} – ${g.home.name}`,
      description: L.t(
        `Match ${isNBA ? "NBA" : "d'EuroLeague"} entre ${g.away.name} et ${g.home.name}. Probabilités Basketlog : ${Math.round(a.pAway * 100)} % / ${Math.round(a.pHome * 100)} %.`,
        `${isNBA ? "NBA" : "EuroLeague"} game between ${g.away.name} and ${g.home.name}. Basketlog probabilities: ${pctOf(a.pAway, L)} / ${pctOf(a.pHome, L)}.`,
        `Partido de ${isNBA ? "la NBA" : "la Euroliga"} entre ${g.away.name} y ${g.home.name}. Probabilidades de Basketlog: ${Math.round(a.pAway * 100)} % / ${Math.round(a.pHome * 100)} %.`
      ),
      sport: "Basketball",
      startDate: g.date,
      eventStatus: g.postponed === "canceled" ? "https://schema.org/EventCancelled" : g.postponed ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      ...(g.venue ? { location: { "@type": "Place", name: g.venue, address: g.city || g.venue } } : {}),
      homeTeam: team(g.home),
      awayTeam: team(g.away),
      competitor: [team(g.away), team(g.home)],
      url,
    },
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: L.t(`Pronostic ${g.away.name} – ${g.home.name}`, `${g.away.name} vs ${g.home.name} prediction`, `Pronóstico ${g.away.name} – ${g.home.name}`),
      url,
      inLanguage: L.hreflang,
      isAccessibleForFree: false,
      hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".ar-locked" },
      isPartOf: { "@id": `${SITE}/#site` },
    },
  ];

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <AppTabs active={isNBA ? "analyse" : "euroleague"} />
      <Link href={L.href(backHref)} className="back">← {L.t("Retour", "Back", "Volver")}</Link>
      <h1 className="match-title">
        {L.t(
          `${g.hypothetical ? "Analyse" : "Pronostic"} ${g.away.short} – ${g.home.short}`,
          `${g.away.short} vs ${g.home.short} ${g.hypothetical ? "analysis" : "prediction"}`,
          `${g.hypothetical ? "Análisis" : "Pronóstico"} ${g.away.short} – ${g.home.short}`
        )}{" "}
        <span>{g.hypothetical ? L.t("Match hypothétique", "Hypothetical game", "Partido hipotético") : `${isNBA ? "NBA" : L.t("EuroLeague", "EuroLeague", "Euroliga")} · ${dayLong(g.date, L)}`}</span>
      </h1>

      <div className="card match-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusTag game={g} L={L} />
          <span className="team-rec">{[g.venue, g.broadcast].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="match-teams">
          <Link href={teamHref(g.away)} className="team"><TeamLogo team={g.away} size={92} /><div className="team-name">{g.away.name}</div><div className="team-rec mono"><span>{g.away.record || "0-0"}</span><span className="sep"> · </span><span>{L.t("extérieur", "away", "visitante")}</span></div></Link>
          <div className="proj">
            <div className="label">{showScore ? (g.state === "in" ? L.t("Score en direct", "Live score", "Marcador en directo") : L.t("Score final", "Final score", "Resultado final")) : L.t("Score projeté", "Projected score", "Marcador proyectado")}</div>
            <div className="score">{showScore ? `${g.away.score}-${g.home.score}` : `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`}</div>
            {showScore && <div className="team-rec mono">{L.t("Projeté :", "Projected:", "Proyectado:")} {Math.round(a.awayPts)}-{Math.round(a.homePts)}</div>}
          </div>
          <Link href={teamHref(g.home)} className="team"><TeamLogo team={g.home} size={92} /><div className="team-name">{g.home.name}</div><div className="team-rec mono"><span>{g.home.record || "0-0"}</span><span className="sep"> · </span><span>{L.t("domicile", "home", "casa")}</span></div></Link>
        </div>
        <div style={{ marginTop: 26 }}>
          <ProbBar pAway={a.pAway} pHome={a.pHome} away={g.away} home={g.home} L={L} />
          <div className="prob-labels mono">
            <span><strong>{pctOf(a.pAway, L)}</strong><small>{L.t(`victoire ${g.away.abbr}`, `${g.away.abbr} win`, `victoria ${g.away.abbr}`)}</small></span>
            <span><strong>{pctOf(a.pHome, L)}</strong><small>{L.t(`victoire ${g.home.abbr}`, `${g.home.abbr} win`, `victoria ${g.home.abbr}`)}</small></span>
          </div>
        </div>
      </div>

      {g.hypothetical && (
        <div className="hypo">{L.t(
          <>Ces deux équipes ne se jouent pas dans les 3 prochaines semaines : voici l&apos;analyse d&apos;un match hypothétique, avec les {g.home.short} à domicile.</>,
          <>These two teams don&apos;t meet in the next 3 weeks: here is the analysis of a hypothetical game, with the {g.home.short} at home.</>,
          <>Estos dos equipos no se enfrentan en las próximas 3 semanas: aquí tienes el análisis de un partido hipotético, con los {g.home.short} en casa.</>
        )}</div>
      )}

      <AnalysisResult a={a} league={league} L={L} mode="page" path={path} extras={extras} />

      <p className="disclaimer">
        {L.t(
          <>Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles{a.minSample < 5 ? " ; en début de saison, elles s'appuient largement sur la saison précédente" : ""}. Elles ne constituent ni une certitude ni un conseil de pari.</>,
          <>Probabilities estimated by the Basketlog model from available public data{a.minSample < 5 ? "; early in the season they rely heavily on last season" : ""}. They are neither a certainty nor betting advice.</>,
          <>Probabilidades estimadas por el modelo de Basketlog a partir de los datos públicos disponibles{a.minSample < 5 ? "; a principio de temporada se apoyan mucho en la temporada anterior" : ""}. No constituyen ni una certeza ni un consejo de apuestas.</>
        )}
      </p>
    </main>
  );
}
