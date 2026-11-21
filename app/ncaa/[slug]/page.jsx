import Link from "next/link";
import { notFound } from "next/navigation";
import { ncaaGameBySlug } from "../../../lib/ncaa";
import { ncaaGamePath, ncaaTeamPath } from "../../../lib/ncaa-model";
import AppTabs from "../../../components/AppTabs";
import Crumbs from "../../../components/Crumbs";
import QuickFaq from "../../../components/QuickFaq";
import JsonLd from "../../../components/JsonLd";
import LocalTime from "../../../components/LocalTime";
import { pageMeta, fitTitle } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, numOf, pctOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Fiche d'un match NCAA (1re division) : /ncaa/michigan-state-vs-duke-2026-11-21. Recherches US « [école] vs [école] prediction ».
const isoOf = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;
const nm = (t) => t.loc || t.short || t.name;
const rk = (t) => (t.rank ? `#${t.rank} ` : "");

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await ncaaGameBySlug(slug).catch(() => null);
  if (!f) return { title: L.t("Match NCAA – Basketlog", "College basketball game – Basketlog", "Partido NCAA – Basketlog", "Jogo NCAA – Basketlog"), robots: { index: false } };
  const { g } = f;
  const d = fmtDate(L, isoOf(g.d), L.en ? { month: "short", day: "numeric" } : { day: "numeric", month: "short" }).replace(/\.$/, "");
  const fav = g.pHome >= 0.5 ? g.home : g.away, pf = pctOf(Math.max(g.pHome, 1 - g.pHome), L);
  const done = g.state === "post" && g.hs != null;
  const a = nm(g.away), h = nm(g.home);
  return pageMeta({
    title: done ? L.t(
      fitTitle(`${a} – ${h} (${d}) : score final ${g.as}-${g.hs} et pronostic`, `${a} – ${h} : score final et pronostic`),
      fitTitle(`${a} vs ${h} (${d}): final score ${g.as}-${g.hs} and pregame prediction`, `${a} vs ${h}: final score and prediction`),
      fitTitle(`${a} vs ${h} (${d}): resultado final ${g.as}-${g.hs} y pronóstico`, `${a} vs ${h}: resultado y pronóstico`),
      fitTitle(`${a} x ${h} (${d}): resultado final ${g.as}-${g.hs} e palpite`, `${a} x ${h}: resultado e palpite`)
    ) : L.t(
      fitTitle(`Pronostic ${a} – ${h} (${d}) : ${nm(fav)} ${pf}`, `Pronostic ${a} – ${h} : ${nm(fav)} ${pf}`, `Pronostic ${a} – ${h} (${d})`),
      fitTitle(`${a} vs ${h} prediction (${d}): ${nm(fav)} ${pf} to win`, `${a} vs ${h} prediction (${d}): ${nm(fav)} ${pf}`, `${a} vs ${h} prediction: ${nm(fav)} ${pf}`, `${a} vs ${h} prediction (${d})`),
      fitTitle(`Pronóstico ${a} vs ${h} (${d}): ${nm(fav)} ${pf}`, `Pronóstico ${a} vs ${h}: ${nm(fav)} ${pf}`, `Pronóstico ${a} vs ${h} (${d})`),
      fitTitle(`Palpite ${a} x ${h} (${d}): ${nm(fav)} ${pf}`, `Palpite ${a} x ${h}: ${nm(fav)} ${pf}`, `Palpite ${a} x ${h} (${d})`)
    ),
    description: L.t(
      `${g.away.name} ${g.n ? "contre" : "chez"} ${g.home.name}, basket universitaire américain (NCAA) : ${nm(fav)} favori à ${pf}, écart prévu ${numOf(Math.abs(g.margin), L, 1)} points. Notes, bilans et derniers résultats.`,
      `${g.away.name} ${g.n ? "vs." : "at"} ${g.home.name}, men's college basketball: ${nm(fav)} favored at ${pf}, projected margin ${numOf(Math.abs(g.margin), L, 1)} points. Ratings, records and recent results.`,
      `${g.away.name} ${g.n ? "contra" : "en casa de"} ${g.home.name}, baloncesto universitario (NCAA): ${nm(fav)} favorito al ${pf}, margen previsto de ${numOf(Math.abs(g.margin), L, 1)} puntos. Notas, balances y últimos resultados.`,
      `${g.away.name} ${g.n ? "contra" : "na casa do"} ${g.home.name}, basquete universitário (NCAA): ${nm(fav)} favorito com ${pf}, margem prevista de ${numOf(Math.abs(g.margin), L, 1)} pontos. Notas, campanhas e últimos resultados.`
    ),
    path: ncaaGamePath(g),
    L,
  });
}

