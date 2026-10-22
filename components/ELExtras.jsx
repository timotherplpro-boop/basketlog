import Link from "next/link";
import StatCompare from "./StatCompare";

const day = (iso) => { try { return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "short", year: "2-digit" }).format(new Date(iso)); } catch { return ""; } };
const pct0 = (v) => `${Math.round(v)} %`;

function Form({ team, results }) {
  return (
    <div className="form-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <span className="form-team">{team.logo && <img src={team.logo} alt="" />}{team.abbr}</span>
      <div className="form-chips">
        {results.length ? results.map((r) => (
          <span key={r.id} className={`chip ${r.res === "W" ? "w" : "l"}`} title={`${r.ha} ${r.opp.name} · ${r.score}`}>
            <em>{r.res === "W" ? "V" : "D"}</em>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.opp.logo && <img src={r.opp.logo} alt={r.opp.name} />}
            <small>{r.score}</small>
          </span>
        )) : <span className="team-rec">Pas encore de match joué.</span>}
      </div>
    </div>
  );
}

// Sections enrichies de la fiche match EuroLeague.
export default function ELExtras({ a, games, prevGames }) {
  const h = a.home, aw = a.away;
  const hc = h.cur, ac = aw.cur;
  const rows = [
    { label: "Points marqués / match", a: aw.ppg, h: h.ppg },
    { label: "Points encaissés / match", a: aw.oppg, h: h.oppg, low: true },
    { label: "Écart ajusté / match", a: aw.diff, h: h.diff },
    ...(hc && ac ? [
      { label: "% de victoires", a: (ac.wins / ac.gp) * 100, h: (hc.wins / hc.gp) * 100, fmt: pct0 },
      { label: "Victoires à domicile", a: ac.hw, h: hc.hw, fmt: (v) => String(v) },
      { label: "Victoires à l'extérieur", a: ac.rw, h: hc.rw, fmt: (v) => String(v) },
    ] : []),
  ];
  const ids = [h.team.id, aw.team.id];
  const meets = [...prevGames, ...games]
    .filter((g) => ids.includes(g.home.id) && ids.includes(g.away.id))
    .sort((x, y) => new Date(y.date) - new Date(x.date))
    .slice(0, 6);
  return (
    <>
      <div className="card block">
        <h2>Stats comparées <span className="tag">EuroLeague</span></h2>
        <StatCompare away={aw.team} home={h.team} rows={rows} />
        {(!hc || !ac) && <p className="team-rec" style={{ marginTop: 10 }}>Début de saison : les chiffres s&apos;appuient aussi sur la saison passée.</p>}
      </div>
      <div className="grid2">
        <div className="card block">
          <h2>Forme récente</h2>
          <div className="team-rec" style={{ marginBottom: 8 }}>5 derniers matchs d&apos;EuroLeague</div>
          <Form team={aw.team} results={ac?.form || []} />
          <Form team={h.team} results={hc?.form || []} />
        </div>
        <div className="card block">
          <h2>Confrontations</h2>
          {meets.length ? (
            <div className="h2h">
              {meets.map((x) => (
                <Link key={x.season + x.id} href={x.season === a.game.season ? `/app/euroleague/match/${x.id}` : "#"} className={`h2h-row ${`el-${x.id}` === a.game.id && x.season === a.game.season ? "cur" : ""}`}>
                  <span className="d">{day(x.date)}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="t">{x.away.logo && <img src={x.away.logo} alt="" />}{x.away.abbr}</span>
                  <span className="s">{x.played ? `${x.away.score} - ${x.home.score}` : `el-${x.id}` === a.game.id ? "ce match" : "à venir"}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="t">{x.home.abbr}{x.home.logo && <img src={x.home.logo} alt="" />}</span>
                </Link>
              ))}
            </div>
          ) : <p className="team-rec">Aucune confrontation récente.</p>}
        </div>
      </div>
    </>
  );
}
