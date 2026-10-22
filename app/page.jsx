import Link from "next/link";
import { analyzeDay, recentAccuracy, upcomingGames } from "../lib/data";
import { nbaToday, shiftDate } from "../lib/espn";
import { pct } from "../lib/model";
import { parisTime, parisDay } from "../components/ui";
import TeamSearch from "../components/TeamSearch";
import CountUp from "../components/CountUp";
import Reveal from "../components/Reveal";

export const dynamic = "force-dynamic";

const TEAMS = ["atl","bos","bkn","cha","chi","cle","dal","den","det","gs","hou","ind","lac","lal","mem","mia","mil","min","no","ny","okc","orl","phi","phx","por","sac","sa","tor","utah","wsh"];
const logo = (a) => `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${a}.png`;

async function pickFeatured() {
  const today = nbaToday();
  for (const d of [today, shiftDate(today, 1), shiftDate(today, 2)]) {
    const { analyses } = await analyzeDay(d);
    const pool = analyses.filter((a) => a.game.state === "pre");
    if (pool.length) {
      const byEdge = [...pool].sort((x, y) => Math.abs(y.pHome - 0.5) - Math.abs(x.pHome - 0.5));
      return { phone: byEdge[byEdge.length - 1], big: byEdge[0], date: d, count: analyses.length };
    }
  }
  return { phone: null, big: null, date: today, count: 0 };
}

// Lumières de salle (positions fixes pour un rendu stable)
const LIGHTS = Array.from({ length: 46 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  return { x: r(1) * 100, y: 38 + r(2) * 40, s: 2 + r(3) * 4, o: 0.25 + r(4) * 0.6, d: r(5) * 6, warm: r(6) > 0.35 };
});

function Phone({ a, date }) {
  if (!a) return null;
  const g = a.game;
  return (
    <div className="phone">
      <div className="phone-notch" />
      <div className="phone-screen">
        <div className="ps-head">
          <span className="ps-logo"><span className="logo-ball spin" /> Basketlog</span>
          <span className="ps-menu" aria-hidden><i /><i /><i /></span>
        </div>
        <div className="ps-title">Analyse de match</div>
        <div className="ps-sub">Entre les équipes que tu veux analyser</div>
        <div className="ps-note">Le modèle croise forme, niveau, absences et fatigue pour chaque match.</div>
        <div className="ps-card">
          <div className="ps-scan" aria-hidden />
          <div className="ps-teams">
            <div className="ps-t l">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={g.away.logo} alt="" width={44} height={44} /><span>{g.away.abbr}</span></div>
            <div className="ps-time">{parisDay(g.date)}<b>{parisTime(g.date)}</b></div>
            <div className="ps-t r">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={g.home.logo} alt="" width={44} height={44} /><span>{g.home.abbr}</span></div>
          </div>
          <div className="ps-probs">
            <b><CountUp value={Math.round(a.pAway * 100)} suffix="%" delay={1300} /></b>
            <div className="ps-bar"><i style={{ "--w": `${a.pAway * 100}%` }} /></div>
            <b className="hot"><CountUp value={Math.round(a.pHome * 100)} suffix="%" delay={1300} /></b>
          </div>
          <div className="ps-rows">
            <div style={{ "--d": "1.7s" }}><span>Score projeté</span><b>{Math.round(a.awayPts)}–{Math.round(a.homePts)}</b></div>
            <div style={{ "--d": "1.85s" }}><span>Total de points</span><b>{Math.round(a.total)}</b></div>
            <div style={{ "--d": "2s" }}><span>Match serré (≤ 5 pts)</span><b>{pct(a.scenarios[1].p)}</b></div>
          </div>
        </div>
        <Link href={`/app/match/${g.id}?d=${date}`} className="ps-cta shine">Voir l&apos;analyse</Link>
      </div>
    </div>
  );
}

