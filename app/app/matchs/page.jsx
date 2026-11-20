import Link from "next/link";
import PrefSource from "../../../components/PrefSource";
import PushOptIn from "../../../components/PushOptIn";
import { analyzeDay, recentAccuracy } from "../../../lib/data";
import { fmtTime } from "../../../lib/i18n";
import { recordPronosSoon } from "../../../lib/pronos";
import { nbaToday, shiftDate, isValidDate } from "../../../lib/espn";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import { pageMeta, topFavorites } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import JsonLd from "../../../components/JsonLd";
import { SITE } from "../../../lib/site";
import { nbaPath } from "../../../lib/slug.js";

export const dynamic = "force-dynamic";

function longDay(d, L) {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat(L.locale, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dt);
}

// « Nov 12 » / « 12 nov » / « 12 nov. » : date courte dans les titres (Google montre la fraîcheur de la page).
function shortDay(d, L) {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  return new Intl.DateTimeFormat(L.locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(dt).replace(/\.$/, "");
}

// « vendredi 20 novembre (2026) » · « Friday, November 20(, 2026) » · « viernes 20 de noviembre (de 2026) » · « sexta-feira, 20 de novembro (de 2026) ».
function fullDay(d, L, year) {
  const dt = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12));
  const txt = new Intl.DateTimeFormat(L.locale, { weekday: "long", day: "numeric", month: "long", ...(year ? { year: "numeric" } : {}), timeZone: "UTC" }).format(dt);
  return L.es ? txt.replace(",", "") : txt;
}

// FR : « de ce soir », « de demain », « du mercredi 29 octobre » · EN : "tonight", "tomorrow", "for Wednesday, October 29"
function labelOf(d, today, L) {
  if (L.pt) {
    if (d === today) return "de hoje";
    if (d === shiftDate(today, 1)) return "de amanhã";
    if (d === shiftDate(today, -1)) return "de ontem";
    return `de ${longDay(d, L)}`;
  }
  if (L.es) {
    if (d === today) return "de hoy"; // en Espagne, les matchs NBA se jouent dans la nuit : on cherche « pronósticos NBA hoy »
    if (d === shiftDate(today, 1)) return "de mañana";
    if (d === shiftDate(today, -1)) return "de ayer";
    return `del ${longDay(d, L)}`;
  }
  if (L.en) {
    if (d === today) return "tonight";
    if (d === shiftDate(today, 1)) return "tomorrow";
    if (d === shiftDate(today, -1)) return "yesterday";
    return `for ${longDay(d, L)}`;
  }
  if (d === today) return "de ce soir";
  if (d === shiftDate(today, 1)) return "de demain";
  if (d === shiftDate(today, -1)) return "d'hier";
  return `du ${longDay(d, L)}`;
}

