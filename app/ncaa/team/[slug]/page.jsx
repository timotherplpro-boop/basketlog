import Link from "next/link";
import { notFound } from "next/navigation";
import { ncaaTeamBySlug } from "../../../../lib/ncaa";
import { ncaaGamePath, ncaaTeamPath } from "../../../../lib/ncaa-model";
import { nbaToday, seasonForDate } from "../../../../lib/espn";
import AppTabs from "../../../../components/AppTabs";
import Crumbs from "../../../../components/Crumbs";
import QuickFaq from "../../../../components/QuickFaq";
import JsonLd from "../../../../components/JsonLd";
import LocalTime from "../../../../components/LocalTime";
import { pageMeta, fitTitle } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { fmtDate, numOf, pctOf } from "../../../../lib/i18n";
import { SITE } from "../../../../lib/site";

export const dynamic = "force-dynamic";

// Fiche d'une école NCAA (/ncaa/team/duke) : « duke basketball prediction », « duke basketball schedule », « duke record ».
const isoOf = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;
const nm = (t) => t.loc || t.short || t.name;
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await ncaaTeamBySlug(slug).catch(() => null);
  if (!f) return { title: L.t("Équipe NCAA – Basketlog", "College basketball team – Basketlog", "Equipo NCAA – Basketlog", "Time NCAA – Basketlog"), robots: { index: false } };
  const { t, rec, rank, upcoming, st } = f;
  const s = seasonLabel(), n = nm(t);
  const nx = upcoming[0];
  const opp = nx ? nm(nx.home.id === t.id ? nx.away : nx.home) : null;
  const p = nx ? (nx.home.id === t.id ? nx.pHome : 1 - nx.pHome) : null;
  return pageMeta({
    title: nx ? L.t(
      fitTitle(`${n} basket (NCAA) : pronostic contre ${opp}, bilan ${rec.w}-${rec.l}`, `${n} : pronostic contre ${opp}, bilan ${rec.w}-${rec.l}`),
      fitTitle(`${n} basketball: ${opp} prediction, ${rec.w}-${rec.l} record (${s})`, `${n} basketball prediction vs ${opp}`),
      fitTitle(`${n} baloncesto (NCAA): pronóstico ante ${opp}, balance ${rec.w}-${rec.l}`, `${n}: pronóstico ante ${opp}`),
      fitTitle(`${n} basquete (NCAA): palpite contra ${opp}, campanha ${rec.w}-${rec.l}`, `${n}: palpite contra ${opp}`)
    ) : L.t(
      `${n} basket (NCAA) : bilan ${rec.w}-${rec.l}, note et résultats ${s}`,
      `${n} basketball ${s}: ${rec.w}-${rec.l} record, rating and results`,
      `${n} baloncesto (NCAA): balance ${rec.w}-${rec.l}, nota y resultados ${s}`,
      `${n} basquete (NCAA): campanha ${rec.w}-${rec.l}, nota e resultados ${s}`
    ),
    description: L.t(
      `${t.name}, basket universitaire américain ${s} : bilan ${rec.w}-${rec.l}, ${rank}e sur ${st.d1.length} au classement du modèle Basketlog${nx && p != null ? `, ${pctOf(p, L)} de chances contre ${opp}` : ""}. Prochains matchs et résultats.`,
      `${t.name} men's basketball ${s}: ${rec.w}-${rec.l} record, No. ${rank} of ${st.d1.length} in the Basketlog ratings${nx && p != null ? `, ${pctOf(p, L)} to beat ${opp}` : ""}. Upcoming games and results.`,
      `${t.name}, baloncesto universitario ${s}: balance ${rec.w}-${rec.l}, ${rank}.º de ${st.d1.length} en el ranking de Basketlog${nx && p != null ? `, ${pctOf(p, L)} ante ${opp}` : ""}. Próximos partidos y resultados.`,
      `${t.name}, basquete universitário ${s}: campanha ${rec.w}-${rec.l}, ${rank}º de ${st.d1.length} no ranking do Basketlog${nx && p != null ? `, ${pctOf(p, L)} contra ${opp}` : ""}. Próximos jogos e resultados.`
    ),
    path: ncaaTeamPath(t),
    L,
  });
}

