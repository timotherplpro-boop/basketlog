import Link from "next/link";
import { analyzeDay } from "../../../lib/data";
import { getInjuries, getPlayerStats, nbaToday, seasonForDate } from "../../../lib/espn";
import { TEAMS } from "../../../lib/teams";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { nbaPath, playerPath } from "../../../lib/slug";
import { fmtDate, fmtTime, numOf } from "../../../lib/i18n";

export const dynamic = "force-dynamic";

// Blessés NBA du jour (recherches « nba injury report today », « lesionados nba hoy », « blessés nba ce soir ») :
// absents et incertains de chaque équipe qui joue ce soir, avec le lien vers la fiche du match.
// Données publiques (rapport de blessures ESPN) ; l'effet chiffré des absences sur le pronostic reste dans l'analyse complète.
const todayLabel = (L) => {
  const t = nbaToday();
  return fmtDate(L, `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6)}T16:00:00Z`, L.en ? { month: "short", day: "numeric" } : { day: "numeric", month: "short" });
};

export async function generateMetadata() {
  const L = await getL();
  const d = todayLabel(L);
  return pageMeta({
    title: L.t(`Blessés NBA ce soir (${d}) : absents et incertains de chaque équipe`, `NBA injury report today (${d}): who's out tonight for every team`, `Lesionados NBA hoy (${d}): bajas y dudas de cada equipo`, `Lesionados NBA hoje (${d}): desfalques e dúvidas de cada time`),
    description: L.t(
      "Les blessés NBA du jour : joueurs absents et incertains de chaque équipe qui joue ce soir, avec leurs points par match et le pronostic de chaque match.",
      "Today's NBA injury report: players out and questionable for every team playing tonight, with their points per game and a win probability for every game.",
      "Los lesionados de la NBA hoy: jugadores de baja y en duda de cada equipo que juega hoy, con sus puntos por partido y el pronóstico de cada partido.", "Os lesionados da NBA hoje: jogadores fora e em dúvida de cada time que joga hoje, com seus pontos por jogo e o palpite de cada jogo."
    ),
    path: "/app/blessures",
    L,
  });
}

function statusOf(s, L) {
  const x = String(s || "").toLowerCase();
  if (/out/.test(x)) return { k: "out", t: L.t("Absent", "Out", "Baja", "Fora") };
  if (/doubt/.test(x)) return { k: "doubt", t: L.t("Très incertain", "Doubtful", "Duda seria", "Dúvida séria") };
  if (/question|day-to-day|game time/.test(x)) return { k: "q", t: L.t("Incertain", "Questionable", "En duda", "Em dúvida") };
  if (/probable/.test(x)) return { k: "prob", t: L.t("Probable", "Probable", "Probable", "Provável") };
  return { k: "other", t: s || "–" };
}

