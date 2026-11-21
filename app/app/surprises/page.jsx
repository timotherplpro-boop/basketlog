import Link from "next/link";
import { nbaPicks } from "../../../lib/history";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { nbaPath } from "../../../lib/slug";
import AppTabs from "../../../components/AppTabs";
import QuickFaq from "../../../components/QuickFaq";
import CiteBox from "../../../components/CiteBox";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, pctOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches « biggest nba upsets this season », « plus grosses surprises NBA » : les victoires les moins probables
// de la saison selon le modèle (probabilité calculée avant chaque match, avec les seuls résultats connus).
const seasonLabel = (y) => `${y - 1}-${String(y).slice(2)}`;
const isoOf = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;

async function load() {
  const season = seasonForDate(nbaToday());
  const picks = (await nbaPicks(season)) || [];
  const all = picks.filter((p) => p.home.score != null && p.away.score != null && p.home.score !== p.away.score).map((p) => {
    const homeWon = p.home.score > p.away.score;
    return { p, w: homeWon ? p.home : p.away, l: homeWon ? p.away : p.home, pw: homeWon ? p.pHome : 1 - p.pHome };
  });
  const upsets = all.filter((x) => x.pw < 0.5).sort((a, b) => a.pw - b.pw);
  return { season, n: all.length, upsets };
}

export async function generateMetadata() {
  const L = await getL();
  const { season, upsets } = await load().catch(() => ({ season: seasonForDate(nbaToday()), upsets: [] }));
  const s = seasonLabel(season);
  const top = upsets[0];
  return pageMeta({
    title: L.t(`Plus grosses surprises NBA ${s} : les favoris tombés`, `Biggest NBA upsets of the ${s} season`, `Las mayores sorpresas de la NBA ${s}`, `As maiores zebras da NBA ${s}`),
    description: top ? L.t(
      `La plus grosse surprise de la saison : ${top.w.short} vainqueurs des ${top.l.short} avec ${pctOf(top.pw, L)} de chances seulement. Le classement des victoires les plus improbables, mis à jour chaque jour.`,
      `The biggest upset of the season: the ${top.w.short} beat the ${top.l.short} with just a ${pctOf(top.pw, L)} chance. Every season's most unlikely wins, updated daily.`,
      `La mayor sorpresa de la temporada: los ${top.w.short} ganaron a los ${top.l.short} con solo un ${pctOf(top.pw, L)} de probabilidad. Las victorias más improbables, actualizadas cada día.`,
      `A maior zebra da temporada: o ${top.w.short} venceu o ${top.l.short} com só ${pctOf(top.pw, L)} de chance. As vitórias mais improváveis, atualizadas todo dia.`
    ) : L.t("Les victoires les plus improbables de la saison NBA selon le modèle Basketlog.", "The most unlikely wins of the NBA season according to the Basketlog model.", "Las victorias más improbables de la temporada NBA según el modelo de Basketlog.", "As vitórias mais improváveis da temporada da NBA segundo o modelo do Basketlog."),
    path: "/app/surprises",
    L,
  });
}

