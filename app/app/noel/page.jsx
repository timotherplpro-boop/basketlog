import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import PrefSource from "../../../components/PrefSource";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, fmtTime } from "../../../lib/i18n";
import { analyzeDay } from "../../../lib/data";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { nbaPath } from "../../../lib/slug";
import { TEAMS } from "../../../lib/teams";
import { SITE } from "../../../lib/site";
import { probTxt } from "../../../lib/probtxt";

// « Matchs NBA de Noël », « NBA Christmas Day games », « NBA en Navidad », « NBA no Natal » : les matchs du 25 décembre
// avec l'heure locale, la chaîne américaine et la probabilité de victoire, mise à jour chaque jour jusqu'au coup d'envoi.
// Page créée plusieurs semaines avant pour laisser à Google le temps de la classer.
// Repli (si le calendrier ESPN ne renvoie rien) : affiches et horaires annoncés par la NBA pour 2026 (Fox Sports, ABC).
export const dynamic = "force-dynamic";

const xmasOf = () => `${seasonForDate(nbaToday()) - 1}1225`;
const yearOf = () => xmasOf().slice(0, 4);
const byShort = (s) => TEAMS.find((t) => t.short === s);
const FALLBACK_2026 = [
  ["Spurs", "Knicks", "2026-12-25T17:00:00Z"],
  ["Heat", "Celtics", "2026-12-25T19:30:00Z"],
  ["76ers", "Lakers", "2026-12-25T22:00:00Z"],
  ["Thunder", "Timberwolves", "2026-12-26T01:00:00Z"],
  ["Nuggets", "Warriors", "2026-12-26T03:30:00Z"],
];

async function loadGames() {
  const date = xmasOf();
  let rows = [];
  try {
    rows = (await analyzeDay(date)).analyses
      .filter((a) => !a.game.postponed)
      .sort((x, y) => new Date(x.game.date) - new Date(y.game.date))
      .map((a) => ({ game: a.game, pHome: a.pHome, pAway: a.pAway }));
  } catch {}
  if (!rows.length && date === "20261225") {
    rows = FALLBACK_2026.map(([a, h, d], i) => ({ game: { id: `x${i}`, date: d, away: byShort(a), home: byShort(h), broadcast: "ABC" }, pHome: null, pAway: null })).filter((r) => r.game.away && r.game.home);
  }
  return { date, rows };
}

export async function generateMetadata() {
  const L = await getL();
  const y = yearOf();
  return pageMeta({
    title: L.t(`Matchs NBA de Noël ${y} : programme, horaires et pronostics`, `NBA Christmas Day ${y} games: schedule, times and predictions`, `NBA en Navidad ${y}: partidos, horarios y pronósticos`, `Jogos da NBA no Natal ${y}: horários e palpites`),
    description: L.t(
      `Les 5 matchs NBA du 25 décembre ${y} : affiches, heure en France, chaîne et probabilité de victoire de chaque équipe selon le modèle Basketlog, mise à jour chaque jour.`,
      `All 5 NBA games on December 25, ${y}: matchups, tip-off times (ET), TV channel and each team's win probability from the Basketlog model, updated daily.`,
      `Los 5 partidos NBA del 25 de diciembre de ${y}: cruces, hora en España y México, canal y probabilidad de victoria de cada equipo según el modelo de Basketlog.`,
      `Os 5 jogos da NBA de 25 de dezembro de ${y}: confrontos, horário de Brasília, canal e chance de vitória de cada time segundo o modelo do Basketlog.`
    ),
    path: "/app/noel",
    L,
  });
}

