import Link from "next/link";
import { fmt, pct } from "../lib/model";
import { aiNarrative } from "../lib/narrative";
import { TeamLogo, ProbBar, StatusTag } from "./ui";
import Gate from "./Gate";
import AppTabs from "./AppTabs";
import MatchExtras from "./MatchExtras";

function Signed({ v }) {
  return <span className={v > 0.05 ? "pos" : v < -0.05 ? "neg" : ""}>{fmt(v)}</span>;
}

export default async function MatchView({ a, backHref = "/app", league = "NBA", extras = null }) {
  const isNBA = league === "NBA";
  const teamHref = (t) => (isNBA ? `/app/equipe/${t.id}` : `/app/euroleague/equipe/${t.id}`);
  const g = a.game;
  const h = a.home, aw = a.away;
  const narrative = await aiNarrative(a);
  const showScore = g.state !== "pre" && g.home.score != null;

  const rows = [
    ["Bilan", aw.cur ? `${aw.cur.wins}-${aw.cur.losses}` : g.away.record || "–", h.cur ? `${h.cur.wins}-${h.cur.losses}` : g.home.record || "–"],
    ["Points marqués / match", aw.ppg.toFixed(1), h.ppg.toFixed(1)],
    ["Points encaissés / match", aw.oppg.toFixed(1), h.oppg.toFixed(1)],
    ["Écart ajusté / match", fmt(aw.diff), fmt(h.diff)],
    ["Série en cours", aw.cur?.streak || "–", h.cur?.streak || "–"],
    ["10 derniers matchs", aw.cur?.last10 || "–", h.cur?.last10 || "–"],
    ["Bilan dom. / ext.", aw.cur?.road ? `${aw.cur.road} ext.` : "–", h.cur?.home ? `${h.cur.home} dom.` : "–"],
    ["Saison passée", aw.prev ? `${aw.prev.wins}-${aw.prev.losses} (${fmt(aw.prev.diff)})` : "–", h.prev ? `${h.prev.wins}-${h.prev.losses} (${fmt(h.prev.diff)})` : "–"],
    ...(g.hypothetical || league !== "NBA" ? [] : [["A joué hier", aw.b2b ? "Oui" : "Non", h.b2b ? "Oui" : "Non"]]),
  ];

  return (
    <main className="app-page">
      <AppTabs active={isNBA ? "analyse" : "euroleague"} />
      <Link href={backHref} className="back">← Retour</Link>

      <div className="card match-hero">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <StatusTag game={g} />
          <span className="team-rec">{[g.venue, g.broadcast].filter(Boolean).join(" · ")}</span>
        </div>
        <div className="match-teams">
          <Link href={teamHref(g.away)} className="team"><TeamLogo team={g.away} size={92} /><div className="team-name">{g.away.name}</div><div className="team-rec mono">{g.away.record || "0-0"} · extérieur</div></Link>
          <div className="proj">
            <div className="label">{showScore ? (g.state === "in" ? "Score en direct" : "Score final") : "Score projeté"}</div>
            <div className="score">{showScore ? `${g.away.score}-${g.home.score}` : `${Math.round(a.awayPts)}-${Math.round(a.homePts)}`}</div>
            {showScore && <div className="team-rec mono">Projeté : {Math.round(a.awayPts)}-{Math.round(a.homePts)}</div>}
          </div>
          <Link href={teamHref(g.home)} className="team"><TeamLogo team={g.home} size={92} /><div className="team-name">{g.home.name}</div><div className="team-rec mono">{g.home.record || "0-0"} · domicile</div></Link>
        </div>
        <div style={{ marginTop: 26 }}>
          <ProbBar pAway={a.pAway} pHome={a.pHome} away={g.away} home={g.home} />
          <div className="prob-labels mono">
            <span><strong>{pct(a.pAway)}</strong> victoire {g.away.abbr}</span>
            <span>victoire {g.home.abbr} <strong>{pct(a.pHome)}</strong></span>
          </div>
        </div>
      </div>

      {g.hypothetical && (
        <div className="hypo">Ces deux équipes ne se jouent pas dans les 3 prochaines semaines : voici l&apos;analyse d&apos;un match hypothétique, avec les {g.home.short} à domicile.</div>
      )}

      <div className="kpis">
        <div className="card kpi"><span>Favori</span><strong>{a.fav.team.abbr}</strong></div>
        <div className="card kpi"><span>Écart projeté</span><strong>{Math.abs(a.margin).toFixed(1)}</strong></div>
        <div className="card kpi"><span>Total projeté</span><strong>{Math.round(a.total)}</strong></div>
        <div className="card kpi"><span>Confiance</span><strong>{a.confidence}</strong></div>
      </div>

      <Gate matchId={g.id}>
        <div className="card block">
          <h2>L&apos;analyse {narrative.source === "ai" ? <span className="tag hot">IA</span> : <span className="tag">Modèle</span>}</h2>
          <p className="narr">{narrative.text}</p>
          {narrative.keys.length > 0 && <ul className="keys">{narrative.keys.map((k, i) => <li key={i}>{k}</li>)}</ul>}
        </div>

        <div className="grid2">
          <div className="card block">
            <h2>Ce qui fait pencher la balance</h2>
            <div className="team-rec" style={{ marginBottom: 6 }}>En points, positif = avantage {g.home.short}</div>
            {a.factors.map((f) => (
              <div className="factor" key={f.label}><div>{f.label}<small>{f.detail}</small></div><div className="v mono"><Signed v={f.value} /></div></div>
            ))}
            <div className="factor"><div><b>Marge attendue</b><small>pour {g.home.short}</small></div><div className="v mono"><Signed v={a.margin} /></div></div>
          </div>
          <div className="card block">
            <h2>Scénarios</h2>
            <div className="scen">
              {a.scenarios.map((s) => (
                <div className="scen-row" key={s.label}>
                  <div>{s.label}<div className="scen-bar"><div style={{ width: `${Math.round(s.p * 100)}%` }} /></div></div>
                  <div className="mono" style={{ textAlign: "right", fontWeight: 700 }}>{pct(s.p)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {isNBA ? <MatchExtras a={a} /> : extras}

        <div className="card block">
          <h2>Fiche des deux équipes</h2>
          <table className="cmp">
            <thead><tr><th>{g.away.abbr}</th><th></th><th>{g.home.abbr}</th></tr></thead>
            <tbody>{rows.map(([l, x, y]) => <tr key={l}><td className="mono">{x}</td><td>{l}</td><td className="mono">{y}</td></tr>)}</tbody>
          </table>
        </div>

        {isNBA && (
        <div className="grid2">
          {[aw, h].map((s) => (
            <div className="card block" key={s.team.id}>
              <h2><TeamLogo team={s.team} size={24} /> Infirmerie {s.team.short}</h2>
              {s.inj.out.length + s.inj.doubtful.length === 0 ? (
                <div className="team-rec">Aucune absence signalée.</div>
              ) : (
                <div className="inj">
                  {[...s.inj.out, ...s.inj.doubtful].map((i) => (
                    <div className="inj-row" key={i.player}><span>{i.player} <span className="team-rec">{i.pos}</span></span><span className={/out/i.test(i.status) ? "neg" : ""}>{i.status}</span></div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        )}
      </Gate>

      <p className="disclaimer">
        Probabilités estimées par le modèle Basketlog à partir des données publiques disponibles{a.minSample < 5 ? " ; en début de saison, elles s'appuient largement sur la saison précédente" : ""}. Elles ne constituent ni une certitude ni un conseil de pari.
      </p>
    </main>
  );
}
