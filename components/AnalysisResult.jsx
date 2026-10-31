// Résultat d'analyse façon Visifoot : carte du match, forme récente, résumé rapide, scénario n° 1 et confiance
// pour tout le monde ; le reste (probabilités exactes, argumentation, facteurs, scénarios, stats, infirmerie)
// seulement une fois l'analyse complète lancée. Utilisé dans « Analyse de match » et sur les fiches des matchs.
import Gate from "./Gate";
import FormToggle from "./FormToggle";
import MatchExtras from "./MatchExtras";
import { TeamLogo } from "./ui";
import { fmt } from "../lib/model";
import { aiNarrative } from "../lib/narrative";
import { matchSummary } from "../lib/summary";
import { factorText, scenarioText, confText } from "../lib/matchtext";
import Link from "next/link";
import NewsSection from "./NewsSection";
import AskAI from "./AskAI";
import { aiReady, QUESTIONS } from "../lib/pro";
import { analysisAccess, memberSession, questionUsage } from "../lib/usage";
import { nbaRecentForm } from "../lib/data";
import { unlockProof } from "../lib/proof";
import { nbaDateOf } from "../lib/espn";
import { fmtDate, deFr } from "../lib/i18n";

const pctL = (p, L, d = 0) => `${(p * 100).toFixed(d).replace(".", L.en ? "." : ",")}${L.en ? "%" : " %"}`;
const num = (v, L, d = 1) => v.toFixed(d).replace(".", L.en ? "." : ",");
const sgn = (v, L) => (L.en ? fmt(v) : fmt(v).replace(".", ",")); // « +3,2 » en français et en espagnol
// Statut ESPN d'un blessé, dans la langue de la page.
function injStatus(st, L) {
  const s = String(st || "");
  if (/out/i.test(s)) return L.t("Absent", "Out", "Baja");
  if (/doubt/i.test(s)) return L.t("Très incertain", "Doubtful", "Muy dudoso");
  if (/question|game time/i.test(s)) return L.t("Incertain", "Questionable", "En duda");
  if (/day-to-day/i.test(s)) return L.t("Au jour le jour", "Day-to-day", "Día a día");
  if (/probable/i.test(s)) return L.t("Probable", "Probable", "Probable");
  return s;
}

function formLabel(list, L) {
  if (!list.length) return L.t("⏳ Pas encore de match", "⏳ No games yet", "⏳ Todavía sin partidos");
  const w = list.filter((x) => x.res === "W").length;
  const r = w / list.length;
  if (r >= 0.8) return L.t("🔥 En grande forme", "🔥 On fire", "🔥 En gran forma");
  if (r >= 0.6) return L.t("👍 En forme", "👍 In form", "👍 En forma");
  if (r >= 0.4) return L.t("➖ Irrégulier", "➖ Up and down", "➖ Irregular");
  return L.t("🧊 En difficulté", "🧊 Struggling", "🧊 En apuros");
}

// Résumé rapide : le contexte du match, sans les chiffres du modèle (réservés à l'analyse complète).
const LOCKED_LINE = /%|^(Absences signalées|Reported injuries|Bajas comunicadas|Niveau de confiance|Prediction confidence|Nivel de confianza)/;
const briefSummary = (a, league, L) => matchSummary(a, league, L).filter((x) => !LOCKED_LINE.test(x)).join(" ");