export default async function ChristmasPage() {
  const L = await getL();
  const y = yearOf();
  const { date, rows } = await loadGames();
  const withP = rows.filter((r) => r.pHome != null);
  const when = (iso) => `${fmtDate(L, iso, { weekday: "short", day: "numeric", month: "short" }).replace(/\.$/, "")} · ${fmtTime(L, iso)}`;
  const favOf = (r) => (r.pHome >= 0.5 ? r.game.home : r.game.away);
  const pf = (r) => Math.max(r.pHome, r.pAway);
  const closest = [...withP].sort((a, b) => Math.abs(a.pHome - 0.5) - Math.abs(b.pHome - 0.5))[0];
  const biggest = [...withP].sort((a, b) => pf(b) - pf(a))[0];
  const list = rows.map((r) => `${r.game.away.short} – ${r.game.home.short}`).join(", ");
  const listEn = rows.map((r) => `${r.game.away.short} at ${r.game.home.short}`).join(", ");
  const first = rows[0]?.game, last = rows[rows.length - 1]?.game;
  const mx = (iso) => new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const faq = rows.length ? [
    {
      q: L.t(`Quels sont les matchs NBA de Noël ${y} ?`, `What NBA games are on Christmas Day ${y}?`, `¿Qué partidos NBA hay en Navidad ${y}?`, `Quais são os jogos da NBA no Natal de ${y}?`),
      a: L.t(`${rows.length} matchs le 25 décembre : ${list}.`, `${rows.length} games on December 25: ${listEn}.`, `${rows.length} partidos el 25 de diciembre: ${list}.`, `${rows.length} jogos em 25 de dezembro: ${list}.`),
    },
    {
      q: L.t("À quelle heure sont les matchs de Noël en France ?", "What time do the Christmas games start?", "¿A qué hora son los partidos de Navidad?", "Que horas começam os jogos de Natal?"),
      a: L.t(`Le premier (${first.away.short} – ${first.home.short}) commence le 25 décembre à ${fmtTime(L, first.date)}, le dernier (${last.away.short} – ${last.home.short}) dans la nuit, à ${fmtTime(L, last.date)}, heure de Paris.`,
        `The first game (${first.away.short} at ${first.home.short}) tips off at ${fmtTime(L, first.date)} ET and the last (${last.away.short} at ${last.home.short}) at ${fmtTime(L, last.date)} ET.`,
        `El primero (${first.away.short} – ${first.home.short}) empieza a las ${fmtTime(L, first.date)} hora de España (${mx(first.date)} en Ciudad de México) y el último (${last.away.short} – ${last.home.short}) a las ${fmtTime(L, last.date)} (${mx(last.date)} en México).`,
        `O primeiro (${first.away.short} x ${first.home.short}) começa às ${fmtTime(L, first.date)} e o último (${last.away.short} x ${last.home.short}) às ${fmtTime(L, last.date)}, horário de Brasília.`),
    },
    {
      q: L.t("Sur quelle chaîne voir les matchs de Noël ?", "What channel are the Christmas games on?", "¿Dónde ver los partidos de Navidad?", "Onde assistir aos jogos de Natal?"),
      a: L.t("Aux États-Unis, les 5 matchs passent sur ABC (et ESPN). Ailleurs, NBA League Pass diffuse tous les matchs ; les diffuseurs de chaque pays annoncent leurs matchs de Noël quelques semaines avant.", "All 5 games air nationally on ABC (simulcast on ESPN). NBA League Pass shows every game outside the US.", "En Estados Unidos, los 5 partidos van por ABC (y ESPN). En el resto del mundo, NBA League Pass emite todos los partidos; las cadenas de cada país anuncian sus partidos de Navidad unas semanas antes.", "Nos Estados Unidos, os 5 jogos passam na ABC (e na ESPN). No resto do mundo, o NBA League Pass transmite todos os jogos; as emissoras de cada país anunciam seus jogos de Natal algumas semanas antes."),
    },
    ...(closest && biggest ? [{
      q: L.t("Qui est favori pour les matchs de Noël ?", "Who is favored on Christmas Day?", "¿Quién es favorito en Navidad?", "Quem é favorito no Natal?"),
      a: L.t(`Aujourd'hui, le plus gros favori est ${favOf(biggest).short} (${probTxt(pf(biggest), L)}) ; le match le plus serré est ${closest.game.away.short} – ${closest.game.home.short} (${favOf(closest).short} ${probTxt(pf(closest), L)}). Les probabilités évoluent chaque jour jusqu'au 25 décembre.`,
        `Right now the biggest favorite is the ${favOf(biggest).short} (${probTxt(pf(biggest), L)}); the closest game is ${closest.game.away.short} at ${closest.game.home.short} (${favOf(closest).short} ${probTxt(pf(closest), L)}). The odds update every day until December 25.`,
        `Hoy, el mayor favorito es ${favOf(biggest).short} (${probTxt(pf(biggest), L)}); el partido más igualado es ${closest.game.away.short} – ${closest.game.home.short} (${favOf(closest).short} ${probTxt(pf(closest), L)}). Las probabilidades cambian cada día hasta el 25 de diciembre.`,
        `Hoje, o maior favorito é ${favOf(biggest).short} (${probTxt(pf(biggest), L)}); o jogo mais equilibrado é ${closest.game.away.short} x ${closest.game.home.short} (${favOf(closest).short} ${probTxt(pf(closest), L)}). As chances mudam todo dia até 25 de dezembro.`),
    }] : []),
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const events = rows.length ? rows.map((r) => ({
    "@context": "https://schema.org", "@type": "SportsEvent",
    name: `${r.game.away.name || r.game.away.short} at ${r.game.home.name || r.game.home.short}`,
    startDate: r.game.date, sport: "Basketball", eventStatus: "https://schema.org/EventScheduled",
    homeTeam: { "@type": "SportsTeam", name: r.game.home.name || r.game.home.short },
    awayTeam: { "@type": "SportsTeam", name: r.game.away.name || r.game.away.short },
    url: `${SITE}${L.href(nbaPath(r.game, date))}`,
  })) : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      {events && events.map((e, i) => <JsonLd key={i} data={e} />)}
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Programme NBA", "NBA schedule", "Horarios NBA", "Jogos da NBA"), "/app/programme"], [L.t(`Noël ${y}`, `Christmas Day ${y}`, `Navidad ${y}`, `Natal ${y}`), "/app/noel"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Matchs NBA de Noël ${y}`, `NBA Christmas Day ${y}`, `NBA en Navidad ${y}`, `Jogos da NBA no Natal ${y}`)}</h1>
        <p>{L.t(`Le 25 décembre ${y}, ${rows.length} matchs. Horaires à l'heure de Paris, probabilités du modèle Basketlog mises à jour chaque jour.`, `${rows.length} games on December 25, ${y}. Times are ET; Basketlog model win probabilities update daily.`, `${rows.length} partidos el 25 de diciembre de ${y}. Horarios de España; probabilidades del modelo de Basketlog actualizadas cada día.`, `${rows.length} jogos em 25 de dezembro de ${y}. Horário de Brasília; chances do modelo do Basketlog atualizadas todo dia.`)}</p>
      </div>
      {rows.length ? (
        <div className="card block tbl-scroll">
          <table className="std-table">
            <thead><tr><th>{L.t("Heure", "Time", "Hora", "Horário")}</th><th>{L.t("Match", "Game", "Partido", "Jogo")}</th><th>{L.t("Chaîne US", "TV", "TV EE. UU.", "TV EUA")}</th><th>{L.t("Favori", "Favorite", "Favorito", "Favorito")}</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.game.id}>
                  <td>{when(r.game.date)}</td>
                  <td className="tm">{r.pHome != null ? <Link href={L.href(nbaPath(r.game, date))}>{r.game.away.short} @ {r.game.home.short}</Link> : `${r.game.away.short} @ ${r.game.home.short}`}</td>
                  <td>{r.game.broadcast || "ABC"}</td>
                  <td className="pos">{r.pHome != null ? `${favOf(r).short} ${probTxt(pf(r), L)}` : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{L.t("Le programme de Noël n'est pas encore disponible.", "The Christmas schedule isn't available yet.", "El calendario de Navidad aún no está disponible.", "A programação de Natal ainda não está disponível.")}</p>
      )}
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`NBA à Noël ${y} : l'essentiel`, `NBA on Christmas ${y}: quick answers`, `NBA en Navidad ${y}: lo esencial`, `NBA no Natal ${y}: o essencial`)}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more"><Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link>{" · "}<Link href={L.href("/app/champion")}>{L.t("Favoris au titre →", "Title favorites →", "Favoritos al título →", "Favoritos ao título →")}</Link>{" · "}<Link href={L.href("/app/nba-cup")}>{L.t("NBA Cup →", "NBA Cup →", "NBA Cup →", "NBA Cup →")}</Link></p>
        </section>
      )}
      <p className="disclaimer">{L.t("Probabilités estimées par le modèle statistique Basketlog, jamais une certitude. Elles bougent chaque jour avec les résultats.", "Probabilities from the Basketlog statistical model, never a certainty. They move every day with results.", "Probabilidades estimadas por el modelo estadístico de Basketlog, nunca una certeza. Cambian cada día con los resultados.", "Probabilidades estimadas pelo modelo estatístico do Basketlog, nunca uma certeza. Mudam todo dia com os resultados.")}</p>
      <PrefSource L={L} />
    </main>
  );
}
