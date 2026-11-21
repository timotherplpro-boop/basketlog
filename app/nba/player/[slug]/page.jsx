import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayerStats, getInjuries, getTeamSchedule, nbaToday, nbaDateOf, seasonForDate } from "../../../../lib/espn";
import { upcomingAnalyses } from "../../../../lib/data";
import { teamById } from "../../../../lib/teams";
import { slugify, nbaPath, playerPath } from "../../../../lib/slug";
import { getL } from "../../../../lib/lang-server";
import { pageMeta, fitTitle } from "../../../../lib/seo";
import { fmtDate, fmtTime, numOf, pctOf } from "../../../../lib/i18n";
import AppTabs from "../../../../components/AppTabs";
import JsonLd from "../../../../components/JsonLd";
import Crumbs from "../../../../components/Crumbs";
import { SITE } from "../../../../lib/site";
import { injuryStatus } from "../../../../lib/injury-status";
import CiteBox from "../../../../components/CiteBox";

export const dynamic = "force-dynamic";

// Page joueur (/nba/player/lebron-james) : recherches « lebron james stats », « estadísticas de luka doncic »,
// « wembanyama stats ce soir ». Stats de la saison, statut médical du jour, prochain match de son équipe et sa probabilité.
const season = () => seasonForDate(nbaToday());
const seasonLabel = () => `${season() - 1}-${String(season()).slice(2)}`;

async function findPlayer(slug) {
  const [cur, prev] = await Promise.all([getPlayerStats(season()), getPlayerStats(season() - 1)]);
  const all = Object.values(cur || {}).filter((p) => slugify(p.name) === slug).sort((a, b) => (b.gp || 0) - (a.gp || 0));
  const p = all[0];
  if (!p) return null;
  return { p, prev: prev?.[p.id] || null, team: p.team ? teamById(p.team) : null, cur };
}

async function nextGame(team) {
  if (!team) return null;
  const [sched, up] = await Promise.all([getTeamSchedule(team.id).catch(() => []), upcomingAnalyses(7).catch(() => [])]);
  const g = sched.filter((x) => x.type !== "pre" && x.state !== "post" && !x.postponed).sort((x, y) => new Date(x.date) - new Date(y.date))[0];
  if (!g) return null;
  const home = g.home.id === team.id;
  const u = up.find((x) => x.id === g.id);
  return { g, home, opp: home ? g.away : g.home, p: u ? (home ? u.pHome : 1 - u.pHome) : null, path: nbaPath(g, nbaDateOf(g.date)) };
}

const n1 = (x, L) => (x == null ? "–" : numOf(x, L));

