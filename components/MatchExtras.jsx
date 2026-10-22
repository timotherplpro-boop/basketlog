import Link from "next/link";
import { getSummary, getTeamStats, nbaDateOf } from "../lib/espn";
import StatCompare from "./StatCompare";

const pct1 = (v) => `${v.toFixed(1)} %`;
const day = (iso) => {
  try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short" }).format(new Date(iso)); } catch { return ""; }
};

function Players({ team, list, title }) {
  return (
    <div className="pl-col">
      <div className="pl-team">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team.logo && <img src={team.logo} alt="" />}{team.short}
      </div>
      {list.length ? list.map((p) => (
        <div className="pl-row" key={p.cat + p.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.head ? <img className="pl-head" src={p.head} alt="" loading="lazy" /> : <span className="pl-head ph" />}
          <span className="pl-id"><b>{p.name}</b><small>{p.pos}{p.jersey ? ` · #${p.jersey}` : ""}</small></span>
          <span className="pl-val"><strong>{p.value}</strong><small>{catFr(p.cat)}</small></span>
        </div>
      )) : <div className="team-rec">{title === "game" ? "Pas encore de données." : "Pas encore de match joué cette saison."}</div>}
    </div>
  );
}

const catFr = (c) => ({ Points: "pts / match", Rebounds: "rebonds", Assists: "passes", "Points Per Game": "pts / match", "Rebounds Per Game": "rebonds", "Assists Per Game": "passes" }[c] || c);

function Form({ team, games }) {
  return (
    <div className="form-row">
      <span className="form-team">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team.logo && <img src={team.logo} alt="" />}{team.abbr}
      </span>
      <div className="form-chips">
        {games.length ? games.map((g, i) => (
          <span key={i} className={`chip ${g.res === "W" ? "w" : g.res === "L" ? "l" : ""}`} title={`${g.ha} ${g.opp} · ${g.score}`}>
            <em>{g.res === "W" ? "V" : g.res === "L" ? "D" : "–"}</em>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {g.oppLogo && <img src={g.oppLogo} alt={g.opp} />}
            <small>{g.score}</small>
          </span>
        )) : <span className="team-rec">Pas encore de match joué.</span>}
      </div>
    </div>
  );
}