export default async function Home() {
  const [{ phone, big, date, count }, acc, upcoming] = await Promise.all([pickFeatured(), recentAccuracy(7), upcomingGames(7)]);
  const accPct = acc.n ? Math.round((acc.ok / acc.n) * 100) : 0;

  return (
    <main className="home">
      {/* ===== HERO ===== */}
      <section className="hx">
        <div className="hx-bg" aria-hidden>
          <div className="hx-flood l" /><div className="hx-flood r" /><div className="hx-beam" />
          {LIGHTS.map((l, i) => (
            <span key={i} className={`hx-dot ${l.warm ? "warm" : ""}`} style={{ left: `${l.x}%`, top: `${l.y}%`, width: l.s, height: l.s, opacity: l.o, animationDelay: `${l.d}s` }} />
          ))}
          <div className="hx-floor"><svg viewBox="0 0 1000 400" preserveAspectRatio="none"><rect x="40" y="20" width="920" height="360" /><line x1="500" y1="20" x2="500" y2="380" /><circle cx="500" cy="200" r="70" /><circle cx="500" cy="200" r="18" /><path d="M40 90 h170 v220 h-170" /><path d="M960 90 h-170 v220 h170" /><path d="M40 40 a260 160 0 0 1 0 320" /><path d="M960 40 a260 160 0 0 0 0 320" /></svg></div>
          <div className="hx-vignette" />
        </div>

        <div className="hx-in">
          <div className="hx-pill rise" style={{ "--d": "100ms" }}><span className="star"><span className="logo-ball spin" /></span> {count ? `${count} matchs NBA analysés ce soir` : "Toute la NBA analysée chaque soir"}</div>
          <h1 className="hx-title">
            <span className="ln"><span style={{ "--d": "250ms" }}>Prédis chaque</span></span>
            <span className="ln"><span style={{ "--d": "380ms" }}>match avant</span></span>
            <span className="ln"><span style={{ "--d": "510ms" }}>l&apos;<em className="glow">entre-deux.</em></span></span>
          </h1>
          <p className="hx-sub rise" style={{ "--d": "750ms" }}>Probabilités, score projeté, absences et scénarios de match pour anticiper les résultats et mieux comprendre le jeu.</p>
          <div className="rise search-wrap" style={{ "--d": "900ms" }}><TeamSearch games={upcoming} /></div>
          <p className="hx-proof rise" style={{ "--d": "1050ms" }}>
            {acc.n >= 5 ? (
              <><b><CountUp value={accPct} suffix="%" delay={1100} /></b> de bons pronostics sur les <b>{acc.n}</b> derniers matchs terminés</>
            ) : (
              <><b>{upcoming.length}</b> matchs NBA à analyser cette semaine</>
            )}
          </p>
        </div>

        <div className="hx-stage">
          <div className="ball-bounce" aria-hidden><span className="logo-ball big" /><i className="ball-shadow" /></div>
          {phone && (
            <>
              <div className="hx-team-wrap l">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="hx-team" src={phone.game.away.logo} alt={phone.game.away.name} /></div>
              <div className="hx-team-wrap r">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="hx-team" src={phone.game.home.logo} alt={phone.game.home.name} /></div>
            </>
          )}
          <div className="phone-wrap"><Phone a={phone} date={date} /></div>
        </div>
      </section>

      {/* ===== FRANCHISES ===== */}
      <section className="teams-strip">
        <Reveal as="h3">Les 30 franchises NBA couvertes</Reveal>
        <div className="marquee">
          <div className="marquee-track">
            {[...TEAMS, ...TEAMS].map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={logo(t)} alt="" width={64} height={64} loading="lazy" />
            ))}
          </div>
        </div>
        <div className="marquee rev">
          <div className="marquee-track">
            {[...TEAMS.slice().reverse(), ...TEAMS.slice().reverse()].map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={logo(t)} alt="" width={64} height={64} loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEMO CHIFFRÉE ===== */}
      {big && (
        <section className="bigdemo">
          <div className="bigdemo-bg" aria-hidden><span className="sweep" /></div>
          <div className="wrap center">
            <Reveal as="h2" className="bigscore zoom">
              {big.game.home.abbr} <CountUp value={Math.round(big.homePts)} duration={1800} /> – <CountUp value={Math.round(big.awayPts)} duration={1800} /> {big.game.away.abbr}
            </Reveal>
            <Reveal as="p" className="bigdemo-sub" delay={150}>Score projeté par le modèle pour {big.game.away.short} @ {big.game.home.short}, {parisDay(big.game.date)} à {parisTime(big.game.date)}.</Reveal>
            <div className="bigstats">
              <Reveal delay={200}><strong><CountUp value={Math.round(big.pHome * 100)} suffix="%" /></strong><span>Victoire {big.game.home.short}</span></Reveal>
              <Reveal delay={350}><strong><CountUp value={Math.round(big.scenarios[1].p * 100)} suffix="%" /></strong><span>Match serré</span></Reveal>
              <Reveal delay={500}><strong><CountUp value={Math.round(big.pAway * 100)} suffix="%" /></strong><span>Victoire {big.game.away.short}</span></Reveal>
            </div>
            <Reveal delay={600}><Link href={`/app/match/${big.game.id}?d=${date}`} className="btn-ready shine pulse-ring">Analyse prête</Link></Reveal>
            <p className="bigdemo-note">Les probabilités de tous les matchs sont gratuites. 3 analyses complètes offertes chaque jour.</p>
          </div>
        </section>
      )}

      {/* ===== COMMENT ===== */}
      <section id="comment" className="how">
        <div className="wrap">
          <Reveal as="h2" className="h-sec">Un vrai modèle derrière <em>chaque chiffre.</em></Reveal>
          <Reveal as="p" className="p-sec" delay={100}>Les probabilités sortent d&apos;un modèle statistique alimenté chaque soir par les données NBA, puis on te les explique en clair.</Reveal>
          <div className="how-grid">
            <Reveal className="how-card" delay={0}><span className="how-ic">📊</span><span className="how-n">01</span><h3>Niveau réel des équipes</h3><p>Écart de points, attaque, défense. En début de saison, le modèle s&apos;appuie aussi sur la saison passée pour ne pas surréagir à 2 matchs.</p></Reveal>
            <Reveal className="how-card" delay={150}><span className="how-ic">🩹</span><span className="how-n">02</span><h3>Contexte du soir</h3><p>Avantage du terrain, back-to-back et joueurs absents ou incertains, mis à jour avant chaque match.</p></Reveal>
            <Reveal className="how-card" delay={300}><span className="how-ic">🎯</span><span className="how-n">03</span><h3>Scénarios lisibles</h3><p>Victoire, score projeté, total de points, chances d&apos;un match serré ou d&apos;une large victoire, et les clés du match.</p></Reveal>
          </div>
        </div>
      </section>

      {/* ===== TARIFS ===== */}
      <section id="tarifs" className="pricing">
        <div className="wrap">
          <Reveal as="h2" className="h-sec center">Commence <em>gratuitement.</em></Reveal>
          <div className="price-grid">
            <Reveal className="pcard" delay={0}>
              <h3>Gratuit</h3>
              <div className="pamount">0 €</div>
              <ul><li>Probabilités de tous les matchs</li><li>3 analyses complètes par jour</li><li>Score et total projetés</li></ul>
              <Link href="/app" className="pbtn ghost">Commencer</Link>
            </Reveal>
            <Reveal className="pcard pro" delay={150}>
              <span className="pbadge">Bientôt</span>
              <h3>Pro</h3>
              <div className="pamount">6,99 € <small>/ mois</small></div>
              <ul><li>Analyses illimitées chaque soir</li><li>Analyse d&apos;avant-match rédigée par IA</li><li>Alertes absences de dernière minute</li><li>Euroleague et Betclic Élite à venir</li></ul>
              <span className="pbtn shine" aria-disabled="true">Accès anticipé bientôt</span>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="faq2">
        <div className="wrap narrow">
          <Reveal as="h2" className="h-sec center">Questions <em>fréquentes</em></Reveal>
          <Reveal delay={0}><details><summary>Basketlog est-il gratuit ?</summary><p>Oui. Les probabilités de tous les matchs sont visibles gratuitement et tu as 3 analyses complètes offertes chaque jour. La formule Pro débloque tout, sans limite.</p></details></Reveal>
          <Reveal delay={80}><details><summary>Comment fonctionnent les analyses ?</summary><p>Le modèle part de l&apos;écart de points moyen de chaque équipe (corrigé en début de saison avec la saison précédente), puis ajoute l&apos;avantage du terrain, la fatigue des back-to-back et les absences. La marge attendue est convertie en probabilité de victoire.</p></details></Reveal>
          <Reveal delay={160}><details><summary>Est-ce que Basketlog permet de parier ?</summary><p>Non. Basketlog est un outil d&apos;analyse pour mieux comprendre les matchs. Aucune prise de pari ne se fait ici, et aucune probabilité n&apos;est une garantie.</p></details></Reveal>
          <Reveal delay={240}><details><summary>Les données sont-elles fiables ?</summary><p>Elles viennent des flux publics NBA, mis à jour en continu : calendrier, résultats, classements et infirmerie. Le taux de réussite affiché est calculé sur les vrais matchs terminés.</p></details></Reveal>
        </div>
      </section>

      <section className="final">
        <div className="wrap center">
          <Reveal as="h2" className="h-sec">Le match de ce soir est <em>déjà analysé.</em></Reveal>
          <Reveal delay={150}><Link href="/app" className="btn-ready shine pulse-ring">Voir les matchs du jour</Link></Reveal>
        </div>
      </section>
    </main>
  );
}
