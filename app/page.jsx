import Link from "next/link";
import { recentAccuracy, upcomingAnalyses, conferenceStandings } from "../lib/data";
import { TEAMS, teamById } from "../lib/teams";
import { nbaToday, seasonForDate } from "../lib/espn";
import { nbaPicks } from "../lib/history";
import { getELGames } from "../lib/euroleague";
import TeamSearch from "../components/TeamSearch";
import PhoneHero from "../components/PhoneHero";
import SlotNumber from "../components/SlotNumber";
import StickyStandings from "../components/StickyStandings";
import RevealObserver from "../components/RevealObserver";
import Faq from "../components/Faq";
import ReviewCards from "../components/ReviewCards";
import { getReviews } from "../lib/reviews";
import JsonLd from "../components/JsonLd";
import { pageMeta } from "../lib/seo";
import { getL } from "../lib/lang-server";
import { fmtDate } from "../lib/i18n";

const AV = ["#ff7a1a", "#7c5cff", "#22c55e", "#0ea5e9", "#e11d48", "#eab308"];
const avatarColor = (s) => AV[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AV.length];

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Basketlog : pronostics NBA et EuroLeague analysés par IA", "Basketlog: AI-powered NBA and EuroLeague predictions", "Basketlog: pronósticos NBA y Euroliga analizados con IA"),
    description: L.t(
      "Pronostics NBA et EuroLeague pour chaque match : probabilités de victoire gratuites, score projeté, absences, forme et scénarios. Taux de réussite public.",
      "NBA and EuroLeague predictions for every game: free win probabilities, projected score, injuries, form and scenarios. Public track record.", "Pronósticos de la NBA y la Euroliga para cada partido: probabilidades de victoria gratis, marcador proyectado, bajas, forma y escenarios. Balance público."
    ),
    path: "/",
    L,
  });
}

const pct = (p) => Math.round(p * 100);

// Titre du hero, mot par mot (animation comme Visifoot) ; le dernier mot est en orange.
const HERO = {
  fr: { words: ["Prédis", "chaque", "match", "avant", "qu’il", "ne"], accent: "commence." },
  en: { words: ["Predict", "every", "game", "before", "it"], accent: "starts." },
  es: { words: ["Predice", "cada", "partido", "antes", "de", "que"], accent: "comience." },
};

const StarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden><defs><linearGradient id="star-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe066" /><stop offset="1" stopColor="#ffb300" /></linearGradient></defs><path d="M12 2.6l2.9 6 6.5.8-4.8 4.5 1.2 6.5L12 17.3l-5.8 3.1 1.2-6.5-4.8-4.5 6.5-.8z" fill="url(#star-g)" stroke="#e09a00" strokeWidth=".8" strokeLinejoin="round" /></svg>
);

// Nombre de matchs NBA recalculés par le modèle (bilan public). Mis en cache côté serveur ; si c'est lent, on n'attend pas.
async function countPicks() {
  try {
    const season = seasonForDate(nbaToday());
    const work = Promise.all([nbaPicks(season - 1), nbaPicks(season)]).then(([a, b]) => (a?.length || 0) + (b?.length || 0));
    return await Promise.race([work, new Promise((r) => setTimeout(() => r(0), 1500))]);
  } catch {
    return 0;
  }
}
const shortDay = (iso, L) => fmtDate(L, iso, { weekday: "short", day: "numeric", month: "short" });

// Grains de lumière dans le faisceau du projecteur
const DUST = Array.from({ length: 26 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: 30 + r(1) * 40, y: 18 + r(2) * 40, d: r(3) * 9 };
});

function BallButton({ href, children }) {
  return (
    <Link href={href} className="btn-ball">
      <span className="ball" aria-hidden />
      <span className="pill">{children}</span>
    </Link>
  );
}