// Scénario n° 1 : le plus probable des scénarios étudiés, et ce qui porte surtout le favori (sans probabilité chiffrée).
function scenarioOne(a, league, L) {
  const nba = league === "NBA";
  const s = [...a.scenarios].sort((x, y) => y.p - x.p)[0];
  const favHome = a.pHome >= 0.5;
  const fav = a.fav.team, dog = a.dog.team;
  const n = (t) => (nba ? t.short : t.name);
  const d = (x) => (L.en ? fmt(x) : fmt(x).replace(".", ","));
  const lead = [...a.factors].sort((x, y) => (favHome ? y.value - x.value : x.value - y.value))[0];
  const why = !lead || (favHome ? lead.value <= 0 : lead.value >= 0) ? null : {
    level: L.t(`un meilleur niveau sur la saison (écart de points de ${d(a.fav.diff)} par match, contre ${d(a.dog.diff)})`, `a stronger season so far (point differential of ${d(a.fav.diff)} per game, against ${d(a.dog.diff)})`, `un mejor nivel en la temporada (diferencia de puntos de ${d(a.fav.diff)} por partido, frente a ${d(a.dog.diff)})`),
    home: L.t("l'avantage du terrain", "home-court advantage", "la ventaja de jugar en casa"),
    b2b: L.t(`la fatigue ${nba ? `des ${dog.short}, qui ont` : `${deFr(dog.name)}, qui a`} joué la veille`, `${nba ? `the ${dog.short}'` : `${dog.name}'s`} fatigue after playing the night before`, `el cansancio ${nba ? `de los ${dog.short}, que jugaron` : `de ${dog.name}, que jugó`} la víspera`),
    inj: L.t(`les absences ${nba ? `côté ${dog.short}` : deFr(dog.name)}`, `${nba ? `the ${dog.short}'` : `${dog.name}'s`} injuries`, `las bajas ${nba ? `de los ${dog.short}` : `de ${dog.name}`}`),
  }[lead.key];
  const team = s.key === "home10" ? a.home.team : s.key === "away10" ? a.away.team : null;
  const what = team
    ? L.t(`Victoire ${nba ? `des ${team.short}` : deFr(team.name)} par 10 points ou plus`, `${nba ? `The ${team.short}` : team.name} win${nba ? "" : "s"} by 10 points or more`, `Victoria ${nba ? `de los ${team.short}` : `de ${team.name}`} por 10 puntos o más`)
    : L.t("Un match serré, avec 5 points d'écart ou moins", "A close game, decided by 5 points or fewer", "Un partido igualado, con 5 puntos de diferencia o menos");
  return L.t(
    `${what} : c'est le scénario le plus probable parmi ceux étudiés par le modèle. ${nba ? `Les ${fav.short} partent favoris` : `${fav.name} part favori`}${why ? `, ${nba ? "portés" : "porté"} surtout par ${why}` : ""}. ${nba ? `Les ${dog.short} devront` : `${dog.name} devra`} faire mieux que ${nba ? "leurs" : "ses"} moyennes de la saison pour inverser la tendance.`,
    `${what}: the most likely of the scenarios the model looks at. ${nba ? `The ${fav.short} are` : `${fav.name} is`} favored${why ? `, driven mostly by ${why}` : ""}. ${nba ? `The ${dog.short}` : dog.name} will need to beat ${nba ? "their" : "its"} season averages to flip it.`,
    `${what}: es el escenario más probable entre los que estudia el modelo. ${nba ? `Los ${fav.short} parten como favoritos` : `${fav.name} parte como favorito`}${why ? `, ${nba ? "impulsados" : "impulsado"} sobre todo por ${why}` : ""}. ${nba ? `Los ${dog.short} tendrán` : `${dog.name} tendrá`} que superar sus promedios de la temporada para darle la vuelta.`
  );
}

