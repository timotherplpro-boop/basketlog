import Link from "next/link";
import { analyzeDay } from "../lib/data";
import { nbaToday, shiftDate } from "../lib/espn";
import { pct } from "../lib/model";
import { TeamLogo, ProbBar, parisTime, parisDay } from "../components/ui";

export const dynamic = "force-dynamic";

async function pickDemo() {
  const today = nbaToday();
  for (const d of [today, shiftDate(today, 1)]) {
    const { analyses } = await analyzeDay(d);
    const upcoming = analyses.filter((a) => a.game.state === "pre");
    const pool = upcoming.length ? upcoming : analyses;
    if (pool.length) {
      // Le match le plus disputé = le plus intéressant à montrer
      const best = [...pool].sort((x, y) => Math.abs(x.pHome - 0.5) - Math.abs(y.pHome - 0.5))[0];
      return { a: best, count: analyses.length, date: d };
    }
  }
  return { a: null, count: 0, date: today };
}

export default async function Home() {
  const { a, count, date } = await pickDemo();

  return (
    <main>
      <header className="hero">
        <div className="court-lines" aria-hidden />
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow"><span className="pulse" /> {count ? `${count} matchs NBA analysés ce soir` : "Analyses NBA mises à jour chaque jour"}</span>
            <h1>Lis le match <em>avant</em> l&apos;entre-deux.</h1>
            <p className="lead">
              Probabilités de victoire, score projeté, absences, fatigue des back-to-back et scénarios : chaque match NBA décortiqué par un modèle statistique, en 30 secondes de lecture.
            </p>
            <div className="hero-cta">
              <Link href="/app" className="btn btn-primary">Voir les matchs du soir →</Link>
              <Link href="#comment" className="btn btn-ghost">Comment ça marche</Link>
            </div>
            <div className="hero-note">3 analyses complètes offertes chaque jour · sans inscription</div>
          </div>

          {a ? (
            <Link href={`/app/match/${a.game.id}?d=${date}`} className="card demo" aria-label="Voir l'analyse du match">
              <div className="demo-head">
                <span>Match à suivre</span>
                <span className="mono">{parisDay(a.game.date)} · {parisTime(a.game.date)}</span>
              </div>
              <div className="teams">
                <div className="team"><TeamLogo team={a.game.away} size={56} /><div className="team-name">{a.game.away.short}</div><div className="team-rec mono">{a.game.away.record}</div></div>
                <div className="vs mono">@</div>
                <div className="team"><TeamLogo team={a.game.home} size={56} /><div className="team-name">{a.game.home.short}</div><div className="team-rec mono">{a.game.home.record}</div></div>
              </div>
              <ProbBar pAway={a.pAway} pHome={a.pHome} away={a.game.away} home={a.game.home} />
              <div className="prob-labels mono">
                <span><strong>{pct(a.pAway)}</strong> {a.game.away.abbr}</span>
                <span>{a.game.home.abbr} <strong>{pct(a.pHome)}</strong></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, paddingTop: 16, borderTop: "1px solid var(--line)" }}>
                <div><div className="team-rec">Score projeté</div><div className="big-score mono">{Math.round(a.awayPts)}–{Math.round(a.homePts)}</div></div>
                <div style={{ textAlign: "right" }}><div className="team-rec">Total projeté</div><div className="big-score mono">{Math.round(a.total)}</div></div>
              </div>
            </Link>
          ) : (
            <div className="card demo empty">Aucun match NBA programmé aujourd&apos;hui. Reviens ce soir !</div>
          )}
        </div>
      </header>

      <div className="wrap">
        <div className="stat-strip">
          <div><strong className="mono">30</strong><span>équipes NBA suivies</span></div>
          <div><strong className="mono">10 min</strong><span>fréquence de mise à jour</span></div>
          <div><strong className="mono">5</strong><span>facteurs pondérés par match</span></div>
          <div><strong className="mono">0 €</strong><span>pour tes 3 analyses du jour</span></div>
        </div>
      </div>

      <section id="comment">
        <div className="wrap">
          <h2 className="sec-title">Un vrai modèle derrière chaque chiffre.</h2>
          <p className="sec-sub">Pas d&apos;intuition, pas de « feeling » : les probabilités sortent d&apos;un modèle statistique, puis on te les explique en clair.</p>
          <div className="grid3">
            <div className="card feature"><span className="num mono">01</span><h3>Niveau réel des équipes</h3><p>Écart de points moyen, attaque, défense. En début de saison, le modèle mélange les chiffres récents avec la saison passée pour ne pas surréagir à 2 matchs.</p></div>
            <div className="card feature"><span className="num mono">02</span><h3>Contexte du soir</h3><p>Avantage du terrain, équipes qui ont joué la veille (back-to-back) et joueurs absents ou incertains, mis à jour avant chaque match.</p></div>
            <div className="card feature"><span className="num mono">03</span><h3>Scénarios lisibles</h3><p>Probabilité de victoire, score projeté, total de points, chances d&apos;un match serré ou d&apos;une large victoire, et les clés du match en 3 phrases.</p></div>
          </div>
        </div>
      </section>

      <section id="tarifs" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <h2 className="sec-title">Simple.</h2>
          <p className="sec-sub">Commence gratuitement. Passe Pro quand tu veux tout le programme du soir.</p>
          <div className="grid2">
            <div className="card price">
              <h3>Gratuit</h3>
              <div className="amount mono">0 €</div>
              <ul>
                <li>Probabilités de tous les matchs du jour</li>
                <li>3 analyses complètes par jour</li>
                <li>Score et total projetés</li>
              </ul>
              <Link href="/app" className="btn btn-ghost" style={{ marginTop: "auto" }}>Commencer</Link>
            </div>
            <div className="card price pro">
              <h3>Pro <span className="tag hot" style={{ marginLeft: 6 }}>Bientôt</span></h3>
              <div className="amount mono">6,99 € <small>/ mois</small></div>
              <ul>
                <li>Analyses illimitées, chaque soir</li>
                <li>Récit d&apos;avant-match rédigé par IA</li>
                <li>Alertes absences de dernière minute</li>
                <li>Euroleague et Betclic Élite (à venir)</li>
              </ul>
              <span className="btn btn-primary" style={{ marginTop: "auto", opacity: .9 }} aria-disabled>Accès anticipé bientôt</span>
            </div>
          </div>
        </div>
      </section>

      <section className="faq" style={{ paddingTop: 20 }}>
        <div className="wrap">
          <h2 className="sec-title">Questions fréquentes</h2>
          <details><summary>HoopSight est-il gratuit ?</summary><p>Oui : les probabilités de tous les matchs sont visibles gratuitement, et tu as 3 analyses complètes offertes chaque jour. La formule Pro débloque tout, sans limite.</p></details>
          <details><summary>Comment sont calculées les probabilités ?</summary><p>À partir de l&apos;écart de points moyen de chaque équipe (corrigé en début de saison avec la saison précédente), de l&apos;avantage du terrain, de la fatigue (back-to-back) et des absences. La marge attendue est convertie en probabilité avec la dispersion historique des scores NBA.</p></details>
          <details><summary>Est-ce que HoopSight permet de parier ?</summary><p>Non. HoopSight est un outil d&apos;analyse pour mieux comprendre les matchs. Aucune prise de pari ne se fait ici, et aucune probabilité n&apos;est une garantie.</p></details>
          <details><summary>Quelles compétitions sont couvertes ?</summary><p>La NBA pour l&apos;instant. L&apos;Euroleague, la Betclic Élite et la WNBA sont prévues.</p></details>
        </div>
      </section>
    </main>
  );
}
