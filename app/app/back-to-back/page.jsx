import Link from "next/link";
import { upcomingAnalyses } from "../../../lib/data";
import { nbaToday, shiftDate } from "../../../lib/espn";
import { nbaPath } from "../../../lib/slug";
import AppTabs from "../../../components/AppTabs";
import QuickFaq from "../../../components/QuickFaq";
import CiteBox from "../../../components/CiteBox";
import LocalTime from "../../../components/LocalTime";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { fmtDate, pctOf } from "../../../lib/i18n";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// Recherches « nba back to back tonight », « back-to-back nba ce soir » (fantasy, pronostics) : les équipes qui jouent
// le 2e soir de suite, aujourd'hui et sur 7 jours. Le modèle retire environ 1,6 point à une équipe qui a joué la veille.
const isoOf = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}T16:00:00Z`;

async function load() {
  const games = await upcomingAnalyses(7);
  const list = [];
  for (const g of games) for (const side of ["home", "away"]) {
    if (!g.a?.[side]?.b2b) continue;
    const me = g[side], opp = side === "home" ? g.away : g.home;
    list.push({ g, me, opp, home: side === "home", p: side === "home" ? g.pHome : 1 - g.pHome, oppTired: !!g.a?.[side === "home" ? "away" : "home"]?.b2b });
  }
  return list;
}

export async function generateMetadata() {
  const L = await getL();
  const today = nbaToday();
  let n = 0;
  try { n = (await load()).filter((x) => x.g.d === today).length; } catch {}
  const d = fmtDate(L, isoOf(today), { weekday: "long", day: "numeric", month: "long" });
  return pageMeta({
    title: L.t(`Back-to-back NBA ce soir (${d}) : ${n} équipe${n > 1 ? "s" : ""} sur le 2e soir`, `NBA back-to-backs tonight (${d}): ${n} team${n === 1 ? "" : "s"} on the second night`, `Back-to-back NBA hoy (${d}): ${n} equipo${n === 1 ? "" : "s"} en la 2.ª noche`, `Back-to-back na NBA hoje (${d}): ${n} time${n === 1 ? "" : "s"} na 2ª noite`),
    description: L.t(
      "Les équipes NBA qui ont joué la veille, ce soir et sur les 7 prochains jours, avec leurs chances de victoire après la fatigue comptée par le modèle Basketlog.",
      "NBA teams playing on the second night of a back-to-back, tonight and over the next 7 days, with their win probability after the Basketlog model's fatigue adjustment.",
      "Los equipos NBA que jugaron la víspera, hoy y en los próximos 7 días, con sus opciones de victoria tras el cansancio que cuenta el modelo de Basketlog.",
      "Os times da NBA que jogaram na véspera, hoje e nos próximos 7 dias, com a chance de vitória depois do cansaço contado pelo modelo do Basketlog."
    ),
    path: "/app/back-to-back",
    L,
  });
}

function Item({ x, L }) {
  return (
    <li>
      <Link href={L.href(nbaPath(x.g, x.g.d))}><b>{x.me.short}</b> {x.home ? L.t("contre", "vs.", "contra", "contra o") : L.t("chez", "at", "en casa de", "na casa do")} {x.opp.short}</Link>
      <span className="mono"> · <LocalTime iso={x.g.date} lang={L.lang} label={L.en} /> · {x.me.short} {pctOf(x.p, L)}</span>
      {x.oppTired ? <small> · {L.t("les deux équipes ont joué la veille", "both teams played the night before", "los dos equipos jugaron la víspera", "os dois times jogaram na véspera")}</small> : null}
    </li>
  );
}

export default async function BackToBackPage() {
  const L = await getL();
  const today = nbaToday();
  let list = [];
  try { list = await load(); } catch {}
  const tonight = list.filter((x) => x.g.d === today);
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const d = shiftDate(today, i);
    const l = list.filter((x) => x.g.d === d);
    if (l.length) days.push({ d, l });
  }
  const dayName = (d) => fmtDate(L, isoOf(d), { weekday: "long", day: "numeric", month: "long" });
  const faq = [
    {
      q: L.t("Quelles équipes NBA sont en back-to-back ce soir ?", "Which NBA teams are on a back-to-back tonight?", "¿Qué equipos NBA están en back-to-back hoy?", "Quais times da NBA estão em back-to-back hoje?"),
      a: tonight.length
        ? L.t(`Ce soir : ${tonight.map((x) => x.me.short).join(", ")}.`, `Tonight: ${tonight.map((x) => x.me.short).join(", ")}.`, `Hoy: ${tonight.map((x) => x.me.short).join(", ")}.`, `Hoje: ${tonight.map((x) => x.me.short).join(", ")}.`)
        : L.t("Aucune équipe ne joue deux soirs de suite ce soir.", "No team is playing on the second night of a back-to-back tonight.", "Ningún equipo juega dos noches seguidas hoy.", "Nenhum time joga duas noites seguidas hoje."),
    },
    {
      q: L.t("Un back-to-back change-t-il les chances de victoire ?", "Does a back-to-back change win probability?", "¿Un back-to-back cambia las opciones de victoria?", "Um back-to-back muda a chance de vitória?"),
      a: L.t("Oui, un peu : le modèle Basketlog retire environ 1,6 point à l'équipe qui a joué la veille, soit quelques points de pourcentage de chances de victoire selon le match.", "Yes, a little: the Basketlog model takes about 1.6 points off a team that played the night before, worth a few percentage points of win probability depending on the game.", "Sí, un poco: el modelo de Basketlog resta unos 1,6 puntos al equipo que jugó la víspera, unos pocos puntos porcentuales de probabilidad según el partido.", "Sim, um pouco: o modelo do Basketlog tira cerca de 1,6 ponto do time que jogou na véspera, alguns pontos percentuais de chance conforme o jogo."),
    },
  ];
  const url = `${SITE}${L.href("/app/back-to-back")}`;
  const title = L.t("Back-to-back NBA ce soir", "NBA back-to-backs tonight", "Back-to-back NBA hoy", "Back-to-back na NBA hoje");
  return (
    <main className="app-page">
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{title}</h1>
        <p>{L.t("Les équipes qui jouent le deuxième soir de suite, avec leurs chances de victoire (fatigue comprise).", "Teams playing on consecutive nights, with their win probability (fatigue included).", "Los equipos que juegan la segunda noche seguida, con sus opciones de victoria (cansancio incluido).", "Os times que jogam a segunda noite seguida, com a chance de vitória (cansaço incluído).")}</p>
      </div>
      <section className="card block">
        <h2>{L.t(`Ce soir, ${dayName(today)}`, `Tonight, ${dayName(today)}`, `Hoy, ${dayName(today)}`, `Hoje, ${dayName(today)}`)}</h2>
        {tonight.length ? <ul className="wk-list">{tonight.map((x) => <Item key={`${x.g.id}-${x.me.id}`} x={x} L={L} />)}</ul> : <p className="narr">{L.t("Pas de back-to-back ce soir.", "No back-to-backs tonight.", "Sin back-to-back hoy.", "Nenhum back-to-back hoje.")}</p>}
      </section>
      {days.length > 0 && (
        <section className="card block">
          <h2>{L.t("Les 7 prochains jours", "Next 7 days", "Próximos 7 días", "Próximos 7 dias")}</h2>
          {days.map(({ d, l }) => (
            <div key={d}>
              <h3>{dayName(d)}</h3>
              <ul className="wk-list">{l.map((x) => <Item key={`${x.g.id}-${x.me.id}`} x={x} L={L} />)}</ul>
            </div>
          ))}
        </section>
      )}
      <QuickFaq L={L} items={faq} />
      <p className="team-rec">
        <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du soir", "Tonight's NBA predictions", "Pronósticos NBA de hoy", "Palpites NBA de hoje")}</Link>{" · "}
        <Link href={L.href("/app/blessures")}>{L.t("Blessés du jour", "Today's injuries", "Lesionados de hoy", "Lesionados de hoje")}</Link>{" · "}
        <Link href={L.href("/app/calendrier-restant")}>{L.t("Calendrier restant", "Remaining schedule", "Calendario restante", "Calendário restante")}</Link>
      </p>
      <CiteBox url={url} title={title} lang={L.lang} />
    </main>
  );
}