// Réponse directe à « X joue-t-il ce soir ? » (recherche très fréquente), en tête de page et dans la FAQ.
function playingAnswer(L, p, team, status, nx) {
  const st = status ? injuryStatus(status.status, L) : null;
  const out = st?.k === "out";
  if (!nx) return (st ? L.t(`Statut : ${st.t.toLowerCase()}. `, `Status: ${status.status}. `, `Estado: ${st.t.toLowerCase()}. `, `Status: ${st.t.toLowerCase()}. `) : "") + L.t("Pas de match prévu pour l'instant.", "No game scheduled right now.", "Sin partido previsto por ahora.", "Nenhum jogo previsto por enquanto.");
  const tonight = nbaDateOf(nx.g.date) === nbaToday();
  const opp = nx.opp.short, me = team.short;
  const vs = L.t(nx.home ? "contre" : "chez", nx.home ? "vs." : "at", nx.home ? "contra" : "en casa de", nx.home ? "contra o" : "na casa do");
  const time = `${fmtTime(L, nx.g.date)} ${L.tzLabel}`;
  if (tonight && out) return L.t(`Non : ${p.name} est annoncé absent pour le match des ${me} ce soir ${vs} les ${opp} (${time}).`, `No: ${p.name} is ruled out for tonight's ${me} game ${vs} the ${opp} (${time}).`, `No: ${p.name} es baja para el partido de hoy de los ${me} ${vs} los ${opp} (${time}).`, `Não: ${p.name} está fora do jogo de hoje do ${me} ${vs} ${opp} (${time}).`);
  if (tonight && st?.k === "prob") return L.t(`Oui, très probablement : ${p.name} est annoncé « probable » pour le match de ce soir ${vs} les ${opp} (${time}).`, `Very likely: ${p.name} is listed as probable for tonight's game ${vs} the ${opp} (${time}).`, `Sí, muy probablemente: ${p.name} figura como «probable» para el partido de hoy ${vs} los ${opp} (${time}).`, `Sim, muito provavelmente: ${p.name} aparece como "provável" para o jogo de hoje ${vs} ${opp} (${time}).`);
  if (tonight && st) return L.t(`Incertain : ${p.name} est annoncé « ${st.t.toLowerCase()} » pour le match de ce soir ${vs} les ${opp} (${time}). La décision tombe en général peu avant le coup d'envoi.`, `Uncertain: ${p.name} is listed as ${status.status} for tonight's game ${vs} the ${opp} (${time}). The final call usually comes shortly before tip-off.`, `En duda: ${p.name} figura como «${st.t.toLowerCase()}» para el partido de hoy ${vs} los ${opp} (${time}). La decisión suele llegar poco antes del inicio.`, `Em dúvida: ${p.name} aparece como "${st.t.toLowerCase()}" para o jogo de hoje ${vs} ${opp} (${time}). A decisão costuma sair pouco antes do início.`);
  if (tonight) return L.t(`Oui, a priori : les ${me} jouent ce soir ${vs} les ${opp} à ${time}, et ${p.name} ne figure pas sur le rapport des blessures.`, `Expected to, yes: the ${me} ${nx.home ? "host" : "visit"} the ${opp} tonight at ${time}, and ${p.name} is not on the injury report.`, `Sí, en principio: los ${me} juegan hoy ${vs} los ${opp} a las ${time}, y ${p.name} no figura en el parte de lesiones.`, `Sim, a princípio: o ${me} joga hoje ${vs} ${opp} às ${time}, e ${p.name} não está no boletim de lesões.`);
  const when = `${fmtDate(L, nx.g.date, { weekday: "long", day: "numeric", month: "long" })} · ${time}`;
  return L.t(`Non, les ${me} ne jouent pas ce soir. Prochain match : ${when}, ${vs} les ${opp}.`, `No, the ${me} don't play tonight. Next game: ${when}, ${vs} the ${opp}.`, `No, los ${me} no juegan hoy. Próximo partido: ${when}, ${vs} los ${opp}.`, `Não, o ${me} não joga hoje. Próximo jogo: ${when}, ${vs} ${opp}.`)
    + (out ? " " + L.t(`${p.name} est actuellement absent (blessure).`, `${p.name} is currently out (injury).`, `${p.name} está de baja actualmente.`, `${p.name} está fora no momento (lesão).`) : "");
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await findPlayer(slug).catch(() => null);
  if (!f) return { title: L.t("Joueur introuvable – Basketlog", "Player not found – Basketlog", "Jugador no encontrado – Basketlog", "Jogador não encontrado – Basketlog"), robots: { index: false } };
  const { p, team } = f;
  const s = seasonLabel();
  const line = `${n1(p.ppg, L)} pts, ${n1(p.reb, L)} reb, ${n1(p.ast, L)} ${L.t("pd", "ast", "ast", "ast")}`;
  return pageMeta({
    title: L.t(
      fitTitle(`${p.name} joue-t-il ce soir ? Blessure, stats ${s} et prochain match`, `${p.name} joue-t-il ce soir ? Statut et stats ${s}`, `${p.name} joue-t-il ce soir ? Stats ${s}`),
      fitTitle(`Is ${p.name} playing tonight? Injury status, ${s} stats`, `Is ${p.name} playing tonight? Status and stats`, `Is ${p.name} playing tonight?`),
      fitTitle(`¿Juega ${p.name} hoy? Lesión, estadísticas ${s} y próximo partido`, `¿Juega ${p.name} hoy? Estado y estadísticas ${s}`, `¿Juega ${p.name} hoy? Estadísticas ${s}`), fitTitle(`${p.name} joga hoje? Lesão, estatísticas ${s} e próximo jogo`, `${p.name} joga hoje? Status e estatísticas ${s}`, `${p.name} joga hoje? Estatísticas ${s}`)
    ),
    description: L.t(
      `${p.name} joue-t-il ce soir ? Statut médical du jour, prochain match${team ? ` des ${team.short}` : ""} et probabilité de victoire. Saison : ${line} en ${p.gp} matchs.`,
      `Is ${p.name} playing tonight? Today's injury status, the${team ? ` ${team.short}'` : ""} next game and win probability. Season: ${line} in ${p.gp} games.`,
      `${p.name}${team ? ` (${team.name})` : ""} esta temporada: ${line} en ${p.gp} partidos. Estado físico de hoy y próximo partido con la probabilidad de victoria de Basketlog.`, `${p.name}${team ? ` (${team.name})` : ""} nesta temporada: ${line} em ${p.gp} jogos. Condição física de hoje e próximo jogo com a probabilidade de vitória do Basketlog.`
    ),
    path: playerPath(p.name),
    L,
  });
}

