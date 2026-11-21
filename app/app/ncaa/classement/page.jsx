import Link from "next/link";
import { ncaaStateOf, ncaaLg } from "../../../../lib/ncaa";
import { ncaaTeamPath, phi, NCAA, LEAGUES, ncaaWords } from "../../../../lib/ncaa-model";
import { nbaToday, seasonForDate } from "../../../../lib/espn";
import AppTabs from "../../../../components/AppTabs";
import Crumbs from "../../../../components/Crumbs";
import QuickFaq from "../../../../components/QuickFaq";
import CiteBox from "../../../../components/CiteBox";
import JsonLd from "../../../../components/JsonLd";
import { pageMeta, fitTitle } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { fmtDate, numOf, pctOf } from "../../../../lib/i18n";
import { SITE } from "../../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches US « college basketball power rankings », « ncaa basketball rankings », « kenpom alternative » : les 365 équipes
// de 1re division classées par la note du modèle, avec la difficulté du calendrier déjà joué.
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };
const dayOf = (L) => fmtDate(L, new Date().toISOString(), L.en ? { month: "long", day: "numeric" } : { day: "numeric", month: "long" });

function rows(st) {
  const d1 = new Set(st.d1);
  const sos = {};
  for (const g of st.games) for (const [me, op] of [[g.h, g.a], [g.a, g.h]]) {
    if (!d1.has(me)) continue;
    const x = (sos[me] ||= { n: 0, s: 0 });
    x.n++; x.s += d1.has(op) ? st.ratings[op] : NCAA.NON_D1;
  }
  return st.d1
    .map((id) => ({ id, t: st.meta[id], r: st.ratings[id], rec: st.records[id] || { w: 0, l: 0 }, sos: sos[id]?.n ? sos[id].s / sos[id].n : null }))
    .filter((x) => x.t)
    .sort((a, b) => b.r - a.r);
}

export async function generateMetadata() {
  const L = await getL();
  const lg = await ncaaLg();
  const W = ncaaWords(L, lg), fem = lg === "w";
  const s = seasonLabel(), d = dayOf(L);
  let n = 365;
  try { n = rows(await ncaaStateOf(lg)).length; } catch {}
  return pageMeta({
    title: L.t(
      fitTitle(`Classement ${W.low} ${s} : les ${n} équipes au ${d}`, `Classement ${W.low} ${s} : les ${n} équipes`),
      fitTitle(`${W.name} power rankings ${s}: all ${n} teams (${d})`, `${W.name} power rankings ${s}: all ${n} teams`),
      fitTitle(`Ranking de ${W.low} ${s}: los ${n} equipos (${d})`, `Ranking de ${W.low} ${s}: los ${n} equipos`),
      fitTitle(`Ranking de ${W.low} ${s}: os ${n} times (${d})`, `Ranking de ${W.low} ${s}: os ${n} times`)
    ),
    description: L.t(
      `Les ${n} équipes de 1re division du basket universitaire ${fem ? "féminin " : ""}américain classées par le modèle Basketlog : note corrigée de la force des adversaires, bilan, classement AP et difficulté du calendrier. Mis à jour chaque jour.`,
      `All ${n} Division I ${fem ? "women's" : "men's"} college basketball teams ranked by the Basketlog model: opponent-adjusted rating, record, AP rank and strength of schedule. Updated daily.`,
      `Los ${n} equipos de primera división del baloncesto universitario${fem ? " femenino" : ""} ordenados por el modelo de Basketlog: nota corregida por la fuerza de los rivales, balance, ranking AP y dificultad del calendario. Actualizado cada día.`,
      `Os ${n} times da primeira divisão do basquete universitário${fem ? " feminino" : ""} ordenados pelo modelo do Basketlog: nota corrigida pela força dos adversários, campanha, ranking AP e dificuldade do calendário. Atualizado todo dia.`
    ),
    path: `${LEAGUES[lg].hub}/classement`,
    L,
  });
}

