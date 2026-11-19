import Link from "next/link";
import { notFound } from "next/navigation";
import AppTabs from "../../../../../components/AppTabs";
import JsonLd from "../../../../../components/JsonLd";
import Crumbs from "../../../../../components/Crumbs";
import { pageMeta } from "../../../../../lib/seo";
import { getL } from "../../../../../lib/lang-server";
import { fmtDate, fmtTime } from "../../../../../lib/i18n";
import { teamById } from "../../../../../lib/teams";
import { getTeamSchedule, getStandings, seasonForDate, nbaToday, nbaDateOf } from "../../../../../lib/espn";
import { teamStrength, phi, MODEL } from "../../../../../lib/model";
import { nbaPath } from "../../../../../lib/slug";
import { SITE } from "../../../../../lib/site";
import { probTxt } from "../../../../../lib/probtxt";

// Calendrier complet d'une équipe sur la saison : « calendrier Lakers », « Lakers schedule », « calendario Lakers ».
// Matchs joués (résultat) et à venir (date, heure locale, domicile/extérieur, probabilité de victoire du modèle).
export const dynamic = "force-dynamic";
const seasonLabel = () => { const y = seasonForDate(nbaToday()); return `${y - 1}-${String(y).slice(2)}`; };

export async function generateMetadata({ params }) {
  const L = await getL();
  const t = teamById((await params).id);
  if (!t) return {};
  const s = seasonLabel();
  return pageMeta({
    title: L.t(`Calendrier des ${t.short} ${s} : tous les matchs, horaires et résultats`, `${t.short} schedule ${s}: every game, start times and results`, `Calendario de los ${t.short} ${s}: todos los partidos, horarios y resultados`, `Calendário do ${t.short} ${s}: todos os jogos, horários e resultados`),
    description: L.t(`Le calendrier complet des ${t.name} pour la saison NBA ${s} : dates, heures en France, domicile ou extérieur, résultats et probabilité de victoire de chaque match. À ajouter à ton agenda.`, `The full ${t.name} schedule for the ${s} NBA season: dates, tip-off times (ET), home or away, results and the win probability for every game. Add it to your calendar.`, `El calendario completo de los ${t.name} para la temporada NBA ${s}: fechas, horarios en España, local o visitante, resultados y probabilidad de victoria de cada partido. Añádelo a tu agenda.`, `O calendário completo do ${t.name} na temporada da NBA ${s}: datas, horário de Brasília, casa ou fora, resultados e probabilidade de vitória de cada jogo. Adicione à sua agenda.`),
    path: `/app/equipe/${t.id}/calendrier`,
    L,
  });
}

