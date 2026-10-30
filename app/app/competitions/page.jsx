import Link from "next/link";
import { conferenceStandings } from "../../../lib/data";
import { elUpcoming, elStandings } from "../../../lib/euroleague";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import AppTabs from "../../../components/AppTabs";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Compétitions : NBA et EuroLeague – Basketlog", "Competitions: NBA and EuroLeague – Basketlog", "Competiciones: NBA y Euroliga – Basketlog"),
    description: L.t(
      "Les championnats analysés par Basketlog : la NBA et ses 30 franchises, l'EuroLeague et ses 20 clubs. Classements, matchs et pronostics.",
      "The leagues Basketlog analyzes: the NBA and its 30 franchises, the EuroLeague and its 20 clubs. Standings, games and predictions.",
      "Las competiciones que analiza Basketlog: la NBA y sus 30 franquicias, la Euroliga y sus 20 clubes. Clasificaciones, partidos y pronósticos."
    ),
    path: "/app/competitions",
    L,
  });
}

const rec = (t) => `${t.wins}-${t.losses}`;

function Top({ rows, href, L }) {
  return (
    <ol className="comp-top">
      {rows.map((t, i) => (
        <li key={t.id}>
          <Link href={L.href(href(t))}>
            <span className="rk">{i + 1}</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {t.logo ? <img src={t.logo} alt="" /> : <span className="ph" />}
            <span className="nm">{t.short}</span>
            <b className="mono">{rec(t)}</b>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default async function CompetitionsPage() {
  const L = await getL();
  const [std, el] = await Promise.all([conferenceStandings().catch(() => null), elUpcoming(10).catch(() => null)]);
  const season = seasonForDate(nbaToday());
  const label = (y) => `${y - 1}-${String(y).slice(2)}`;
  const elRows = el ? elStandings(el.cur).slice(0, 8) : [];
  const elYear = el ? Number(el.season.slice(1)) : null;

  return (
    <main className="app-page wide">
      <AppTabs />
      <div className="app-head">
        <h1>{L.t("Compétitions", "Competitions", "Competiciones")}</h1>
        <p>{L.t("Les championnats analysés par Basketlog", "The leagues Basketlog analyzes", "Las competiciones que analiza Basketlog")}</p>
        <p className="note">{L.t("Choisis une compétition pour voir le classement complet et les pronostics des prochains matchs.", "Pick a competition to see the full standings and predictions for upcoming games.", "Elige una competición para ver la clasificación completa y los pronósticos de los próximos partidos.")}</p>
      </div>

      <div className="comp-grid">
        <section className="panel comp">
          <div className="comp-head">
            <h2>NBA</h2>
            <span className="tag hot">{label(season)}</span>
          </div>
          <p className="comp-sub">{L.t("30 franchises · chaque match analysé", "30 franchises · every game analyzed", "30 franquicias · cada partido analizado")}</p>
          {std ? (
            <div className="comp-cols">
              <div>
                <div className="panel-label">{L.t("CONFÉRENCE EST", "EASTERN CONFERENCE", "CONFERENCIA ESTE")}</div>
                <Top rows={std.east.slice(0, 5)} href={(t) => `/app/equipe/${t.id}`} L={L} />
              </div>
              <div>
                <div className="panel-label">{L.t("CONFÉRENCE OUEST", "WESTERN CONFERENCE", "CONFERENCIA OESTE")}</div>
                <Top rows={std.west.slice(0, 5)} href={(t) => `/app/equipe/${t.id}`} L={L} />
              </div>
            </div>
          ) : (
            <p className="empty">{L.t("Classement momentanément indisponible.", "Standings temporarily unavailable.", "Clasificación no disponible por el momento.")}</p>
          )}
          <div className="comp-links">
            <Link href={L.href("/app/classement")} className="btn-solid">{L.t("Classement complet", "Full standings", "Clasificación completa")}</Link>
            <Link href={L.href("/app/matchs")} className="comp-more">{L.t("Matchs du jour", "Today's games", "Partidos de hoy")} →</Link>
          </div>
        </section>

        <section className="panel comp">
          <div className="comp-head">
            <h2>{L.t("EuroLeague", "EuroLeague", "Euroliga")}</h2>
            {elYear && <span className="tag hot">{elYear}-{String(elYear + 1).slice(2)}</span>}
          </div>
          <p className="comp-sub">{L.t("20 clubs · chaque journée analysée", "20 clubs · every round analyzed", "20 clubes · cada jornada analizada")}</p>
          {elRows.length ? (
            <Top rows={elRows} href={(t) => `/app/euroleague/equipe/${t.id}`} L={L} />
          ) : (
            <p className="empty">{L.t("Classement momentanément indisponible.", "Standings temporarily unavailable.", "Clasificación no disponible por el momento.")}</p>
          )}
          <div className="comp-links">
            <Link href={L.href("/app/euroleague")} className="btn-solid">{L.t("Classement et matchs", "Standings and games", "Clasificación y partidos")}</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
