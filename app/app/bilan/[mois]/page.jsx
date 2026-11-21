import Link from "next/link";
import { notFound } from "next/navigation";
import { nbaPicks, summarize } from "../../../../lib/history";
import { nbaToday, seasonForDate } from "../../../../lib/espn";
import { nbaPath } from "../../../../lib/slug";
import AppTabs from "../../../../components/AppTabs";
import Crumbs from "../../../../components/Crumbs";
import QuickFaq from "../../../../components/QuickFaq";
import CiteBox from "../../../../components/CiteBox";
import { pageMeta } from "../../../../lib/seo";
import { getL } from "../../../../lib/lang-server";
import { fmtDate, pctOf } from "../../../../lib/i18n";
import { SITE } from "../../../../lib/site";
import { monthsOf, monthOk, seasonOfMonth } from "../../../../lib/months";

export const dynamic = "force-dynamic";

// Bilan d'un mois (/app/bilan/2026-11) : page datée que les journalistes et les forums peuvent citer
// (« pronostics NBA novembre 2026 : 68 % de réussite »). Chaque match est recalculé avec les seuls résultats d'avant.
const isoOf = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;
const monthName = (m, L) => fmtDate(L, `${m}-15T12:00:00Z`, { month: "long", year: "numeric" });

async function load(m) {
  if (!monthOk(m)) return null;
  const picks = (await nbaPicks(seasonOfMonth(m))) || [];
  const key = m.replace("-", "");
  const list = picks.filter((p) => p.d.startsWith(key));
  return list.length ? list : null;
}

export async function generateMetadata({ params }) {
  const { mois } = await params;
  const L = await getL();
  const list = await load(mois).catch(() => null);
  if (!list) return { title: L.t("Mois introuvable – Basketlog", "Month not found – Basketlog", "Mes no encontrado – Basketlog", "Mês não encontrado – Basketlog"), robots: { index: false } };
  const s = summarize(list), mn = monthName(mois, L);
  const ongoing = mois === `${nbaToday().slice(0, 4)}-${nbaToday().slice(4, 6)}`;
  return pageMeta({
    title: L.t(`Pronostics NBA ${mn} : ${pctOf(s.pct, L)} de réussite (${s.ok} sur ${s.n})`, `NBA predictions, ${mn}: ${pctOf(s.pct, L)} correct (${s.ok} of ${s.n})`, `Pronósticos NBA ${mn}: ${pctOf(s.pct, L)} de acierto (${s.ok} de ${s.n})`, `Palpites NBA ${mn}: ${pctOf(s.pct, L)} de acerto (${s.ok} de ${s.n})`),
    description: L.t(
      `Bilan des pronostics NBA Basketlog en ${mn}${ongoing ? " (mois en cours)" : ""} : ${s.ok} favoris gagnants sur ${s.n} matchs, jour par jour, avec les plus grosses surprises.`,
      `Basketlog NBA prediction record for ${mn}${ongoing ? " (month in progress)" : ""}: the favorite won ${s.ok} of ${s.n} games, day by day, with the biggest upsets.`,
      `Balance de los pronósticos NBA de Basketlog en ${mn}${ongoing ? " (mes en curso)" : ""}: ${s.ok} favoritos ganadores de ${s.n} partidos, día a día, con las mayores sorpresas.`,
      `Desempenho dos palpites NBA do Basketlog em ${mn}${ongoing ? " (mês em andamento)" : ""}: ${s.ok} favoritos vencedores em ${s.n} jogos, dia a dia, com as maiores zebras.`
    ),
    path: `/app/bilan/${mois}`,
    L,
  });
}

