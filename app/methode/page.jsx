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
    title: L.t("Comment sont calculés les pronostics NBA de Basketlog – Méthode", "How Basketlog's NBA predictions are calculated – Methodology", "Cómo se calculan los pronósticos NBA de Basketlog – Metodología"),
    description: L.t(
      "La méthode du modèle Basketlog : niveau des équipes, avantage du terrain, fatigue, absences, puis conversion en probabilité de victoire. Résultats vérifiés en public.",
      "The Basketlog model's methodology: team strength, home-court advantage, fatigue, injuries, then conversion into a win probability. Results verified in public.", "La metodología del modelo de Basketlog: nivel de los equipos, ventaja de jugar en casa, cansancio, bajas y conversión en probabilidad de victoria. Resultados verificados en público."
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
    headline: L.t("Comment Basketlog calcule ses pronostics NBA", "How Basketlog calculates its NBA predictions", "Cómo calcula Basketlog sus pronósticos NBA"),
    description: L.t("Méthode du modèle statistique Basketlog et résultats vérifiés match par match.", "The Basketlog statistical model's methodology and results verified game by game.", "Metodología del modelo estadístico de Basketlog y resultados verificados partido a partido."),
    inLanguage: L.hreflang,
    url: `${SITE}${L.href("/methode")}`,
    author: { "@id": `${SITE}/#organisation` },
    publisher: { "@id": `${SITE}/#organisation` },
    isPartOf: { "@id": `${SITE}/#site` },
  };

  if (L.es) return (
    <main className="app-page prose-page">
      <JsonLd data={ld} />
      <div className="app-head">
        <h1>Cómo calcula Basketlog sus pronósticos NBA</h1>
        <p>Un modelo estadístico sencillo, transparente y verificado en público, partido tras partido.</p>
      </div>

      <div className="card block">
        <h2>En resumen</h2>
        <p className="narr">
          Para cada partido, Basketlog estima la diferencia de puntos esperada entre los dos equipos y luego la convierte en probabilidad de victoria.
          La diferencia parte del nivel real de cada equipo, al que se suman la ventaja de jugar en casa, el cansancio y las bajas.
          {p.n > 0 && <> Probado en la temporada {label(season - 1)} ({p.n} partidos), el modelo acertó el ganador en el <b>{pct(p.pct)}</b> de los casos{strong.n > 0 ? <>, y en el <b>{pct(strong.ok / strong.n)}</b> de los casos cuando daba al menos un 70&nbsp;% al favorito</> : null}.</>}
          {s.n > 0 && <> Esta temporada ({label(season)}), va por el <b>{pct(s.pct)}</b> en {s.n} partidos terminados.</>}
        </p>
      </div>

      <div className="card block">
        <h2>1. El nivel de cada equipo</h2>
        <p className="narr">
          La base es la diferencia media de puntos por partido: los puntos anotados menos los encajados. Es uno de los indicadores más fiables del nivel real de un equipo de la NBA, más revelador que su balance de victorias y derrotas.
          A principio de temporada, unos pocos partidos no bastan: el modelo mezcla la temporada en curso con la anterior, que cuenta como 12 partidos adicionales. Cuanto más avanza la temporada, más pesa la temporada actual.
          Por último, esa diferencia se acerca un 15 % a la media, porque los arranques muy buenos y muy malos tienden a moderarse.
        </p>
      </div>

      <div className="card block">
        <h2>2. La ventaja de jugar en casa</h2>
        <p className="narr">Jugar en casa vale unos 2,3 puntos en la NBA actual (y 3,2 puntos en la Euroliga, donde los pabellones pesan más). Ese valor se suma al equipo local.</p>
      </div>

      <div className="card block">
        <h2>3. El cansancio de los back-to-back</h2>
        <p className="narr">Un equipo que jugó la noche anterior pierde de media alrededor de 1,6 puntos. Cada noche, el modelo comprueba qué equipos juegan dos partidos en dos días.</p>
      </div>

      <div className="card block">
        <h2>4. Las bajas</h2>
        <p className="narr">El parte médico se revisa antes de cada partido. Un jugador descartado resta unos 0,9 puntos a su equipo y uno en duda unos 0,35 puntos, con un tope de 4,5 puntos para no sobrerreaccionar. Las bajas solo se tienen en cuenta para los próximos partidos.</p>
      </div>

      <div className="card block">
        <h2>5. De la diferencia a la probabilidad</h2>
        <p className="narr">
          La diferencia esperada nunca se cumple exactamente: en la NBA, el resultado final se aleja de ella una docena de puntos de media. Por eso el modelo usa una distribución normal centrada en la diferencia esperada, con una desviación típica de 12,5 puntos.
          De ahí obtiene la probabilidad de victoria de cada equipo y la de cada diferencia posible: partido igualado (5 puntos o menos), victoria por 6 a 9 puntos o victoria amplia (10 puntos o más).
          El marcador proyectado combina el ataque de cada equipo con la defensa de su rival.
        </p>
      </div>

      <div className="card block">
        <h2>6. Resultados verificados, sin hacer trampa con el futuro</h2>
        <p className="narr">
          Cada pronóstico se compara con el resultado final en la página <Link href={L.href("/app/bilan")}>Balance del modelo</Link>. Para los partidos pasados, el modelo se recalcula solo con los resultados conocidos antes del partido: nunca ve el futuro.
          Las probabilidades siguen siendo estimaciones: un favorito al 70&nbsp;% pierde unas tres veces de cada diez. Basketlog es una herramienta de análisis, no un servicio de apuestas.
        </p>
        <p className="narr" style={{ marginTop: 12 }}>
          <Link href={L.href("/app/matchs")}>Ver los pronósticos NBA de hoy</Link> · <Link href={L.href("/app/euroleague")}>Pronósticos Euroliga</Link> · <Link href={L.href("/app/bilan")}>Porcentaje de acierto</Link>
        </p>
      </div>
    </main>
  );

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
          From it, the model derives each team&apos;s win probability and the chances of every possible margin: a close game (5 points or fewer), a 6-to-9-point win or a blowout (10 points or more).
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
          Il en tire la probabilité de victoire de chaque équipe et les chances de chaque écart possible : match serré (5 points d&apos;écart ou moins), victoire de 6 à 9 points ou large victoire (10 points ou plus).
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
