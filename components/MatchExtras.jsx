import Link from "next/link";
import { getSummary, getTeamStats, getPlayerStats, nbaDateOf, nbaToday, seasonForDate } from "../lib/espn";
import { nbaRecentForm } from "../lib/data";
import StatCompare from "./StatCompare";
import { mk, numOf, pctOf } from "../lib/i18n";

const initials = (n) => String(n || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

// Joueurs à suivre : les 3 meilleurs marqueurs de la saison qui ne sont pas annoncés absents, chacun une seule fois.
function topPlayers(stats, teamId, inj) {
  const outIds = new Set(inj.out.map((i) => i.id).filter(Boolean));
  const outNames = new Set(inj.out.map((i) => i.player));
  return Object.values(stats || {})
    .filter((p) => p.team === String(teamId) && p.gp > 0 && p.ppg != null && !outIds.has(p.id) && !outNames.has(p.name))
    .sort((x, y) => y.ppg - x.ppg)
    .slice(0, 3);
}
// Meilleurs joueurs d'un match terminé (meneurs ESPN), regroupés : un joueur qui mène deux catégories n'apparaît qu'une fois.
function mergeLeaders(list) {
  const m = new Map();
  for (const p of list || []) {
    if (!m.has(p.name)) m.set(p.name, { ...p, more: [] });
    else m.get(p.name).more.push(p);
  }
  return [...m.values()];
}
const day = (iso, L) => {
  try { return new Intl.DateTimeFormat(L.locale, { timeZone: L.tz, day: "numeric", month: "short" }).format(new Date(iso)); } catch { return ""; }
};

function Head({ p }) {
  // eslint-disable-next-line @next/next/no-img-element
  return p.head ? <img className="pl-head" src={p.head} alt="" loading="lazy" /> : <span className="pl-head ph" aria-hidden>{initials(p.name)}</span>;
}

function Players({ team, season, leaders, title, L }) {
  const pos = (p) => `${p.pos || ""}${p.jersey ? ` · #${p.jersey}` : ""}`;
  const rows = season
    ? season.map((p) => (
        <div className="pl-row" key={p.id}>
          <Head p={p} />
          <span className="pl-id"><b>{p.name}</b><small>{[pos(p), p.reb != null && `${numOf(p.reb, L)} ${L.t("reb.", "reb", "reb.")}`, p.ast != null && `${numOf(p.ast, L)} ${L.t("passes", "ast", "asist.")}`].filter(Boolean).join(" · ")}</small></span>
          <span className="pl-val"><strong>{numOf(p.ppg, L)}</strong><small>{L.t("pts / match", "pts / game", "pts / partido")}</small></span>
        </div>
      ))
    : mergeLeaders(leaders).map((p) => (
        <div className="pl-row" key={p.name}>
          <Head p={p} />
          <span className="pl-id"><b>{p.name}</b><small>{[pos(p), ...p.more.map((x) => `${x.value} ${catLabel(x.cat, L)}`)].filter(Boolean).join(" · ")}</small></span>
          <span className="pl-val"><strong>{p.value}</strong><small>{catLabel(p.cat, L)}</small></span>
        </div>
      ));
  return (
    <div className="pl-col">
      <div className="pl-team">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team.logo && <img src={team.logo} alt="" />}{team.short}
      </div>
      {rows.length ? rows : <div className="team-rec">{title === "game" ? L.t("Pas encore de données.", "No data yet.", "Todavía no hay datos.") : L.t("Pas encore de match joué cette saison.", "No games played yet this season.", "Todavía no se ha jugado ningún partido esta temporada.")}</div>}
    </div>
  );
}

const pct1 = (v, L) => `${numOf(v, L)}${L.en ? "%" : "\u202f%"}`;

const catLabel = (c, L) => L.t(
  { Points: "pts / match", Rebounds: "rebonds", Assists: "passes", "Points Per Game": "pts / match", "Rebounds Per Game": "rebonds", "Assists Per Game": "passes" },
  { Points: "pts / game", Rebounds: "rebounds", Assists: "assists", "Points Per Game": "pts / game", "Rebounds Per Game": "rebounds", "Assists Per Game": "assists" },
  { Points: "pts / partido", Rebounds: "rebotes", Assists: "asistencias", "Points Per Game": "pts / partido", "Rebounds Per Game": "rebotes", "Assists Per Game": "asistencias" }
)[c] || c;

