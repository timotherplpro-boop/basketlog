import Link from "next/link";
import { fmt, pct } from "../lib/model";
import { aiNarrative } from "../lib/narrative";
import { TeamLogo, ProbBar, StatusTag } from "./ui";
import Gate from "./Gate";
import AppTabs from "./AppTabs";
import MatchExtras from "./MatchExtras";
import JsonLd from "./JsonLd";
import { SITE } from "../lib/site";
import { dayLong } from "../lib/seo";
import { matchSummary } from "../lib/summary";
import { getL } from "../lib/lang-server";
import { factorText, scenarioText, confText } from "../lib/matchtext";

function Signed({ v }) {
  return <span className={v > 0.05 ? "pos" : v < -0.05 ? "neg" : ""}>{fmt(v)}</span>;
}

export default async function MatchView({ a, backHref = "/app", league = "NBA", extras = null, path = null }) {
  const L = await getL();
  const isNBA = league === "NBA";
  const teamHref = (t) => L.href(isNBA ? `/app/equipe/${t.id}` : `/app/euroleague/equipe/${t.id}`);
  const streak = (x) => (x && L.en ? x.replace(/^V/, "W").replace(/^D/, "L") : x);
  const g = a.game;
  const h = a.home, aw = a.away;
  const narrative = await aiNarrative(a, L);
  const showScore = g.state !== "pre" && g.home.score != null;

  const rows = [
    [L.t("Bilan", "Record"), aw.cur ? `${aw.cur.wins}-${aw.cur.losses}` : g.away.record || "–", h.cur ? `${h.cur.wins}-${h.cur.losses}` : g.home.record || "–"],
    [L.t("Points marqués / match", "Points scored / game"), aw.ppg.toFixed(1), h.ppg.toFixed(1)],
    [L.t("Points encaissés / match", "Points allowed / game"), aw.oppg.toFixed(1), h.oppg.toFixed(1)],
    [L.t("Écart ajusté / match", "Adjusted margin / game"), fmt(aw.diff), fmt(h.diff)],
    [L.t("Série en cours", "Current streak"), streak(aw.cur?.streak) || "–", streak(h.cur?.streak) || "–"],
    [L.t("10 derniers matchs", "Last 10 games"), aw.cur?.last10 || "–", h.cur?.last10 || "–"],
    [L.t("Bilan dom. / ext.", "Home / road record"), aw.cur?.road ? `${aw.cur.road} ${L.t("ext.", "road")}` : "–", h.cur?.home ? `${h.cur.home} ${L.t("dom.", "home")}` : "–"],
    [L.t("Saison passée", "Last season"), aw.prev ? `${aw.prev.wins}-${aw.prev.losses} (${fmt(aw.prev.diff)})` : "–", h.prev ? `${h.prev.wins}-${h.prev.losses} (${fmt(h.prev.diff)})` : "–"],
    ...(g.hypothetical || league !== "NBA" ? [] : [[L.t("A joué hier", "Played yesterday"), aw.b2b ? L.t("Oui", "Yes") : L.t("Non", "No"), h.b2b ? L.t("Oui", "Yes") : L.t("Non", "No")]]),
  ];

  // Données structurées : le match (événement sportif) et la page, dont l'analyse détaillée est réservée aux abonnés.
  const url = path ? `${SITE}${L.href(path)}` : null;
  const team = (t) => ({ "@type": "SportsTeam", name: t.name, ...(t.logo ? { logo: t.logo } : {}) });
  const ld = g.hypothetical || !url ? null : [
    {
      "@context": "https://schema.org",
      "@type": "SportsEvent",
      name: `${g.away.name} – ${g.home.name}`,
      description: L.en ? `${isNBA ? "NBA" : "EuroLeague"} game between ${g.away.name} and ${g.home.name}. Basketlog probabilities: ${Math.round(a.pAway * 100)}% / ${Math.round(a.pHome * 100)}%.` : `Match ${isNBA ? "NBA" : "d'EuroLeague"} entre ${g.away.name} et ${g.home.name}. Probabilités Basketlog : ${Math.round(a.pAway * 100)} % / ${Math.round(a.pHome * 100)} %.`,
      sport: "Basketball",
      startDate: g.date,
      eventStatus: "https://schema.org/EventScheduled",
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
      name: L.en ? `${g.away.name} vs ${g.home.name} prediction` : `Pronostic ${g.away.name} – ${g.home.name}`,
      url,
      inLanguage: L.en ? "en-US" : "fr-FR",
      isAccessibleForFree: false,
      hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".gate-content" },
      isPartOf: { "@id": `${SITE}/#site` },
    },
  ];

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <AppTabs active={isNBA ? "analyse" : "euroleague"} />
      <Link href={L.href(backHref)} className="back">← {L.t("Retour", "Back")}</Link>
      <h1 className="match-title">
        {L.en
          ? `${g.away.short} vs ${g.home.short} ${g.hypothetical ? "analysis" : "prediction"}`
          : `${g.hypothetical ? "Analyse" : "Pronostic"} ${g.away.short} – ${g.home.short}`}{" "}
        <span>{g.hypothetical ? L.t("Match hypothétique", "Hypothetical game") : `${isNBA ? "NBA" : "EuroLeague"} · ${dayLong(g.date, L)}`}</span>
      </h1>

      <div className="card match-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusTag game={g} L={L} />
          <span className="team-rec">{[g.venue, g.broadcast].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="match-teams">
          <Link href={teamHref(g.away)} className="team"><TeamLogo team={g.away} size={92} /><div className="team-name">{g.away.name}</div><div className="team-rec mono">{g.away.record || "0-0"} · {L.t("extérieur", "away")}</div></Link>
          <div className="proj">
            <div className="label">{showScore ? (g.state === "in" ? L.t("Score en direct", "Live score") : L.t("Score final", "Final score")) : L.t("Score projeté", "Projected score")}</div>
            <div className="score">{showScore ? `${g.away.score}-${g.home.score}` : `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`}</div>
            {showScore && <div className="team-rec mono">{L.t("Projeté :", "Projected:")} {Math.round(a.awayPts)}-{Math.round(a.homePts)}</div>}
          </div>
          <Link href={teamHref(g.home)} className="team"><TeamLogo team={g.home} size={92} /><div className="team-name">{g.home.name}</div><div className="team-rec mono">{g.home.record || "0-0"} · {L.t("domicile", "home")}</div></Link>
        </div>
        <div style={{ marginTop: 26 }}>
          <ProbBar pAway={a.pAway} pHome={a.pHome} away={g.away} home={g.home} />
          <div className="prob-labels mono">
            <span><strong>{pct(a.pAway)}</strong> {L.t("victoire", "win")} {g.away.abbr}</span>
            <span>{L.t("victoire", "win")} {g.home.abbr} <strong>{pct(a.pHome)}</strong></span>
          </div>
        </div>
      </div>

      {g.hypothetical && (
        <div className="hypo">{L.en ? <>These two teams don&apos;t meet in the next 3 weeks: here is the analysis of a hypothetical game, with the {g.home.short} at home.</> : <>Ces deux équipes ne se jouent pas dans les 3 prochaines semaines : voici l&apos;analyse d&apos;un match hypothétique, avec les {g.home.short} à domicile.</>}</div>
      )}

      <div className="kpis">
        <div className="card kpi"><span>{L.t("Favori", "Favorite")}</span><strong>{a.fav.team.abbr}</strong></div>
        <div className="card kpi"><span>{L.t("Écart projeté", "Projected margin")}</span><strong>{Math.abs(a.margin).toFixed(1)}</strong></div>
        <div className="card kpi"><span>{L.t("Total projeté", "Projected total")}</span><strong>{Math.round(a.total)}</strong></div>
        <div className="card kpi"><span>{L.t("Confiance", "Confidence")}</span><strong>{confText(a.confidence, L)}</strong></div>
      </div>

      <div className="card block">
        <h2>{L.t("En bref", "At a glance")}</h2>
        <p className="narr">{matchSummary(a, league, L).join(" ")}</p>
      </div>

      <Gate matchId={g.id} league={league}>
        <div className="card block">
          <h2>{L.t("L'analyse", "The analysis")} {narrative.source === "ai" ? <span className="tag hot">{L.t("IA", "AI")}</span> : <span className="tag">{L.t("Modèle", "Model")}</span>}</h2>
          <p className="narr">{narrative.text}</p>
          {narrative.keys.length > 0 && <ul className="keys">{narrative.keys.map((k, i) => <li key={i}>{k}</li>)}</ul>}
        </div>

        <div className="grid2">
          <div className="card block">
            <h2>{L.t("Ce qui fait pencher la balance", "What tips the balance")}</h2>
            <div className="team-rec" style={{ marginBottom: 6 }}>{L.t("En points, positif = avantage", "In points, positive = edge")} {g.home.short}</div>
            {a.factors.map((f) => { const ft = factorText(f, a, L); return (
              <div className="factor" key={f.label}><div>{ft.label}<small>{ft.detail}</small></div><div className="v mono"><Signed v={f.value} /></div></div>
            ); })}
            <div className="factor"><div><b>{L.t("Marge attendue", "Expected margin")}</b><small>{L.t("pour", "for")} {g.home.short}</small></div><div className="v mono"><Signed v={a.margin} /></div></div>
          </div>
          <div className="card block">
            <h2>{L.t("Scénarios", "Scenarios")}</h2>
            <div className="scen">
              {a.scenarios.map((s) => (
                <div className="scen-row" key={s.label}>
                  <div>{scenarioText(s, a, L)}<div className="scen-bar"><div style={{ width: `${Math.round(s.p * 100)}%` }} /></div></div>
                  <div className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{pct(s.p)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isNBA ? <MatchExtras a={a} L={L} /> : extras}

        <div className="card block">
          <h2>{L.t("Fiche des deux équipes", "Team comparison")}</h2>
          <table className="cmp">
            <thead><tr><th>{g.away.abbr}</th><th></th><th>{g.home.abbr}</th></tr></thead>
            <tbody>{rows.map(([l, x, y]) => <tr key={l}><td className="mono">{x}</td><td>{l}</td><td className="mono">{y}</td></tr>)}</tbody>
          </table>
        </div>

        {isNBA && (
        <div className="grid2">
          {[aw, h].map((s) => (
            <div className="card block" key={s.team.id}>
              <h2><TeamLogo team={s.team} size={24} /> {L.t("Infirmerie", "Injury report")} {s.team.short}</h2>
              {s.inj.out.length + s.inj.doubtful.length === 0 ? (
                <div className="team-rec">{L.t("Aucune absence signalée.", "No injuries reported.")}</div>
              ) : (
                <div className="inj">
                  {[...s.inj.out, ...s.inj.doubtful].map((i) => (
                    <div className="inj-row" key={i.player}><span>{i.player} <span className="team-rec">{i.pos}</span></span><span className={/out/i.test(i.status) ? "neg" : ""}>{i.status}</span></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </Gate>

      <p className="disclaimer">
        {L.en
          ? <>Probabilities estimated by the Basketlog model from available public data{a.minSample < 5 ? "; early in the season they rely heavily on last season" : ""}. They are neither a certainty nor betting advice.</>
          : <>Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles{a.minSample < 5 ? " ; en début de saison, elles s'appuient largement sur la saison précédente" : ""}. Elles ne constituent ni une certitude ni un conseil de pari.</>}
      </p>
    </main>
  );
}