export default async function NcaaTeamPage({ params }) {
  const { slug } = await params;
  const L = await getL();
  const f = await ncaaTeamBySlug(slug);
  if (!f) notFound();
  const { t, rec, rank, rating, past, upcoming, st } = f;
  const s = seasonLabel(), n = nm(t);
  const day = (d) => fmtDate(L, isoOf(d), { day: "numeric", month: "short" });
  const url = `${SITE}${L.href(ncaaTeamPath(t))}`;
  const nx = upcoming[0];
  const pOf = (g) => (g.home.id === t.id ? g.pHome : 1 - g.pHome);
  const oppOf = (g) => (g.home.id === t.id ? g.away : g.home);
  const where = (g) => (g.n ? L.t("terrain neutre", "neutral", "neutral", "neutro") : g.home.id === t.id ? L.t("domicile", "home", "casa", "casa") : L.t("extérieur", "away", "fuera", "fora"));
  const faq = [
    nx && {
      q: L.t(`${n} va-t-il gagner son prochain match ?`, `Will ${n} win its next game?`, `¿Ganará ${n} su próximo partido?`, `${n} vai vencer o próximo jogo?`),
      a: L.t(`Le modèle Basketlog donne ${pctOf(pOf(nx), L)} de chances à ${n} contre ${nm(oppOf(nx))} (${day(nx.d)}).`, `The Basketlog model gives ${n} a ${pctOf(pOf(nx), L)} chance against ${nm(oppOf(nx))} (${day(nx.d)}).`, `El modelo de Basketlog da a ${n} un ${pctOf(pOf(nx), L)} ante ${nm(oppOf(nx))} (${day(nx.d)}).`, `O modelo do Basketlog dá a ${n} ${pctOf(pOf(nx), L)} contra ${nm(oppOf(nx))} (${day(nx.d)}).`),
    },
    {
      q: L.t(`Quel est le niveau de ${n} cette saison ?`, `How good is ${n} this season?`, `¿Qué nivel tiene ${n} esta temporada?`, `Qual é o nível de ${n} nesta temporada?`),
      a: L.t(`${t.name} est ${rank}e sur ${st.d1.length} équipes de 1re division au classement du modèle (note ${numOf(rating, L, 1)}), avec un bilan de ${rec.w}-${rec.l}${t.rank ? ` et la ${t.rank}e place du classement AP` : ""}.`, `${t.name} ranks No. ${rank} of ${st.d1.length} Division I teams in the model (rating ${numOf(rating, L, 1)}), with a ${rec.w}-${rec.l} record${t.rank ? ` and the No. ${t.rank} spot in the AP poll` : ""}.`, `${t.name} es ${rank}.º de ${st.d1.length} equipos de primera división en el modelo (nota ${numOf(rating, L, 1)}), con un balance de ${rec.w}-${rec.l}${t.rank ? ` y el puesto ${t.rank} del ranking AP` : ""}.`, `${t.name} é ${rank}º de ${st.d1.length} times da primeira divisão no modelo (nota ${numOf(rating, L, 1)}), com campanha de ${rec.w}-${rec.l}${t.rank ? ` e o ${t.rank}º lugar no ranking AP` : ""}.`),
    },
  ];
  return (
    <main className="app-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Basket NCAA", "College basketball", "Baloncesto NCAA", "Basquete NCAA"), "/app/ncaa"], [n, ncaaTeamPath(t)]]} />
      <AppTabs active="matchs" />
      <div className="app-head pl-head-row">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {t.logo ? <img className="pl-photo" src={t.logo} alt="" width="88" height="88" /> : null}
        <div>
          <h1>{L.t(`${t.name} : pronostics et résultats ${s}`, `${t.name}: predictions and results ${s}`, `${t.name}: pronósticos y resultados ${s}`, `${t.name}: palpites e resultados ${s}`)}</h1>
          <p>{L.t("Basket universitaire américain, 1re division", "NCAA men's Division I basketball", "Baloncesto universitario de EE. UU., primera división", "Basquete universitário dos EUA, primeira divisão")}</p>
        </div>
      </div>
      <div className="kpis">
        <div className="card kpi"><span>{L.t("Bilan", "Record", "Balance", "Campanha")}</span><strong>{rec.w}-{rec.l}</strong></div>
        <div className="card kpi"><span>{L.t("Classement AP", "AP rank", "Ranking AP", "Ranking AP")}</span><strong>{t.rank ?? "–"}</strong></div>
        <div className="card kpi"><span>{L.t("Rang Basketlog", "Basketlog rank", "Ranking Basketlog", "Ranking Basketlog")}</span><strong>{rank}</strong></div>
        <div className="card kpi"><span>{L.t("Note", "Rating", "Nota", "Nota")}</span><strong>{numOf(rating, L, 1)}</strong></div>
      </div>
      {upcoming.length > 0 && (
        <section className="card block">
          <h2>{L.t("Prochains matchs", "Upcoming games", "Próximos partidos", "Próximos jogos")}</h2>
          <ul className="wk-list">
            {upcoming.map((g) => <li key={g.id}><Link href={L.href(ncaaGamePath(g))}>{day(g.d)} · {g.home.id === t.id ? L.t("contre", "vs.", "contra", "contra") : g.n ? L.t("contre", "vs.", "contra", "contra") : L.t("chez", "at", "en casa de", "na casa do")} {nm(oppOf(g))}</Link><span className="mono"> · {where(g)} · <LocalTime iso={g.date} lang={L.lang} label={L.en} /> · {n} {pctOf(pOf(g), L)}</span></li>)}
          </ul>
        </section>
      )}
      {past.length > 0 && (
        <section className="card block">
          <h2>{L.t("Résultats de la saison", "Season results", "Resultados de la temporada", "Resultados da temporada")}</h2>
          <ul className="wk-list">
            {[...past].reverse().map((g) => {
              const home = g.h === t.id, me = home ? g.hs : g.as, op = home ? g.as : g.hs, o = home ? g.away : g.home;
              return <li key={g.d + o.id} className="mono">{day(g.d)} · {me > op ? L.t("V", "W", "V", "V") : L.t("D", "L", "D", "D")} {me}-{op} {g.n ? "vs" : home ? "vs" : "@"} {o.slug ? <Link href={L.href(`/ncaa/team/${o.slug}`)}>{nm(o)}</Link> : nm(o)}</li>;
            })}
          </ul>
        </section>
      )}
      <QuickFaq L={L} items={faq} />
      <p className="team-rec"><Link href={L.href("/app/ncaa")}>{L.t("Matchs NCAA du jour et top 25 du modèle", "Today's college basketball games and model top 25", "Partidos NCAA de hoy y top 25 del modelo", "Jogos NCAA de hoje e top 25 do modelo")}</Link></p>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "SportsTeam", name: t.name, sport: "Basketball", url, ...(t.logo ? { logo: t.logo } : {}), memberOf: { "@type": "SportsOrganization", name: "NCAA Division I" } }} />
      <p className="disclaimer">{L.t("Données ESPN. Basketlog n'est pas affilié à la NCAA.", "Data from ESPN. Basketlog is not affiliated with the NCAA.", "Datos de ESPN. Basketlog no está afiliado a la NCAA.", "Dados da ESPN. O Basketlog não é afiliado à NCAA.")}</p>
    </main>
  );
}