function Form({ team, games, L }) {
  const sc = (g) => g.score.replace("-", " - ");
  return (
    <div className="form-row">
      <span className="form-team">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {team.logo && <img src={team.logo} alt="" />}{team.abbr}
      </span>
      <div className="form-chips">
        {games.length ? games.map((g, i) => (
          <span key={i} className={`chip ${g.res === "W" ? "w" : g.res === "L" ? "l" : ""}`} title={`${g.ha} ${g.opp} · ${sc(g)}`}>
            <em>{g.res === "W" ? L.t("V", "W", "V") : g.res === "L" ? L.t("D", "L", "D") : "–"}</em>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {g.oppLogo && <img src={g.oppLogo} alt={g.opp} />}
            <small>{g.score}</small>
          </span>
        )) : <span className="team-rec">{L.t("Pas encore de match joué.", "No games played yet.", "Todavía no se ha jugado ningún partido.")}</span>}
      </div>
    </div>
  );
}

// Sections enrichies de la fiche match (stats comparées, joueurs, forme, confrontations, 2e avis).
export default async function MatchExtras({ a, L = mk("fr") }) {
  const g = a.game;
  const post = g.state === "post";
  const season = seasonForDate(g.date ? nbaDateOf(g.date) : nbaToday());
  const [sum, hs, as, players, form] = await Promise.all([
    g.hypothetical ? null : getSummary(g.id),
    getTeamStats(g.home.id),
    getTeamStats(g.away.id),
    post ? null : getPlayerStats(season),
    nbaRecentForm([g.home.id, g.away.id], g.hypothetical || g.state === "pre" ? null : g.date),
  ]);
  const h = a.home, aw = a.away;
  // Avant le match : meilleurs marqueurs disponibles de la saison ; match terminé : meilleurs joueurs du match.
  const seasonPlayers = (t, inj) => { const l = topPlayers(players, t.id, inj); return l.length ? l : null; };

  const rows = [
    { label: L.t("Points marqués / match", "Points scored / game", "Puntos anotados / partido"), a: aw.ppg, h: h.ppg },
    { label: L.t("Points encaissés / match", "Points allowed / game", "Puntos encajados / partido"), a: aw.oppg, h: h.oppg, low: true },
    ...(hs && as ? [
      { label: L.t("Adresse aux tirs", "Field goal %", "% de tiros de campo"), a: as.fgPct, h: hs.fgPct, fmt: (v) => pct1(v, L) },
      { label: L.t("Adresse à 3 points", "3-point %", "% de triples"), a: as.threePct, h: hs.threePct, fmt: (v) => pct1(v, L) },
      { label: L.t("Tirs à 3 pts tentés / match", "3-pointers attempted / game", "Triples intentados / partido"), a: as.threeAtt, h: hs.threeAtt },
      { label: L.t("Lancers francs", "Free throw %", "% de tiros libres"), a: as.ftPct, h: hs.ftPct, fmt: (v) => pct1(v, L) },
      { label: L.t("Rebonds / match", "Rebounds / game", "Rebotes / partido"), a: as.reb, h: hs.reb },
      { label: L.t("Passes décisives / match", "Assists / game", "Asistencias / partido"), a: as.ast, h: hs.ast },
      { label: L.t("Interceptions / match", "Steals / game", "Robos / partido"), a: as.stl, h: hs.stl },
      { label: L.t("Contres / match", "Blocks / game", "Tapones / partido"), a: as.blk, h: hs.blk },
      { label: L.t("Balles perdues / match", "Turnovers / game", "Pérdidas / partido"), a: as.tov, h: hs.tov, low: true },
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
    serText = L.t(
      !done.length ? `${ser.total || ser.games.length} confrontations prévues cette saison.` : w1 === w2 ? `Égalité ${w1}-${w2} cette saison.` : `${w1 > w2 ? t1 : t2} mène ${Math.max(w1, w2)}-${Math.min(w1, w2)} cette saison.`,
      !done.length ? `${ser.total || ser.games.length} meetings scheduled this season.` : w1 === w2 ? `Tied ${w1}-${w2} this season.` : `${w1 > w2 ? t1 : t2} lead ${Math.max(w1, w2)}-${Math.min(w1, w2)} this season.`,
      !done.length ? `${ser.total || ser.games.length} enfrentamientos previstos esta temporada.` : w1 === w2 ? `Empate ${w1}-${w2} esta temporada.` : `${w1 > w2 ? t1 : t2} gana la serie ${Math.max(w1, w2)}-${Math.min(w1, w2)} esta temporada.`
    );
  }

  return (
    <>
      <div className="card block">
        <h2>{L.t("Stats comparées", "Stat comparison", "Estadísticas comparadas")} <span className="tag">{L.t("Saison en cours", "Current season", "Temporada en curso")}</span></h2>
        <StatCompare away={aw.team} home={h.team} rows={rows} L={L} />
        {(!hs || !as) && <p className="team-rec" style={{ marginTop: 10 }}>{L.t("Stats de tirs indisponibles pour le moment.", "Shooting stats unavailable for now.", "Estadísticas de tiro no disponibles por ahora.")}</p>}
      </div>

      {(sum || players) && (
        <div className="card block">
          <h2>{post ? L.t("Meilleurs joueurs du match", "Top performers", "Mejores jugadores del partido") : L.t("Joueurs à suivre", "Players to watch", "Jugadores a seguir")}</h2>
          <div className="grid2 pl-grid">
            <Players team={aw.team} season={post ? null : seasonPlayers(aw.team, aw.inj)} leaders={sum?.leaders[aw.team.id]} title={post ? "game" : "season"} L={L} />
            <Players team={h.team} season={post ? null : seasonPlayers(h.team, h.inj)} leaders={sum?.leaders[h.team.id]} title={post ? "game" : "season"} L={L} />
          </div>
          {!post && <p className="team-rec" style={{ marginBottom: 0 }}>{L.t("Meilleurs marqueurs de la saison, hors joueurs annoncés absents.", "Season's top scorers, excluding players ruled out.", "Máximos anotadores de la temporada, sin contar a los jugadores de baja.")}</p>}
        </div>
      )}

      {(sum || form) && (
        <div className="grid2">
          <div className="card block">
            <h2>{L.t("Derniers résultats", "Latest results", "Últimos resultados")}</h2>
            <div className="team-rec" style={{ marginBottom: 8 }}>{L.t("5 derniers matchs de la saison, avec le score", "Last 5 games of the season, with the score", "Últimos 5 partidos de la temporada, con el marcador")}</div>
            <Form team={aw.team} games={form?.[aw.team.id] || []} L={L} />
            <Form team={h.team} games={form?.[h.team.id] || []} L={L} />
          </div>
          <div className="card block">
            <h2>{L.t("Confrontations", "Head-to-head", "Enfrentamientos")}</h2>
            {ser ? (
              <>
                <p className="team-rec" style={{ marginTop: 0 }}>{serText}</p>
                <div className="h2h">
                  {ser.games.map((x) => (
                    <Link key={x.id} href={L.href(`/app/match/${x.id}?d=${nbaDateOf(x.date)}`)} className={`h2h-row ${x.id === g.id ? "cur" : ""}`}>
                      <span className="d">{day(x.date, L)}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="t">{x.away.logo && <img src={x.away.logo} alt="" />}{x.away.abbr}</span>
                      <span className="s">{x.state === "post" && x.home.score != null ? `${x.away.score} - ${x.home.score}` : x.state === "postponed" ? L.t("reporté", "postponed", "aplazado") : x.id === g.id ? L.t("ce match", "this game", "este partido") : L.t("à venir", "upcoming", "próximamente")}</span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <span className="t">{x.home.abbr}{x.home.logo && <img src={x.home.logo} alt="" />}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : <p className="team-rec">{L.t("Pas de confrontation programmée cette saison.", "No meetings scheduled this season.", "No hay enfrentamientos programados esta temporada.")}</p>}
          </div>
        </div>
      )}

      {sum?.predictor && !post && (
        <div className="card block">
          <h2>{L.t("Deuxième avis", "Second opinion", "Segunda opinión")}</h2>
          <p className="team-rec" style={{ marginTop: 0 }}>{L.t("Notre modèle comparé au modèle public d'ESPN (BPI). Quand ils sont d'accord, le pronostic est plus solide.", "Our model compared with ESPN's public model (BPI). When they agree, the prediction is more solid.", "Nuestro modelo comparado con el modelo público de ESPN (BPI). Cuando coinciden, el pronóstico es más sólido.")}</p>
          {[["Basketlog", a.pHome], ["ESPN BPI", sum.predictor.home]].map(([n, p]) => (
            <div className="second" key={n}>
              <span className="n">{n}</span>
              <div className="probbar"><div style={{ width: `${(1 - p) * 100}%`, background: "#5b6273" }} /><div style={{ width: `${p * 100}%`, background: "var(--orange)" }} /></div>
              <span className="v mono">{aw.team.abbr} {pctOf(1 - p, L)} · {h.team.abbr} {pctOf(p, L)}</span>
            </div>
          ))}
          <p className="team-rec" style={{ marginBottom: 0 }}>
            {(a.pHome >= 0.5) === (sum.predictor.home >= 0.5) ? L.t("✓ Les deux modèles désignent le même favori.", "✓ Both models pick the same favorite.", "✓ Los dos modelos señalan al mismo favorito.") : L.t("⚠ Les deux modèles ne sont pas d'accord : match à prendre avec prudence.", "⚠ The two models disagree: handle this game with caution.", "⚠ Los dos modelos no coinciden: partido para tomar con prudencia.")}
          </p>
        </div>
      )}
    </>
  );
}