// Sections enrichies de la fiche match (stats comparées, joueurs, forme, confrontations, 2e avis).
export default async function MatchExtras({ a }) {
  const g = a.game;
  const [sum, hs, as] = await Promise.all([
    g.hypothetical ? null : getSummary(g.id),
    getTeamStats(g.home.id),
    getTeamStats(g.away.id),
  ]);
  const h = a.home, aw = a.away;
  const post = g.state === "post";

  const rows = [
    { label: "Points marqués / match", a: aw.ppg, h: h.ppg },
    { label: "Points encaissés / match", a: aw.oppg, h: h.oppg, low: true },
    ...(hs && as ? [
      { label: "Adresse aux tirs", a: as.fgPct, h: hs.fgPct, fmt: pct1 },
      { label: "Adresse à 3 points", a: as.threePct, h: hs.threePct, fmt: pct1 },
      { label: "Tirs à 3 pts tentés / match", a: as.threeAtt, h: hs.threeAtt },
      { label: "Lancers francs", a: as.ftPct, h: hs.ftPct, fmt: pct1 },
      { label: "Rebonds / match", a: as.reb, h: hs.reb },
      { label: "Passes décisives / match", a: as.ast, h: hs.ast },
      { label: "Interceptions / match", a: as.stl, h: hs.stl },
      { label: "Contres / match", a: as.blk, h: hs.blk },
      { label: "Balles perdues / match", a: as.tov, h: hs.tov, low: true },
    ] : []),
  ];

  const ser = sum?.series;
  let serText = "";
  if (ser) {
    const done = ser.games.filter((x) => x.state === "post" && x.home.score != null);
    const wins = {};
    done.forEach((x) => { const w = x.home.winner ? x.home : x.away; wins[w.abbr] = (wins[w.abbr] || 0) + 1; });
    const [t1, t2] = [aw.team.abbr, h.team.abbr];
    const w1 = wins[t1] || 0, w2 = wins[t2] || 0;
    serText = !done.length ? `${ser.total || ser.games.length} confrontations prévues cette saison.` : w1 === w2 ? `Égalité ${w1}-${w2} cette saison.` : `${w1 > w2 ? t1 : t2} mène ${Math.max(w1, w2)}-${Math.min(w1, w2)} cette saison.`;
  }

  return (
    <>
      <div className="card block">
        <h2>Stats comparées <span className="tag">Saison en cours</span></h2>
        <StatCompare away={aw.team} home={h.team} rows={rows} />
        {(!hs || !as) && <p className="team-rec" style={{ marginTop: 10 }}>Stats de tirs indisponibles pour le moment.</p>}
      </div>

      {sum && (
        <div className="card block">
          <h2>{post ? "Meilleurs joueurs du match" : "Joueurs à suivre"}</h2>
          <div className="grid2 pl-grid">
            <Players team={aw.team} list={sum.leaders[aw.team.id] || []} title={post ? "game" : "season"} />
            <Players team={h.team} list={sum.leaders[h.team.id] || []} title={post ? "game" : "season"} />
          </div>
        </div>
      )}

      {sum && (
        <div className="grid2">
          <div className="card block">
            <h2>Forme récente</h2>
            <div className="team-rec" style={{ marginBottom: 8 }}>5 derniers matchs (présaison comprise en début de saison)</div>
            <Form team={aw.team} games={sum.form[aw.team.id] || []} />
            <Form team={h.team} games={sum.form[h.team.id] || []} />
          </div>
          <div className="card block">
            <h2>Confrontations</h2>
            {ser ? (
              <>
                <p className="team-rec" style={{ marginTop: 0 }}>{serText}</p>
                <div className="h2h">
                  {ser.games.map((x) => (
                    <Link key={x.id} href={`/app/match/${x.id}?d=${nbaDateOf(x.date)}`} className={`h2h-row ${x.id === g.id ? "cur" : ""}`}>
                      <span className="d">{day(x.date)}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="t">{x.away.logo && <img src={x.away.logo} alt="" />}{x.away.abbr}</span>
                      <span className="s">{x.state === "post" && x.home.score != null ? `${x.away.score} - ${x.home.score}` : x.id === g.id ? "ce match" : "à venir"}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="t">{x.home.abbr}{x.home.logo && <img src={x.home.logo} alt="" />}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : <p className="team-rec">Pas de confrontation programmée cette saison.</p>}
          </div>
        </div>
      )}

      {sum?.predictor && !post && (
        <div className="card block">
          <h2>Deuxième avis</h2>
          <p className="team-rec" style={{ marginTop: 0 }}>Notre modèle comparé au modèle public d&apos;ESPN (BPI). Quand ils sont d&apos;accord, le pronostic est plus solide.</p>
          {[["Basketlog", a.pHome], ["ESPN BPI", sum.predictor.home]].map(([n, p]) => (
            <div className="second" key={n}>
              <span className="n">{n}</span>
              <div className="probbar"><div style={{ width: `${(1 - p) * 100}%`, background: "#5b6273" }} /><div style={{ width: `${p * 100}%`, background: "var(--orange)" }} /></div>
              <span className="v mono">{aw.team.abbr} {Math.round((1 - p) * 100)}% · {h.team.abbr} {Math.round(p * 100)}%</span>
            </div>
          ))}
          <p className="team-rec" style={{ marginBottom: 0 }}>
            {(a.pHome >= 0.5) === (sum.predictor.home >= 0.5) ? "✓ Les deux modèles désignent le même favori." : "⚠ Les deux modèles ne sont pas d'accord : match à prendre avec prudence."}
          </p>
        </div>
      )}
    </>
  );
}
