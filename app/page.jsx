import Link from "next/link";
import { recentAccuracy, upcomingAnalyses, conferenceStandings } from "../lib/data";
import { TEAMS, teamById } from "../lib/teams";
import { nbaToday } from "../lib/espn";
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
    title: L.t("Basketlog : pronostics NBA et EuroLeague analysés par IA", "Basketlog: AI-powered NBA and EuroLeague predictions"),
    description: L.t(
      "Pronostics NBA et EuroLeague pour chaque match : probabilités de victoire gratuites, score projeté, absences, forme et scénarios. Taux de réussite public.",
      "NBA and EuroLeague predictions for every game: free win probabilities, projected score, injuries, form and scenarios. Public track record."
    ),
    path: "/",
    L,
  });
}

const pct = (p) => Math.round(p * 100);
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
  const [up, acc, std, reviews, elGames] = await Promise.all([upcomingAnalyses(7), recentAccuracy(7), conferenceStandings(), getReviews(30), getELGames()]);
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
  const cards = pre.slice(0, 12);
  const elCrests = [...new Map(elGames.flatMap((g) => [g.home, g.away]).filter((c) => c.logo).map((c) => [c.id, c.logo])).values()];
  const LOGOS = TEAMS.map((t) => t.logo);
  const MIX = LOGOS.flatMap((l, i) => (elCrests[i] ? [l, elCrests[i]] : [l]));
  const nTeams = 30 + elCrests.length;

  const faq = L.en ? [
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

      {/* ================= HERO ================= */}
      <section className="hero">
        <div className="hero-bg" aria-hidden>
          <div className="photo" />
          <div className="cone" />
          <div className="lamp" />
          <div className="shade" />
          <div className="dust">{DUST.map((p, i) => <i key={i} style={{ left: `${p.x}%`, top: `${p.y}%`, animationDelay: `${p.d}s` }} />)}</div>
        </div>

        <div className="hero-in">
          <div className="pill-badge rise" style={{ "--d": "100ms" }}>
            <span className="ico"><span className="ball" /></span>
            {L.en
              ? (todayCount ? `${todayCount} NBA games analyzed tonight` : "The whole NBA analyzed every night")
              : (todayCount ? `${todayCount} matchs NBA analysés ce soir` : "Toute la NBA analysée chaque soir")}
          </div>
          {L.en ? (
            <h1 className="t-hero">
              <span className="ln"><span style={{ "--d": "200ms" }}>Predict every</span></span>
              <span className="ln"><span style={{ "--d": "320ms" }}>NBA game before</span></span>
              <span className="ln"><span style={{ "--d": "440ms" }}>it <span className="accent">tips off.</span></span></span>
            </h1>
          ) : (
            <h1 className="t-hero">
              <span className="ln"><span style={{ "--d": "200ms" }}>Prédis chaque</span></span>
              <span className="ln"><span style={{ "--d": "320ms" }}>match NBA avant</span></span>
              <span className="ln"><span style={{ "--d": "440ms" }}>qu&apos;il ne <span className="accent">commence.</span></span></span>
            </h1>
          )}
          <p className="lead rise" style={{ "--d": "650ms" }}>{L.t("Pronostics NBA et EuroLeague : probabilités, statistiques avancées et scénarios de match pour anticiper les résultats et mieux comprendre le jeu.", "NBA and EuroLeague predictions: probabilities, advanced stats and game scenarios to anticipate results and understand the game better.")}</p>
          <div className="rise" style={{ "--d": "800ms", width: "100%", display: "flex", justifyContent: "center" }}><TeamSearch games={up.map(({ a, ...r }) => r)} /></div>
          <p className="proof rise" style={{ "--d": "950ms" }}>
            {acc.n >= 5
              ? <Link href={L.href("/app/bilan")}>{L.en ? <><b>{accPct}%</b> correct predictions over the <b>{acc.n}</b> games played last week</> : <><b>{accPct}%</b> de bons pronostics sur les <b>{acc.n}</b> matchs terminés la semaine dernière</>}</Link>
              : L.en ? <><b>{up.length}</b> NBA games to analyze this week</> : <><b>{up.length}</b> matchs NBA à analyser cette semaine</>}
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
                  <span>{L.t("Victoire", "Win")} {fav.abbr} {pct(Math.max(g.pHome, 1 - g.pHome))}% 🔥</span>
                </span>
                <time>{shortDay(g.date, L)}</time>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ================= ÉQUIPES COUVERTES ================= */}
      <section className="cover">
        {L.en
          ? <h2 className="t-sec reveal">{nTeams > 30 ? `${nTeams} NBA and` : "All 30 NBA"}<br /><span className="accent">{nTeams > 30 ? "EuroLeague teams" : "franchises covered"}</span></h2>
          : <h2 className="t-sec reveal">{nTeams > 30 ? `${nTeams} équipes` : "Les 30 franchises"}<br /><span className="accent">{nTeams > 30 ? "NBA et EuroLeague" : "NBA couvertes"}</span></h2>}
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
            <p className="lead reveal" style={{ "--d": "120ms" }}>{L.en
              ? <>The score our model projects for {big.away.short} @ {big.home.short} ({shortDay(big.date, L)}). Strength, form, injuries and fatigue: everything is factored in.</>
              : <>Le score projeté par notre modèle pour {big.away.short} @ {big.home.short} ({shortDay(big.date, L)}). Niveau, forme, absences et fatigue : tout est pris en compte.</>}</p>
            <div className="stats3">
              <div className="stat reveal" style={{ "--d": "150ms" }}><strong><SlotNumber value={pct(big.pHome)} suffix="%" /></strong><span>{L.en ? `${big.home.short} win` : `Victoire ${big.home.short}`}</span></div>
              <div className="stat reveal" style={{ "--d": "300ms" }}><strong><SlotNumber value={pct(big.close)} suffix="%" /></strong><span>{L.t("Match serré", "Close game")}</span></div>
              <div className="stat reveal" style={{ "--d": "450ms" }}><strong><SlotNumber value={pct(1 - big.pHome)} suffix="%" /></strong><span>{L.en ? `${big.away.short} win` : `Victoire ${big.away.short}`}</span></div>
            </div>
            <div className="reveal" style={{ "--d": "500ms" }}><BallButton href={L.href(`/app/match/${big.id}?d=${big.d}`)}>{L.t("Analyse prête", "Analysis ready")}</BallButton></div>
            <p className="demo-note reveal" style={{ "--d": "600ms" }}>{L.t("Probabilités gratuites pour tous les matchs · analyses complètes dès 10 €/mois", "Free probabilities for every game · full analyses from €10/month")}</p>
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
        <h2 className="t-80 reveal">{L.t("Ce que pensent les utilisateurs de Basketlog", "What Basketlog users think")}</h2>
        <p className="lead reveal" style={{ "--d": "120ms" }}>
          {reviews.count
            ? (L.en
              ? <>{reviews.count} review{reviews.count > 1 ? "s" : ""} · average rating {reviews.avg.toFixed(1)}/5. All published as is, after a simple check.</>
              : <>{reviews.count} avis · note moyenne {reviews.avg.toFixed(1).replace(".", ",")}/5. Tous publiés tels quels, après simple relecture.</>)
            : L.t("Les avis de nos utilisateurs, publiés tels quels après relecture. Les premiers arrivent : à toi de jouer.", "Reviews from our users, published as is after a check. The first ones are coming in: your turn.")}
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
                  <div className="ap">{pct(Math.max(g.pHome, 1 - g.pHome))}%<small>{L.en ? `${(g.pHome >= 0.5 ? g.home : g.away).short} win` : `victoire ${(g.pHome >= 0.5 ? g.home : g.away).short}`}</small></div>
                  <div className="abar"><i style={{ width: `${(1 - g.pHome) * 100}%` }} /></div>
                  <div className="arow"><span>{L.t("Score projeté", "Projected score")}</span><b>{Math.round(g.awayPts)}-{Math.round(g.homePts)}</b></div>
                  <div className="arow"><span>Total</span><b>{Math.round(g.total)}</b></div>
                </div>
              );
            })}
          </div>
          <div className="arc-fade" />
        </div>

        <div className="reveal"><BallButton href={L.href("/app/matchs")}>{L.t("Analyse prête", "Analysis ready")}</BallButton></div>

        <ReviewCards reviews={reviews.list} L={L} />
      </section>

      {/* ================= ANALYSES + CLASSEMENT ================= */}
      <StickyStandings east={std.east} west={std.west} />

      {/* ================= SOURCES ================= */}
      <section className="sources">
        <div className="sources-bg" aria-hidden />
        <span className="pill-badge plain reveal">{L.t("+1 230 matchs par saison", "1,230+ games per season")}</span>
        {L.en
          ? <h2 className="t-sec reveal" style={{ "--d": "100ms" }}>We analyze<br />every NBA game</h2>
          : <h2 className="t-sec reveal" style={{ "--d": "100ms" }}>Nous analysons<br />chaque match NBA</h2>}
        <p className="lead reveal" style={{ "--d": "200ms" }}>{L.t("Calendrier, scores, stats de tirs, joueurs clés, classements et infirmerie : les données NBA et EuroLeague sont croisées en continu pour prédire chaque match.", "Schedule, scores, shooting stats, key players, standings and injury reports: NBA and EuroLeague data is cross-checked continuously to predict every game.")}</p>
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
          <h2 className="t-sec reveal">{L.t("Question fréquente", "FAQ")}</h2>
          <p className="lead reveal" style={{ "--d": "100ms" }}>{L.t("Une réponse claire à toutes vos questions sur Basketlog.", "Clear answers to all your questions about Basketlog.")}</p>
          <div className="reveal" style={{ "--d": "200ms" }}><Faq items={faq} /></div>
        </div>
      </section>
    </main>
  );
}
