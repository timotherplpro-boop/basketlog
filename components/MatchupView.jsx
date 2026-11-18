import Link from "next/link";
import AppTabs from "./AppTabs";
import JsonLd from "./JsonLd";
import { getL } from "../lib/lang-server";
import { conferenceStandings, upcomingAnalyses } from "../lib/data";
import { getTeamSchedule, nbaToday, nbaDateOf, seasonForDate } from "../lib/espn";
import { nbaPicks } from "../lib/history";
import { nbaPath } from "../lib/slug";
import { fmtDate, fmtTime, pctOf } from "../lib/i18n";

// Page duel sans date (/nba/celtics-vs-lakers) : voir lib/matchup.js.
export async function matchupData(x, y) {
  const today = nbaToday();
  const [sched, picks, up, st] = await Promise.all([
    getTeamSchedule(x.id).catch(() => []),
    nbaPicks(seasonForDate(today)).catch(() => null),
    upcomingAnalyses(14).catch(() => []),
    conferenceStandings().catch(() => null),
  ]);
  const games = sched
    .filter((g) => g.type !== "pre" && (g.home.id === y.id || g.away.id === y.id) && (g.home.id === x.id || g.away.id === x.id))
    .sort((p, q) => new Date(p.date) - new Date(q.date));
  const pickOf = new Map((picks || []).map((p) => [p.id, p]));
  const upOf = new Map(up.map((u) => [u.id, u]));
  const rows = games.map((g) => {
    const d = nbaDateOf(g.date);
    const pk = pickOf.get(g.id), u = upOf.get(g.id);
    const pHome = pk ? pk.pHome : u ? u.pHome : null;
    return { g, d, pHome, ok: pk ? pk.ok : null, path: nbaPath(g, d) };
  });
  const rec = (t) => [...(st?.east || []), ...(st?.west || [])].find((r) => r.id === t.id) || null;
  return { rows, recX: rec(x), recY: rec(y) };
}

