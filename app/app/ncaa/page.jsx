import Link from "next/link";
import { ncaaGames } from "../../../lib/ncaa";
import { ncaaGamePath, ncaaTeamPath } from "../../../lib/ncaa-model";
import { nbaToday, shiftDate } from "../../../lib/espn";
import AppTabs from "../../../components/AppTabs";
import QuickFaq from "../../../components/QuickFaq";
import CiteBox from "../../../components/CiteBox";
import LocalTime from "../../../components/LocalTime";
import JsonLd from "../../../components/JsonLd";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, numOf, pctOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches US énormes, de novembre à la March Madness : « college basketball predictions today », « ncaab picks »,
// « [équipe] vs [équipe] prediction ». Probabilité de chaque match de 1re division et classement du modèle.
const isoOf = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;
const nm = (t) => `${t.rank ? `#${t.rank} ` : ""}${t.short}`;

async function load() {
  const today = nbaToday();
  const [{ st, games }, next] = await Promise.all([ncaaGames(today), ncaaGames(shiftDate(today, 1)).catch(() => ({ games: [] }))]);
  return { today, st, games, tomorrow: next.games };
}

export async function generateMetadata() {
  const L = await getL();
  let n = 0;
  try { n = (await load()).games.length; } catch {}
  const d = fmtDate(L, isoOf(nbaToday()), L.en ? { weekday: "long", month: "long", day: "numeric" } : { weekday: "long", day: "numeric", month: "long" });
  return pageMeta({
    title: L.t(`Pronostics basket NCAA aujourd'hui (${d}) : ${n} matchs`, `College Basketball Predictions Today (${d}): ${n} games`, `Pronósticos baloncesto NCAA hoy (${d}): ${n} partidos`, `Palpites basquete NCAA hoje (${d}): ${n} jogos`),
    description: L.t(
      "Basket universitaire américain (NCAA, 1re division) : probabilité de victoire et écart prévu pour chaque match du jour, classement du modèle Basketlog et bilan public.",
      "Men's college basketball (NCAA Division I): win probability and projected margin for every game today, the Basketlog model's top 25 and a public track record.",
      "Baloncesto universitario de EE. UU. (NCAA, primera división): probabilidad de victoria y margen previsto de cada partido de hoy, el top 25 del modelo de Basketlog y balance público.",
      "Basquete universitário dos EUA (NCAA, primeira divisão): probabilidade de vitória e margem prevista de cada jogo de hoje, o top 25 do modelo do Basketlog e histórico público."
    ),
    path: "/app/ncaa",
    L,
  });
}

function GameRow({ g, L }) {
  const favHome = g.pHome >= 0.5;
  const fav = favHome ? g.home : g.away;
  const pf = Math.max(g.pHome, 1 - g.pHome);
  const done = g.state === "post" && g.hs != null;
  const ok = done ? (favHome === g.hs > g.as) : null;
  return (
    <tr>
      <td className="tm"><Link href={L.href(ncaaGamePath(g))}><span>{nm(g.away)} {g.n ? "vs" : "@"} {nm(g.home)}</span></Link>{g.note ? <small> · {g.note}</small> : null}</td>
      <td>{done ? `${g.as}-${g.hs}` : g.state === "in" ? L.t("En cours", "Live", "En juego", "Ao vivo") : <LocalTime iso={g.date} lang={L.lang} label={L.en} />}</td>
      <td className={done ? (ok ? "pos" : "neg") : "pos"}>{fav.abbr || fav.short} {pctOf(pf, L)}{done ? (ok ? " ✓" : " ✗") : ""}</td>
      <td>{numOf(Math.abs(g.margin), L, 1)}</td>
      <td>{g.tv || "–"}</td>
    </tr>
  );
}

function Games({ list, L }) {
  return (
    <div className="panel tbl-scroll">
      <table className="std-table">
        <thead><tr><th>{L.t("Match", "Game", "Partido", "Jogo")}</th><th>{L.t("Heure / score", "Time / score", "Hora / resultado", "Hora / placar")}</th><th>{L.t("Favori", "Favorite", "Favorito", "Favorito")}</th><th>{L.t("Écart prévu", "Proj. margin", "Margen previsto", "Margem prevista")}</th><th>TV</th></tr></thead>
        <tbody>{list.map((g) => <GameRow key={g.id} g={g} L={L} />)}</tbody>
      </table>
    </div>
  );
}