export default async function Home() {
  const L = await getL();
  const [up, acc, std, reviews, elGames, picksCount] = await Promise.all([upcomingAnalyses(7), recentAccuracy(7), conferenceStandings(), getReviews(30), getELGames(), countPicks()]);
  const pre = up.filter((g) => !g.live);

  // Téléphone : les Lakers (ou l'équipe qui joue le plus cette semaine)
  const count = {};
  pre.forEach((g) => { count[g.home.id] = (count[g.home.id] || 0) + 1; count[g.away.id] = (count[g.away.id] || 0) + 1; });
  const heroId = (count["13"] || 0) >= 2 ? "13" : Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || "13";
  const heroTeam = teamById(heroId);
  const heroRows = pre.filter((g) => g.home.id === heroId || g.away.id === heroId);
  const rows = heroRows.length >= 2 ? heroRows : pre;
  const rivals = (heroRows.length ? heroRows.map((g) => (g.home.id === heroId ? g.away : g.home)) : [teamById("2"), teamById("18")])
    .filter(Boolean)
    .map((t) => ({ id: t.id, name: t.name, logo: t.logo }));

  // Notifications : les deux plus gros favoris de la semaine
  const byEdge = [...pre].sort((a, b) => Math.abs(b.pHome - 0.5) - Math.abs(a.pHome - 0.5));
  const notifs = byEdge.slice(0, 2);

  // Démo géante : le match le plus déséquilibré
  const big = byEdge[0];
  const nameFor = (t) => t.abbr.toUpperCase();

  const today = nbaToday();
  const todayCount = up.filter((g) => g.d === today).length;
  const accPct = acc.n ? Math.round((acc.ok / acc.n) * 100) : 0;
  // Précision de la semaine, à une décimale comme Visifoot (« 67,4 % » / « 67.4% »).
  const accVal = acc.n ? (acc.ok / acc.n) * 100 : 0;
  const accTxt = L.en ? `${accVal.toFixed(1)}%` : `${accVal.toFixed(1).replace(".", ",")}\u00a0%`;
  // Badge : nombre réel de matchs passés au crible par le modèle (saison passée + saison en cours), arrondi à la centaine.
  const analysed = Math.floor(Math.max(1300, picksCount) / 100) * 100;
  const badge = L.t(
    `+${analysed.toLocaleString("fr-FR")} matchs NBA analysés`,
    `+${analysed.toLocaleString("en-US")} NBA games analyzed`,
    `+${analysed.toLocaleString("es-ES")} partidos de la NBA analizados`
  );
  const hero = HERO[L.lang];
  const badgeTxt = badge.replace(/\u202f/g, "\u00a0");
  const cards = pre.slice(0, 12);
  const elCrests = [...new Map(elGames.flatMap((g) => [g.home, g.away]).filter((c) => c.logo).map((c) => [c.id, c.logo])).values()];
  const LOGOS = TEAMS.map((t) => t.logo);
  const MIX = LOGOS.flatMap((l, i) => (elCrests[i] ? [l, elCrests[i]] : [l]));
  const nTeams = 30 + elCrests.length;

  const faqEs = [
    { q: "1. ¿Basketlog es gratis?", a: "Las probabilidades de victoria de todos los partidos son gratis, sin registro. Con una cuenta gratis desbloqueas además 1 análisis completo al día (escenarios, estadísticas comparadas, jugadores, forma). Para ir más allá: Starter a 10 €/mes (5 análisis al día), Pro a 19 €/mes (ilimitado) o Lifetime a 99 € en un solo pago. Todo está en la página Pro (/es/pro)." },
    { q: "2. ¿Cómo funcionan los análisis?", a: "El modelo parte del nivel real de cada equipo (diferencia de puntos, ataque, defensa, temporada pasada) y luego añade la ventaja de jugar en casa, el cansancio de los back-to-back y las bajas. El margen esperado se convierte en probabilidad de victoria y en escenarios. Todos los detalles están en la página Metodología (/es/methode)." },
    { q: "3. ¿Se puede apostar en Basketlog?", a: "No. Basketlog es una herramienta de análisis para entender mejor los partidos. Aquí no se aceptan apuestas y ninguna probabilidad es una garantía." },
    { q: "4. ¿Qué competiciones están cubiertas?", a: "La NBA (las 30 franquicias, con estadísticas de tiro, jugadores clave, forma reciente y enfrentamientos) y la Euroliga (los 20 clubes, con probabilidades, forma y clasificación). Más adelante llegarán otras ligas." },
    { q: "5. ¿Las opiniones que se muestran son reales?", a: "Sí. Cada opinión la envía un usuario con el botón «Dar mi opinión» y se publica tal cual tras una simple revisión antispam. No escribimos ninguna nosotros." },
    { q: "6. ¿Cuál es el porcentaje de acierto de Basketlog?", a: "Todo es público en la página Balance (/es/app/bilan): cada pronóstico se compara con el resultado final, partido a partido, con el detalle por nivel de confianza. El modelo se recalcula solo con los resultados conocidos antes de cada partido, sin hacer trampa con el futuro. Los datos proceden de las fuentes oficiales de la NBA y la Euroliga, actualizadas continuamente." },
  ];
  const faq = L.es ? faqEs : L.en ? [
    { q: "1. Is Basketlog free?", a: "Win probabilities for every game are free, no sign-up needed. With a free account, you also unlock 1 full analysis per day (scenarios, stat comparison, players, form). To go further: Starter at €10/month (5 analyses per day), Pro at €19/month (unlimited) or Lifetime at €99 one-time. Everything is on the Pro page (/en/pro)." },
    { q: "2. How do the analyses work?", a: "The model starts from each team's real strength (point differential, offense, defense, last season), then adds home-court advantage, back-to-back fatigue and injuries. The expected margin is converted into a win probability and scenarios. All the details are on the Methodology page (/en/methode)." },
    { q: "3. Can I bet on Basketlog?", a: "No. Basketlog is an analysis tool to understand games better. No bets are taken here and no probability is a guarantee." },
    { q: "4. Which competitions are covered?", a: "The NBA (all 30 franchises, with shooting stats, key players, recent form and head-to-head) and the EuroLeague (all 20 clubs, with probabilities, form and standings). More leagues will follow." },
    { q: "5. Are the reviews real?", a: "Yes. Every review is submitted by a user through the “Leave a review” button, then published as is after a simple anti-spam check. We don't write any ourselves." },
    { q: "6. What is Basketlog's track record?", a: "Everything is public on the Track record page (/en/app/bilan): every prediction is compared with the final score, game by game, with a breakdown by confidence level. The model is recalculated using only results known before each game, without peeking at the future. Data comes from the official NBA and EuroLeague feeds, updated continuously." },
  ] : [
    { q: "1. Basketlog est-il gratuit ?", a: "Les probabilités de victoire de tous les matchs sont gratuites, sans inscription. Avec un compte gratuit, tu débloques en plus 1 analyse complète par jour (scénarios, stats comparées, joueurs, forme). Pour aller plus loin : Starter à 10 €/mois (5 analyses par jour), Pro à 19 €/mois (illimité) ou Lifetime à 99 € une seule fois. Tout est sur la page Pro (/pro)." },
    { q: "2. Comment fonctionnent les analyses ?", a: "Le modèle part du niveau réel de chaque équipe (écart de points, attaque, défense, saison passée), puis ajoute l'avantage du terrain, la fatigue des back-to-back et les absences. La marge attendue est convertie en probabilité de victoire et en scénarios. Tout le détail est sur la page Méthode (/methode)." },
    { q: "3. Est-ce que Basketlog permet de parier ?", a: "Non. Basketlog est un outil d'analyse pour mieux comprendre les matchs. Aucune prise de pari ne se fait ici et aucune probabilité n'est une garantie." },
    { q: "4. Quelles compétitions sont couvertes ?", a: "La NBA (les 30 franchises, avec stats de tirs, joueurs clés, forme récente et confrontations) et l'EuroLeague (les 20 clubs, avec probabilités, forme et classement). D'autres championnats arriveront ensuite." },
    { q: "5. Les avis affichés sont-ils réels ?", a: "Oui. Chaque avis est déposé par un utilisateur via le bouton « Donner mon avis », puis publié tel quel après une simple relecture anti-spam. Nous n'en écrivons aucun nous-mêmes." },
    { q: "6. Quel est le taux de réussite de Basketlog ?", a: "Tout est public sur la page Bilan (/app/bilan) : chaque pronostic est comparé au score final, match par match, avec le détail par niveau de confiance. Le modèle y est recalculé uniquement avec les résultats connus avant chaque match, sans tricher avec le futur. Les données viennent des flux officiels NBA et EuroLeague, mis à jour en continu." },
  ];

  return (
    <main>
      <JsonLd data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q.replace(/^\d+\.\s*/, ""), acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }} />
      <RevealObserver />

      {/* ================= HERO (façon Visifoot) ================= */}
      <section className="hero">
        <div className="hero-bg" aria-hidden>
          <div className="photo" />
          <div className="shade" />
          <div className="cone" />
          <div className="bloom" />
          <div className="lamp" />
          <div className="grain" />
          <div className="dust">{DUST.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }} />)}</div>
        </div>

        <div className="hero-in">
          <div className="pill-badge rise" style={{ "--d": "100ms" }}>
            <span className="ico" aria-hidden><StarIcon /></span>
            {badgeTxt}
          </div>
          <h1 className="t-hero">
            {hero.words.map((w, i) => <span key={i}><span className="w" style={{ "--d": `${180 + i * 70}ms` }}>{w}</span>{" "}</span>)}
            <span className="w accent" style={{ "--d": `${180 + hero.words.length * 70}ms` }}>{hero.accent}</span>
          </h1>
          <p className="lead rise" style={{ "--d": "650ms" }}>{L.t(
            "Probabilités, statistiques avancées et scénarios de match pour anticiper les résultats et mieux comprendre le jeu.",
            "Probabilities, advanced statistics and game scenarios to anticipate outcomes and better understand the game.",
            "Probabilidades, estadísticas avanzadas y escenarios de partido para anticipar los resultados y comprender mejor el juego."
          )}</p>
          <div className="rise" style={{ "--d": "800ms", width: "100%", display: "flex", justifyContent: "center" }}><TeamSearch games={up.map(({ a, ...r }) => r)} /></div>
          <p className="proof rise" style={{ "--d": "950ms" }}>
            {acc.n >= 5 ? (
              <Link href={L.href("/app/bilan")}>{L.t(
                <><b>{accTxt}</b> de précision sur les <b>{acc.n}</b> matchs analysés la semaine dernière</>,
                <><b>{accTxt}</b> accuracy on <b>{acc.n}</b> games analyzed last week</>,
                <><b>{accTxt}</b> de precisión en los <b>{acc.n}</b> partidos analizados la semana pasada</>
              )}</Link>
            ) : L.t(
              <><b>{up.length}</b> matchs NBA à analyser cette semaine</>,
              <><b>{up.length}</b> NBA games to analyze this week</>,
              <><b>{up.length}</b> partidos de la NBA para analizar esta semana</>
            )}
          </p>
        </div>

        <div className="stage">
          <div className="flogo f1"><div className="float">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={teamById("2").logo} alt="" /></div></div>
          <div className="flogo f2"><div className="float">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={teamById("9").logo} alt="" /></div></div>
          <div className="flogo f3"><div className="float">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={teamById("18").logo} alt="" /></div></div>
          <div className="flogo f4"><div className="float">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={teamById("4").logo} alt="" /></div></div>
          <div className="phone-in"><PhoneHero team={{ id: heroTeam.id, name: heroTeam.name, logo: heroTeam.logo }} rivals={rivals} rows={rows.map(({ a, ...r }) => r)} /></div>
          {notifs.map((g, i) => {
            const fav = g.pHome >= 0.5 ? g.home : g.away;
            return (
              <Link key={g.id} href={L.href(`/app/match/${g.id}?d=${g.d}`)} className={`notif n${i + 1}`}>
                <span className="nico"><span className="ball" /></span>
                <span>
                  <small>BASKETLOG</small>
                  <b>🏀 {g.home.short} - {g.away.short}</b>
                  <span>{L.t("Victoire", "Win", "Victoria")} {fav.abbr} {pct(Math.max(g.pHome, 1 - g.pHome))}% 🔥</span>
                </span>
                <time>{shortDay(g.date, L)}</time>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= ÉQUIPES COUVERTES ================= */}
      <section className="cover">
        {L.t(
          <h2 className="t-sec reveal">{nTeams > 30 ? `${nTeams} équipes` : "Les 30 franchises"}<br /><span className="accent">{nTeams > 30 ? "NBA et EuroLeague" : "NBA couvertes"}</span></h2>,
          <h2 className="t-sec reveal">{nTeams > 30 ? `${nTeams} NBA and` : "All 30 NBA"}<br /><span className="accent">{nTeams > 30 ? "EuroLeague teams" : "franchises covered"}</span></h2>,
          <h2 className="t-sec reveal">{nTeams > 30 ? `${nTeams} equipos` : "Las 30 franquicias"}<br /><span className="accent">{nTeams > 30 ? "NBA y Euroliga" : "NBA cubiertas"}</span></h2>
        )}
        <div className="marquee reveal" style={{ "--d": "150ms" }}>
          <div className="marquee-track">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {[...MIX, ...MIX].map((l, i) => <img key={i} src={l} alt="" loading="lazy" />)}
          </div>
        </div>
      </section>

      {/* ================= DÉMO SCORE ================= */}
      {big && (
        <section className="demo">
          <div className="demo-bg" aria-hidden />
          <div className="demo-side l reveal left"><div className="float">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={big.home.logo} alt={big.home.name} /></div></div>
          <div className="demo-side r reveal right"><div className="float">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={big.away.logo} alt={big.away.name} /></div></div>
          <div className="demo-in">
            <h2 className="t-big reveal zoom">{nameFor(big.home)} {Math.round(big.homePts)} - {Math.round(big.awayPts)} {nameFor(big.away)}</h2>
            <p className="lead reveal" style={{ "--d": "120ms" }}>{L.t(
              <>Le score projeté par notre modèle pour {big.away.short} @ {big.home.short} ({shortDay(big.date, L)}). Niveau, forme, absences et fatigue : tout est pris en compte.</>,
              <>The score our model projects for {big.away.short} @ {big.home.short} ({shortDay(big.date, L)}). Strength, form, injuries and fatigue: everything is factored in.</>,
              <>El marcador que proyecta nuestro modelo para {big.away.short} @ {big.home.short} ({shortDay(big.date, L)}). Nivel, forma, bajas y cansancio: todo se tiene en cuenta.</>
            )}</p>
            <div className="stats3">
              <div className="stat reveal" style={{ "--d": "150ms" }}><strong><SlotNumber value={pct(big.pHome)} suffix="%" /></strong><span>{L.t(`Victoire ${big.home.short}`, `${big.home.short} win`, `Victoria ${big.home.short}`)}</span></div>
              <div className="stat reveal" style={{ "--d": "300ms" }}><strong><SlotNumber value={pct(big.close)} suffix="%" /></strong><span>{L.t("Match serré", "Close game", "Partido igualado")}</span></div>
              <div className="stat reveal" style={{ "--d": "450ms" }}><strong><SlotNumber value={pct(1 - big.pHome)} suffix="%" /></strong><span>{L.t(`Victoire ${big.away.short}`, `${big.away.short} win`, `Victoria ${big.away.short}`)}</span></div>
            </div>
            <div className="reveal" style={{ "--d": "500ms" }}><BallButton href={L.href(`/app/match/${big.id}?d=${big.d}`)}>{L.t("Analyse prête", "Analysis ready", "Análisis listo")}</BallButton></div>
            <p className="demo-note reveal" style={{ "--d": "600ms" }}>{L.t("Probabilités gratuites pour tous les matchs · analyses complètes dès 10 €/mois", "Free probabilities for every game · full analyses from €10/month", "Probabilidades gratis para todos los partidos · análisis completos desde 10 €/mes")}</p>
          </div>
        </section>
      )}

      {/* ================= AVIS DES UTILISATEURS ================= */}
      <section className="voices" id="avis">
        <div className="avatars reveal">
          {reviews.list.length
            ? reviews.list.slice(0, 5).map((r) => <span key={r.id} className="initial" style={{ background: avatarColor(r.prenom) }}>{r.prenom.charAt(0).toUpperCase()}</span>)
            : /* eslint-disable-next-line @next/next/no-img-element */
              ["13", "2", "9", "25", "18"].map((id) => <img key={id} src={teamById(id).logo} alt="" />)}
        </div>
        <h2 className="t-80 reveal">{L.t("Ce que pensent les utilisateurs de Basketlog", "What Basketlog users think", "Lo que piensan los usuarios de Basketlog")}</h2>
        <p className="lead reveal" style={{ "--d": "120ms" }}>
          {reviews.count
            ? L.t(
              <>{reviews.count} avis · note moyenne {reviews.avg.toFixed(1).replace(".", ",")}/5. Tous publiés tels quels, après simple relecture.</>,
              <>{reviews.count} review{reviews.count > 1 ? "s" : ""} · average rating {reviews.avg.toFixed(1)}/5. All published as is, after a simple check.</>,
              <>{reviews.count} opinión{reviews.count > 1 ? "es" : ""} · nota media {reviews.avg.toFixed(1).replace(".", ",")}/5. Todas publicadas tal cual, tras una simple revisión.</>
            )
            : L.t("Les avis de nos utilisateurs, publiés tels quels après relecture. Les premiers arrivent : à toi de jouer.", "Reviews from our users, published as is after a check. The first ones are coming in: your turn.", "Las opiniones de nuestros usuarios, publicadas tal cual tras una revisión. Ya llegan las primeras: te toca.")}
        </p>

        <div className="arc reveal" style={{ "--d": "150ms" }} aria-hidden>
          <div className="arc-ring">
            {cards.slice(0, 12).map((g, i, arr) => {
              const n = Math.max(arr.length, 10);
              return (
                <div className="arc-card" key={g.id} style={{ transform: `rotateY(${(360 / n) * i}deg) translateZ(560px)` }}>
                  <div className="ah"><span className="logo"><span className="ball" />Basketlog</span><span>{shortDay(g.date, L)}</span></div>
                  <div className="at">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div><img src={g.away.logo} alt="" /><b>{g.away.abbr}</b></div>
                    <em>@</em>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <div><img src={g.home.logo} alt="" /><b>{g.home.abbr}</b></div>
                  </div>
                  <div className="ap">{pct(Math.max(g.pHome, 1 - g.pHome))}%<small>{L.t(`victoire ${(g.pHome >= 0.5 ? g.home : g.away).short}`, `${(g.pHome >= 0.5 ? g.home : g.away).short} win`, `victoria ${(g.pHome >= 0.5 ? g.home : g.away).short}`)}</small></div>
                  <div className="abar"><i style={{ width: `${(1 - g.pHome) * 100}%` }} /></div>
                  <div className="arow"><span>{L.t("Score projeté", "Projected score", "Marcador proyectado")}</span><b>{Math.round(g.awayPts)}-{Math.round(g.homePts)}</b></div>
                  <div className="arow"><span>Total</span><b>{Math.round(g.total)}</b></div>
                </div>
              );
            })}
          </div>
          <div className="arc-fade" />
        </div>

        <div className="reveal"><BallButton href={L.href("/app/matchs")}>{L.t("Analyse prête", "Analysis ready", "Análisis listo")}</BallButton></div>

        <ReviewCards reviews={reviews.list} L={L} />
      </section>

      {/* ================= ANALYSES + CLASSEMENT ================= */}
      <StickyStandings east={std.east} west={std.west} />

      {/* ================= SOURCES ================= */}
      <section className="sources">
        <div className="sources-bg" aria-hidden />
        <span className="pill-badge plain reveal">{L.t("+1 230 matchs par saison", "1,230+ games per season", "+1230 partidos por temporada")}</span>
        {L.t(
          <h2 className="t-sec reveal" style={{ "--d": "100ms" }}>Nous analysons<br />chaque match NBA</h2>,
          <h2 className="t-sec reveal" style={{ "--d": "100ms" }}>We analyze<br />every NBA game</h2>,
          <h2 className="t-sec reveal" style={{ "--d": "100ms" }}>Analizamos<br />cada partido de la NBA</h2>
        )}
        <p className="lead reveal" style={{ "--d": "200ms" }}>{L.t("Calendrier, scores, stats de tirs, joueurs clés, classements et infirmerie : les données NBA et EuroLeague sont croisées en continu pour prédire chaque match.", "Schedule, scores, shooting stats, key players, standings and injury reports: NBA and EuroLeague data is cross-checked continuously to predict every game.", "Calendario, resultados, estadísticas de tiro, jugadores clave, clasificaciones y parte médico: los datos de la NBA y la Euroliga se cruzan continuamente para predecir cada partido.")}</p>
        <div className="marquee">
          <div className="marquee-track" style={{ animationDirection: "reverse", animationDuration: "65s" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {[...LOGOS.slice().reverse(), ...LOGOS.slice().reverse()].map((l, i) => <img key={i} src={l} alt="" loading="lazy" />)}
          </div>
        </div>
      </section>

      {/* ================= FAQ ================= */}
      <section className="faq" id="faq">
        <div className="faq-in">
          <h2 className="t-sec reveal">{L.t("Question fréquente", "FAQ", "Pregunta frecuente")}</h2>
          <p className="lead reveal" style={{ "--d": "100ms" }}>{L.t("Une réponse claire à toutes vos questions sur Basketlog.", "Clear answers to all your questions about Basketlog.", "Una respuesta clara a todas tus preguntas sobre Basketlog.")}</p>
          <div className="reveal" style={{ "--d": "200ms" }}><Faq items={faq} /></div>
        </div>
      </section>
    </main>
  );
}
