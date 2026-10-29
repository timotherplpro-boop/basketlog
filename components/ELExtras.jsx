import Link from "next/link";
import StatCompare from "./StatCompare";
import { mk } from "../lib/i18n";

const day = (iso, L) => { try { return new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, day: "numeric", month: "short", year: "2-digit" }).format(new Date(iso)); } catch { return ""; } };
const pct0 = (v) => `${Math.round(v)} %`;

function Form({ team, results, L }) {
  return (
    <div className="form-row">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <span className="form-team">{team.logo && <img src={team.logo} alt="" />}{team.abbr}</span>
      <div className="form-chips">
        {results.length ? results.map((r) => (
          <span key={r.id} className={`chip ${r.res === "W" ? "w" : "l"}`} title={`${r.ha} ${r.opp.name} · ${r.score}`}>
            <em>{r.res === "W" ? L.t("V", "W", "V") : L.t("D", "L", "D")}</em>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {r.opp.logo && <img src={r.opp.logo} alt={r.opp.name} />}
            <small>{r.score}</small>
          </span>
        )) : <span className="team-rec">{L.t("Pas encore de match joué.", "No games played yet.", "Todavía no se ha jugado ningún partido.")}</span>}
      </div>
    </div>
  );
}

// Sections enrichies de la fiche match EuroLeague.
export default function ELExtras({ a, games, prevGames, L = mk("fr") }) {
  const h = a.home, aw = a.away;
  const hc = h.cur, ac = aw.cur;
  const rows = [
    { label: L.t("Points marqués / match", "Points scored / game", "Puntos anotados / partido"), a: aw.ppg, h: h.ppg },
    { label: L.t("Points encaissés / match", "Points allowed / game", "Puntos encajados / partido"), a: aw.oppg, h: h.oppg, low: true },
    { label: L.t("Écart ajusté / match", "Adjusted margin / game", "Diferencia ajustada / partido"), a: aw.diff, h: h.diff },
    ...(hc && ac ? [
      { label: L.t("% de victoires", "Win %", "% de victorias"), a: (ac.wins / ac.gp) * 100, h: (hc.wins / hc.gp) * 100, fmt: pct0 },
      { label: L.t("Victoires à domicile", "Home wins", "Victorias en casa"), a: ac.hw, h: hc.hw, fmt: (v) => String(v) },
      { label: L.t("Victoires à l'extérieur", "Road wins", "Victorias fuera"), a: ac.rw, h: hc.rw, fmt: (v) => String(v) },
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
        <h2>{L.t("Stats comparées", "Stat comparison", "Estadísticas comparadas")} <span className="tag">{L.t("EuroLeague", "EuroLeague", "Euroliga")}</span></h2>
        <StatCompare away={aw.team} home={h.team} rows={rows} />
        {(!hc || !ac) && <p className="team-rec" style={{ marginTop: 10 }}>{L.t("Début de saison : les chiffres s'appuient aussi sur la saison passée.", "Early season: the numbers also lean on last season.", "Principio de temporada: las cifras también se apoyan en la temporada pasada.")}</p>}
      </div>
      <div className="grid2">
        <div className="card block">
          <h2>{L.t("Forme récente", "Recent form", "Forma reciente")}</h2>
          <div className="team-rec" style={{ marginBottom: 8 }}>{L.t("5 derniers matchs d'EuroLeague", "Last 5 EuroLeague games", "Últimos 5 partidos de Euroliga")}</div>
          <Form team={aw.team} results={ac?.form || []} L={L} />
          <Form team={h.team} results={hc?.form || []} L={L} />
        </div>
        <div className="card block">
          <h2>{L.t("Confrontations", "Head-to-head", "Enfrentamientos")}</h2>
          {meets.length ? (
            <div className="h2h">
              {meets.map((x) => (
                <Link key={x.season + x.id} href={x.season === a.game.season ? L.href(`/app/euroleague/match/${x.id}`) : "#"} className={`h2h-row ${`el-${x.id}` === a.game.id && x.season === a.game.season ? "cur" : ""}`}>
                  <span className="d">{day(x.date, L)}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="t">{x.away.logo && <img src={x.away.logo} alt="" />}{x.away.abbr}</span>
                  <span className="s">{x.played ? `${x.away.score} - ${x.home.score}` : `el-${x.id}` === a.game.id ? L.t("ce match", "this game", "este partido") : L.t("à venir", "upcoming", "próximamente")}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <span className="t">{x.home.abbr}{x.home.logo && <img src={x.home.logo} alt="" />}</span>
                </Link>
              ))}
            </div>
          ) : <p className="team-rec">{L.t("Aucune confrontation récente.", "No recent meetings.", "No hay enfrentamientos recientes.")}</p>}
        </div>
      </div>
    </>
  );
}