export default async function PlayerPage({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await findPlayer(slug);
  if (!f) notFound();
  const { p, prev, team, cur } = f;
  const [inj, nx] = await Promise.all([getInjuries().catch(() => ({})), nextGame(team)]);
  const status = team ? (inj[String(team.id)] || []).find((i) => i.id === p.id || i.player === p.name) : null;
  const mates = team ? Object.values(cur).filter((x) => x.team === p.team && (x.gp || 0) >= 3).sort((a, b) => (b.ppg || 0) - (a.ppg || 0)) : [];
  const rankTeam = mates.findIndex((x) => x.id === p.id) + 1;
  const s = seasonLabel();
  const when = (g) => `${fmtDate(L, g.date, { weekday: "long", day: "numeric", month: "long" })} · ${fmtTime(L, g.date)} ${L.tzLabel}`;
  const answer = playingAnswer(L, p, team, status, nx);
  const stTxt = status ? L.t(`Statut du jour : ${/out/i.test(status.status) ? "absent" : "incertain"}${status.detail && L.en ? ` (${status.detail})` : ""}.`, `Today's status: ${status.status}${status.detail ? ` (${status.detail})` : ""}.`, `Estado de hoy: ${/out/i.test(status.status) ? "baja" : "en duda"}.`, `Status de hoje: ${/out/i.test(status.status) ? "fora" : "em dúvida"}.`) : L.t("Aucune blessure signalée aujourd'hui.", "No injury reported today.", "Sin lesión comunicada hoy.", "Nenhuma lesão informada hoje.");

  const faq = [
    {
      q: L.t(`Combien de points marque ${p.name} cette saison ?`, `How many points is ${p.name} averaging this season?`, `¿Cuántos puntos promedia ${p.name} esta temporada?`, `Quantos pontos ${p.name} tem de média nesta temporada?`),
      a: L.t(`${p.name} tourne à ${n1(p.ppg, L)} points, ${n1(p.reb, L)} rebonds et ${n1(p.ast, L)} passes décisives par match en ${p.gp} matchs (saison ${s})${rankTeam ? `, ${rankTeam === 1 ? "meilleur marqueur" : `${rankTeam}e marqueur`} des ${team.short}` : ""}.`,
        `${p.name} is averaging ${n1(p.ppg, L)} points, ${n1(p.reb, L)} rebounds and ${n1(p.ast, L)} assists per game over ${p.gp} games (${s} season)${rankTeam ? `, ${rankTeam === 1 ? "the top scorer" : `No. ${rankTeam} scorer`} on the ${team.short}` : ""}.`,
        `${p.name} promedia ${n1(p.ppg, L)} puntos, ${n1(p.reb, L)} rebotes y ${n1(p.ast, L)} asistencias por partido en ${p.gp} partidos (temporada ${s})${rankTeam ? `, ${rankTeam === 1 ? "máximo anotador" : `${rankTeam}.º anotador`} de los ${team.short}` : ""}.`, `${p.name} tem médias de ${n1(p.ppg, L)} pontos, ${n1(p.reb, L)} rebotes e ${n1(p.ast, L)} assistências por jogo em ${p.gp} jogos (temporada ${s})${rankTeam ? `, ${rankTeam === 1 ? "cestinha" : `${rankTeam}.º maior pontuador`} do ${team.short}` : ""}.`),
    },
    {
      q: L.t(`${p.name} joue-t-il ce soir ?`, `Is ${p.name} playing tonight?`, `¿Juega ${p.name} hoy?`, `${p.name} joga hoje?`),
      a: answer,
    },
  ];
  if (nx && nx.p != null) faq.push({
    q: L.t(`Les ${team.short} vont-ils gagner leur prochain match ?`, `Will the ${team.short} win their next game?`, `¿Ganarán los ${team.short} su próximo partido?`, `O ${team.short} vai vencer o próximo jogo?`),
    a: L.t(`Le modèle Basketlog donne ${pctOf(nx.p, L)} de chances de victoire aux ${team.short} face aux ${nx.opp.short}.`, `The Basketlog model gives the ${team.short} a ${pctOf(nx.p, L)} chance to win against the ${nx.opp.short}.`, `El modelo de Basketlog da a los ${team.short} un ${pctOf(nx.p, L)} de probabilidades de victoria ante los ${nx.opp.short}.`, `O modelo do Basketlog dá ao ${team.short} ${pctOf(nx.p, L)} de probabilidade de vitória contra o ${nx.opp.short}.`),
  });
  const url = `${SITE}${L.href(playerPath(p.name))}`;
  const ld = [
    { "@context": "https://schema.org", "@type": "Person", name: p.name, url, ...(p.head ? { image: p.head } : {}), ...(team ? { memberOf: { "@type": "SportsTeam", name: team.name } } : {}) },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })) },
  ];
  const kpis = [
    [L.t("Points", "Points", "Puntos", "Pontos"), n1(p.ppg, L)],
    [L.t("Rebonds", "Rebounds", "Rebotes", "Rebotes"), n1(p.reb, L)],
    [L.t("Passes", "Assists", "Asistencias", "Assistências"), n1(p.ast, L)],
    [L.t("Minutes", "Minutes", "Minutos", "Minutos"), n1(p.mpg, L)],
    [L.t("Matchs", "Games", "Partidos", "Jogos"), p.gp ?? "–"],
    [L.t("Saison passée", "Last season", "Temporada pasada", "Temporada passada"), prev?.ppg != null ? `${n1(prev.ppg, L)} pts` : "–"],
  ];

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], team ? [L.t(`Pronostic ${team.name}`, `${team.name} predictions`, `Pronóstico ${team.name}`, `Palpite ${team.name}`), `/app/equipe/${team.id}`] : [L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA"), "/app/classement"], [p.name, playerPath(p.name)]]} />
      <AppTabs active="classement" />
      <div className="app-head pl-head-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {p.head && <img className="pl-photo" src={p.head} alt={p.name} width="120" height="88" />}
        <div>
          <h1>{L.t(`${p.name} joue-t-il ce soir ? Stats ${s}`, `Is ${p.name} playing tonight? ${s} stats`, `¿Juega ${p.name} hoy? Estadísticas ${s}`, `${p.name} joga hoje? Estatísticas ${s}`)}</h1>
          <p>{p.pos}{p.jersey ? ` · #${p.jersey}` : ""}{team ? <> · <Link href={L.href(`/app/equipe/${team.id}`)}>{team.name}</Link></> : null}</p>
          <p className="pl-answer"><b>{answer}</b></p>
          {status && <p className="note">{stTxt}</p>}
        </div>
      </div>
      <div className="kpis">
        {kpis.map(([l, v]) => <div className="card kpi" key={l}><span>{l}</span><strong>{v}</strong></div>)}
      </div>
      {nx && (
        <Link href={L.href(nx.path)} className="card block next-game">
          <h2>{L.t("Prochain match", "Next game", "Próximo partido", "Próximo jogo")}</h2>
          <p><b>{nx.g.away.short} @ {nx.g.home.short}</b> · {when(nx.g)}{nx.p != null ? <> · <b>{team.short} {pctOf(nx.p, L)}</b></> : null} → {L.t("voir le pronostic", "see the prediction", "ver el pronóstico", "ver o palpite")}</p>
        </Link>
      )}
      <section className="card block match-faq">
        <h2>{L.t(`${p.name} : l'essentiel`, `${p.name}: quick answers`, `${p.name}: lo esencial`, `${p.name}: o essencial`)}</h2>
        {faq.map((x) => <div key={x.q} className="mfaq-item"><h3>{x.q}</h3><p>{x.a}</p></div>)}
      </section>
      {mates.length > 1 && (
        <section className="card block">
          <h2>{L.t(`Les autres joueurs des ${team.short}`, `Other ${team.short} players`, `Otros jugadores de los ${team.short}`, `Outros jogadores do ${team.short}`)}</h2>
          <ul className="wk-list">
            {mates.filter((x) => x.id !== p.id).slice(0, 8).map((x) => <li key={x.id}><Link href={L.href(playerPath(x.name))}>{x.name}</Link><span className="mono"> · {n1(x.ppg, L)} pts</span></li>)}
          </ul>
        </section>
      )}
      <p className="team-rec"><Link href={L.href("/app/leaders")}>{L.t("Meilleurs marqueurs NBA", "NBA scoring leaders", "Máximos anotadores NBA", "Cestinhas da NBA")}</Link>{" · "}<Link href={L.href("/app/leaders/rebounds")}>{L.t("Meilleurs rebondeurs", "Rebounding leaders", "Máximos reboteadores", "Líderes em rebotes")}</Link>{" · "}<Link href={L.href("/app/leaders/assists")}>{L.t("Meilleurs passeurs", "Assists leaders", "Máximos asistentes", "Líderes em assistências")}</Link></p>
      <CiteBox url={url} title={L.t(`${p.name} : stats et statut du jour`, `${p.name}: stats and today's status`, `${p.name}: estadísticas y estado de hoy`, `${p.name}: estatísticas e status de hoje`)} lang={L.lang} />
      <p className="disclaimer">{L.t("Statistiques de la saison régulière (source : ESPN), mises à jour chaque jour.", "Regular-season stats (source: ESPN), updated daily.", "Estadísticas de la temporada regular (fuente: ESPN), actualizadas cada día.", "Estatísticas da temporada regular (fonte: ESPN), atualizadas todo dia.")}</p>
    </main>
  );
}