export default async function BlessuresPage() {
  const L = await getL();
  const today = nbaToday();
  const season = seasonForDate(today);
  const [inj, day, cur, prev] = await Promise.all([
    getInjuries().catch(() => ({})),
    analyzeDay(today).catch(() => ({ analyses: [] })),
    getPlayerStats(season).catch(() => null),
    getPlayerStats(season - 1).catch(() => null),
  ]);
  const ppgOf = (id) => {
    const c = id && cur?.[id], p = id && prev?.[id];
    if (c?.ppg != null && (c.gp || 0) >= 3) return c.ppg;
    return p?.ppg ?? c?.ppg ?? null;
  };
  const listOf = (teamId) =>
    (inj[String(teamId)] || [])
      .map((i) => ({ ...i, st: statusOf(i.status, L), ppg: ppgOf(i.id) }))
      .filter((i) => i.st.k !== "prob")
      .sort((a, b) => (a.st.k === "out" ? 0 : 1) - (b.st.k === "out" ? 0 : 1) || (b.ppg ?? -1) - (a.ppg ?? -1));

  const games = (day.analyses || []).filter((a) => a.game && !a.game.hypothetical && !a.game.postponed);
  const playing = new Set(games.flatMap((a) => [a.game.home.id, a.game.away.id]));
  const others = TEAMS.filter((t) => !playing.has(t.id)).map((t) => ({ t, list: listOf(t.id) })).filter((x) => x.list.length);

  // Questions-réponses : plus grosses absences du soir (joueurs à 10 pts ou plus).
  const tonightOut = games.flatMap((a) => [a.game.away, a.game.home].map((tm) => listOf(tm.id).filter((i) => i.st.k === "out" && i.ppg != null && i.ppg >= 10).map((i) => ({ ...i, team: tm }))).flat())
    .sort((a, b) => b.ppg - a.ppg).slice(0, 6);
  const pts = (x) => L.t(`${numOf(x, L)} pts`, `${numOf(x, L)} ppg`, `${numOf(x, L)} pts`, `${numOf(x, L)} pts`);
  const faq = [];
  if (games.length) {
    faq.push({
      q: L.t("Quels joueurs NBA sont absents ce soir ?", "Which NBA players are out tonight?", "¿Qué jugadores de la NBA están de baja hoy?", "Quais jogadores da NBA estão fora hoje?"),
      a: tonightOut.length
        ? L.t("Les absences les plus lourdes ce soir : ", "The biggest absences tonight: ", "Las bajas más importantes de hoy: ", "Os desfalques mais importantes de hoje: ") + tonightOut.map((i) => `${i.player} (${i.team.short}, ${pts(i.ppg)})`).join(", ") + "."
        : L.t("Aucun joueur à 10 points par match ou plus n'est déclaré absent ce soir pour l'instant.", "No player averaging 10+ points is listed as out tonight so far.", "Por ahora, ningún jugador con 10 puntos o más por partido figura como baja hoy.", "Por enquanto, nenhum jogador com 10 pontos ou mais por jogo aparece como desfalque hoje."),
    });
    faq.push({
      q: L.t("Les blessures changent-elles les pronostics ?", "Do injuries change the predictions?", "¿Las lesiones cambian los pronósticos?", "As lesões mudam os palpites?"),
      a: L.t("Oui. Le modèle Basketlog retire à chaque équipe la valeur de ses absents, pondérée par leurs points par match ; un joueur incertain compte en partie. Le pronostic de chaque match est recalculé quand le rapport de blessures change.",
        "Yes. The Basketlog model removes each team's missing players, weighted by their points per game; a questionable player counts partially. Each game's prediction updates when the injury report changes.",
        "Sí. El modelo de Basketlog descuenta a cada equipo el peso de sus bajas, ponderado por sus puntos por partido; un jugador en duda cuenta en parte. El pronóstico de cada partido se recalcula cuando cambia el parte de lesiones.", "Sim. O modelo do Basketlog desconta de cada time o peso dos seus desfalques, ponderado pelos pontos por jogo; um jogador em dúvida conta em parte. O palpite de cada jogo é recalculado quando o boletim de lesões muda."),
    });
  }
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;

  const Team = ({ tm }) => {
    const list = listOf(tm.id);
    return (
      <div className="inj-team">
        <h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {tm.logo && <img src={tm.logo} alt="" />}
          <Link href={L.href(`/app/equipe/${tm.id}`)}>{tm.name || tm.short}</Link>
        </h3>
        {list.length ? (
          <ul>
            {list.map((i, k) => (
              <li key={k}>
                <b>{i.ppg != null ? <Link href={L.href(playerPath(i.player))}>{i.player}</Link> : i.player}</b>{i.pos ? <span className="mono"> {i.pos}</span> : null}
                <span className={`inj-st inj-${i.st.k}`}>{i.st.t}</span>
                {i.ppg != null && <span className="mono"> · {pts(i.ppg)}</span>}
                {L.en && i.detail ? <small> · {i.detail}</small> : null}
              </li>
            ))}
          </ul>
        ) : <p className="note">{L.t("Aucun blessé signalé.", "No injuries reported.", "Sin bajas comunicadas.", "Nenhum desfalque informado.")}</p>}
      </div>
    );
  };

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"], [L.t("Blessés NBA", "NBA injury report", "Lesionados NBA", "Lesionados NBA"), "/app/blessures"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Blessés NBA ce soir (${todayLabel(L)})`, `NBA injury report today (${todayLabel(L)})`, `Lesionados NBA hoy (${todayLabel(L)})`, `Lesionados NBA hoje (${todayLabel(L)})`)}</h1>
        <p>{L.t("Absents et incertains de chaque équipe qui joue ce soir, mis à jour plusieurs fois par jour.", "Players out and questionable for every team playing tonight, updated several times a day.", "Bajas y dudas de cada equipo que juega hoy, actualizadas varias veces al día.", "Desfalques e dúvidas de cada time que joga hoje, atualizados várias vezes por dia.")}</p>
        <p className="note"><Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link></p>
      </div>

      {games.length === 0 && <section className="card block"><p>{L.t("Pas de match NBA aujourd'hui.", "No NBA games today.", "Hoy no hay partidos de la NBA.", "Hoje não há jogos da NBA.")}</p></section>}

      {games.map((a) => {
        const g = a.game;
        return (
          <section key={g.id} className="card block inj-game">
            <h2>
              <Link href={L.href(nbaPath(g, today))}>{L.t(`${g.away.short} – ${g.home.short}`, `${g.away.short} @ ${g.home.short}`, `${g.away.short} – ${g.home.short}`, `${g.away.short} x ${g.home.short}`)}</Link>
              <span className="mono"> · {fmtTime(L, g.date)} {L.tzLabel}</span>
            </h2>
            <div className="inj-grid">
              <Team tm={g.away} />
              <Team tm={g.home} />
            </div>
            <p className="mfaq-more"><Link href={L.href(nbaPath(g, today))}>{L.t("Voir le pronostic du match →", "See the game prediction →", "Ver el pronóstico del partido →", "Ver o palpite do jogo →")}</Link></p>
          </section>
        );
      })}

      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("Blessés NBA : l'essentiel", "NBA injuries: quick answers", "Lesionados NBA: lo esencial", "Lesionados NBA: o essencial")}</h2>
          {faq.map((f) => (
            <div key={f.q} className="mfaq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section className="card block">
          <h2>{L.t("Les autres équipes", "Other teams", "Los demás equipos", "Os outros times")}</h2>
          <div className="inj-grid">
            {others.map(({ t }) => <Team key={t.id} tm={t} />)}
          </div>
        </section>
      )}

      <p className="disclaimer">{L.t("Source : rapports de blessures officiels publiés par les équipes, repris par ESPN. Un statut peut changer jusqu'au coup d'envoi.", "Source: official team injury reports, via ESPN. A status can change until tip-off.", "Fuente: partes de lesiones oficiales de los equipos, vía ESPN. Un estado puede cambiar hasta el inicio del partido.", "Fonte: boletins de lesões oficiais dos times, via ESPN. Um status pode mudar até o início do jogo.")}</p>
    </main>
  );
}
