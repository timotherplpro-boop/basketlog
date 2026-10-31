import Link from "next/link";
import { mk, fmtDate, fmtTime, pctOf } from "../lib/i18n";
import { confText } from "../lib/matchtext";

export function TeamLogo({ team, size = 30 }) {
  if (!team.logo) return <div style={{ width: size, height: size, borderRadius: 8, background: team.color }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={team.logo} alt={team.name} width={size} height={size} loading="lazy" />;
}

export function ProbBar({ pAway, pHome, away, home, L = mk("fr") }) {
  return (
    <div className="probbar" role="img" aria-label={`${away.abbr} ${pctOf(pAway, L)} – ${home.abbr} ${pctOf(pHome, L)}`}>
      <div style={{ width: `${pAway * 100}%`, background: "#6f675f" }} />
      <div style={{ width: `${pHome * 100}%`, background: "var(--orange)" }} />
    </div>
  );
}

export function parisTime(iso, L = mk("fr")) {
  return fmtTime(L, iso);
}
export function parisDay(iso, L = mk("fr")) {
  return fmtDate(L, iso, { weekday: "short", day: "numeric", month: "short" });
}

export function StatusTag({ game, L = mk("fr") }) {
  if (game.hypothetical) return <span className="tag hot">{L.t("Match hypothétique", "Hypothetical game", "Partido hipotético")}</span>;
  if (game.state === "in") return <span className="tag live">● {L.t("En direct", "Live", "En directo")}</span>;
  if (game.postponed === "canceled") return <span className="tag">{L.t("Annulé", "Canceled", "Cancelado")}</span>;
  if (game.postponed) return <span className="tag">{L.t("Reporté", "Postponed", "Aplazado")}</span>;
  if (game.state === "post") return <span className="tag">{L.t("Terminé", "Final", "Finalizado")}</span>;
  return <span className="tag">{parisDay(game.date, L)} · {parisTime(game.date, L)}{L.en ? " ET" : ""}</span>;
}

export function GameCard({ a, date, L = mk("fr") }) {
  const g = a.game;
  const favHome = a.pHome >= 0.5;
  const showScore = g.state !== "pre" && g.home.score != null;
  return (
    <Link href={L.href(`/app/match/${g.id}?d=${date}`)} className="card game">
      <div className="game-top">
        <StatusTag game={g} L={L} />
        {Math.max(a.pHome, a.pAway) > 0.72 ? <span className="tag hot">{L.t("Favori net", "Clear favorite", "Favorito claro")}</span> : Math.abs(a.pHome - 0.5) < 0.06 ? <span className="tag hot">{L.t("Indécis", "Toss-up", "Igualado")}</span> : <span>{L.t(`Confiance ${a.confidence.toLowerCase()}`, `${confText(a.confidence, L)} confidence`, `Confianza ${confText(a.confidence, L).toLowerCase()}`)}</span>}
      </div>
      {[g.away, g.home].map((t, i) => {
        const p = i === 0 ? a.pAway : a.pHome;
        const isFav = i === 0 ? !favHome : favHome;
        return (
          <div className="row" key={t.id}>
            <div className="t">
              <TeamLogo team={t} />
              <span>{t.short}</span>
              <span className="team-rec mono">{t.record || ""}</span>
            </div>
            <div className="p mono" style={{ color: isFav ? "var(--text)" : "var(--dim)" }}>
              {showScore ? t.score : pctOf(p, L)}
            </div>
          </div>
        );
      })}
      <ProbBar pAway={a.pAway} pHome={a.pHome} away={g.away} home={g.home} L={L} />
      <div className="game-foot">
        <span>{L.t("Projeté :", "Projected:", "Proyectado:")} <span className="mono">{Math.round(a.awayPts)}–{Math.round(a.homePts)}</span></span>
        <span>{L.t("Analyse →", "Analysis →", "Análisis →")}</span>
      </div>
    </Link>
  );
}
