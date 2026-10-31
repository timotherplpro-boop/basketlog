import Link from "next/link";
import { nbaPicks, elPicks, summarize, lastDays } from "../../../lib/history";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { currentSeasonCode } from "../../../lib/euroleague";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { confText } from "../../../lib/matchtext";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Bilan des pronostics NBA : taux de réussite réel – Basketlog", "NBA prediction track record: real accuracy – Basketlog", "Balance de pronósticos NBA: porcentaje de acierto real – Basketlog"),
    description: L.t(
      "Chaque pronostic Basketlog comparé au score final, match par match. Taux de réussite NBA et EuroLeague, calibration et niveau de confiance.",
      "Every Basketlog prediction compared with the final score, game by game. NBA and EuroLeague accuracy, calibration and confidence levels.", "Cada pronóstico de Basketlog comparado con el resultado final, partido a partido. Acierto en la NBA y la Euroliga, calibración y niveles de confianza."
    ),
    path: "/app/bilan",
    L,
  });
}

// Jour du match à l'heure locale du match (date NBA pour la NBA), pas de décalage d'une nuit.
const dayOf = (d, L) => {
  try { return new Intl.DateTimeFormat(L.locale, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`)); } catch { return ""; }
};

function Row({ p, href, L }) {
  const favHome = p.pHome >= 0.5;
  const fav = favHome ? p.home : p.away;
  const pf = Math.round(Math.max(p.pHome, 1 - p.pHome) * 100);
  return (
    <Link href={href} className={`bl-row ${p.ok ? "ok" : "ko"}`}>
      <span className="bl-m">
        <span className={`t ${!favHome ? "fav" : ""}`}>{p.away.abbr}{/* eslint-disable-next-line @next/next/no-img-element */}{p.away.logo && <img src={p.away.logo} alt="" />}</span>
        <b className="mono">{p.away.score} - {p.home.score}</b>
        <span className={`t ${favHome ? "fav" : ""}`}>{/* eslint-disable-next-line @next/next/no-img-element */}{p.home.logo && <img src={p.home.logo} alt="" />}{p.home.abbr}</span>
      </span>
      <span className="bl-pick">{fav.abbr} {pf}{L.en ? "%" : " %"}</span>
      <span className="bl-res" role="img" aria-label={p.ok ? L.t("Pronostic correct", "Correct prediction", "Pronóstico acertado") : L.t("Pronostic raté", "Missed prediction", "Pronóstico fallado")}>{p.ok ? "✓" : "✗"}</span>
    </Link>
  );
}

export default async function BilanPage({ searchParams }) {
  const sp = await searchParams;
  const L = await getL();
  const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)}${L.en ? "%" : " %"}`);
  const of = (a, b) => L.t(`${a} sur ${b}`, `${a} of ${b}`, `${a} de ${b}`);
  const view = ["nba", "past", "el"].includes(sp?.l) ? sp.l : "nba";
  const season = seasonForDate(nbaToday());
  const elYear = Number(currentSeasonCode().slice(1));
  const label = (y) => `${y - 1}-${String(y).slice(2)}`;

  const picks = view === "el" ? await elPicks() : await nbaPicks(view === "past" ? season - 1 : season);
  const list = picks || [];
  const s = summarize(list);
  const week = summarize(lastDays(list, 7));
  const strongL = list.filter((p) => Math.max(p.pHome, 1 - p.pHome) >= 0.7);
  const strong = { n: strongL.length, ok: strongL.filter((p) => p.ok).length };
  const href = (p) => L.href(view === "el" ? `/app/euroleague/match/${p.id}` : `/app/match/${p.id}?d=${p.d}`);

  // Derniers résultats, groupés par jour (plus récents d'abord).
  const recent = [...list].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 45);
  const groups = [];
  for (const p of recent) {
    const k = dayOf(p.d, L);
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.items.push(p); else groups.push({ k, items: [p] });
  }

  const tabs = [
    ["nba", `NBA ${label(season)}`],
    ["past", `NBA ${label(season - 1)} (${L.t("test", "backtest", "prueba")})`],
    ["el", L.t("EuroLeague", "EuroLeague", "Euroliga")],
  ];

  return (
    <main className="app-page wide">
      <AppTabs active="bilan" />
      <div className="app-head">
        <h1>{L.t("Bilan du modèle", "Model track record", "Balance del modelo")}</h1>
        <p>{L.t("Chaque pronostic comparé au score final. Les bons comme les ratés.", "Every prediction compared with the final score. The hits and the misses.", "Cada pronóstico comparado con el resultado final. Los aciertos y los fallos.")}</p>
        <p className="note">{L.t("Pas de chiffres choisis à la main : tout est recalculé automatiquement.", "No hand-picked numbers: everything is recalculated automatically.", "Sin cifras elegidas a dedo: todo se recalcula automáticamente.")}</p>
      </div>

      <div className="bl-tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <Link key={k} href={L.href(`/app/bilan?l=${k}`)} className={view === k ? "on" : ""} role="tab" aria-selected={view === k}>{l}</Link>
        ))}
      </div>

      {!picks ? (
        <div className="card block empty">{L.t("Données momentanément indisponibles. Réessaie dans quelques minutes.", "Data temporarily unavailable. Please try again in a few minutes.", "Datos no disponibles por el momento. Vuelve a intentarlo en unos minutos.")}</div>
      ) : !s.n ? (
        <div className="card block empty">{L.t("Aucun match terminé pour l'instant sur cette période.", "No completed games yet for this period.", "Todavía no hay partidos terminados en este periodo.")}</div>
      ) : (
        <>
          <div className="kpis kpis8">
            <div className="card kpi bl-hero"><span>{L.t("Bons pronostics", "Correct predictions", "Pronósticos acertados")}</span><strong>{pct(s.pct)}</strong><small>{L.t(`${s.ok} sur ${s.n} matchs`, `${s.ok} of ${s.n} games`, `${s.ok} de ${s.n} partidos`)}</small></div>
            <div className="card kpi"><span>{L.t("7 derniers jours", "Last 7 days", "Últimos 7 días")}</span><strong>{week.n ? pct(week.pct) : "–"}</strong><small>{week.n ? of(week.ok, week.n) : L.t("pas de match", "no games", "sin partidos")}</small></div>
            <div className="card kpi"><span>{L.t("Favoris à 70 % et plus", "Favorites at 70%+", "Favoritos al 70 % o más")}</span><strong>{strong.n ? pct(strong.ok / strong.n) : "–"}</strong><small>{strong.n ? of(strong.ok, strong.n) : L.t("aucun pour l'instant", "none yet", "ninguno por ahora")}</small></div>
            <div className="card kpi"><span>{L.t("Erreur moyenne sur l'écart", "Average margin error", "Error medio en la diferencia")}</span><strong>{s.mae != null ? (L.en ? `${s.mae.toFixed(1)} pts` : `${s.mae.toFixed(1).replace(".", ",")} pts`) : "–"}</strong><small>{L.t("score projeté vs réel", "projected vs actual score", "marcador proyectado vs. real")}</small></div>
          </div>

          <div className="grid2">
            <div className="card block">
              <h2>{L.t("Selon le niveau de confiance", "By confidence level", "Según el nivel de confianza")}</h2>
              <p className="team-rec" style={{ marginTop: 0 }}>{L.t("Plus la confiance est haute, plus le favori doit gagner souvent.", "The higher the confidence, the more often the favorite should win.", "Cuanto mayor es la confianza, más a menudo debe ganar el favorito.")}</p>
              {s.byConf.map((c) => (
                <div className="bl-bar" key={c.label}>
                  <span className="n">{confText(c.label, L)}</span>
                  <div className="track"><div style={{ width: `${c.n ? (c.ok / c.n) * 100 : 0}%` }} /></div>
                  <span className="v mono">{c.n ? pct(c.ok / c.n) : "–"} <small>({c.n})</small></span>
                </div>
              ))}
            </div>
            <div className="card block">
              <h2>{L.t("Calibration", "Calibration", "Calibración")}</h2>
              <p className="team-rec" style={{ marginTop: 0 }}>{L.t("Quand Basketlog annonce 70 %, le favori doit gagner environ 7 fois sur 10.", "When Basketlog says 70%, the favorite should win about 7 times out of 10.", "Cuando Basketlog anuncia un 70 %, el favorito debe ganar unas 7 veces de cada 10.")}</p>
              {s.buckets.map((b) => (
                <div className="bl-cal" key={b.lo}>
                  <span className="n">{Math.round(b.lo * 100)}-{Math.round(b.hi * 100)}{L.en ? "%" : " %"}</span>
                  <div className="track">
                    {b.avg != null && <i className="pred" style={{ left: `${b.avg * 100}%` }} title={L.t("Probabilité annoncée", "Stated probability", "Probabilidad anunciada")} />}
                    <div style={{ width: `${b.n ? (b.ok / b.n) * 100 : 0}%` }} />
                  </div>
                  <span className="v mono">{b.n ? pct(b.ok / b.n) : "–"} <small>({b.n})</small></span>
                </div>
              ))}
              <p className="bl-legend"><span className="sw" /> {L.t("victoires réelles du favori", "favorite's actual wins", "victorias reales del favorito")} <span className="sw pred" /> {L.t("probabilité annoncée", "stated probability", "probabilidad anunciada")}</p>
            </div>
          </div>

          <div className="card block">
            <h2>{L.t("Derniers résultats", "Recent results", "Últimos resultados")} <span className="tag">{L.t(`${s.n} matchs`, `${s.n} games`, `${s.n} partidos`)}</span></h2>
            {groups.map((g) => (
              <div key={g.k}>
                <div className="up-day">{g.k}</div>
                {g.items.map((p) => <Row key={p.id} p={p} href={href(p)} L={L} />)}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card block bl-method">
        {L.es ? (<>
          <h2>Cómo se calcula este balance</h2>
          <p>Para cada partido terminado, volvemos a ejecutar el modelo de Basketlog <b>solo con los resultados conocidos antes del salto inicial</b> y comparamos el favorito señalado con el ganador real. No se usa ninguna información del futuro.</p>
          <p>Las bajas no se incluyen en este balance, porque no siempre se conoce la lista exacta antes del partido. Los pronósticos que se muestran antes de los partidos sí las tienen en cuenta: por eso están algo mejor informados que este balance.</p>
          <p>La pestaña {label(season - 1)} es una prueba sobre una temporada completa ya jugada, para juzgar el modelo en más de 1000 partidos.</p>
        </>) : L.en ? (<>
          <h2>How this track record is calculated</h2>
          <p>For every completed game, we rerun the Basketlog model <b>using only the results known before tip-off</b>, then compare the predicted favorite with the actual winner. No information from the future is used.</p>
          <p>Injuries aren&apos;t included in this track record, because the exact pregame list isn&apos;t always known. The predictions shown before games do factor them in, so they are slightly better informed than this track record.</p>
          <p>The {label(season - 1)} tab is a backtest on a full season already played, to judge the model on more than 1,000 games.</p>
        </>) : (<>
          <h2>Comment ce bilan est calculé</h2>
          <p>Pour chaque match terminé, on refait tourner le modèle Basketlog <b>uniquement avec les résultats connus avant le coup d&apos;envoi</b>, puis on compare le favori désigné au vainqueur réel. Aucune information du futur n&apos;est utilisée.</p>
          <p>Les absences ne sont pas reprises dans ce bilan, car on ne connaît pas toujours la liste exacte d&apos;avant-match. Les pronostics affichés avant les matchs les prennent en compte : ils sont donc légèrement mieux informés que ce bilan.</p>
          <p>L&apos;onglet {label(season - 1)} est un test sur une saison entière déjà jouée, pour juger le modèle sur plus de 1 000 matchs.</p>
        </>)}
      </div>
      <p className="disclaimer">{L.t("Basketlog n'est pas un service de paris. Un bon taux de réussite passé ne garantit pas les résultats futurs.", "Basketlog is not a betting service. A good past track record does not guarantee future results.", "Basketlog no es un servicio de apuestas. Un buen porcentaje de acierto en el pasado no garantiza resultados futuros.")}</p>
    </main>
  );
}
