import Link from "next/link";
import { fmtDate, fmtTime, pctOf } from "../lib/i18n";
import { confText } from "../lib/matchtext";
import { RECORD_MIN } from "../lib/sure";

// Accueil : les pronostics « Confiance très élevée » (favori à 88 % et plus) des prochains jours, avec le bilan réel
// de ce niveau. Rien à ce niveau : on le dit, et on montre le favori le plus net avec sa vraie confiance.
const seasonLabel = (y) => `${y - 1}-${String(y).slice(2)}`;

function when(p, today, L) {
  const time = fmtTime(L, p.date);
  if (p.d !== today) return `${fmtDate(L, p.date, { weekday: "short", day: "numeric", month: "short" })} · ${time}`;
  // Le soir même : en France, un match NBA tombe le plus souvent dans la nuit.
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: L.tz, hour: "2-digit", hourCycle: "h23" }).format(new Date(p.date)));
  return `${L.t(hour >= 12 ? "Ce soir" : "Cette nuit", "Tonight", "Esta noche")} · ${time}`;
}

function Card({ p, today, L, i }) {
  const favHome = p.pHome >= 0.5;
  const fav = favHome ? p.home : p.away;
  const pf = Math.max(p.pHome, 1 - p.pHome);
  const n = Math.round(pf * 100);
  const [sa, sh] = [Math.round(p.awayPts), Math.round(p.homePts)];
  const team = (t, isFav) => (
    <span className={`su-team${isFav ? " fav" : ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {t.logo ? <img src={t.logo} alt="" /> : <i className="su-noimg" />}
      <b>{t.abbr}</b>
    </span>
  );
  return (
    <div className="su-cell reveal" style={{ "--d": `${150 + i * 120}ms` }}>
      <Link href={L.href(p.href)} className="su-card">
        <span className="su-top">
          <span className="su-lg">{p.league === "EL" ? L.t("EuroLeague", "EuroLeague", "Euroliga") : "NBA"}</span>
          <time dateTime={p.date}>{when(p, today, L)}</time>
        </span>
        <span className="su-teams">
          {team(p.away, !favHome)}
          <em>@</em>
          {team(p.home, favHome)}
        </span>
        <span className="su-pct">{n}<small>{L.en ? "%" : " %"}</small></span>
        <span className="su-lab">{L.t(`victoire ${fav.short}`, `${fav.short} win`, `victoria ${fav.short}`)}</span>
        <span className="su-bar" aria-hidden><i className={favHome ? "" : "f"} style={{ width: `${(1 - p.pHome) * 100}%` }} /><i className={favHome ? "f" : ""} style={{ width: `${p.pHome * 100}%` }} /></span>
        <span className="su-row"><span>{L.t("Score projeté", "Projected score", "Marcador proyectado")}</span><b className="mono">{sa}-{sh}</b></span>
        <span className="su-go">{L.t("Voir l'analyse", "See the analysis", "Ver el análisis")} <span aria-hidden>→</span></span>
      </Link>
    </div>
  );
}

export default function SureSection({ picks, record, fallback, today, L }) {
  if (!picks.length && !fallback) return null; // pas de match à venir (intersaison)
  const nba = record?.nba && record.nba.n >= RECORD_MIN ? record.nba : null;
  const el = record?.el && record.el.n > 0 ? record.el : null;
  const shown = picks.slice(0, 3);
  const more = picks.length - shown.length;

  return (
    <section className="sure" id="confiance">
      <div className="sure-in">
        <span className="su-chip reveal"><span className="dot" />{L.t("Confiance très élevée", "Very high confidence", "Confianza muy alta")}</span>
        {L.t(
          <h2 className="t-sec reveal" style={{ "--d": "80ms" }}>Nos pronostics<br /><span className="accent">les plus sûrs</span></h2>,
          <h2 className="t-sec reveal" style={{ "--d": "80ms" }}>Our most<br /><span className="accent">confident picks</span></h2>,
          <h2 className="t-sec reveal" style={{ "--d": "80ms" }}>Nuestros pronósticos<br /><span className="accent">más seguros</span></h2>
        )}
        <p className="lead reveal" style={{ "--d": "140ms" }}>{L.t(
          "Quand le modèle donne un favori à 88 % ou plus, le match passe en confiance très élevée. C'est rare : environ 3 matchs sur 100.",
          "When the model makes a team a favorite at 88% or more, the game gets very high confidence. It's rare: about 3 games in 100.",
          "Cuando el modelo da a un favorito un 88 % o más, el partido pasa a confianza muy alta. Es raro: unos 3 partidos de cada 100."
        )}</p>

        {shown.length ? (
          <div className="su-grid">
            {shown.map((p, i) => <Card key={p.key} p={p} today={today} L={L} i={i} />)}
          </div>
        ) : (
          <div className="su-empty reveal" style={{ "--d": "150ms" }}>
            <b>{L.t("Aucun match à ce niveau dans les 7 prochains jours, pour l'instant.", "No game at this level in the next 7 days, for now.", "Ningún partido en este nivel en los próximos 7 días, por ahora.")}</b>
            <p>{L.t(
              <>Le modèle ne force rien. Le favori le plus net de la semaine : {fallback.favShort} à {pctOf(fallback.pf, L)}, confiance {confText(fallback.conf, L).toLowerCase()}.</>,
              <>The model doesn&apos;t force it. This week&apos;s clearest favorite: {fallback.favShort} at {pctOf(fallback.pf, L)}, {confText(fallback.conf, L).toLowerCase()} confidence.</>,
              <>El modelo no fuerza nada. El favorito más claro de la semana: {fallback.favShort} al {pctOf(fallback.pf, L)}, confianza {confText(fallback.conf, L).toLowerCase()}.</>
            )}</p>
            <Link href={L.href(fallback.href)} className="su-go">{L.t("Voir l'analyse", "See the analysis", "Ver el análisis")} <span aria-hidden>→</span></Link>
          </div>
        )}
        {more > 0 && <p className="su-more reveal">{L.t(
          `+ ${more} autre${more > 1 ? "s" : ""} match${more > 1 ? "s" : ""} à ce niveau cette semaine`,
          `+ ${more} more game${more > 1 ? "s" : ""} at this level this week`,
          `+ ${more} partido${more > 1 ? "s" : ""} más en este nivel esta semana`
        )} · <Link href={L.href("/app")}>{L.t("tous les matchs", "all games", "todos los partidos")}</Link></p>}

        <div className="su-record reveal" style={{ "--d": "200ms" }}>
          {nba ? (
            <>
              <strong>{pctOf(nba.ok / nba.n, L)}</strong>
              <span className="su-rec-txt">
                <b>{L.t(`${nba.ok} pronostics justes sur ${nba.n} à ce niveau`, `${nba.ok} of ${nba.n} picks right at this level`, `${nba.ok} pronósticos acertados de ${nba.n} en este nivel`)}</b>
                <span>{L.t(
                  `NBA, saisons ${seasonLabel(nba.since)} et ${seasonLabel(nba.since + 1)} : chaque match recalculé avec les seuls résultats connus avant lui.`,
                  `NBA, ${seasonLabel(nba.since)} and ${seasonLabel(nba.since + 1)} seasons: every game recalculated using only results known before it.`,
                  `NBA, temporadas ${seasonLabel(nba.since)} y ${seasonLabel(nba.since + 1)}: cada partido recalculado solo con los resultados conocidos antes de él.`
                )}{el ? ` ${L.t(`EuroLeague cette saison : ${el.ok} sur ${el.n}.`, `EuroLeague this season: ${el.ok} of ${el.n}.`, `Euroliga esta temporada: ${el.ok} de ${el.n}.`)}` : ""}</span>
              </span>
            </>
          ) : (
            <span className="su-rec-txt"><b>{L.t("Chaque pronostic de ce niveau est suivi, match par match.", "Every pick at this level is tracked, game by game.", "Cada pronóstico de este nivel se sigue, partido a partido.")}</b></span>
          )}
          <Link href={L.href("/app/bilan")} className="su-link">{L.t("Voir le bilan", "See the track record", "Ver el balance")}</Link>
        </div>
        <p className="su-disc">{L.t(
          "Probabilités estimées par le modèle, jamais une certitude : même à ce niveau, le favori perd parfois. Pas un conseil de pari.",
          "Probabilities estimated by the model, never a certainty: even at this level, the favorite sometimes loses. Not betting advice.",
          "Probabilidades estimadas por el modelo, nunca una certeza: incluso en este nivel, el favorito a veces pierde. No es un consejo de apuestas."
        )}</p>
      </div>
    </section>
  );
}