export default async function NcaaRankingsPage() {
  const L = await getL();
  const lg = await ncaaLg();
  const C = LEAGUES[lg], W = ncaaWords(L, lg), SD = C.P.SD, fem = lg === "w";
  let list = [], st = null;
  try { st = await ncaaStateOf(lg); list = rows(st); } catch {}
  const s = seasonLabel();
  const sg = (x) => (x == null ? "–" : `${x > 0 ? "+" : ""}${numOf(x, L, 1)}`);
  const title = L.t(`Classement ${W.low} ${s}`, `${W.name} power rankings ${s}`, `Ranking de ${W.low} ${s}`, `Ranking de ${W.low} ${s}`);
  const top = list[0];
  const hardest = [...list].filter((x) => x.sos != null && x.rec.w + x.rec.l >= 3).sort((a, b) => b.sos - a.sos)[0];
  const faq = [
    top && {
      q: L.t("Quelle est la meilleure équipe de basket universitaire en ce moment ?", "Who is the best college basketball team right now?", "¿Cuál es el mejor equipo de baloncesto universitario ahora?", "Qual é o melhor time do basquete universitário agora?"),
      a: L.t(`${top.t.name}, ${top.rec.w}-${top.rec.l}, avec une note de ${sg(top.r)} : le modèle la donne gagnante face à une équipe moyenne de 1re division avec ${pctOf(phi(top.r / SD), L)} de chances.`, `${top.t.name}, ${top.rec.w}-${top.rec.l}, with a rating of ${sg(top.r)}: the model gives it a ${pctOf(phi(top.r / SD), L)} chance to beat an average Division I team.`, `${top.t.name}, ${top.rec.w}-${top.rec.l}, con una nota de ${sg(top.r)}: el modelo le da un ${pctOf(phi(top.r / SD), L)} de ganar a un equipo medio de primera división.`, `${top.t.name}, ${top.rec.w}-${top.rec.l}, com nota ${sg(top.r)}: o modelo dá ${pctOf(phi(top.r / SD), L)} de chance contra um time médio da primeira divisão.`),
    },
    {
      q: L.t("Que veut dire la note ?", "What does the rating mean?", "¿Qué significa la nota?", "O que significa a nota?"),
      a: L.t("C'est l'écart de points attendu face à une équipe moyenne de 1re division sur terrain neutre, corrigé de la force des adversaires déjà affrontés. En début de saison, elle part de la note de la saison passée, qui s'efface au fil des matchs.", "It is the expected point margin against an average Division I team on a neutral court, adjusted for the strength of opponents faced. Early in the season it starts from last season's rating, which fades as games are played.", "Es la diferencia de puntos esperada ante un equipo medio de primera división en campo neutral, corregida por la fuerza de los rivales. Al principio de la temporada parte de la nota de la temporada pasada, que se diluye con los partidos.", "É o saldo de pontos esperado contra um time médio da primeira divisão em quadra neutra, corrigido pela força dos adversários. No início da temporada parte da nota da temporada passada, que se dilui com os jogos."),
    },
    hardest && {
      q: L.t("Quelle équipe a affronté le calendrier le plus dur ?", "Which team has played the toughest schedule?", "¿Qué equipo ha tenido el calendario más difícil?", "Qual time teve o calendário mais difícil?"),
      a: L.t(`${hardest.t.name} : ses adversaires valent en moyenne ${sg(hardest.sos)} points.`, `${hardest.t.name}: its opponents average ${sg(hardest.sos)} points.`, `${hardest.t.name}: sus rivales valen de media ${sg(hardest.sos)} puntos.`, `${hardest.t.name}: seus adversários valem em média ${sg(hardest.sos)} pontos.`),
    },
  ];
  const url = `${SITE}${L.href(`${C.hub}/classement`)}`;
  return (
    <main className="app-page wide">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [W.name, C.hub], [L.t("Classement", "Rankings", "Ranking", "Ranking"), `${C.hub}/classement`]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t(`Les ${list.length} équipes de 1re division classées par le modèle Basketlog, au ${dayOf(L)}.`, `All ${list.length} Division I teams ranked by the Basketlog model, as of ${dayOf(L)}.`, `Los ${list.length} equipos de primera división según el modelo de Basketlog, al ${dayOf(L)}.`, `Os ${list.length} times da primeira divisão segundo o modelo do Basketlog, em ${dayOf(L)}.`)}
          {st?.record?.n ? " " + L.t(`Bilan des pronostics : ${pctOf(st.record.ok / st.record.n, L)} sur ${st.record.n} matchs.`, `Prediction record: ${pctOf(st.record.ok / st.record.n, L)} over ${st.record.n} games.`, `Balance de pronósticos: ${pctOf(st.record.ok / st.record.n, L)} en ${st.record.n} partidos.`, `Desempenho dos palpites: ${pctOf(st.record.ok / st.record.n, L)} em ${st.record.n} jogos.`) : ""}</p>
      </div>
      {list.length ? (
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr><th>#</th><th>{L.t("Équipe", "Team", "Equipo", "Time")}</th><th>{L.t("Bilan", "Record", "Balance", "Campanha")}</th><th>AP</th><th>{L.t("Note", "Rating", "Nota", "Nota")}</th><th>{L.t("vs équipe moyenne", "vs average team", "vs equipo medio", "vs time médio")}</th><th>{L.t("Calendrier joué", "Schedule played", "Calendario jugado", "Calendário jogado")}</th></tr></thead>
            <tbody>
              {list.map((x, i) => (
                <tr key={x.id}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm"><Link href={L.href(ncaaTeamPath(x.t, C.base))}><span>{x.t.name}</span></Link></td>
                  <td>{x.rec.w}-{x.rec.l}</td>
                  <td>{x.t.rank ?? "–"}</td>
                  <td className={x.r > 0 ? "pos" : "neg"}>{sg(x.r)}</td>
                  <td>{pctOf(phi(x.r / SD), L)}</td>
                  <td>{sg(x.sos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="narr">{L.t("Classement momentanément indisponible, réessaie dans quelques minutes.", "Rankings temporarily unavailable, try again in a few minutes.", "Ranking no disponible por ahora, vuelve a intentarlo en unos minutos.", "Ranking indisponível no momento, tente de novo em alguns minutos.")}</p>}
      <QuickFaq L={L} items={faq} />
      <p className="team-rec"><Link href={L.href(C.hub)}>{fem ? L.t("Matchs NCAA féminins du jour", "Today's women's college basketball games", "Partidos NCAA femeninos de hoy", "Jogos NCAA femininos de hoje") : L.t("Matchs NCAA du jour", "Today's college basketball games", "Partidos NCAA de hoy", "Jogos NCAA de hoje")}</Link>{" · "}<Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA")}</Link></p>
      <CiteBox url={url} title={title} lang={L.lang} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: title, itemListElement: list.slice(0, 50).map((x, i) => ({ "@type": "ListItem", position: i + 1, name: x.t.name, url: `${SITE}${L.href(ncaaTeamPath(x.t, C.base))}` })) }} />
      <p className="disclaimer">{L.t("Données ESPN. Classement indépendant, sans lien avec la NCAA.", "Data from ESPN. Independent ranking, not affiliated with the NCAA.", "Datos de ESPN. Ranking independiente, sin relación con la NCAA.", "Dados da ESPN. Ranking independente, sem relação com a NCAA.")}</p>
    </main>
  );
}
