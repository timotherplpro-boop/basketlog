import Link from "next/link";
import { pctOf } from "../lib/i18n";
import { TeamLogo, ProbBar, StatusTag } from "./ui";
import AppTabs from "./AppTabs";
import JsonLd from "./JsonLd";
import AnalysisResult from "./AnalysisResult";
import { SITE } from "../lib/site";
import { dayLong } from "../lib/seo";
import { getL } from "../lib/lang-server";
import { matchFaq } from "../lib/matchfaq";
import { pairPath } from "../lib/matchup";
import Crumbs from "./Crumbs";
import ShareMatch from "./ShareMatch";

export default async function MatchView({ a, backHref = "/app", league = "NBA", extras = null, path = null, acc = null, others = null }) {
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
        `Partido de ${isNBA ? "la NBA" : "la Euroliga"} entre ${g.away.name} y ${g.home.name}. Probabilidades de Basketlog: ${Math.round(a.pAway * 100)} % / ${Math.round(a.pHome * 100)} %.`, `Jogo ${isNBA ? "da NBA" : "da Euroliga"} entre ${g.away.name} e ${g.home.name}. Probabilidades do Basketlog: ${Math.round(a.pAway * 100)} % / ${Math.round(a.pHome * 100)} %.`
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
      name: L.t(`Pronostic ${g.away.name} – ${g.home.name}`, `${g.away.name} vs ${g.home.name} prediction`, `Pronóstico ${g.away.name} – ${g.home.name}`, `Palpite ${g.away.name} x ${g.home.name}`),
      url,
      inLanguage: L.hreflang,
      isAccessibleForFree: false,
      hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".ar-locked" },
      isPartOf: { "@id": `${SITE}/#site` },
    },
  ];

  // Message prêt pour le partage (WhatsApp, partage du téléphone) : l'équipe la plus probable et sa probabilité.
  const fav = a.pHome >= a.pAway ? g.home : g.away;
  const favP = pctOf(Math.max(a.pHome, a.pAway), L);
  const shareText = L.t(
    `🏀 ${g.away.short} – ${g.home.short} : ${fav.short} à ${favP} de chances de victoire, selon Basketlog`,
    `🏀 ${g.away.short} vs ${g.home.short}: ${fav.short} ${favP} to win, according to Basketlog`,
    `🏀 ${g.away.short} – ${g.home.short}: ${fav.short} con ${favP} de probabilidad de victoria, según Basketlog`,
    `🏀 ${g.away.short} x ${g.home.short}: ${fav.short} com ${favP} de chance de vitória, segundo Basketlog`
  );

  const faq = path ? matchFaq(a, L, acc, !isNBA) : [];
  const faqLd = faq.length && url ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  } : null;

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      {faqLd && <JsonLd data={faqLd} />}
      {path && !g.hypothetical && <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], isNBA ? [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"] : [L.t("Pronostic Euroligue", "EuroLeague predictions", "Pronósticos Euroliga", "Palpites Euroliga"), "/app/euroleague"], [L.t(`Pronostic ${g.away.short} – ${g.home.short}`, `${g.away.short} vs ${g.home.short} prediction`, `Pronóstico ${g.away.short} – ${g.home.short}`, `Palpite ${g.away.short} x ${g.home.short}`), path]]} />}
      <AppTabs active={isNBA ? "analyse" : "euroleague"} />
      <Link href={L.href(backHref)} className="back">← {L.t("Retour", "Back", "Volver", "Voltar")}</Link>
      <h1 className="match-title">
        {L.t(
          `${g.hypothetical ? "Analyse" : "Pronostic"} ${g.away.short} – ${g.home.short}`,
          `${g.away.short} vs ${g.home.short} ${g.hypothetical ? "analysis" : "prediction"}`,
          `${g.hypothetical ? "Análisis" : "Pronóstico"} ${g.away.short} – ${g.home.short}`, `${g.hypothetical ? "Análise" : "Palpite"} ${g.away.short} x ${g.home.short}`
        )}{" "}
        <span>{g.hypothetical ? L.t("Match hypothétique", "Hypothetical game", "Partido hipotético", "Jogo hipotético") : `${isNBA ? "NBA" : L.t("EuroLeague", "EuroLeague", "Euroliga", "Euroliga")} · ${dayLong(g.date, L)}`}</span>
      </h1>

      <div className="card match-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusTag game={g} L={L} />
          <span className="team-rec">{[g.venue, g.broadcast].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="match-teams">
          <Link href={teamHref(g.away)} className="team"><TeamLogo team={g.away} size={92} /><div className="team-name">{g.away.name}</div><div className="team-rec mono"><span>{g.away.record || "0-0"}</span><span className="sep"> · </span><span>{L.t("extérieur", "away", "visitante", "visitante")}</span></div></Link>
          <div className="proj">
            <div className="label">{showScore ? (g.state === "in" ? L.t("Score en direct", "Live score", "Marcador en directo", "Placar ao vivo") : L.t("Score final", "Final score", "Resultado final", "Resultado final")) : L.t("Score projeté", "Projected score", "Marcador proyectado", "Placar projetado")}</div>
            <div className="score">{showScore ? `${g.away.score}-${g.home.score}` : `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`}</div>
            {showScore && <div className="team-rec mono">{L.t("Projeté :", "Projected:", "Proyectado:", "Projetado:")} {Math.round(a.awayPts)}-{Math.round(a.homePts)}</div>}
          </div>
          <Link href={teamHref(g.home)} className="team"><TeamLogo team={g.home} size={92} /><div className="team-name">{g.home.name}</div><div className="team-rec mono"><span>{g.home.record || "0-0"}</span><span className="sep"> · </span><span>{L.t("domicile", "home", "casa", "casa")}</span></div></Link>
        </div>
        <div style={{ marginTop: 26 }}>
          <ProbBar pAway={a.pAway} pHome={a.pHome} away={g.away} home={g.home} L={L} />
          <div className="prob-labels mono">
            <span><strong>{pctOf(a.pAway, L)}</strong><small>{L.t(`victoire ${g.away.abbr}`, `${g.away.abbr} win`, `victoria ${g.away.abbr}`, `vitória ${g.away.abbr}`)}</small></span>
            <span><strong>{pctOf(a.pHome, L)}</strong><small>{L.t(`victoire ${g.home.abbr}`, `${g.home.abbr} win`, `victoria ${g.home.abbr}`, `vitória ${g.home.abbr}`)}</small></span>
          </div>
        </div>
        {url && !g.hypothetical && <ShareMatch text={shareText} url={url} matchId={String(g.id)} league={league} />}
      </div>

      {g.hypothetical && (
        <div className="hypo">{L.t(
          <>Ces deux équipes ne se jouent pas dans les 3 prochaines semaines : voici l&apos;analyse d&apos;un match hypothétique, avec les {g.home.short} à domicile.</>,
          <>These two teams don&apos;t meet in the next 3 weeks: here is the analysis of a hypothetical game, with the {g.home.short} at home.</>,
          <>Estos dos equipos no se enfrentan en las próximas 3 semanas: aquí tienes el análisis de un partido hipotético, con los {g.home.short} en casa.</>, <>Estes dois times não se enfrentam nas próximas 3 semanas: aqui está a análise de um jogo hipotético, com o {g.home.short} em casa.</>
        )}</div>
      )}

      <AnalysisResult a={a} league={league} L={L} mode="page" path={path} extras={extras} />

      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`${g.away.short} – ${g.home.short} : l'essentiel`, `${g.away.short} vs ${g.home.short}: quick answers`, `${g.away.short} – ${g.home.short}: lo esencial`, `${g.away.short} x ${g.home.short}: o essencial`)}</h2>
          {faq.map((f) => (
            <div key={f.q} className="mfaq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p className="mfaq-more">{isNBA && <><Link href={L.href(pairPath(g.home, g.away))}>{L.t(`Toutes les rencontres ${g.away.short} – ${g.home.short} de la saison →`, `Every ${g.away.short} vs ${g.home.short} game this season →`, `Todos los ${g.away.short} – ${g.home.short} de la temporada →`, `Todos os ${g.away.short} x ${g.home.short} da temporada →`)}</Link>{" · "}</>}<Link href={L.href(isNBA ? "/app/bilan" : "/app/euroleague")}>{isNBA ? L.t("Bilan public du modèle →", "Model track record →", "Balance público del modelo →", "Desempenho público do modelo →") : L.t("Tous les pronostics EuroLeague →", "All EuroLeague predictions →", "Todos los pronósticos de la Euroliga →", "Todos os palpites da Euroliga →")}</Link></p>
        </section>
      )}

      {others && others.length > 0 && (
        <section className="card block match-others">
          <h2>{isNBA ? L.t(`Les autres matchs NBA du ${dayLong(g.date, L)}`, `Other NBA games on ${dayLong(g.date, L)}`, `Los demás partidos de la NBA del ${dayLong(g.date, L)}`, `Os outros jogos da NBA de ${dayLong(g.date, L)}`) : L.t("Les autres matchs de la journée d'EuroLeague", "Other EuroLeague games this round", "Los demás partidos de la jornada de la Euroliga", "Os outros jogos da rodada da Euroliga")}</h2>
          <ul>
            {others.map(({ a: o, path: p }) => {
              const og = o.game;
              const fav = o.pHome >= 0.5 ? og.home : og.away;
              return (
                <li key={og.id}>
                  <Link href={L.href(p)}>{L.t(`Pronostic ${og.away.short} – ${og.home.short}`, `${og.away.short} vs ${og.home.short} prediction`, `Pronóstico ${og.away.short} – ${og.home.short}`, `Palpite ${og.away.short} x ${og.home.short}`)}</Link>
                  <span className="mono"> · {fav.abbr} {pctOf(Math.max(o.pHome, o.pAway), L)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="disclaimer">
        {L.t(
          <>Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles{a.minSample < 5 ? " ; en début de saison, elles s'appuient largement sur la saison précédente" : ""}. Elles ne constituent ni une certitude ni un conseil de pari.</>,
          <>Probabilities estimated by the Basketlog model from available public data{a.minSample < 5 ? "; early in the season they rely heavily on last season" : ""}. They are neither a certainty nor betting advice.</>,
          <>Probabilidades estimadas por el modelo de Basketlog a partir de los datos públicos disponibles{a.minSample < 5 ? "; a principio de temporada se apoyan mucho en la temporada anterior" : ""}. No constituyen ni una certeza ni un consejo de apuestas.</>, <>Probabilidades estimadas pelo modelo do Basketlog a partir dos dados públicos disponíveis{a.minSample < 5 ? "; no início da temporada, elas se apoiam muito na temporada anterior" : ""}. Não são nem uma certeza nem uma recomendação de aposta.</>
        )}
      </p>
    </main>
  );
}
