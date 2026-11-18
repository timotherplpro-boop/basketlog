import Link from "next/link";
import { upcomingAnalyses } from "../../../lib/data";
import { nbaPicks, lastDays } from "../../../lib/history";
import { nbaToday, shiftDate, seasonForDate } from "../../../lib/espn";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { SITE } from "../../../lib/site";
import { nbaPath } from "../../../lib/slug";
import { pctOf } from "../../../lib/i18n";
import Crumbs from "../../../components/Crumbs";

export const dynamic = "force-dynamic";

// Récap de la semaine (recherches « nba predictions this week », « pronósticos nba semana ») : bilan des 7 derniers
// jours (réussites et ratés, rien n'est caché) et plus gros favoris des 7 prochains jours, avec un lien vers chaque fiche.
const ymd = (d) => new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`);
const short = (L, d) => new Intl.DateTimeFormat(L.locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(ymd(d));
const range = (L) => { const t = nbaToday(); return `${short(L, t)} – ${short(L, shiftDate(t, 6))}`; };

export async function generateMetadata() {
  const L = await getL();
  const r = range(L);
  return pageMeta({
    title: L.t(`Pronostics NBA de la semaine (${r}) : bilan et plus gros favoris`, `NBA predictions this week (${r}): model record and biggest favorites`, `Pronósticos NBA de la semana (${r}): balance y grandes favoritos`, `Palpites NBA da semana (${r}): desempenho e grandes favoritos`),
    description: L.t(
      "Les pronostics NBA de la semaine par le modèle Basketlog : bilan des 7 derniers jours (réussites et ratés), et les plus gros favoris des 7 prochains jours avec leurs probabilités.",
      "This week's NBA predictions from the Basketlog model: the last 7 days' record (hits and misses) and the biggest favorites of the next 7 days with their win probabilities.",
      "Los pronósticos NBA de la semana según el modelo de Basketlog: balance de los últimos 7 días (aciertos y fallos) y los grandes favoritos de los próximos 7 días con sus probabilidades.", "Os palpites NBA da semana segundo o modelo do Basketlog: desempenho dos últimos 7 dias (acertos e erros) e os grandes favoritos dos próximos 7 dias com suas probabilidades."
    ),
    path: "/app/semaine",
    L,
  });
}

export default async function WeekPage() {
  const L = await getL();
  const today = nbaToday();
  const [picks, upcoming] = await Promise.all([nbaPicks(seasonForDate(today)), upcomingAnalyses(7).catch(() => [])]);
  const week = picks ? lastDays(picks, 7, today) : [];
  const ok = week.filter((p) => p.ok).length;
  const fav = (p) => Math.max(p.pHome, 1 - p.pHome);
  const favTeam = (p) => (p.pHome >= 0.5 ? p.home : p.away);
  const best = week.filter((p) => p.ok).sort((x, y) => fav(y) - fav(x)).slice(0, 5);
  const misses = week.filter((p) => !p.ok).sort((x, y) => fav(y) - fav(x)).slice(0, 5);
  const ahead = upcoming.filter((u) => !u.live).sort((x, y) => fav(y) - fav(x)).slice(0, 10);
  const dayOf = (iso) => new Intl.DateTimeFormat(L.locale, { weekday: "short", month: "short", day: "numeric", timeZone: L.tz }).format(new Date(iso));
  const line = (p) => `${p.away.short} ${p.away.score} – ${p.home.short} ${p.home.score}`;

  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: L.t("Plus gros favoris NBA de la semaine", "Biggest NBA favorites this week", "Grandes favoritos NBA de la semana", "Grandes favoritos NBA da semana"),
    itemListElement: ahead.map((u, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${L.href(nbaPath(u, u.d))}` })),
  };

  return (
    <main className="app-page wide">
      <JsonLd data={ahead.length ? ld : null} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje"), "/app/matchs"], [L.t("Pronostics NBA de la semaine", "NBA predictions this week", "Pronósticos NBA de la semana", "Palpites NBA da semana"), "/app/semaine"]]} />
      <AppTabs active="analyse" />
      <div className="app-head">
        <h1>{L.t("Pronostics NBA de la semaine", "NBA predictions this week", "Pronósticos NBA de la semana", "Palpites NBA da semana")}</h1>
        <p>{L.t(
          `Semaine du ${range(L)}. Chaque pronostic est enregistré avant le match puis comparé au score final : les ratés restent affichés.`,
          `Week of ${range(L)}. Every pick is saved before tip-off and compared with the final score: misses stay on the record.`,
          `Semana del ${range(L)}. Cada pronóstico se guarda antes del partido y se compara con el resultado final: los fallos se quedan a la vista.`, `Semana de ${range(L)}. Cada palpite é salvo antes do jogo e comparado com o resultado final: os erros ficam à vista.`
        )}</p>
      </div>

      {week.length > 0 && (
        <section className="card block">
          <h2>{L.t("Les 7 derniers jours", "The last 7 days", "Los últimos 7 días", "Os últimos 7 dias")}</h2>
          <p className="big-stat">{L.t(
            <>Le favori du modèle a gagné <b>{ok} matchs sur {week.length}</b> ({pctOf(ok / week.length, L)}).</>,
            <>The model&apos;s favorite won <b>{ok} of {week.length} games</b> ({pctOf(ok / week.length, L)}).</>,
            <>El favorito del modelo ganó <b>{ok} de {week.length} partidos</b> ({pctOf(ok / week.length, L)}).</>, <>O favorito do modelo venceu <b>{ok} de {week.length} jogos</b> ({pctOf(ok / week.length, L)}).</>
          )}</p>
          <div className="grid2">
            <div>
              <h3>✅ {L.t("Meilleurs pronostics", "Best calls", "Mejores pronósticos", "Melhores palpites")}</h3>
              <ul className="wk-list">{best.map((p) => (
                <li key={p.id}><Link href={L.href(nbaPath(p, p.d))}>{line(p)}</Link> <span className="mono">· {favTeam(p).short} {pctOf(fav(p), L)}</span></li>
              ))}</ul>
            </div>
            <div>
              <h3>❌ {L.t("Plus grosses surprises", "Biggest upsets", "Mayores sorpresas", "Maiores surpresas")}</h3>
              {misses.length ? <ul className="wk-list">{misses.map((p) => (
                <li key={p.id}><Link href={L.href(nbaPath(p, p.d))}>{line(p)}</Link> <span className="mono">· {favTeam(p).short} {pctOf(fav(p), L)}</span></li>
              ))}</ul> : <p>{L.t("Aucun raté cette semaine.", "No misses this week.", "Ningún fallo esta semana.", "Nenhum erro nesta semana.")}</p>}
            </div>
          </div>
        </section>
      )}

      {ahead.length > 0 && (
        <section className="card block">
          <h2>{L.t("Plus gros favoris des 7 prochains jours", "Biggest favorites of the next 7 days", "Grandes favoritos de los próximos 7 días", "Grandes favoritos dos próximos 7 dias")}</h2>
          <ul className="wk-list">{ahead.map((u) => (
            <li key={u.id}>
              <Link href={L.href(nbaPath(u, u.d))}>{L.t(`Pronostic ${u.away.short} – ${u.home.short}`, `${u.away.short} vs ${u.home.short} prediction`, `Pronóstico ${u.away.short} – ${u.home.short}`, `Palpite ${u.away.short} x ${u.home.short}`)}</Link>
              <span className="mono"> · {dayOf(u.date)} · {favTeam(u).short} {pctOf(fav(u), L)}</span>
            </li>
          ))}</ul>
        </section>
      )}

      <p className="note">
        <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy", "Palpites NBA de hoje")}</Link>{" · "}
        <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA")}</Link>{" · "}
        <Link href={L.href("/app/bilan")}>{L.t("Bilan complet du modèle", "Full model track record", "Balance completo del modelo", "Desempenho completo do modelo")}</Link>
      </p>
    </main>
  );
}