function recent(st, id, n = 5) {
  return st.games.filter((x) => x.h === id || x.a === id).slice(-n).reverse().map((x) => {
    const home = x.h === id, me = home ? x.hs : x.as, op = home ? x.as : x.hs, opp = st.meta[home ? x.a : x.h];
    return { d: x.d, w: me > op, score: `${me}-${op}`, opp: opp ? (opp.loc || opp.short) : "–", ha: x.n ? "vs" : home ? "vs" : "@" };
  });
}

export default async function NcaaGamePage({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await ncaaGameBySlug(slug);
  if (!f) notFound();
  const { st, g } = f;
  const fav = g.pHome >= 0.5 ? g.home : g.away, dog = fav === g.home ? g.away : g.home;
  const pf = Math.max(g.pHome, 1 - g.pHome);
  const done = g.state === "post" && g.hs != null;
  const ok = done ? ((g.pHome >= 0.5) === (g.hs > g.as)) : null;
  const rankOf = (id) => st.d1.filter((x) => st.ratings[x] > st.ratings[id]).length + 1;
  const side = (t) => ({ t, rating: st.ratings[t.id], rank: rankOf(t.id), rec: st.records[t.id] || { w: 0, l: 0 }, last: recent(st, t.id) });
  const A = side(g.away), H = side(g.home);
  const day = fmtDate(L, isoOf(g.d), { weekday: "long", day: "numeric", month: "long" });
  const url = `${SITE}${L.href(ncaaGamePath(g))}`;
  const faq = [
    {
      q: L.t(`Qui va gagner ${nm(g.away)} – ${nm(g.home)} ?`, `Who will win ${nm(g.away)} vs ${nm(g.home)}?`, `¿Quién ganará ${nm(g.away)} vs ${nm(g.home)}?`, `Quem vai vencer ${nm(g.away)} x ${nm(g.home)}?`),
      a: L.t(`Le modèle Basketlog donne ${pctOf(pf, L)} de chances de victoire à ${fav.name}, avec un écart prévu de ${numOf(Math.abs(g.margin), L, 1)} points.`, `The Basketlog model gives ${fav.name} a ${pctOf(pf, L)} chance to win, with a projected margin of ${numOf(Math.abs(g.margin), L, 1)} points.`, `El modelo de Basketlog da a ${fav.name} un ${pctOf(pf, L)} de probabilidades de victoria, con un margen previsto de ${numOf(Math.abs(g.margin), L, 1)} puntos.`, `O modelo do Basketlog dá a ${fav.name} ${pctOf(pf, L)} de chance de vitória, com margem prevista de ${numOf(Math.abs(g.margin), L, 1)} pontos.`),
    },
    {
      q: L.t("Comment est calculée cette probabilité ?", "How is this probability calculated?", "¿Cómo se calcula esta probabilidad?", "Como essa probabilidade é calculada?"),
      a: L.t(`Chaque équipe a une note (écart de points attendu face à une équipe moyenne, corrigé de la force des adversaires) : ${nm(g.away)} ${numOf(A.rating, L, 1)}, ${nm(g.home)} ${numOf(H.rating, L, 1)}. ${g.n ? "Terrain neutre : pas d'avantage du terrain." : `${nm(g.home)} reçoit : 3 points de plus.`}`, `Each team has a rating (expected margin against an average team, adjusted for opponent strength): ${nm(g.away)} ${numOf(A.rating, L, 1)}, ${nm(g.home)} ${numOf(H.rating, L, 1)}. ${g.n ? "Neutral court: no home advantage." : `${nm(g.home)} is at home: 3 extra points.`}`, `Cada equipo tiene una nota (margen esperado ante un equipo medio, corregido por la fuerza de los rivales): ${nm(g.away)} ${numOf(A.rating, L, 1)}, ${nm(g.home)} ${numOf(H.rating, L, 1)}. ${g.n ? "Campo neutral: sin ventaja de local." : `${nm(g.home)} juega en casa: 3 puntos más.`}`, `Cada time tem uma nota (margem esperada contra um time médio, corrigida pela força dos adversários): ${nm(g.away)} ${numOf(A.rating, L, 1)}, ${nm(g.home)} ${numOf(H.rating, L, 1)}. ${g.n ? "Quadra neutra: sem vantagem de mando." : `${nm(g.home)} joga em casa: 3 pontos a mais.`}`),
    },
    st.record.n > 0 && {
      q: L.t("Le modèle NCAA est-il fiable ?", "How accurate is the college basketball model?", "¿Es fiable el modelo NCAA?", "O modelo NCAA é confiável?"),
      a: L.t(`Cette saison, le favori du modèle a gagné ${pctOf(st.record.ok / st.record.n, L)} des ${st.record.n} matchs entre équipes de 1re division, chacun prédit avec les seuls résultats d'avant.`, `This season the model's favorite has won ${pctOf(st.record.ok / st.record.n, L)} of ${st.record.n} Division I games, each predicted with only prior results.`, `Esta temporada el favorito del modelo ganó el ${pctOf(st.record.ok / st.record.n, L)} de ${st.record.n} partidos de primera división, cada uno pronosticado solo con resultados previos.`, `Nesta temporada o favorito do modelo venceu ${pctOf(st.record.ok / st.record.n, L)} de ${st.record.n} jogos da primeira divisão, cada um previsto só com resultados anteriores.`),
    },
  ];
  const Col = ({ s }) => (
    <div className="card block">
      <h2><Link href={L.href(ncaaTeamPath(s.t))}>{rk(s.t)}{s.t.name}</Link></h2>
      <ul className="wk-list">
        <li>{L.t("Bilan", "Record", "Balance", "Campanha")} : <b>{s.rec.w}-{s.rec.l}</b></li>
        <li>{L.t("Note Basketlog", "Basketlog rating", "Nota Basketlog", "Nota Basketlog")} : <b>{numOf(s.rating, L, 1)}</b> ({L.t(`${s.rank}e sur ${st.d1.length}`, `No. ${s.rank} of ${st.d1.length}`, `${s.rank}.º de ${st.d1.length}`, `${s.rank}º de ${st.d1.length}`)})</li>
        {s.last.map((x) => <li key={x.d + x.opp} className="mono">{x.w ? L.t("V", "W", "V", "V") : L.t("D", "L", "D", "D")} {x.score} {x.ha} {x.opp}</li>)}
      </ul>
    </div>
  );
  return (
    <main className="app-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Basket NCAA", "College basketball", "Baloncesto NCAA", "Basquete NCAA"), "/app/ncaa"], [`${nm(g.away)} – ${nm(g.home)}`, ncaaGamePath(g)]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{done ? L.t(`${nm(g.away)} – ${nm(g.home)} : score final ${g.as}-${g.hs}`, `${nm(g.away)} vs ${nm(g.home)}: final score ${g.as}-${g.hs}`, `${nm(g.away)} vs ${nm(g.home)}: resultado final ${g.as}-${g.hs}`, `${nm(g.away)} x ${nm(g.home)}: resultado final ${g.as}-${g.hs}`) : L.t(`Pronostic ${nm(g.away)} – ${nm(g.home)}`, `${nm(g.away)} vs ${nm(g.home)} prediction`, `Pronóstico ${nm(g.away)} vs ${nm(g.home)}`, `Palpite ${nm(g.away)} x ${nm(g.home)}`)}</h1>
        <p>{day}{g.state === "pre" ? <> · <LocalTime iso={g.date} lang={L.lang} label={L.en} /></> : null}{g.tv ? ` · ${g.tv}` : ""}{g.n ? ` · ${L.t("terrain neutre", "neutral court", "campo neutral", "quadra neutra")}` : ""}{g.note ? ` · ${g.note}` : ""}</p>
      </div>
      <div className="card block">
        <div className="probbar"><div style={{ width: `${(1 - g.pHome) * 100}%`, background: "var(--muted, #8b93a7)" }} /><div style={{ width: `${g.pHome * 100}%`, background: "var(--orange, #ff7a1a)" }} /></div>
        <div className="prob-labels mono">
          <span><strong>{pctOf(1 - g.pHome, L)}</strong><small>{rk(g.away)}{nm(g.away)}</small></span>
          <span><strong>{pctOf(g.pHome, L)}</strong><small>{rk(g.home)}{nm(g.home)}</small></span>
        </div>
        <p className="narr" style={{ marginTop: 14 }}>
          {L.t(`Favori : ${fav.name}, écart prévu ${numOf(Math.abs(g.margin), L, 1)} points face à ${dog.name}.`, `Favorite: ${fav.name}, projected to win by ${numOf(Math.abs(g.margin), L, 1)} points over ${dog.name}.`, `Favorito: ${fav.name}, margen previsto de ${numOf(Math.abs(g.margin), L, 1)} puntos ante ${dog.name}.`, `Favorito: ${fav.name}, margem prevista de ${numOf(Math.abs(g.margin), L, 1)} pontos sobre ${dog.name}.`)}
          {done ? " " + (ok ? L.t("Le favori a gagné ✓", "The favorite won ✓", "Ganó el favorito ✓", "O favorito venceu ✓") : L.t("Surprise : le favori a perdu ✗", "Upset: the favorite lost ✗", "Sorpresa: perdió el favorito ✗", "Zebra: o favorito perdeu ✗")) : ""}
        </p>
      </div>
      <div className="grid2">
        <Col s={A} />
        <Col s={H} />
      </div>
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/ncaa")}>{L.t("Tous les matchs NCAA du jour", "All college basketball games today", "Todos los partidos NCAA de hoy", "Todos os jogos NCAA de hoje")}</Link>{" · "}
        <Link href={L.href(ncaaTeamPath(g.away))}>{nm(g.away)}</Link>{" · "}
        <Link href={L.href(ncaaTeamPath(g.home))}>{nm(g.home)}</Link>{" · "}
        <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA", "NBA predictions", "Pronósticos NBA", "Palpites NBA")}</Link>
      </p>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsEvent", name: `${g.away.name} ${g.n ? "vs" : "at"} ${g.home.name}`, startDate: g.date, sport: "Basketball", url, eventStatus: "https://schema.org/EventScheduled", homeTeam: { "@type": "SportsTeam", name: g.home.name }, awayTeam: { "@type": "SportsTeam", name: g.away.name }, location: { "@type": "Place", name: g.n ? "Neutral site" : g.home.name } }} />
      <p className="disclaimer">{L.t("Données ESPN. Basketlog n'est pas affilié à la NCAA. Probabilités estimées, jamais une certitude.", "Data from ESPN. Basketlog is not affiliated with the NCAA. Probabilities are estimates, never certainties.", "Datos de ESPN. Basketlog no está afiliado a la NCAA. Probabilidades estimadas, nunca certezas.", "Dados da ESPN. O Basketlog não é afiliado à NCAA. Probabilidades estimadas, nunca certezas.")}</p>
    </main>
  );
}
