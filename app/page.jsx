import Link from "next/link";
import { analyzeDay, recentAccuracy, upcomingGames } from "../lib/data";
import { nbaToday, shiftDate } from "../lib/espn";
import { pct } from "../lib/model";
import { parisTime, parisDay } from "../components/ui";
import TeamSearch from "../components/TeamSearch";
import CountUp from "../components/CountUp";

export const dynamic = "force-dynamic";

const TEAMS = ["atl","bos","bkn","cha","chi","cle","dal","den","det","gs","hou","ind","lac","lal","mem","mia","mil","min","no","ny","okc","orl","phi","phx","por","sac","sa","tor","utah","wsh"];
const logo = (a) => `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${a}.png`;

async function pickFeatured() {
  const today = nbaToday();
  for (const d of [today, shiftDate(today, 1), shiftDate(today, 2)]) {
    const { analyses } = await analyzeDay(d);
    const pool = analyses.filter((a) => a.game.state === "pre");
    if (pool.length) {
      // Le match le plus déséquilibré pour la démo chiffrée, le plus serré pour le téléphone
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
          <span className="ps-logo"><span className="logo-ball" /> HoopSight</span>
          <span className="ps-menu" aria-hidden><i /><i /><i /></span>
        </div>
        <div className="ps-title">Analyse de match</div>
        <div className="ps-sub">Entre les équipes que tu veux analyser</div>
        <div className="ps-note">Le modèle croise forme, niveau, absences et fatigue pour chaque match.</div>
        <div className="ps-card">
          <div className="ps-teams">
            <div>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={g.away.logo} alt="" width={44} height={44} /><span>{g.away.abbr}</span></div>
            <div className="ps-time">{parisDay(g.date)}<b>{parisTime(g.date)}</b></div>
            <div>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={g.home.logo} alt="" width={44} height={44} /><span>{g.home.abbr}</span></div>
          </div>
          <div className="ps-probs">
            <b>{pct(a.pAway)}</b>
            <div className="ps-bar"><i style={{ width: `${a.pAway * 100}%` }} /></div>
            <b className="hot">{pct(a.pHome)}</b>
          </div>
          <div className="ps-rows">
            <div><span>Score projeté</span><b>{Math.round(a.awayPts)}–{Math.round(a.homePts)}</b></div>
            <div><span>Total de points</span><b>{Math.round(a.total)}</b></div>
            <div><span>Match serré (≤ 5 pts)</span><b>{pct(a.scenarios[1].p)}</b></div>
          </div>
        </div>
        <Link href={`/app/match/${g.id}?d=${date}`} className="ps-cta">Voir l&apos;analyse</Link>
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
          <div className="hx-floor"><svg viewBox="0 0 1000 400" preserveAspectRatio="none"><rect x="40" y="20" width="920" height="360" /><line x1="500" y1="20" x2="500" y2="380" /><circle cx="500" cy="200" r="70" /><circle cx="500" cy="200" r="18" /><path d="M40 90 h170 v220 h-170" /><path d="M960 90 h-170 v220 h170" /><path d="M40 40 a260 160 0 0 1 0 320" transform="translate(0,0)" /><path d="M960 40 a260 160 0 0 0 0 320" /></svg></div>
          <div className="hx-vignette" />
        </div>

        <div className="hx-in">
          <div className="hx-pill"><span className="star">🏀</span> {count ? `${count} matchs NBA analysés ce soir` : "Toute la NBA analysée chaque soir"}</div>
          <h1 className="hx-title">Prédis chaque<br />match avant<br />l&apos;<em>entre-deux.</em></h1>
          <p className="hx-sub">Probabilités, score projeté, absences et scénarios de match pour anticiper les résultats et mieux comprendre le jeu.</p>
          <TeamSearch games={upcoming} />
          <p className="hx-proof">
            {acc.n >= 5 ? (
              <><b>{accPct}%</b> de bons pronostics sur les <b>{acc.n}</b> derniers matchs terminés</>
            ) : (
              <><b>{upcoming.length}</b> matchs NBA à analyser cette semaine</>
            )}
          </p>
        </div>

        <div className="hx-stage">
          {phone && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hx-team l" src={phone.game.away.logo} alt={phone.game.away.name} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hx-team r" src={phone.game.home.logo} alt={phone.game.home.name} />
            </>
          )}
          <Phone a={phone} date={date} />
        </div>
      </section>

      {/* ===== FRANCHISES ===== */}
      <section className="teams-strip">
        <h3>Les 30 franchises NBA couvertes</h3>
        <div className="marquee">
          <div className="marquee-track">
            {[...TEAMS, ...TEAMS].map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={logo(t)} alt="" width={64} height={64} loading="lazy" />
            ))}
          </div>
        </div>
      </section>

      {/* ===== DEMO CHIFFRÉE ===== */}
      {big && (
        <section className="bigdemo">
          <div className="bigdemo-bg" aria-hidden />
          <div className="wrap center">
            <h2 className="bigscore">{big.game.home.abbr} {Math.round(big.homePts)} – {Math.round(big.awayPts)} {big.game.away.abbr}</h2>
            <p className="bigdemo-sub">Score projeté par le modèle pour {big.game.away.short} @ {big.game.home.short}, {parisDay(big.game.date)} à {parisTime(big.game.date)}.</p>
            <div className="bigstats">
              <div><strong><CountUp value={Math.round(big.pHome * 100)} suffix="%" /></strong><span>Victoire {big.game.home.short}</span></div>
              <div><strong><CountUp value={Math.round(big.scenarios[1].p * 100)} suffix="%" /></strong><span>Match serré</span></div>
              <div><strong><CountUp value={Math.round(big.pAway * 100)} suffix="%" /></strong><span>Victoire {big.game.away.short}</span></div>
            </div>
            <Link href={`/app/match/${big.game.id}?d=${date}`} className="btn-ready">Analyse prête</Link>
            <p className="bigdemo-note">Les probabilités de tous les matchs sont gratuites. 3 analyses complètes offertes chaque jour.</p>
          </div>
        </section>
      )}

      {/* ===== COMMENT ===== */}
      <section id="comment" className="how">
        <div className="wrap">
          <h2 className="h-sec">Un vrai modèle derrière <em>chaque chiffre.</em></h2>
          <p className="p-sec">Les probabilités sortent d&apos;un modèle statistique alimenté chaque soir par les données NBA, puis on te les explique en clair.</p>
          <div className="how-grid">
            <div className="how-card"><span className="how-n">01</span><h3>Niveau réel des équipes</h3><p>Écart de points, attaque, défense. En début de saison, le modèle s&apos;appuie aussi sur la saison passée pour ne pas surréagir à 2 matchs.</p></div>
            <div className="how-card"><span className="how-n">02</span><h3>Contexte du soir</h3><p>Avantage du terrain, back-to-back et joueurs absents ou incertains, mis à jour avant chaque match.</p></div>
            <div className="how-card"><span className="how-n">03</span><h3>Scénarios lisibles</h3><p>Victoire, score projeté, total de points, chances d&apos;un match serré ou d&apos;une large victoire, et les clés du match.</p></div>
          </div>
        </div>
      </section>

      {/* ===== TARIFS ===== */}
      <section id="tarifs" className="pricing">
        <div className="wrap">
          <h2 className="h-sec center">Commence <em>gratuitement.</em></h2>
          <div className="price-grid">
            <div className="pcard">
              <h3>Gratuit</h3>
              <div className="pamount">0 €</div>
              <ul><li>Probabilités de tous les matchs</li><li>3 analyses complètes par jour</li><li>Score et total projetés</li></ul>
              <Link href="/app" className="pbtn ghost">Commencer</Link>
            </div>
            <div className="pcard pro">
              <span className="pbadge">Bientôt</span>
              <h3>Pro</h3>
              <div className="pamount">6,99 € <small>/ mois</small></div>
              <ul><li>Analyses illimitées chaque soir</li><li>Analyse d&apos;avant-match rédigée par IA</li><li>Alertes absences de dernière minute</li><li>Euroleague et Betclic Élite à venir</li></ul>
              <span className="pbtn" aria-disabled="true">Accès anticipé bientôt</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="faq2">
        <div className="wrap narrow">
          <h2 className="h-sec center">Questions <em>fréquentes</em></h2>
          <details><summary>HoopSight est-il gratuit ?</summary><p>Oui. Les probabilités de tous les matchs sont visibles gratuitement et tu as 3 analyses complètes offertes chaque jour. La formule Pro débloque tout, sans limite.</p></details>
          <details><summary>Comment fonctionnent les analyses ?</summary><p>Le modèle part de l&apos;écart de points moyen de chaque équipe (corrigé en début de saison avec la saison précédente), puis ajoute l&apos;avantage du terrain, la fatigue des back-to-back et les absences. La marge attendue est convertie en probabilité de victoire.</p></details>
          <details><summary>Est-ce que HoopSight permet de parier ?</summary><p>Non. HoopSight est un outil d&apos;analyse pour mieux comprendre les matchs. Aucune prise de pari ne se fait ici, et aucune probabilité n&apos;est une garantie.</p></details>
          <details><summary>Les données sont-elles fiables ?</summary><p>Elles viennent des flux publics NBA, mis à jour en continu : calendrier, résultats, classements et infirmerie. Le taux de réussite affiché est calculé sur les vrais matchs terminés.</p></details>
        </div>
      </section>

      <section className="final">
        <div className="wrap center">
          <h2 className="h-sec">Le match de ce soir est <em>déjà analysé.</em></h2>
          <Link href="/app" className="btn-ready">Voir les matchs du jour</Link>
        </div>
      </section>
    </main>
  );
}