export async function generateMetadata({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const today = nbaToday();
  const date = isValidDate(sp.d) ? sp.d : today;
  let an = [];
  try { an = (await analyzeDay(date)).analyses || []; } catch {}
  const n = an.length;
  const when = labelOf(date, today, L);
  const isToday = date === today && !sp.d;
  // Titres calés sur les recherches vues dans la Search Console (« nba predictions today », « pronósticos nba hoy ») et sur
  // les pages qui nous devancent (un titre par jour avec le jour de la semaine et la date : « pronósticos nba hoy jueves 22 »).
  // Jour passé : le bilan du favori (« 7 sur 9 justes »), qui donne une raison de cliquer et montre la transparence.
  const day = fullDay(date, L, false);
  const dayY = fullDay(date, L, true);
  let ok = 0, done = 0;
  for (const a of an) {
    const g = a.game;
    if (g?.state !== "post" || g.home?.score == null || g.away?.score == null || +g.home.score === +g.away.score || a.pHome == null) continue;
    done++;
    if ((a.pHome >= 0.5) === (+g.home.score > +g.away.score)) ok++;
  }
  const past = !isToday && date < today && done > 0;
  const title = isToday
    ? L.t(`Pronostic NBA ce soir, ${day}${n ? ` : ${n} matchs gratuits` : ""}`, `Free NBA Predictions Today, ${day}${n ? `: ${n} games` : ""}`, `Pronósticos NBA hoy ${day}${n ? `: ${n} partidos gratis` : ""}`, `Palpites NBA hoje, ${day}${n ? `: ${n} jogos grátis` : ""}`)
    : past
      ? L.t(`Pronostics NBA du ${dayY} : ${ok} sur ${done} justes`, `NBA Predictions, ${dayY}: ${ok} of ${done} right`, `Pronósticos NBA del ${dayY}: ${ok} de ${done} acertados`, `Palpites NBA de ${dayY}: ${ok} de ${done} certos`)
      : L.t(`Pronostic NBA du ${dayY}${n ? ` : ${n} matchs` : ""}`, `NBA Predictions for ${dayY}${n ? `: ${n} games` : ""}`, `Pronósticos NBA del ${dayY}${n ? `: ${n} partidos` : ""}`, `Palpites NBA de ${dayY}${n ? `: ${n} jogos` : ""}`);
  const description = past
    ? L.t(`Les ${n} matchs NBA ${when} : pronostic d'avant-match, score final et réussite. Le favori Basketlog a gagné ${ok} matchs sur ${done}.`, `All ${n} NBA games ${when}: pre-game prediction, final score and result. The Basketlog favorite won ${ok} of ${done}.`, `Los ${n} partidos de la NBA ${when}: pronóstico previo, resultado final y acierto. El favorito de Basketlog ganó ${ok} de ${done}.`, `Os ${n} jogos da NBA ${when}: palpite, placar final e acerto. O favorito do Basketlog venceu ${ok} de ${done}.`)
    : L.t(
    n ? `Pronostic NBA gratuit pour les ${n} matchs ${when} : favori, probabilités de victoire, score projeté et heure de chaque match (heure de Paris).` : `Matchs NBA ${when} : pronostic gratuit, probabilités de victoire, score projeté et heure de chaque match (heure de Paris).`,
    n ? `All ${n} NBA games ${when} analyzed: win probabilities, projected score and the favorite in every matchup, in Eastern Time.` : `NBA games ${when}: win probabilities, projected score and the favorite in every matchup, in Eastern Time.`,
    n ? `Los ${n} partidos de la NBA ${when} analizados: probabilidades de victoria, marcador proyectado y favorito de cada encuentro, en hora de España.` : `Partidos de la NBA ${when}: probabilidades de victoria, marcador proyectado y favorito de cada encuentro, en hora de España.`, n ? `Os ${n} jogos da NBA ${when} analisados: probabilidades de vitória, placar projetado e favorito de cada confronto, no horário de Brasília.` : `Jogos da NBA ${when}: probabilidades de vitória, placar projetado e favorito de cada confronto, no horário de Brasília.`
  );
  return pageMeta({
    title,
    description,
    path: isToday ? "/app/matchs" : `/app/matchs?d=${date}`,
    // Jour précis sans match (ou date invalide) : page vide, inutile dans Google. La page du jour reste toujours indexée.
    noindex: (!!sp.d && !isValidDate(sp.d)) || (n === 0 && !isToday),
    L,
  });
}

export default async function MatchsPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const today = nbaToday();
  const date = isValidDate(sp.d) ? sp.d : today;
  const { analyses } = await analyzeDay(date);
  recordPronosSoon("NBA", analyses); // pronostic d'avant-match enregistré pour le bilan réel
  const games = analyses
    .map((a) => ({ id: a.game.id, d: date, date: a.game.date, state: a.game.state, postponed: a.game.postponed || null, live: a.game.state === "in", home: a.game.home, away: a.game.away, pHome: a.pHome, confidence: a.confidence }))
    .sort((x, y) => new Date(x.date) - new Date(y.date));

  const favs = topFavorites(games, L);
  // Liste des matchs du jour pour Google : chaque affiche renvoie à sa page de pronostic.
  const ld = games.length ? {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: L.t(`Pronostics NBA ${labelOf(date, today, L)}`, `NBA predictions ${labelOf(date, today, L)}`, `Pronósticos NBA ${labelOf(date, today, L)}`, `Palpites NBA ${labelOf(date, today, L)}`),
    itemListElement: games.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: L.t(`${g.away.name} – ${g.home.name}`, `${g.away.name} vs ${g.home.name}`, `${g.away.name} – ${g.home.name}`, `${g.away.name} x ${g.home.name}`),
      url: `${SITE}${L.href(nbaPath(g, date))}`,
    })),
  } : null;

  // Questions-réponses du soir (« nba favorites tonight », « closest nba game tonight », « how many nba games tonight »).
  const faq = [];
  const pre = games.filter((g) => g.state === "pre" && !g.postponed && g.pHome != null);
  if (date === today && pre.length) {
    const fav = (g) => (g.pHome >= 0.5 ? { t: g.home, p: g.pHome } : { t: g.away, p: 1 - g.pHome });
    const pc = (p) => `${Math.round(p * 100)}${L.en ? "%" : "\u202f%"}`;
    const byFav = [...pre].sort((x, y) => fav(y).p - fav(x).p);
    const close = [...pre].sort((x, y) => fav(x).p - fav(y).p)[0];
    const acc = await recentAccuracy(400).catch(() => null);
    const top = byFav.slice(0, 3).map((g) => `${fav(g).t.short} (${pc(fav(g).p)}, ${g.away.short} ${L.en ? "vs" : "–"} ${g.home.short})`).join(", ");
    faq.push({
      q: L.t("Quels sont les plus gros favoris NBA ce soir ?", "Who are the biggest NBA favorites tonight?", "¿Quiénes son los grandes favoritos de la NBA hoy?", "Quem são os grandes favoritos da NBA hoje?"),
      a: L.t(`Selon le modèle Basketlog : ${top}.`, `According to the Basketlog model: ${top}.`, `Según el modelo de Basketlog: ${top}.`, `Segundo o modelo do Basketlog: ${top}.`),
    });
    faq.push({
      q: L.t("Quel est le match NBA le plus serré ce soir ?", "What is the closest NBA game tonight?", "¿Cuál es el partido más igualado de la NBA hoy?", "Qual é o jogo mais equilibrado da NBA hoje?"),
      a: L.t(`${close.away.short} – ${close.home.short} : ${fav(close).t.short} à ${pc(fav(close).p)}, presque du 50-50.`, `${close.away.short} vs ${close.home.short}: the ${fav(close).t.short} at ${pc(fav(close).p)}, close to a coin flip.`, `${close.away.short} – ${close.home.short}: ${fav(close).t.short} al ${pc(fav(close).p)}, casi un 50-50.`, `${close.away.short} x ${close.home.short}: ${fav(close).t.short} a ${pc(fav(close).p)}, quase 50-50.`),
    });
    faq.push({
      q: L.t("Combien de matchs NBA ce soir ?", "How many NBA games are on tonight?", "¿Cuántos partidos de la NBA hay hoy?", "Quantos jogos da NBA tem hoje?"),
      a: L.t(`${games.length} match${games.length > 1 ? "s" : ""}, premier coup d'envoi à ${fmtTime(L, pre[0].date)} (${L.tzLabel}).`, `${games.length} game${games.length > 1 ? "s" : ""}, first tip-off at ${fmtTime(L, pre[0].date)} ${L.tzLabel}.`, `${games.length} partido${games.length > 1 ? "s" : ""}, el primero a las ${fmtTime(L, pre[0].date)} (${L.tzLabel}); en Ciudad de México a las ${new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", hour: "2-digit", minute: "2-digit" }).format(new Date(pre[0].date))}.`, `${games.length} jogo${games.length > 1 ? "s" : ""}, o primeiro às ${fmtTime(L, pre[0].date)} (${L.tzLabel}).`),
    });
    if (acc && acc.n >= 20) faq.push({
      q: L.t("Ces pronostics sont-ils fiables ?", "How accurate are these NBA predictions?", "¿Son fiables estos pronósticos?", "Esses palpites são confiáveis?"),
      a: L.t(`Cette saison, le favori Basketlog a gagné ${acc.ok} matchs sur ${acc.n} (${pc(acc.ok / acc.n)}). Chaque pronostic est vérifié en public.`, `This season the Basketlog favorite won ${acc.ok} of ${acc.n} games (${pc(acc.ok / acc.n)}). Every pick is checked in public.`, `Esta temporada, el favorito de Basketlog ganó ${acc.ok} de ${acc.n} partidos (${pc(acc.ok / acc.n)}). Cada pronóstico se comprueba en público.`, `Nesta temporada, o favorito do Basketlog venceu ${acc.ok} de ${acc.n} jogos (${pc(acc.ok / acc.n)}). Cada palpite é verificado em público.`),
    });
  }
  const faqLd = faq.length ? { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) } : null;

  return (
    <main className="app-page">
      {ld && <JsonLd data={ld} />}
      {faqLd && <JsonLd data={faqLd} />}
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Pronostics NBA ${labelOf(date, today, L)}`, `NBA predictions ${labelOf(date, today, L)}`, `Pronósticos NBA ${labelOf(date, today, L)}`, `Palpites NBA ${labelOf(date, today, L)}`)}</h1>
        <p>{L.t(
          `${games.length} match${games.length > 1 ? "s" : ""} NBA · pronostics gratuits · heures de Paris`,
          `${games.length} NBA game${games.length > 1 ? "s" : ""} · free predictions · Eastern Time`,
          `${games.length} partido${games.length > 1 ? "s" : ""} de la NBA · pronósticos gratis · hora de España`, `${games.length} jogo${games.length > 1 ? "s" : ""} da NBA · palpites grátis · horário de Brasília`
        )}</p>
        {favs.length > 0 && (
          <p className="note">{L.t(
            `Plus gros favoris ${labelOf(date, today, L)} : ${favs.join(", ")}`,
            `Biggest favorites ${labelOf(date, today, L)}: ${favs.join(", ")}`,
            `Favoritos NBA ${labelOf(date, today, L)}: ${favs.join(", ")}`, `Favoritos NBA ${labelOf(date, today, L)}: ${favs.join(", ")}`
          )}</p>
        )}
        <p className="note"><Link href={L.href("/pronostic-basket")}>{L.t("Pronostic basket du jour : NBA et EuroLeague →", "Today's basketball predictions: NBA and EuroLeague →", "Pronósticos de baloncesto de hoy: NBA y Euroliga →", "Palpites de basquete de hoje: NBA e Euroliga →")}</Link></p>
        <p className="note"><Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA", "Power ranking NBA")}</Link>{" · "}<Link href={L.href("/app/semaine")}>{L.t("Pronostics de la semaine", "NBA predictions this week", "Pronósticos de la semana", "Palpites da semana")}</Link>{" · "}<Link href={L.href("/articles")}>{L.t("Les 3 matchs à suivre", "3 games to watch tonight", "Los 3 partidos a seguir", "Os 3 jogos para acompanhar")}</Link>{" · "}<Link href={L.href("/app/blessures")}>{L.t("Blessés NBA du jour", "NBA injury report", "Lesionados NBA hoy", "Lesionados NBA hoje")}</Link>{" · "}<Link href={L.href("/app/nba-cup")}>{L.t("Pronostics NBA Cup", "NBA Cup predictions", "Pronósticos NBA Cup", "Palpites NBA Cup")}</Link>{" · "}<Link href={L.href("/app/defi")}>{L.t("Jeu : bats le modèle", "Game: beat the model", "Juego: gana al modelo", "Jogo: vença o modelo")}</Link>{" · "}<Link href={L.href("/app/resultats")}>{L.t("Résultats de la nuit", "Last night's scores", "Resultados de anoche", "Resultados de ontem")}</Link>{" · "}<Link href={L.href("/app/programme")}>{L.t("Horaires et où regarder", "Times and TV channels", "Horarios y dónde ver", "Horários e onde assistir")}</Link>{" · "}<Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs", "Playoff odds", "Probabilidades de playoffs", "Chances de playoffs")}</Link></p>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 18 }}>
        <Link className="btn-white" href={L.href(`/app/matchs?d=${shiftDate(date, -1)}`)}>{L.t("← Veille", "← Previous day", "← Día anterior", "← Dia anterior")}</Link>
        <Link className="btn-white" href={L.href(shiftDate(date, 1) === shiftDate(today, 1) ? "/app/demain" : `/app/matchs?d=${shiftDate(date, 1)}`)}>{L.t("Lendemain →", "Next day →", "Día siguiente →", "Dia seguinte →")}</Link>
      </div>
      <PushOptIn source="matchs" />
      <UpcomingList games={games} title="" grouped={false} L={L} />
      {faq.length > 0 && (
        <section className="card block match-faq" style={{ marginTop: 22 }}>
          <h2>{L.t("Ce soir en NBA : l'essentiel", "NBA tonight: quick answers", "La NBA hoy: lo esencial", "A NBA hoje: o essencial")}</h2>
          {faq.map((f) => (
            <div key={f.q} className="mfaq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
          <p className="mfaq-more"><Link href={L.href("/app/bilan")}>{L.t("Voir le bilan public du modèle →", "See the model's public track record →", "Ver el balance público del modelo →", "Ver o desempenho público do modelo →")}</Link></p>
        </section>
      )}
      <PrefSource L={L} />
    </main>
  );
}