export default async function AnalysisResult({ a, league = "NBA", L, mode = "page", path = null, extras = null }) {
  const isNBA = league === "NBA";
  const g = a.game, h = a.home, aw = a.away;
  const leagueKey = isNBA ? "NBA" : "EL";
  const access = await analysisAccess(leagueKey, g.id);
  const open = access.state === "open";
  const target = {
    league: leagueKey,
    id: String(g.id),
    path: path || (g.hypothetical ? `/app?home=${g.home.id}&away=${g.away.id}` : isNBA ? `/app/match/${g.id}?d=${nbaDateOf(g.date)}` : `/app/euroleague/match/${g.id}`),
    info: { date: g.date, home: { short: g.home.short, abbr: g.home.abbr, logo: g.home.logo || null }, away: { short: g.away.short, abbr: g.away.abbr, logo: g.away.logo || null } },
  };

  // Forme : 5 derniers matchs (chronologiques), et bilans à domicile / à l'extérieur.
  // Sans l'analyse complète : chiffres réels de la fenêtre « Tu veux voir l'analyse complète ? ».
  const [form, proof] = await Promise.all([
    isNBA
      ? nbaRecentForm([h.team.id, aw.team.id], g.hypothetical || g.state === "pre" ? null : g.date)
      : { [h.team.id]: [...(h.cur?.form || [])].reverse(), [aw.team.id]: [...(aw.cur?.form || [])].reverse() },
    access.state === "visitor" || access.state === "limit" ? unlockProof() : null,
  ]);
  const matchInfo = { home: g.home.name, away: g.away.name, date: g.date || null, state: g.state || "pre", hypothetical: !!g.hypothetical };
  const fh = form[h.team.id] || [], fa = form[aw.team.id] || [];
  const splits = { home: h.cur?.home || null, away: aw.cur?.road || null };
  const vd = (l) => `${l.filter((x) => x.res === "W").length}-${l.filter((x) => x.res !== "W").length}`;
  const chips = (l) => l.map((x) => (x.res === "W" ? "✅" : "❌")).join("") + (g.state === "pre" ? "⏳" : "");

  // Starter : analyse réduite (probabilités exactes et stats clés), comme Visifoot. Pro et Lifetime : analyse complète
  // détaillée, actualités en temps réel et questions personnelles à l'IA (si l'IA est configurée).
  const reduced = open && access.tier === "starter";
  const full = open && !reduced;
  const aiOn = aiReady();
  const ask = full && aiOn && QUESTIONS[access.tier] ? { limit: access.tier === "lifetime" ? null : QUESTIONS[access.tier] } : null;
  const [narrative, qUsed] = await Promise.all([
    full ? aiNarrative(a, L) : null,
    ask && ask.limit != null ? memberSession().then((m) => (m ? questionUsage(m.uid) : 0)) : 0,
  ]);
  const conf = a.confidence;
  const confW = conf === "Élevée" ? 88 : conf === "Moyenne" ? 62 : 34;

  // Part de l'analyse visible sans l'analyse complète (nombre de rubriques).
  const lockedCount = 4 + (isNBA ? (g.hypothetical ? 1 : 4) + 2 : 4);
  const visiblePct = Math.round((4 / (4 + lockedCount)) * 20) * 5;

  const streak = (x) => (!x ? x : L.en ? x.replace(/^V/, "W").replace(/^D/, "L") : x.replace(/^W/, "V").replace(/^L/, "D"));
  const rows = [
    [L.t("Bilan", "Record", "Balance"), aw.cur ? `${aw.cur.wins}-${aw.cur.losses}` : g.away.record || "–", h.cur ? `${h.cur.wins}-${h.cur.losses}` : g.home.record || "–"],
    [L.t("Points marqués / match", "Points scored / game", "Puntos anotados / partido"), num(aw.ppg, L), num(h.ppg, L)],
    [L.t("Points encaissés / match", "Points allowed / game", "Puntos encajados / partido"), num(aw.oppg, L), num(h.oppg, L)],
    [L.t("Écart ajusté / match", "Adjusted margin / game", "Diferencia ajustada / partido"), sgn(aw.diff, L), sgn(h.diff, L)],
    [L.t("Série en cours", "Current streak", "Racha actual"), streak(aw.cur?.streak) || "–", streak(h.cur?.streak) || "–"],
    [L.t("10 derniers matchs", "Last 10 games", "Últimos 10 partidos"), aw.cur?.last10 || "–", h.cur?.last10 || "–"],
    [L.t("Saison passée", "Last season", "Temporada pasada"), aw.prev ? `${aw.prev.wins}-${aw.prev.losses} (${fmt(aw.prev.diff)})` : "–", h.prev ? `${h.prev.wins}-${h.prev.losses} (${fmt(h.prev.diff)})` : "–"],
    ...(g.hypothetical || !isNBA ? [] : [[L.t("A joué hier", "Played yesterday", "Jugó ayer"), aw.b2b ? L.t("Oui", "Yes", "Sí") : L.t("Non", "No", "No"), h.b2b ? L.t("Oui", "Yes", "Sí") : L.t("Non", "No", "No")]]),
  ];

  const when = g.date ? fmtDate(L, g.date, { weekday: "long", day: "numeric", month: "long", hour: L.en ? "numeric" : "2-digit", minute: "2-digit" }) : null;

  const probsBlock = (
        <div className="ar-sec">
          <h3>📈 {L.t("Probabilités exactes", "Exact probabilities", "Probabilidades exactas")}</h3>
          <div className="ar-box ar-probs">
            <div><span>{L.t("Victoire", "Win", "Victoria")} {g.away.short}</span><b>{pctL(a.pAway, L, 1)}</b></div>
            <div><span>{L.t("Victoire", "Win", "Victoria")} {g.home.short}</span><b>{pctL(a.pHome, L, 1)}</b></div>
            <div><span>{L.t("Score projeté", "Projected score", "Marcador proyectado")}</span><b>{g.away.abbr} {Math.round(a.awayPts)} - {Math.round(a.homePts)} {g.home.abbr}</b></div>
            <div><span>{L.t("Écart projeté", "Projected margin", "Diferencia proyectada")}</span><b>{num(Math.abs(a.margin), L)} pts</b></div>
            <div><span>{L.t("Total projeté", "Projected total", "Total proyectado")}</span><b>{Math.round(a.total)} pts</b></div>
            <div><span>{L.t("Match serré (écart ≤ 5)", "Close game (margin ≤ 5)", "Partido igualado (diferencia ≤ 5)")}</span><b>{pctL(a.scenarios.find((s) => s.key === "close")?.p || 0, L)}</b></div>
          </div>
        </div>
  );
  const ficheBlock = (title) => (
        <div className="card block">
          <h2>📋 {title}</h2>
          <table className="cmp">
            <thead><tr><th>{g.away.abbr}</th><th></th><th>{g.home.abbr}</th></tr></thead>
            <tbody>{rows.map(([l, x, y]) => <tr key={l}><td className="mono">{x}</td><td>{l}</td><td className="mono">{y}</td></tr>)}</tbody>
          </table>
        </div>
  );

  return (
    <section className="panel ar">
      {mode === "analyzer" && (
        <div className="ar-match">
          <div className="ar-mrow">
            <TeamLogo team={g.home} size={44} />
            <div className="ar-mnames">
              <small>{L.t("Match analysé", "Game analyzed", "Partido analizado")}</small>
              <b>{g.home.name} <em>vs</em> {g.away.name}</b>
            </div>
            <TeamLogo team={g.away} size={44} />
            <div className="ar-mready">
              <span>{L.t("Analyse prête", "Analysis ready", "Análisis listo")}</span>
              <small>{isNBA ? L.t("Basée sur les stats NBA et l'infirmerie", "Based on NBA stats and injury reports", "Basado en las estadísticas NBA y el parte médico") : L.t("Basée sur les stats de l'EuroLeague", "Based on EuroLeague stats", "Basado en las estadísticas de la Euroliga")}</small>
            </div>
          </div>
          <div className="ar-meta">
            <span>🏀 {isNBA ? "NBA" : L.t("EuroLeague", "EuroLeague", "Euroliga")}</span>
            <span>📅 {when || L.t("Match hypothétique (pas de rencontre prévue dans les 3 semaines)", "Hypothetical game (no meeting in the next 3 weeks)", "Partido hipotético (sin enfrentamiento en las próximas 3 semanas)")}</span>
            {g.venue && <span>📍 {g.venue}{g.city ? ` · ${g.city}` : ""}</span>}
          </div>
        </div>
      )}

      <div className="ar-card">
        <div className="ar-h"><h2>📊 {L.t("Forme récente", "Recent form", "Forma reciente")}</h2><small>{isNBA ? L.t("5 derniers matchs (saison en cours)", "Last 5 games (current season)", "Últimos 5 partidos (temporada en curso)") : L.t("5 derniers matchs d'EuroLeague", "Last 5 EuroLeague games", "Últimos 5 partidos de Euroliga")}</small></div>
        <FormToggle
          home={{ team: { name: g.home.name, logo: g.home.logo || null }, label: formLabel(fh, L) }}
          away={{ team: { name: g.away.name, logo: g.away.logo || null }, label: formLabel(fa, L) }}
          splits={splits}
        />
      </div>

      <div className="ar-teams">
        {[[g.home, fh], [g.away, fa]].map(([t, l]) => (
          <div className="ar-team" key={t.id}>
            <div className="ar-tname"><TeamLogo team={t} size={22} /> {t.name}</div>
            <div>{L.t("Forme", "Form", "Forma")} : <span className="ar-chips">{l.length ? chips(l) : "–"}</span></div>
            <div>{L.t("V-D", "W-L", "V-D")} : {l.length ? vd(l) : "–"}</div>
          </div>
        ))}
      </div>

      <div className="ar-sec">
        <h3>🔍 {L.t("Résumé rapide", "Quick summary", "Resumen rápido")}</h3>
        <p>{briefSummary(a, league, L)}</p>
        <small className="ar-note">{isNBA ? L.t("Généré par le modèle Basketlog à partir des résultats, des stats et de l'infirmerie.", "Generated by the Basketlog model from results, stats and injury reports.", "Generado por el modelo de Basketlog a partir de los resultados, las estadísticas y el parte médico.") : L.t("Généré par le modèle Basketlog à partir des résultats et des stats de l'EuroLeague.", "Generated by the Basketlog model from EuroLeague results and stats.", "Generado por el modelo de Basketlog a partir de los resultados y las estadísticas de la Euroliga.")}</small>
      </div>

      <div className="ar-sec">
        <h3>📌 {L.t("Scénario n° 1", "Scenario #1", "Escenario n.º 1")}</h3>
        <div className="ar-box"><p>{scenarioOne(a, league, L)}</p></div>
      </div>

      <div className="ar-sec">
        <h3>🎯 {L.t("Confiance du modèle", "Model confidence", "Confianza del modelo")}</h3>
        <div className="ar-box ar-conf">
          <div className="ar-cbar"><i style={{ width: `${confW}%` }} /></div>
          <b>{confText(conf, L)}</b>
          <small>{L.t("Niveau de confiance basé sur l'écart entre les deux équipes et le nombre de matchs déjà joués cette saison.", "Confidence level based on the gap between both teams and how many games have been played this season.", "Nivel de confianza basado en la diferencia entre los dos equipos y el número de partidos ya jugados esta temporada.")}</small>
        </div>
      </div>

      <Gate key={target.id} access={access} target={target} pct={visiblePct} proof={proof} match={matchInfo} mode={mode}>
        {reduced && <>
          {probsBlock}
          {ficheBlock(L.t("Stats clés des deux équipes", "Key stats for both teams", "Estadísticas clave de los dos equipos"))}
          <div className="gated locked ar-locked">
            <div className="gate-content" aria-hidden>
              <div className="card block ghost"><div className="gl w40" /><div className="gl" /><div className="gl" /><div className="gl w70" /></div>
              <div className="grid2">
                <div className="card block ghost"><div className="gl w60" /><div className="gl" /><div className="gl w40" /></div>
                <div className="card block ghost"><div className="gl w50" /><div className="gl" /><div className="gl w70" /></div>
              </div>
            </div>
            <div className="gate-overlay">
              <div className="gate-box">
                <h3>{L.t("Passe à l'analyse complète détaillée", "Get the detailed full analysis", "Pásate al análisis completo detallado")}</h3>
                <p>{L.t(
                  `Ton analyse Starter du jour montre les probabilités exactes et les stats clés. Avec Pro ou Lifetime : l'argumentation du modèle, tous les scénarios, les stats comparées, les joueurs à suivre, l'infirmerie, les actualités en temps réel${aiOn ? " et tes questions à l'IA" : ""}, sur tous les matchs et sans limite.`,
                  `Your Starter analysis shows exact probabilities and key stats. With Pro or Lifetime: the model's reasoning, every scenario, the stat comparison, players to watch, the injury report, real-time news${aiOn ? " and your questions to the AI" : ""}, on every game with no limit.`,
                  `Tu análisis Starter muestra las probabilidades exactas y las estadísticas clave. Con Pro o Lifetime: la argumentación del modelo, todos los escenarios, las estadísticas comparadas, los jugadores a seguir, el parte médico, las noticias en tiempo real${aiOn ? " y tus preguntas a la IA" : ""}, en todos los partidos y sin límite.`
                )}</p>
                <Link href={L.href("/pro")} className="btn-solid">🔓 {L.t("Passer Pro", "Go Pro", "Hazte Pro")}</Link>
              </div>
            </div>
          </div>
        </>}
        {full && <>
          {probsBlock}

          <div className="card block">
            <h2>🧠 {L.t("L'argumentation du modèle", "The model's reasoning", "La argumentación del modelo")} {narrative.source === "ai" ? <span className="tag hot">{L.t("IA", "AI", "IA")}</span> : <span className="tag">{L.t("Modèle", "Model", "Modelo")}</span>}</h2>
            <p className="narr">{narrative.text}</p>
            {narrative.keys.length > 0 && <ul className="keys">{narrative.keys.map((k, i) => <li key={i}>{k}</li>)}</ul>}
          </div>

          <div className="grid2">
            <div className="card block">
              <h2>⚖️ {L.t("Ce qui fait pencher la balance", "What tips the balance", "Lo que inclina la balanza")}</h2>
              <div className="team-rec" style={{ marginBottom: 6 }}>{L.t("En points, positif = avantage", "In points, positive = edge", "En puntos, positivo = ventaja")} {g.home.short}</div>
              {a.factors.map((f) => { const ft = factorText(f, a, L); return (
                <div className="factor" key={f.label}><div>{ft.label}<small>{ft.detail}</small></div><div className="v mono"><span className={f.value > 0.05 ? "pos" : f.value < -0.05 ? "neg" : ""}>{sgn(f.value, L)}</span></div></div>
              ); })}
              <div className="factor"><div><b>{L.t("Marge attendue", "Expected margin", "Margen esperado")}</b><small>{L.t("pour", "for", "para")} {g.home.short}</small></div><div className="v mono"><span className={a.margin > 0.05 ? "pos" : a.margin < -0.05 ? "neg" : ""}>{sgn(a.margin, L)}</span></div></div>
            </div>
            <div className="card block">
              <h2>🎲 {L.t("Tous les scénarios", "All scenarios", "Todos los escenarios")}</h2>
              <div className="scen">
                {a.scenarios.map((s) => (
                  <div className="scen-row" key={s.label}>
                    <div>{scenarioText(s, a, L)}<div className="scen-bar"><div style={{ width: `${Math.round(s.p * 100)}%` }} /></div></div>
                    <div className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{pctL(s.p, L)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {isNBA ? <MatchExtras a={a} L={L} /> : extras}

          {ficheBlock(L.t("Fiche des deux équipes", "Team comparison", "Ficha de los dos equipos"))}

          {isNBA && g.state !== "post" && (
            <div className="grid2">
              {[aw, h].map((s) => (
                <div className="card block" key={s.team.id}>
                  <h2><TeamLogo team={s.team} size={24} /> {L.t("Infirmerie", "Injury report", "Parte médico")} {s.team.short}</h2>
                  {s.inj.out.length + s.inj.doubtful.length === 0 ? (
                    <div className="team-rec">{L.t("Aucune absence signalée.", "No injuries reported.", "No hay bajas comunicadas.")}</div>
                  ) : (
                    <div className="inj">
                      {[...s.inj.out, ...s.inj.doubtful].map((i) => (
                        <div className="inj-row" key={i.player}>
                          <span>{i.player} <span className="team-rec">{i.pos}{i.ppg != null ? ` · ${num(i.ppg, L)} ${L.t("pts", "ppg", "pts")}` : ""}</span></span>
                          <span className={/out/i.test(i.status) ? "neg" : ""}>{injStatus(i.status, L)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isNBA && <NewsSection a={a} L={L} />}
          {ask && <AskAI target={{ league: leagueKey, id: String(g.id), d: g.date ? nbaDateOf(g.date) : null }} tier={access.tier} limit={ask.limit} used={qUsed} />}
        </>}
      </Gate>
    </section>
  );
}
