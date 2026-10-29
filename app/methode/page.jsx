import Link from "next/link";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate } from "../../lib/espn";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import JsonLd from "../../components/JsonLd";
import { getL } from "../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Comment sont calculés les pronostics NBA de Basketlog – Méthode", "How Basketlog's NBA predictions are calculated – Methodology"),
    description: L.t(
      "La méthode du modèle Basketlog : niveau des équipes, avantage du terrain, fatigue, absences, puis conversion en probabilité de victoire. Résultats vérifiés en public.",
      "The Basketlog model's methodology: team strength, home-court advantage, fatigue, injuries, then conversion into a win probability. Results verified in public."
    ),
    path: "/methode",
    L,
  });
}

const label = (y) => `${y - 1}-${String(y).slice(2)}`;

export default async function MethodePage() {
  const L = await getL();
  const pct = (x) => (x == null ? "–" : L.en ? `${Math.round(x * 100)}%` : `${Math.round(x * 100)}\u00a0%`);
  const season = seasonForDate(nbaToday());
  const [cur, past] = await Promise.all([nbaPicks(season).catch(() => []), nbaPicks(season - 1).catch(() => [])]);
  const s = summarize(cur || []);
  const p = summarize(past || []);
  const strongL = (past || []).filter((x) => Math.max(x.pHome, 1 - x.pHome) >= 0.7);
  const strong = { n: strongL.length, ok: strongL.filter((x) => x.ok).length };

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: L.t("Comment Basketlog calcule ses pronostics NBA", "How Basketlog calculates its NBA predictions"),
    description: L.t("Méthode du modèle statistique Basketlog et résultats vérifiés match par match.", "The Basketlog statistical model's methodology and results verified game by game."),
    inLanguage: L.en ? "en-US" : "fr-FR",
    url: `${SITE}${L.href("/methode")}`,
    author: { "@id": `${SITE}/#organisation` },
    publisher: { "@id": `${SITE}/#organisation` },
    isPartOf: { "@id": `${SITE}/#site` },
  };

  if (L.en) return (
    <main className="app-page prose-page">
      <JsonLd data={ld} />
      <div className="app-head">
        <h1>How Basketlog calculates its NBA predictions</h1>
        <p>A simple, transparent statistical model, verified in public, game after game.</p>
      </div>

      <div className="card block">
        <h2>In short</h2>
        <p className="narr">
          For every game, Basketlog estimates the expected point margin between the two teams, then turns it into a win probability.
          The margin starts from each team&apos;s real strength, then adds home-court advantage, fatigue and injuries.
          {p.n > 0 && <> Backtested on the {label(season - 1)} season ({p.n} games), the model picked the right winner in <b>{pct(p.pct)}</b> of cases{strong.n > 0 ? <>, and in <b>{pct(strong.ok / strong.n)}</b> of cases when it gave the favorite at least 70%</> : null}.</>}
          {s.n > 0 && <> This season ({label(season)}), it stands at <b>{pct(s.pct)}</b> over {s.n} completed games.</>}
        </p>
      </div>

      <div className="card block">
        <h2>1. Each team&apos;s strength</h2>
        <p className="narr">
          The foundation is the average point differential per game: points scored minus points allowed. It is one of the most reliable indicators of an NBA team&apos;s real strength, more telling than its win-loss record.
          Early in the season, a handful of games isn&apos;t enough, so the model blends the current season with the previous one, which counts as 12 extra games. The further the season goes, the more the current season weighs.
          Finally, this differential is pulled 15% toward the average, because very good and very bad starts tend to even out.
        </p>
      </div>

      <div className="card block">
        <h2>2. Home-court advantage</h2>
        <p className="narr">Playing at home is worth about 2.3 points in today&apos;s NBA (and 3.2 points in the EuroLeague, where arenas matter more). This value is added to the home team.</p>
      </div>

      <div className="card block">
        <h2>3. Back-to-back fatigue</h2>
        <p className="narr">A team that played the night before loses around 1.6 points on average. Every night, the model checks which teams are playing two games in two days.</p>
      </div>

      <div className="card block">
        <h2>4. Injuries</h2>
        <p className="narr">The injury report is checked before every game. A player ruled out takes about 0.9 points away from his team and a questionable player about 0.35 points, capped at 4.5 points to avoid overreacting. Injuries are only factored in for upcoming games.</p>
      </div>

      <div className="card block">
        <h2>5. From margin to probability</h2>
        <p className="narr">
          The expected margin is never spot on: in the NBA, the final score misses it by about a dozen points on average. So the model uses a normal distribution centered on the expected margin, with a standard deviation of 12.5 points.
          From it, the model derives each team&apos;s win probability, the chances of a close game (a margin of 5 points or fewer) and of a blowout (10 points or more).
          The projected score combines each team&apos;s offense with its opponent&apos;s defense.
        </p>
      </div>

      <div className="card block">
        <h2>6. Verified results, no peeking at the future</h2>
        <p className="narr">
          Every prediction is compared with the final score on the <Link href={L.href("/app/bilan")}>Model track record</Link> page. For past games, the model is recalculated using only the results known before the game: it never sees the future.
          Probabilities remain estimates: a 70% favorite loses about three times out of ten. Basketlog is an analysis tool, not a betting service.
        </p>
        <p className="narr" style={{ marginTop: 12 }}>
          <Link href={L.href("/app/matchs")}>See today&apos;s NBA predictions</Link> · <Link href={L.href("/app/euroleague")}>EuroLeague predictions</Link> · <Link href={L.href("/app/bilan")}>Track record</Link>
        </p>
      </div>
    </main>
  );

  return (
    <main className="app-page prose-page">
      <JsonLd data={ld} />
      <div className="app-head">
        <h1>Comment Basketlog calcule ses pronostics NBA</h1>
        <p>Un modèle statistique simple, transparent et vérifié en public, match après match.</p>
      </div>

      <div className="card block">
        <h2>En résumé</h2>
        <p className="narr">
          Pour chaque match, Basketlog estime l&apos;écart de points attendu entre les deux équipes, puis le transforme en probabilité de victoire.
          L&apos;écart part du niveau réel de chaque équipe, auquel s&apos;ajoutent l&apos;avantage du terrain, la fatigue et les absences.
          {p.n > 0 && <> Testé sur la saison {label(season - 1)} ({p.n} matchs), le modèle a trouvé le bon vainqueur dans <b>{pct(p.pct)}</b> des cas{strong.n > 0 ? <>, et dans <b>{pct(strong.ok / strong.n)}</b> des cas quand il donnait au moins 70&nbsp;% au favori</> : null}.</>}
          {s.n > 0 && <> Cette saison ({label(season)}), il en est à <b>{pct(s.pct)}</b> sur {s.n} matchs terminés.</>}
        </p>
      </div>

      <div className="card block">
        <h2>1. Le niveau de chaque équipe</h2>
        <p className="narr">
          La base, c&apos;est l&apos;écart de points moyen par match : les points marqués moins les points encaissés. C&apos;est l&apos;un des indicateurs les plus fiables du niveau réel d&apos;une équipe en NBA, plus parlant que son bilan victoires-défaites.
          En début de saison, quelques matchs ne suffisent pas : le modèle mélange donc la saison en cours avec la saison précédente, qui compte comme 12 matchs supplémentaires. Plus la saison avance, plus la saison en cours pèse lourd.
          Enfin, cet écart est ramené de 15 % vers la moyenne, parce que les très bons et les très mauvais débuts de saison ont tendance à se tasser.
        </p>
      </div>

      <div className="card block">
        <h2>2. L&apos;avantage du terrain</h2>
        <p className="narr">Jouer à domicile vaut environ 2,3 points en NBA aujourd&apos;hui (et 3,2 points en EuroLeague, où les salles pèsent davantage). Cette valeur est ajoutée à l&apos;équipe qui reçoit.</p>
      </div>

      <div className="card block">
        <h2>3. La fatigue des back-to-back</h2>
        <p className="narr">Une équipe qui a joué la veille perd en moyenne autour de 1,6 point. Le modèle vérifie chaque soir quelles équipes enchaînent deux matchs en deux jours.</p>
      </div>

      <div className="card block">
        <h2>4. Les absences</h2>
        <p className="narr">La liste des joueurs blessés est relue avant chaque match. Un joueur forfait retire environ 0,9 point à son équipe et un joueur incertain environ 0,35 point, avec un plafond de 4,5 points pour ne pas surréagir. Les absences ne sont prises en compte que pour les matchs à venir.</p>
      </div>

      <div className="card block">
        <h2>5. De l&apos;écart à la probabilité</h2>
        <p className="narr">
          L&apos;écart attendu ne tombe jamais pile : en NBA, le score final s&apos;en éloigne en moyenne d&apos;une douzaine de points. Le modèle utilise donc une loi normale centrée sur l&apos;écart attendu, avec un écart-type de 12,5 points.
          Il en tire la probabilité de victoire de chaque équipe, les chances d&apos;un match serré (5 points d&apos;écart ou moins) et celles d&apos;une large victoire (10 points ou plus).
          Le score projeté combine l&apos;attaque de chaque équipe et la défense de son adversaire.
        </p>
      </div>

      <div className="card block">
        <h2>6. Des résultats vérifiés, sans tricher avec le futur</h2>
        <p className="narr">
          Chaque pronostic est comparé au score final sur la page <Link href="/app/bilan">Bilan du modèle</Link>. Pour les matchs passés, le modèle est recalculé uniquement avec les résultats connus avant le match : il ne voit jamais le futur.
          Les probabilités restent des estimations : un favori à 70&nbsp;% perd environ trois fois sur dix. Basketlog est un outil d&apos;analyse, pas un service de paris.
        </p>
        <p className="narr" style={{ marginTop: 12 }}>
          <Link href="/app/matchs">Voir les pronostics NBA du jour</Link> · <Link href="/app/euroleague">Pronostics EuroLeague</Link> · <Link href="/app/bilan">Taux de réussite</Link>
        </p>
      </div>
    </main>
  );
}
