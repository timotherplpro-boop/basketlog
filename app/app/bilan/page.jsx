import Link from "next/link";
import { nbaPicks, elPicks, summarize, lastDays } from "../../../lib/history";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { currentSeasonCode } from "../../../lib/euroleague";
import AppTabs from "../../../components/AppTabs";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Bilan du modèle : taux de réussite réel – Basketlog",
  description: "Chaque pronostic Basketlog comparé au score final, match par match. Taux de réussite NBA et EuroLeague, calibration et niveau de confiance.",
};

const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)} %`);
// Jour du match à l'heure locale du match (date NBA pour la NBA), pas de décalage d'une nuit.
const dayFr = (d) => {
  try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T12:00:00Z`)); } catch { return ""; }
};

function Row({ p, href }) {
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
      <span className="bl-pick">{fav.abbr} {pf} %</span>
      <span className="bl-res" aria-label={p.ok ? "Pronostic correct" : "Pronostic raté"}>{p.ok ? "✓" : "✗"}</span>
    </Link>
  );
}

export default async function BilanPage({ searchParams }) {
  const sp = await searchParams;
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
  const href = (p) => (view === "el" ? `/app/euroleague/match/${p.id}` : `/app/match/${p.id}?d=${p.d}`);

  // Derniers résultats, groupés par jour (plus récents d'abord).
  const recent = [...list].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 45);
  const groups = [];
  for (const p of recent) {
    const k = dayFr(p.d);
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.items.push(p); else groups.push({ k, items: [p] });
  }

  const tabs = [
    ["nba", `NBA ${label(season)}`],
    ["past", `NBA ${label(season - 1)} (test)`],
    ["el", "EuroLeague"],
  ];

  return (
    <main className="app-page wide">
      <AppTabs active="bilan" />
      <div className="app-head">
        <h1>Bilan du modèle</h1>
        <p>Chaque pronostic comparé au score final. Les bons comme les ratés.</p>
        <p className="note">Pas de chiffres choisis à la main : tout est recalculé automatiquement.</p>
      </div>

      <div className="bl-tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <Link key={k} href={`/app/bilan?l=${k}`} className={view === k ? "on" : ""} role="tab" aria-selected={view === k}>{l}</Link>
        ))}
      </div>

      {!picks ? (
        <div className="card block empty">Données momentanément indisponibles. Réessaie dans quelques minutes.</div>
      ) : !s.n ? (
        <div className="card block empty">Aucun match terminé pour l&apos;instant sur cette période.</div>
      ) : (
        <>
          <div className="kpis kpis8">
            <div className="card kpi bl-hero"><span>Bons pronostics</span><strong>{pct(s.pct)}</strong><small>{s.ok} sur {s.n} matchs</small></div>
            <div className="card kpi"><span>7 derniers jours</span><strong>{week.n ? pct(week.pct) : "–"}</strong><small>{week.n ? `${week.ok} sur ${week.n}` : "pas de match"}</small></div>
            <div className="card kpi"><span>Favoris à 70 % et plus</span><strong>{strong.n ? pct(strong.ok / strong.n) : "–"}</strong><small>{strong.n ? `${strong.ok} sur ${strong.n}` : "aucun pour l'instant"}</small></div>
            <div className="card kpi"><span>Erreur moyenne sur l&apos;écart</span><strong>{s.mae != null ? `${s.mae.toFixed(1).replace(".", ",")} pts` : "–"}</strong><small>score projeté vs réel</small></div>
          </div>

          <div className="grid2">
            <div className="card block">
              <h2>Selon le niveau de confiance</h2>
              <p className="team-rec" style={{ marginTop: 0 }}>Plus la confiance est haute, plus le favori doit gagner souvent.</p>
              {s.byConf.map((c) => (
                <div className="bl-bar" key={c.label}>
                  <span className="n">{c.label}</span>
                  <div className="track"><div style={{ width: `${c.n ? (c.ok / c.n) * 100 : 0}%` }} /></div>
                  <span className="v mono">{c.n ? pct(c.ok / c.n) : "–"} <small>({c.n})</small></span>
                </div>
              ))}
            </div>
            <div className="card block">
              <h2>Calibration</h2>
              <p className="team-rec" style={{ marginTop: 0 }}>Quand Basketlog annonce 70 %, le favori doit gagner environ 7 fois sur 10.</p>
              {s.buckets.map((b) => (
                <div className="bl-cal" key={b.lo}>
                  <span className="n">{Math.round(b.lo * 100)}-{Math.round(b.hi * 100)} %</span>
                  <div className="track">
                    {b.avg != null && <i className="pred" style={{ left: `${b.avg * 100}%` }} title="Probabilité annoncée" />}
                    <div style={{ width: `${b.n ? (b.ok / b.n) * 100 : 0}%` }} />
                  </div>
                  <span className="v mono">{b.n ? pct(b.ok / b.n) : "–"} <small>({b.n})</small></span>
                </div>
              ))}
              <p className="bl-legend"><span className="sw" /> victoires réelles du favori <span className="sw pred" /> probabilité annoncée</p>
            </div>
          </div>

          <div className="card block">
            <h2>Derniers résultats <span className="tag">{s.n} matchs</span></h2>
            {groups.map((g) => (
              <div key={g.k}>
                <div className="up-day">{g.k}</div>
                {g.items.map((p) => <Row key={p.id} p={p} href={href(p)} />)}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="card block bl-method">
        <h2>Comment ce bilan est calculé</h2>
        <p>Pour chaque match terminé, on refait tourner le modèle Basketlog <b>uniquement avec les résultats connus avant le coup d&apos;envoi</b>, puis on compare le favori désigné au vainqueur réel. Aucune information du futur n&apos;est utilisée.</p>
        <p>Les absences ne sont pas reprises dans ce bilan, car on ne connaît pas toujours la liste exacte d&apos;avant-match. Les pronostics affichés avant les matchs les prennent en compte : ils sont donc légèrement mieux informés que ce bilan.</p>
        <p>L&apos;onglet {label(season - 1)} est un test sur une saison entière déjà jouée, pour juger le modèle sur plus de 1 000 matchs.</p>
      </div>
      <p className="disclaimer">Basketlog n&apos;est pas un service de paris. Un bon taux de réussite passé ne garantit pas les résultats futurs.</p>
    </main>
  );
}