export default async function TeamSchedulePage({ params }) {
  const L = await getL();
  const team = teamById((await params).id);
  if (!team) notFound();
  const season = seasonForDate(nbaToday());
  const [sched, cur, prev] = await Promise.all([getTeamSchedule(team.id).catch(() => []), getStandings(season).catch(() => ({})), getStandings(season - 1).catch(() => ({}))]);
  const s = (id) => teamStrength(cur[id] || null, prev[id] || null);
  const games = sched.filter((g) => g.type !== "pre");
  const months = [];
  for (const g of games) {
    const m0 = fmtDate(L, g.date, { month: "long", year: "numeric" }).replace(/ De /, " de ");
    const m = m0.charAt(0).toUpperCase() + m0.slice(1);
    if (!months.length || months[months.length - 1].m !== m) months.push({ m, list: [] });
    months[months.length - 1].list.push(g);
  }
  const played = games.filter((g) => g.state === "post" && g.home.score != null);
  const w = played.filter((g) => (g.home.id === team.id ? g.home.winner : g.away.winner)).length;
  const next = games.find((g) => g.state === "pre" && !g.postponed);
  const ics = `webcal://basketlog-app.com/api/calendar/${team.id}?lang=${L.lang}`;
  const sl = seasonLabel();
  const homeN = games.filter((g) => g.home.id === team.id).length;
  const faq = [
    ...(next ? [{
      q: L.t(`Quand est le prochain match des ${team.short} ?`, `When do the ${team.short} play next?`, `¿Cuándo es el próximo partido de los ${team.short}?`, `Quando é o próximo jogo do ${team.short}?`),
      a: (() => { const home = next.home.id === team.id, opp = home ? next.away : next.home; const d = fmtDate(L, next.date, { weekday: "long", day: "numeric", month: "long" }); return L.t(`${d} à ${fmtTime(L, next.date)} (heure de Paris), ${home ? "contre" : "chez"} les ${opp.short}.`, `${d} at ${fmtTime(L, next.date)} ET, ${home ? "vs." : "at"} the ${opp.short}.`, `El ${d} a las ${fmtTime(L, next.date)} (hora de España), ${home ? "contra" : "en casa de"} los ${opp.short}.`, `${d}, às ${fmtTime(L, next.date)} (horário de Brasília), ${home ? "contra o" : "na casa do"} ${opp.short}.`); })(),
    }] : []),
    {
      q: L.t(`Combien de matchs les ${team.short} jouent-ils cette saison ?`, `How many games do the ${team.short} play this season?`, `¿Cuántos partidos juegan los ${team.short} esta temporada?`, `Quantos jogos o ${team.short} disputa nesta temporada?`),
      a: L.t(`82 matchs de saison régulière (${games.length} déjà programmés, dont ${homeN} à domicile). Bilan actuel : ${w}-${played.length - w}.`, `82 regular-season games (${games.length} scheduled so far, ${homeN} at home). Current record: ${w}-${played.length - w}.`, `82 partidos de temporada regular (${games.length} ya programados, ${homeN} en casa). Balance actual: ${w}-${played.length - w}.`, `82 jogos de temporada regular (${games.length} já programados, ${homeN} em casa). Campanha atual: ${w}-${played.length - w}.`),
    },
  ];
  const ld = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };
  return (
    <main className="app-page">
      <JsonLd data={ld} />
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t(`Pronostic ${team.name}`, `${team.name} predictions`, `Pronóstico ${team.name}`, `Palpite ${team.name}`), `/app/equipe/${team.id}`], [L.t("Calendrier", "Schedule", "Calendario", "Calendário"), `/app/equipe/${team.id}/calendrier`]]} />
      <AppTabs active="classement" />
      <div className="app-head">
        <h1>{L.t(`Calendrier des ${team.short} ${sl}`, `${team.name} schedule ${sl}`, `Calendario de los ${team.short} ${sl}`, `Calendário do ${team.short} ${sl}`)}</h1>
        <p>{L.t(`Bilan : ${w}-${played.length - w}. Heures en heure de Paris.`, `Record: ${w}-${played.length - w}. Times are ET.`, `Balance: ${w}-${played.length - w}. Horarios en hora de España.`, `Campanha: ${w}-${played.length - w}. Horário de Brasília.`)}</p>
        <p className="team-rec">{L.t("Ajouter à mon calendrier : ", "Add to my calendar: ", "Añadir a mi calendario: ", "Adicionar ao meu calendário: ")}<a href={ics}>iPhone / Outlook</a>{" · "}<a href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(ics)}`} target="_blank" rel="noopener">Google</a>{" · "}<Link href={L.href(`/app/equipe/${team.id}`)}>{L.t(`Fiche des ${team.short} →`, `${team.short} team page →`, `Ficha de los ${team.short} →`, `Página do ${team.short} →`)}</Link></p>
      </div>
      {months.map(({ m, list }) => (
        <section key={m} className="card block">
          <h2>{m}</h2>
          <table className="std-table">
            <tbody>
              {list.map((g) => {
                const home = g.home.id === team.id, opp = home ? g.away : g.home;
                const done = g.state === "post" && g.home.score != null;
                const me = home ? g.home : g.away;
                const pHome = phi((s(g.home.id) - s(g.away.id) + MODEL.HOME_COURT) / MODEL.MARGIN_SD);
                const p = home ? pHome : 1 - pHome;
                return (
                  <tr key={g.id}>
                    <td className="tm" style={{ whiteSpace: "nowrap" }}>{fmtDate(L, g.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                    <td className="tm"><Link href={L.href(nbaPath(g, nbaDateOf(g.date)))}>{home ? "vs" : "@"} {opp.short || opp.abbr}</Link>{/cup/i.test(g.note || "") ? <small className="team-rec"> · NBA Cup</small> : null}</td>
                    <td>{g.postponed ? L.t("reporté", "postponed", "aplazado", "adiado") : done ? <span className={me.winner ? "pos" : "neg"}>{me.winner ? L.t("V", "W", "V", "V") : L.t("D", "L", "D", "D")} {g.home.id === team.id ? `${g.home.score}-${g.away.score}` : `${g.away.score}-${g.home.score}`}</span> : fmtTime(L, g.date)}</td>
                    <td>{done || g.postponed ? "" : probTxt(p, L)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <section className="card block match-faq">
        {faq.map((f) => (<div key={f.q} className="mfaq-item"><h3>{f.q}</h3><p>{f.a}</p></div>))}
      </section>
      <p className="disclaimer">{L.t("Dernière colonne : probabilité de victoire selon le niveau actuel des deux équipes (modèle Basketlog, sans les absences). Le pronostic complet de chaque match est publié quelques jours avant.", "Last column: win probability from both teams' current level (Basketlog model, without injuries). The full prediction for each game is published a few days before.", "Última columna: probabilidad de victoria según el nivel actual de ambos equipos (modelo de Basketlog, sin las bajas). El pronóstico completo de cada partido se publica unos días antes.", "Última coluna: probabilidade de vitória segundo o nível atual dos dois times (modelo do Basketlog, sem os desfalques). O palpite completo de cada jogo é publicado alguns dias antes.")}</p>
    </main>
  );
}