export default async function NcaaPage() {
  const L = await getL();
  let data = null;
  try { data = await load(); } catch {}
  const url = `${SITE}${L.href("/app/ncaa")}`;
  const title = L.t("Pronostics basket NCAA du jour", "College basketball predictions today", "Pronósticos de baloncesto NCAA de hoy", "Palpites de basquete NCAA de hoje");
  if (!data) {
    return (
      <main className="app-page wide"><AppTabs active="matchs" /><div className="app-head"><h1>{title}</h1><p>{L.t("Données momentanément indisponibles, réessaie dans quelques minutes.", "Data temporarily unavailable, try again in a few minutes.", "Datos no disponibles por ahora, vuelve a intentarlo en unos minutos.", "Dados indisponíveis no momento, tente de novo em alguns minutos.")}</p></div></main>
    );
  }
  const { st, games, tomorrow } = data;
  const ranked = games.filter((g) => g.home.rank || g.away.rank);
  const others = games.filter((g) => !g.home.rank && !g.away.rank);
  const top = st.d1.map((id) => ({ id, r: st.ratings[id], t: st.meta[id], rec: st.records[id] })).filter((x) => x.t && x.rec).sort((a, b) => b.r - a.r).slice(0, 25);
  const rec = st.record;
  const sure = games.filter((g) => g.state !== "post").sort((a, b) => Math.max(b.pHome, 1 - b.pHome) - Math.max(a.pHome, 1 - a.pHome))[0];
  const close = games.filter((g) => g.state !== "post").sort((a, b) => Math.abs(a.pHome - 0.5) - Math.abs(b.pHome - 0.5))[0];
  const tmrRanked = tomorrow.filter((g) => g.home.rank || g.away.rank);
  const faq = [
    rec.n > 0 && {
      q: L.t("Les pronostics NCAA de Basketlog sont-ils fiables ?", "How accurate are Basketlog's college basketball predictions?", "¿Son fiables los pronósticos NCAA de Basketlog?", "Os palpites NCAA do Basketlog são confiáveis?"),
      a: L.t(`Cette saison, le favori du modèle a gagné ${rec.ok} des ${rec.n} matchs entre équipes de 1re division (${pctOf(rec.ok / rec.n, L)}), chaque match étant prédit avec les seuls résultats connus avant.`, `This season the model's favorite has won ${rec.ok} of ${rec.n} Division I games (${pctOf(rec.ok / rec.n, L)}), each game predicted using only results known beforehand.`, `Esta temporada el favorito del modelo ganó ${rec.ok} de ${rec.n} partidos entre equipos de primera división (${pctOf(rec.ok / rec.n, L)}), cada uno pronosticado solo con los resultados previos.`, `Nesta temporada o favorito do modelo venceu ${rec.ok} de ${rec.n} jogos entre times da primeira divisão (${pctOf(rec.ok / rec.n, L)}), cada jogo previsto só com os resultados anteriores.`),
    },
    sure && {
      q: L.t("Quel est le favori le plus sûr aujourd'hui ?", "What is the safest pick today?", "¿Cuál es el favorito más claro de hoy?", "Qual é o favorito mais claro hoje?"),
      a: L.t(`${(sure.pHome >= 0.5 ? sure.home : sure.away).short}, à ${pctOf(Math.max(sure.pHome, 1 - sure.pHome), L)} contre ${(sure.pHome >= 0.5 ? sure.away : sure.home).short}.`, `${(sure.pHome >= 0.5 ? sure.home : sure.away).short}, at ${pctOf(Math.max(sure.pHome, 1 - sure.pHome), L)} against ${(sure.pHome >= 0.5 ? sure.away : sure.home).short}.`, `${(sure.pHome >= 0.5 ? sure.home : sure.away).short}, con un ${pctOf(Math.max(sure.pHome, 1 - sure.pHome), L)} ante ${(sure.pHome >= 0.5 ? sure.away : sure.home).short}.`, `${(sure.pHome >= 0.5 ? sure.home : sure.away).short}, com ${pctOf(Math.max(sure.pHome, 1 - sure.pHome), L)} contra ${(sure.pHome >= 0.5 ? sure.away : sure.home).short}.`),
    },
    close && {
      q: L.t("Quel est le match le plus serré ?", "What is the closest game today?", "¿Cuál es el partido más igualado?", "Qual é o jogo mais equilibrado?"),
      a: L.t(`${close.away.short} ${close.n ? "contre" : "chez"} ${close.home.short} : ${pctOf(close.pHome, L)} pour ${close.home.short}.`, `${close.away.short} ${close.n ? "vs." : "at"} ${close.home.short}: ${pctOf(close.pHome, L)} for ${close.home.short}.`, `${close.away.short} ${close.n ? "contra" : "en casa de"} ${close.home.short}: ${pctOf(close.pHome, L)} para ${close.home.short}.`, `${close.away.short} ${close.n ? "contra" : "na casa do"} ${close.home.short}: ${pctOf(close.pHome, L)} para ${close.home.short}.`),
    },
    {
      q: L.t("Comment le modèle calcule-t-il les probabilités ?", "How does the model compute the probabilities?", "¿Cómo calcula el modelo las probabilidades?", "Como o modelo calcula as probabilidades?"),
      a: L.t("Chaque équipe reçoit une note : son écart de points moyen, corrigé de la force de ses adversaires, en partant de sa note de la saison passée en début de saison. On ajoute 3 points à l'équipe qui reçoit (rien sur terrain neutre).", "Each team gets a rating: its average point margin adjusted for opponent strength, starting from last season's rating early on. The home team gets 3 extra points (none on a neutral court).", "Cada equipo recibe una nota: su diferencia media de puntos, corregida por la fuerza de sus rivales, partiendo de la nota de la temporada pasada al principio. El local suma 3 puntos (nada en campo neutral).", "Cada time recebe uma nota: seu saldo médio de pontos, corrigido pela força dos adversários, partindo da nota da temporada passada no início. O mandante ganha 3 pontos (nada em quadra neutra)."),
    },
  ];
  return (
    <main className="app-page wide">
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t(`Basket universitaire américain, 1re division : ${games.length} matchs aujourd'hui.`, `NCAA men's Division I: ${games.length} games today.`, `Baloncesto universitario de EE. UU., primera división: ${games.length} partidos hoy.`, `Basquete universitário dos EUA, primeira divisão: ${games.length} jogos hoje.`)}
          {rec.n > 0 ? " " + L.t(`Bilan de la saison : ${pctOf(rec.ok / rec.n, L)} de favoris gagnants sur ${rec.n} matchs.`, `Season record: the favorite won ${pctOf(rec.ok / rec.n, L)} of ${rec.n} games.`, `Balance de la temporada: ${pctOf(rec.ok / rec.n, L)} de favoritos ganadores en ${rec.n} partidos.`, `Desempenho da temporada: ${pctOf(rec.ok / rec.n, L)} de favoritos vencedores em ${rec.n} jogos.`) : ""}</p>
      </div>
      {ranked.length > 0 && <section><h2>{L.t("Matchs du Top 25", "Top 25 games", "Partidos del Top 25", "Jogos do Top 25")}</h2><Games list={ranked} L={L} /></section>}
      {others.length > 0 && <section><h2>{L.t("Tous les autres matchs", "All other games", "Todos los demás partidos", "Todos os outros jogos")}</h2><Games list={others} L={L} /></section>}
      {!games.length && <p className="narr">{L.t("Pas de match de 1re division aujourd'hui.", "No Division I games today.", "Sin partidos de primera división hoy.", "Nenhum jogo da primeira divisão hoje.")}</p>}
      {tmrRanked.length > 0 && <section><h2>{L.t("Demain : matchs du Top 25", "Tomorrow: Top 25 games", "Mañana: partidos del Top 25", "Amanhã: jogos do Top 25")}</h2><Games list={tmrRanked} L={L} /></section>}
      <section>
        <h2>{L.t("Top 25 du modèle Basketlog", "Basketlog model top 25", "Top 25 del modelo de Basketlog", "Top 25 do modelo do Basketlog")}</h2>
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("Bilan", "Record", "Balance", "Campanha")}</th><th>{L.t("Classement AP", "AP rank", "Ranking AP", "Ranking AP")}</th><th>{L.t("Note", "Rating", "Nota", "Nota")}</th></tr></thead>
            <tbody>{top.map((x, i) => <tr key={x.id}><td className="rk">{i + 1}</td><td className="tm"><Link href={L.href(ncaaTeamPath(x.t))}><span>{/* eslint-disable-next-line @next/next/no-img-element */}{x.t.logo ? <img src={x.t.logo} alt="" /> : null}{x.t.name}</span></Link></td><td>{x.rec.w}-{x.rec.l}</td><td>{x.t.rank ?? "–"}</td><td className="pos">{numOf(x.r, L, 1)}</td></tr>)}</tbody>
          </table>
        </div>
        <p className="note">{L.t("Note : écart de points attendu, corrigé de la force des adversaires. Classement AP : sondage des journalistes, repris par ESPN.", "Rating: expected point margin adjusted for opponent strength. AP rank: the media poll, via ESPN.", "Nota: diferencia de puntos esperada, corregida por la fuerza de los rivales. Ranking AP: encuesta de periodistas, vía ESPN.", "Nota: saldo de pontos esperado, corrigido pela força dos adversários. Ranking AP: pesquisa de jornalistas, via ESPN.")}</p>
      </section>
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du soir", "Tonight's NBA predictions", "Pronósticos NBA de hoy", "Palpites NBA de hoje")}</Link>{" · "}
        <Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague", "EuroLeague predictions", "Pronósticos Euroliga", "Palpites Euroliga")}</Link>{" · "}
        <Link href={L.href("/app/lexique/probabilite-de-victoire")}>{L.t("Lire une probabilité", "How to read a probability", "Cómo leer una probabilidad", "Como ler uma probabilidade")}</Link>
      </p>
      <CiteBox url={url} title={title} lang={L.lang} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: title, itemListElement: games.slice(0, 50).map((g, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "SportsEvent", name: `${g.away.name} ${g.n ? "vs" : "at"} ${g.home.name}`, startDate: g.date, sport: "Basketball", homeTeam: { "@type": "SportsTeam", name: g.home.name }, awayTeam: { "@type": "SportsTeam", name: g.away.name } } })) }} />
      <p className="disclaimer">{L.t("Données ESPN. Basketlog n'est pas affilié à la NCAA. Probabilités estimées, jamais une certitude.", "Data from ESPN. Basketlog is not affiliated with the NCAA. Probabilities are estimates, never certainties.", "Datos de ESPN. Basketlog no está afiliado a la NCAA. Probabilidades estimadas, nunca certezas.", "Dados da ESPN. O Basketlog não é afiliado à NCAA. Probabilidades estimadas, nunca certezas.")}</p>
    </main>
  );
}