export default async function MonthRecordPage({ params }) {
  const { mois } = await params;
  const L = await getL();
  const list = await load(mois);
  if (!list) notFound();
  const s = summarize(list), mn = monthName(mois, L);
  const byDay = [];
  for (const p of [...list].sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0))) {
    if (!byDay.length || byDay[byDay.length - 1].d !== p.d) byDay.push({ d: p.d, l: [] });
    byDay[byDay.length - 1].l.push(p);
  }
  const best = [...byDay].filter((x) => x.l.length >= 4).sort((a, b) => b.l.filter((p) => p.ok).length / b.l.length - a.l.filter((p) => p.ok).length / a.l.length)[0];
  const upsets = list.filter((p) => !p.ok).map((p) => ({ p, pw: Math.min(p.pHome, 1 - p.pHome) })).sort((a, b) => a.pw - b.pw).slice(0, 5);
  const months = monthsOf(seasonForDate(nbaToday()), nbaToday());
  const i = months.indexOf(mois);
  const dayName = (d) => fmtDate(L, isoOf(d), { weekday: "long", day: "numeric" });
  const winner = (p) => (p.home.score > p.away.score ? p.home : p.away);
  const faq = [
    {
      q: L.t(`Quel est le taux de réussite des pronostics NBA Basketlog en ${mn} ?`, `How accurate were Basketlog's NBA predictions in ${mn}?`, `¿Cuál es el porcentaje de acierto de Basketlog en ${mn}?`, `Qual é a taxa de acerto do Basketlog em ${mn}?`),
      a: L.t(`${pctOf(s.pct, L)} : le favori du modèle a gagné ${s.ok} des ${s.n} matchs NBA joués en ${mn}.`, `${pctOf(s.pct, L)}: the model's favorite won ${s.ok} of the ${s.n} NBA games played in ${mn}.`, `${pctOf(s.pct, L)}: el favorito del modelo ganó ${s.ok} de los ${s.n} partidos NBA jugados en ${mn}.`, `${pctOf(s.pct, L)}: o favorito do modelo venceu ${s.ok} dos ${s.n} jogos da NBA disputados em ${mn}.`),
    },
    s.sure.n > 0 && {
      q: L.t("Et les pronostics à confiance très élevée ?", "What about the very high confidence picks?", "¿Y los pronósticos de confianza muy alta?", "E os palpites de confiança muito alta?"),
      a: L.t(`${s.sure.ok} sur ${s.sure.n} (favori à 88 % ou plus).`, `${s.sure.ok} of ${s.sure.n} (favorite at 88% or more).`, `${s.sure.ok} de ${s.sure.n} (favorito al 88 % o más).`, `${s.sure.ok} de ${s.sure.n} (favorito com 88 % ou mais).`),
    },
  ];
  const url = `${SITE}${L.href(`/app/bilan/${mois}`)}`;
  const title = L.t(`Pronostics NBA de ${mn} : le bilan`, `NBA predictions in ${mn}: the record`, `Pronósticos NBA de ${mn}: el balance`, `Palpites NBA de ${mn}: o desempenho`);
  return (
    <main className="app-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Bilan", "Track record", "Balance", "Desempenho"), "/app/bilan"], [mn, `/app/bilan/${mois}`]]} />
      <AppTabs active="bilan" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t(`${s.ok} favoris gagnants sur ${s.n} matchs, soit ${pctOf(s.pct, L)}.`, `The favorite won ${s.ok} of ${s.n} games: ${pctOf(s.pct, L)}.`, `${s.ok} favoritos ganadores de ${s.n} partidos: ${pctOf(s.pct, L)}.`, `${s.ok} favoritos vencedores em ${s.n} jogos: ${pctOf(s.pct, L)}.`)}
          {best ? " " + L.t(`Meilleure soirée : ${dayName(best.d)} (${best.l.filter((p) => p.ok).length} sur ${best.l.length}).`, `Best night: ${dayName(best.d)} (${best.l.filter((p) => p.ok).length} of ${best.l.length}).`, `Mejor noche: ${dayName(best.d)} (${best.l.filter((p) => p.ok).length} de ${best.l.length}).`, `Melhor noite: ${dayName(best.d)} (${best.l.filter((p) => p.ok).length} de ${best.l.length}).`) : ""}</p>
      </div>
      <div className="kpis">
        <div className="card kpi"><span>{L.t("Réussite", "Accuracy", "Acierto", "Acerto")}</span><strong>{pctOf(s.pct, L)}</strong></div>
        <div className="card kpi"><span>{L.t("Matchs", "Games", "Partidos", "Jogos")}</span><strong>{s.n}</strong></div>
        <div className="card kpi"><span>{L.t("Confiance très élevée", "Very high confidence", "Confianza muy alta", "Confiança muito alta")}</span><strong>{s.sure.n ? `${s.sure.ok}/${s.sure.n}` : "–"}</strong></div>
      </div>
      {upsets.length > 0 && (
        <section className="card block">
          <h2>{L.t("Les plus grosses surprises du mois", "Biggest upsets of the month", "Las mayores sorpresas del mes", "As maiores zebras do mês")}</h2>
          <ul className="wk-list">
            {upsets.map(({ p, pw }) => <li key={p.id}><Link href={L.href(nbaPath(p, p.d))}>{p.away.short} {p.away.score}-{p.home.score} {p.home.short}</Link><span className="mono"> · {winner(p).short} {pctOf(pw, L)} · {fmtDate(L, isoOf(p.d), { day: "numeric", month: "short" })}</span></li>)}
          </ul>
        </section>
      )}
      <section className="card block">
        <h2>{L.t("Jour par jour", "Day by day", "Día a día", "Dia a dia")}</h2>
        <ul className="wk-list">
          {byDay.map((x) => <li key={x.d}><Link href={L.href(`/app/matchs?d=${x.d}`)}>{dayName(x.d)}</Link><span className="mono"> · {x.l.filter((p) => p.ok).length}/{x.l.length}</span></li>)}
        </ul>
      </section>
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        {i > 0 && <><Link href={L.href(`/app/bilan/${months[i - 1]}`)}>← {monthName(months[i - 1], L)}</Link>{" · "}</>}
        <Link href={L.href("/app/bilan")}>{L.t("Bilan de la saison", "Season record", "Balance de la temporada", "Desempenho da temporada")}</Link>
        {i >= 0 && i < months.length - 1 && <>{" · "}<Link href={L.href(`/app/bilan/${months[i + 1]}`)}>{monthName(months[i + 1], L)} →</Link></>}
        {" · "}<Link href={L.href("/app/surprises")}>{L.t("Surprises de la saison", "Season's biggest upsets", "Sorpresas de la temporada", "Zebras da temporada")}</Link>
      </p>
      <CiteBox url={url} title={title} lang={L.lang} />
    </main>
  );
}
