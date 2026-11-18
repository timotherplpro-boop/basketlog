import Link from "next/link";
import { elUpcoming, elStandings } from "../../../lib/euroleague";
import { recordPronosSoon } from "../../../lib/pronos";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { numOf, pctOf, fmtDate } from "../../../lib/i18n";
import JsonLd from "../../../components/JsonLd";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Pronostic Euroligue (EuroLeague) : matchs du jour, probabilités et classement", "EuroLeague predictions today: games, win probabilities, standings", "Pronósticos Euroliga hoy: partidos, probabilidades y clasificación"),
    description: L.t(
      "Pronostic Euroligue gratuit pour chaque journée d'EuroLeague : probabilités de victoire, score projeté et forme des 20 clubs, avec le classement à jour.",
      "EuroLeague predictions for every round: win probabilities, projected score and form for all 20 clubs, with up-to-date standings.", "Pronósticos de la Euroliga para cada jornada: probabilidades de victoria, marcador proyectado y forma de los 20 clubes, con la clasificación actualizada."
    ),
    path: "/app/euroleague",
    L,
  });
}

const toWL = (s) => (s ? s.replace(/^V/, "W").replace(/^D/, "L") : s);

export default async function EuroLeaguePage() {
  const L = await getL();
  const { list, cur, season } = await elUpcoming(10);
  recordPronosSoon("EL", list.map((x) => x.a));
  const games = list.map(({ g, a }) => ({ id: g.id, date: g.date, state: a.game.state, live: g.live, home: g.home, away: g.away, pHome: a.pHome, confidence: a.confidence }));
  const table = elStandings(cur);
  const year = Number(season.slice(1));
  const rec = (t) => `${t.wins}-${t.losses}`;
  const up = list.filter(({ a }) => a.game.state !== "post").map(({ g, a }) => ({ g, fav: a.pHome >= 0.5 ? g.home : g.away, p: Math.max(a.pHome, a.pAway) })).sort((x, y) => y.p - x.p);
  const faq = [];
  if (table.length && table[0].gp) faq.push({
    q: L.t("Qui est premier de l'EuroLeague ?", "Who leads the EuroLeague standings?", "¿Quién lidera la Euroliga?"),
    a: L.t(`${table[0].name} est en tête de l'Euroligue avec un bilan de ${rec(table[0])}, devant ${table[1].name} (${rec(table[1])}) et ${table[2].name} (${rec(table[2])}).`,
      `${table[0].name} lead the EuroLeague at ${rec(table[0])}, ahead of ${table[1].name} (${rec(table[1])}) and ${table[2].name} (${rec(table[2])}).`,
      `${table[0].name} lidera la Euroliga con un balance de ${rec(table[0])}, por delante de ${table[1].name} (${rec(table[1])}) y ${table[2].name} (${rec(table[2])}).`),
  });
  if (up.length) faq.push({
    q: L.t("Quels sont les favoris des prochains matchs d'EuroLeague ?", "Who are the favorites in the next EuroLeague games?", "¿Quiénes son los favoritos de los próximos partidos de la Euroliga?"),
    a: up.slice(0, 3).map((x) => L.t(`${x.fav.name} (${pctOf(x.p, L)}, ${x.g.away.short} – ${x.g.home.short}, ${fmtDate(L, x.g.date, { day: "numeric", month: "long" })})`, `${x.fav.name} (${pctOf(x.p, L)}, ${x.g.away.short} vs ${x.g.home.short}, ${fmtDate(L, x.g.date, { month: "short", day: "numeric" })})`, `${x.fav.name} (${pctOf(x.p, L)}, ${x.g.away.short} – ${x.g.home.short}, ${fmtDate(L, x.g.date, { day: "numeric", month: "long" })})`)).join(L.fr ? " ; " : "; ") + ".",
  });
  faq.push({
    q: L.t("Combien d'équipes se qualifient pour les playoffs d'EuroLeague ?", "How many teams make the EuroLeague playoffs?", "¿Cuántos equipos se clasifican para los playoffs de la Euroliga?"),
    a: L.t("Les six premiers de la saison régulière vont directement en playoffs ; les équipes classées de 7 à 10 jouent le play-in pour les deux dernières places.",
      "The top six of the regular season go straight to the playoffs; teams ranked 7 to 10 play the play-in for the last two spots.",
      "Los seis primeros de la fase regular van directamente a los playoffs; los equipos del 7 al 10 juegan el play-in por las dos últimas plazas."),
  });
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  return (
    <main className="app-page wide">
      <JsonLd data={ld} />
      <AppTabs active="euroleague" />
      <div className="app-head">
        <h1>{L.t("Pronostics EuroLeague", "EuroLeague predictions", "Pronósticos Euroliga")} {year}-{String(year + 1).slice(2)}</h1>
        <p>{L.t("Les 20 meilleurs clubs d'Europe, analysés comme la NBA", "Europe's top 20 clubs, analyzed like the NBA", "Los 20 mejores clubes de Europa, analizados como la NBA")}</p>
        <p className="note">{L.t("Probabilités, score projeté et forme : clique sur un match pour l'analyse complète.", "Probabilities, projected score and form: click a game for the full analysis.", "Probabilidades, marcador proyectado y forma: haz clic en un partido para ver el análisis completo.")}</p>
      </div>
      <div className="el-grid">
        <UpcomingList games={games} L={L} href={(g) => `/app/euroleague/match/${g.id}`} />
        <div className="panel">
          <div className="panel-label" style={{ marginBottom: 8 }}>{L.t("CLASSEMENT", "STANDINGS", "CLASIFICACIÓN")}</div>
          <table className="std-table">
            <thead><tr><th>#</th><th>Club</th><th>{L.t("V-D", "W-L", "V-D")}</th><th>{L.t("Écart", "Diff", "Dif.")}</th><th>{L.t("Série", "Streak", "Racha")}</th></tr></thead>
            <tbody>
              {table.map((t, i) => (
                <tr key={t.id} className={i === 6 || i === 10 ? "cut" : ""} style={{ animationDelay: `${i * 30}ms` }}>
                  <td className="rk">{i + 1}</td>
                  <td className="tm">
                    <Link href={L.href(`/app/euroleague/equipe/${t.id}`)}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span>{t.logo && <img src={t.logo} alt="" />}{t.short}</span>
                    </Link>
                  </td>
                  <td>{t.wins}-{t.losses}</td>
                  <td className={t.diff > 0 ? "pos" : t.diff < 0 ? "neg" : ""}>{t.gp ? `${t.diff > 0 ? "+" : ""}${numOf(t.diff, L)}` : "–"}</td>
                  <td>{(L.en ? toWL(t.streak) : t.streak) || "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="disclaimer" style={{ marginTop: 12 }}>{L.t("Tirets : 1-6 qualifiés pour les playoffs, 7-10 play-in.", "Dividers: 1-6 qualify for the playoffs, 7-10 go to the play-in.", "Separadores: del 1 al 6 se clasifican para los playoffs, del 7 al 10 van al play-in.")}</p>
        </div>
      </div>
      <section className="card block match-faq">
        <h2>{L.t("Euroligue : l'essentiel", "EuroLeague: quick answers", "Euroliga: lo esencial")}</h2>
        {faq.map((f) => (
          <div key={f.q} className="mfaq-item">
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
