import Link from "next/link";
import { nbaPicks, summarize } from "../../lib/history";
import { nbaToday, seasonForDate } from "../../lib/espn";
import { pageMeta } from "../../lib/seo";
import { SITE } from "../../lib/site";
import JsonLd from "../../components/JsonLd";

export const dynamic = "force-dynamic";
export const metadata = pageMeta({
  title: "Comment sont calculés les pronostics NBA de Basketlog – Méthode",
  description: "La méthode du modèle Basketlog : niveau des équipes, avantage du terrain, fatigue, absences, puis conversion en probabilité de victoire. Résultats vérifiés en public.",
  path: "/methode",
});

const pct = (x) => (x == null ? "–" : `${Math.round(x * 100)}\u00a0%`);
const label = (y) => `${y - 1}-${String(y).slice(2)}`;

export default async function MethodePage() {
  const season = seasonForDate(nbaToday());
  const [cur, past] = await Promise.all([nbaPicks(season).catch(() => []), nbaPicks(season - 1).catch(() => [])]);
  const s = summarize(cur || []);
  const p = summarize(past || []);
  const strongL = (past || []).filter((x) => Math.max(x.pHome, 1 - x.pHome) >= 0.7);
  const strong = { n: strongL.length, ok: strongL.filter((x) => x.ok).length };

  const ld = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Comment Basketlog calcule ses pronostics NBA",
    description: "Méthode du modèle statistique Basketlog et résultats vérifiés match par match.",
    inLanguage: "fr-FR",
    url: `${SITE}/methode`,
    author: { "@id": `${SITE}/#organisation` },
    publisher: { "@id": `${SITE}/#organisation` },
    isPartOf: { "@id": `${SITE}/#site` },
  };

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