export default async function MatchupView({ x, y, data }) {
  const L = await getL();
  const { rows, recX, recY } = data;
  const vs = L.t(`${x.short} – ${y.short}`, `${x.short} vs ${y.short}`, `${x.short} – ${y.short}`);
  const done = rows.filter((r) => r.g.state === "post" && r.g.home.score != null && !r.g.postponed);
  const next = rows.find((r) => r.g.state !== "post" && !r.g.postponed) || null;
  const winsX = done.filter((r) => (r.g.home.id === x.id ? r.g.home.score > r.g.away.score : r.g.away.score > r.g.home.score)).length;
  const winsY = done.length - winsX;
  const when = (g) => `${fmtDate(L, g.date, { weekday: "long", month: "long", day: "numeric" })} · ${fmtTime(L, g.date)} ${L.tzLabel}`;
  const favOf = (r) => (r.pHome == null ? null : r.pHome >= 0.5 ? { t: r.g.home, p: r.pHome } : { t: r.g.away, p: 1 - r.pHome });
  const series = done.length
    ? L.t(`${x.short} ${winsX} – ${winsY} ${y.short}`, `${x.short} ${winsX}-${winsY} ${y.short}`, `${x.short} ${winsX} – ${winsY} ${y.short}`)
    : null;

  const faq = [];
  if (next) {
    const f = favOf(next);
    faq.push({
      q: L.t(`Qui va gagner ${vs} ?`, `Who will win ${vs}?`, `¿Quién ganará el ${vs}?`),
      a: f
        ? L.t(`Prochaine rencontre ${when(next.g)} : le modèle Basketlog voit les ${f.t.short} favoris à ${pctOf(f.p, L)}.`, `Next meeting ${when(next.g)}: the Basketlog model has the ${f.t.short} as the favorite at ${pctOf(f.p, L)}.`, `Próximo partido ${when(next.g)}: el modelo de Basketlog ve favoritos a los ${f.t.short} con un ${pctOf(f.p, L)}.`)
        : L.t(`Prochaine rencontre ${when(next.g)}. Le pronostic Basketlog est publié quelques jours avant le match.`, `Next meeting ${when(next.g)}. The Basketlog prediction is published a few days before the game.`, `Próximo partido ${when(next.g)}. El pronóstico de Basketlog se publica unos días antes.`),
    });
    faq.push({
      q: L.t(`Quand les ${x.short} jouent-ils contre les ${y.short} ?`, `When do the ${x.short} play the ${y.short}?`, `¿Cuándo juegan los ${x.short} contra los ${y.short}?`),
      a: rows.filter((r) => r.g.state !== "post").map((r) => `${fmtDate(L, r.g.date, { month: "short", day: "numeric" })} (${r.g.away.short} @ ${r.g.home.short})`).join(", ") + ".",
    });
  }
  if (series) faq.push({
    q: L.t(`Quel est le bilan ${vs} cette saison ?`, `What is the ${vs} head-to-head this season?`, `¿Cómo va el cara a cara ${vs} esta temporada?`),
    a: L.t(`Série de la saison : ${series} (${done.length} match${done.length > 1 ? "s" : ""} joué${done.length > 1 ? "s" : ""}).`, `Season series: ${series} (${done.length} game${done.length > 1 ? "s" : ""} played).`, `Serie de la temporada: ${series} (${done.length} partido${done.length > 1 ? "s" : ""} jugado${done.length > 1 ? "s" : ""}).`),
  });
  const ld = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;
  const recLine = (t, r) => (r ? `${t.short} ${r.wins}-${r.losses}${r.last10 ? ` · ${L.t("10 derniers", "last 10", "últimos 10")} ${r.last10}` : ""}` : t.short);

  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Pronostic ${vs}`, `${vs} prediction`, `Pronóstico ${vs}`)}</h1>
        <p>{L.t(
          `Toutes les rencontres ${vs} de la saison : probabilité de victoire, score projeté et résultat, avec le pronostic Basketlog enregistré avant chaque match.`,
          `Every ${vs} game this season: win probability, projected score and result, with the Basketlog prediction saved before each game.`,
          `Todos los ${vs} de la temporada: probabilidad de victoria, marcador proyectado y resultado, con el pronóstico de Basketlog guardado antes de cada partido.`
        )}</p>
        <p className="note">{recLine(x, recX)} · {recLine(y, recY)}{series ? ` · ${L.t("Série", "Series", "Serie")} ${series}` : ""}</p>
      </div>

      {next && (
        <section className="card block">
          <h2>{L.t("Prochaine rencontre", "Next meeting", "Próximo partido")}</h2>
          <p><b>{next.g.away.short} @ {next.g.home.short}</b> · {when(next.g)}</p>
          {favOf(next) && <p>{L.t("Favori Basketlog", "Basketlog favorite", "Favorito de Basketlog")} : <b>{favOf(next).t.short} {pctOf(favOf(next).p, L)}</b></p>}
          <p><Link className="btn-white" href={L.href(next.path)}>{L.t("Voir le pronostic complet →", "See the full prediction →", "Ver el pronóstico completo →")}</Link></p>
        </section>
      )}

      {rows.length > 0 && (
        <section className="card block">
          <h2>{L.t(`${vs} : toutes les rencontres de la saison`, `${vs}: every game this season`, `${vs}: todos los partidos de la temporada`)}</h2>
          <ul className="wk-list">
            {rows.map((r) => {
              const f = favOf(r);
              const fin = r.g.state === "post" && r.g.home.score != null && !r.g.postponed;
              return (
                <li key={r.g.id}>
                  <Link href={L.href(r.path)}>{fmtDate(L, r.g.date, { month: "short", day: "numeric" })} · {r.g.away.short} @ {r.g.home.short}</Link>
                  <span className="mono">
                    {fin ? ` · ${r.g.away.score}-${r.g.home.score}` : ""}
                    {f ? ` · ${L.t("favori", "favorite", "favorito")} ${f.t.short} ${pctOf(f.p, L)}` : ""}
                    {fin && r.ok != null ? (r.ok ? " ✅" : " ❌") : ""}
                    {r.g.postponed ? ` · ${L.t("reporté", "postponed", "aplazado")}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {faq.length > 0 && (
        <section className="card block match-faq">
          <h2>{L.t(`${vs} : l'essentiel`, `${vs}: quick answers`, `${vs}: lo esencial`)}</h2>
          {faq.map((f) => (
            <div key={f.q} className="mfaq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>
      )}

      <p className="note">
        <Link href={L.href(`/app/equipe/${x.id}`)}>{L.t(`Pronostics ${x.short}`, `${x.short} predictions`, `Pronósticos ${x.short}`)}</Link>{" · "}
        <Link href={L.href(`/app/equipe/${y.id}`)}>{L.t(`Pronostics ${y.short}`, `${y.short} predictions`, `Pronósticos ${y.short}`)}</Link>{" · "}
        <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA de ce soir", "NBA predictions tonight", "Pronósticos NBA de hoy")}</Link>
      </p>
    </main>
  );
}