export default async function UpsetsPage() {
  const L = await getL();
  let data = { season: seasonForDate(nbaToday()), n: 0, upsets: [] };
  try { data = await load(); } catch {}
  const { season, n, upsets } = data;
  const s = seasonLabel(season);
  const top = upsets.slice(0, 20);
  const share = n ? upsets.length / n : null;
  const faq = [
    top[0] && {
      q: L.t(`Quelle est la plus grosse surprise de la saison NBA ${s} ?`, `What is the biggest NBA upset of the ${s} season?`, `¿Cuál es la mayor sorpresa de la temporada NBA ${s}?`, `Qual é a maior zebra da temporada da NBA ${s}?`),
      a: L.t(
        `${top[0].w.short} ${top[0].w.score}-${top[0].l.score} ${top[0].l.short} le ${fmtDate(L, isoOf(top[0].p.d), { day: "numeric", month: "long" })} : le modèle ne donnait que ${pctOf(top[0].pw, L)} de chances aux ${top[0].w.short}.`,
        `${top[0].w.short} ${top[0].w.score}-${top[0].l.score} ${top[0].l.short} on ${fmtDate(L, isoOf(top[0].p.d), { month: "long", day: "numeric" })}: the model gave the ${top[0].w.short} just a ${pctOf(top[0].pw, L)} chance.`,
        `${top[0].w.short} ${top[0].w.score}-${top[0].l.score} ${top[0].l.short} el ${fmtDate(L, isoOf(top[0].p.d), { day: "numeric", month: "long" })}: el modelo solo daba un ${pctOf(top[0].pw, L)} a los ${top[0].w.short}.`,
        `${top[0].w.short} ${top[0].w.score}-${top[0].l.score} ${top[0].l.short} em ${fmtDate(L, isoOf(top[0].p.d), { day: "numeric", month: "long" })}: o modelo dava só ${pctOf(top[0].pw, L)} ao ${top[0].w.short}.`
      ),
    },
    share != null && {
      q: L.t("Combien de matchs NBA se terminent par une surprise ?", "How often does the underdog win in the NBA?", "¿Cuántos partidos NBA acaban en sorpresa?", "Com que frequência o azarão vence na NBA?"),
      a: L.t(`Cette saison, l'équipe donnée perdante par le modèle a gagné ${upsets.length} des ${n} matchs terminés (${pctOf(share, L)}).`, `This season, the model's underdog has won ${upsets.length} of ${n} completed games (${pctOf(share, L)}).`, `Esta temporada, el equipo no favorito según el modelo ganó ${upsets.length} de ${n} partidos terminados (${pctOf(share, L)}).`, `Nesta temporada, o azarão segundo o modelo venceu ${upsets.length} de ${n} jogos encerrados (${pctOf(share, L)}).`),
    },
  ];
  const url = `${SITE}${L.href("/app/surprises")}`;
  const title = L.t(`Plus grosses surprises de la saison NBA ${s}`, `Biggest NBA upsets of the ${s} season`, `Las mayores sorpresas de la temporada NBA ${s}`, `As maiores zebras da temporada da NBA ${s}`);
  return (
    <main className="app-page">
      <AppTabs active="bilan" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t("Les victoires les moins probables, d'après la probabilité calculée avant chaque match avec les seuls résultats connus à ce moment-là.", "The least likely wins, based on the probability computed before each game using only results known at the time.", "Las victorias menos probables, según la probabilidad calculada antes de cada partido con los resultados conocidos en ese momento.", "As vitórias menos prováveis, pela probabilidade calculada antes de cada jogo só com os resultados conhecidos naquele momento.")}</p>
      </div>
      {top.length ? (
        <div className="panel tbl-scroll">
          <table className="std-table">
            <thead><tr><th>#</th><th>{L.t("Vainqueur", "Winner", "Ganador", "Vencedor")}</th><th>{L.t("Score", "Score", "Resultado", "Placar")}</th><th>{L.t("Date", "Date", "Fecha", "Data")}</th><th>{L.t("Chances du vainqueur", "Winner's chance", "Opciones del ganador", "Chance do vencedor")}</th></tr></thead>
            <tbody>
              {top.map((x, i) => (
                <tr key={x.p.id}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm"><Link href={L.href(nbaPath(x.p, x.p.d))}><span>{x.w.short} {L.t("bat", "beat", "gana a", "vence")} {x.l.short}</span></Link></td>
                  <td>{x.w.score}-{x.l.score}</td>
                  <td>{fmtDate(L, isoOf(x.p.d), { day: "numeric", month: "short" })}</td>
                  <td className="neg">{pctOf(x.pw, L)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="narr">{L.t("Pas encore assez de matchs joués.", "Not enough games played yet.", "Todavía no hay suficientes partidos.", "Ainda não há jogos suficientes.")}</p>}
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/bilan")}>{L.t("Bilan complet des pronostics", "Full prediction track record", "Balance completo de pronósticos", "Desempenho completo dos palpites")}</Link>{" · "}
        <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking", "Power rankings", "Power ranking", "Power ranking")}</Link>{" · "}
        <Link href={L.href("/app/matchs")}>{L.t("Pronostics du soir", "Tonight's predictions", "Pronósticos de hoy", "Palpites de hoje")}</Link>
      </p>
      <CiteBox url={url} title={title} lang={L.lang} />
    </main>
  );
}
