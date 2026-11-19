import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import Crumbs from "../../../components/Crumbs";
import PrefSource from "../../../components/PrefSource";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, fmtTime } from "../../../lib/i18n";
import { analyzeDay } from "../../../lib/data";
import { nbaToday } from "../../../lib/espn";
import { nbaPath } from "../../../lib/slug";
import { SITE } from "../../../lib/site";
import { probTxt } from "../../../lib/probtxt";

// « Programme NBA ce soir », « horario NBA hoy », « jogos da NBA hoje horário e onde assistir », « NBA games tonight
// TV schedule » : heures locales de chaque match et où le regarder dans chaque pays, avec un lien vers le pronostic.
// Diffuseurs 2026-27 (presse, oct.-nov. 2026) : France Prime Video ; Espagne DAZN (180 matchs) et Prime Video (87) ;
// Mexique Prime Video, ESPN et Disney+ ; Brésil Prime Video, ESPN et Disney+ ; partout NBA League Pass.
// Chaînes nationales américaines : donnée ESPN de chaque match.
export const dynamic = "force-dynamic";

const dayOf = (L) => fmtDate(L, `${nbaToday().replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}T16:00:00Z`, { day: "numeric", month: "short" }).replace(/\.$/, "");

export async function generateMetadata() {
  const L = await getL();
  const d = dayOf(L);
  return pageMeta({
    title: L.t(`Programme NBA ce soir (${d}) : horaires en heure française et où regarder`, `NBA games tonight (${d}): schedule, start times and TV channels`, `NBA hoy (${d}): horarios en España y dónde ver los partidos`, `Jogos da NBA hoje (${d}): horário de Brasília e onde assistir`),
    description: L.t(
      "Tous les matchs NBA de la nuit avec l'heure de début en France, la chaîne ou la plateforme pour les regarder (Prime Video, NBA League Pass) et le pronostic de chaque match.",
      "Every NBA game tonight with tip-off times (ET), national TV channels and streaming, plus a prediction for each game.",
      "Todos los partidos NBA de hoy con la hora de inicio en España y México, dónde verlos (DAZN, Prime Video, NBA League Pass) y el pronóstico de cada partido.",
      "Todos os jogos da NBA de hoje com o horário de Brasília, onde assistir (Prime Video, ESPN, Disney+, NBA League Pass) e o palpite de cada jogo."
    ),
    path: "/app/programme",
    L,
  });
}

// Où regarder, selon la langue de la page (pays principal de chaque version).
function watchInfo(L) {
  return L.t(
    { country: "en France", items: ["Prime Video : jusqu'à 86 matchs de saison régulière en 2026-27, inclus dans l'abonnement Prime, dont les NBA Games de Paris et Manchester (14 et 17 janvier 2027).", "NBA League Pass : tous les matchs en direct et en différé (abonnement séparé)."] },
    { country: "in the US", items: ["National TV: ESPN/ABC, NBC/Peacock and Prime Video, shown game by game below.", "Other games air on each team's local channel; NBA League Pass shows out-of-market games."] },
    { country: "en España y México", items: ["España: DAZN (180 partidos de temporada regular, playoffs y Finales), Prime Video (87 partidos, play-in y parte de los playoffs). Movistar Plus+ los ofrece a través de los canales DAZN Baloncesto.", "México: Prime Video, ESPN y Disney+.", "NBA League Pass: todos los partidos en directo y en diferido."] },
    { country: "no Brasil", items: ["Prime Video: pacote de jogos da temporada regular, da NBA Cup e dos playoffs.", "ESPN e Disney+: jogos selecionados da temporada regular e dos playoffs.", "NBA League Pass: todos os jogos ao vivo e sob demanda."] }
  );
}

export default async function ProgrammePage() {
  const L = await getL();
  const date = nbaToday();
  let analyses = [];
  try { analyses = (await analyzeDay(date)).analyses; } catch {}
  const games = analyses.map((a) => a).sort((x, y) => new Date(x.game.date) - new Date(y.game.date));
  const w = watchInfo(L);
  const d = dayOf(L);
  const mx = (iso) => new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  const first = games[0]?.game, last = games[games.length - 1]?.game;
  const national = games.filter((a) => a.game.broadcast);
  const faq = games.length ? [
    {
      q: L.t("À quelle heure sont les matchs NBA ce soir ?", "What time are the NBA games tonight?", "¿A qué hora son los partidos de la NBA hoy?", "Que horas são os jogos da NBA hoje?"),
      a: L.t(`${games.length} match${games.length > 1 ? "s" : ""} : le premier (${first.away.short} – ${first.home.short}) commence à ${fmtTime(L, first.date)}, le dernier (${last.away.short} – ${last.home.short}) à ${fmtTime(L, last.date)}, heure de Paris.`,
        `${games.length} game${games.length > 1 ? "s" : ""}: the first (${first.away.short} vs ${first.home.short}) tips off at ${fmtTime(L, first.date)} ET and the last (${last.away.short} vs ${last.home.short}) at ${fmtTime(L, last.date)} ET.`,
        `${games.length} partido${games.length > 1 ? "s" : ""}: el primero (${first.away.short} – ${first.home.short}) empieza a las ${fmtTime(L, first.date)} hora de España (${mx(first.date)} en Ciudad de México) y el último (${last.away.short} – ${last.home.short}) a las ${fmtTime(L, last.date)} (${mx(last.date)} en México).`,
        `${games.length} jogo${games.length > 1 ? "s" : ""}: o primeiro (${first.away.short} x ${first.home.short}) começa às ${fmtTime(L, first.date)} e o último (${last.away.short} x ${last.home.short}) às ${fmtTime(L, last.date)}, horário de Brasília.`),
    },
    {
      q: L.t("Où regarder la NBA en France ?", "Where can I watch the NBA in the US?", "¿Dónde ver la NBA en España?", "Onde assistir à NBA no Brasil?"),
      a: w.items.join(" "),
    },
    {
      q: L.t("Quel est le match le plus serré de la nuit ?", "What's the closest game tonight?", "¿Cuál es el partido más igualado de hoy?", "Qual é o jogo mais equilibrado de hoje?"),
      a: (() => {
        const c = [...games].sort((x, y) => Math.abs(x.pHome - 0.5) - Math.abs(y.pHome - 0.5))[0];
        const f = c.pHome >= 0.5 ? c.game.home : c.game.away, pf = Math.max(c.pHome, c.pAway);
        return L.t(`${c.game.away.short} – ${c.game.home.short} : les ${f.short} sont favoris à ${probTxt(pf, L)} selon le modèle Basketlog.`, `${c.game.away.short} vs ${c.game.home.short}: the ${f.short} are ${probTxt(pf, L)} favorites according to the Basketlog model.`, `${c.game.away.short} – ${c.game.home.short}: los ${f.short} son favoritos al ${probTxt(pf, L)} según el modelo de Basketlog.`, `${c.game.away.short} x ${c.game.home.short}: o ${f.short} é favorito com ${probTxt(pf, L)} segundo o modelo do Basketlog.`);
      })(),
    },
  ] : [];
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const events = games.length ? {
    "@context": "https://schema.org", "@type": "ItemList",
    itemListElement: games.map((a, i) => ({
      "@type": "ListItem", position: i + 1,
      item: { "@type": "SportsEvent", name: `${a.game.away.name} vs ${a.game.home.name}`, startDate: a.game.date, url: `${SITE}${L.href(nbaPath(a.game, date))}`, ...(a.game.venue ? { location: { "@type": "Place", name: a.game.venue } } : {}), homeTeam: { "@type": "SportsTeam", name: a.game.home.name }, awayTeam: { "@type": "SportsTeam", name: a.game.away.name } },
    })),
  } : null;
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <JsonLd data={events} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"], [L.t("Programme NBA", "NBA schedule", "Horarios NBA", "Programação NBA"), "/app/programme"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Programme NBA ce soir (${d}) : horaires et où regarder`, `NBA games tonight (${d}): times and where to watch`, `NBA hoy (${d}): horarios y dónde ver los partidos`, `Jogos da NBA hoje (${d}): horários e onde assistir`)}</h1>
        <p>{L.t("Heure de début en France, chaîne ou plateforme, et pronostic de chaque match.", "Tip-off times (ET), national TV and a prediction for every game.", "Hora de inicio en España y en México, dónde verlos y el pronóstico de cada partido.", "Horário de Brasília, onde assistir e o palpite de cada jogo.")}</p>
      </div>
      {games.length ? (
        <div className="card block">
          <table className="std-table">
            <thead><tr>
              <th>{L.t("Heure", "Time (ET)", "Hora", "Horário")}</th>
              <th>{L.t("Match", "Game", "Partido", "Jogo")}</th>
              <th>{L.t("Favori", "Favorite", "Favorito", "Favorito")}</th>
            </tr></thead>
            <tbody>
              {games.map((a) => {
                const g = a.game;
                const f = a.pHome >= 0.5 ? g.home : g.away, pf = Math.max(a.pHome, a.pAway);
                return (
                  <tr key={g.id}>
                    <td>{fmtTime(L, g.date)}{L.es ? <small className="team-rec"><br />{L.t("", "", `México ${mx(g.date)}`, "")}</small> : null}</td>
                    <td className="tm">
                      <Link href={L.href(nbaPath(g, date))}>{g.away.short} {L.en ? "at" : "–"} {g.home.short}</Link>
                      {L.en && g.broadcast ? <small className="team-rec"><br />{g.broadcast}</small> : null}
                    </td>
                    <td>{f.short} {probTxt(pf, L)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">{L.t("Pas de match NBA aujourd'hui.", "No NBA games today.", "Hoy no hay partidos de la NBA.", "Hoje não há jogos da NBA.")}</p>
      )}
      <section className="card block">
        <h2>{L.t(`Où regarder la NBA ${w.country}`, `Where to watch the NBA ${w.country}`, `Dónde ver la NBA ${w.country}`, `Onde assistir à NBA ${w.country}`)}</h2>
        <ul>{w.items.map((x) => <li key={x}>{x}</li>)}</ul>
        {L.en && national.length > 0 && <p className="team-rec">{L.t("", `National TV tonight: ${national.map((a) => `${a.game.away.short} at ${a.game.home.short} (${a.game.broadcast})`).join(", ")}.`, "", "")}</p>}
        <p className="note">{L.t("Diffusion vérifiée en début de saison 2026-27 ; un match peut changer de chaîne.", "Broadcast info checked at the start of the 2026-27 season; a game can move to another channel.", "Información de emisión comprobada a principio de la temporada 2026-27; un partido puede cambiar de canal.", "Informação de transmissão verificada no início da temporada 2026-27; um jogo pode mudar de canal.")}</p>
      </section>
      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t("NBA ce soir : l'essentiel", "NBA tonight: quick answers", "NBA hoy: lo esencial", "NBA hoje: o essencial")}</h2>
          {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
          <p className="mfaq-more">
            <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir →", "NBA predictions tonight →", "Pronósticos NBA de hoy →", "Palpites NBA de hoje →")}</Link>{" · "}
            <Link href={L.href("/app/blessures")}>{L.t("Blessés NBA →", "NBA injury report →", "Lesionados NBA →", "Lesionados NBA →")}</Link>{" · "}
            <Link href={L.href("/app/demain")}>{L.t("Matchs de demain →", "Tomorrow's games →", "Partidos de mañana →", "Jogos de amanhã →")}</Link>
          </p>
        </section>
      )}
      <PrefSource L={L} />
    </main>
  );
}
