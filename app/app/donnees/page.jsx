import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import Crumbs from "../../../components/Crumbs";
import JsonLd from "../../../components/JsonLd";
import QuickFaq from "../../../components/QuickFaq";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { nbaToday, seasonForDate } from "../../../lib/espn";
import { csvName } from "../../../lib/picks-csv.js";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

// « free nba api », « nba predictions api », « api pronostics nba gratuite » : documentation de l'API JSON gratuite,
// du fichier CSV et du widget. Licence CC BY 4.0 : chaque réutilisation renvoie un lien vers le site.
const KAGGLE = "https://www.kaggle.com/datasets/basketlogcontact/nba-game-predictions-and-results-basketlog";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("API gratuite de pronostics NBA (JSON) et données ouvertes", "Free NBA predictions API (JSON) and open data", "API gratis de pronósticos NBA (JSON) y datos abiertos", "API grátis de palpites NBA (JSON) e dados abertos"),
    description: L.t(
      "Probabilités de victoire et scores projetés de chaque match NBA en JSON, sans clé ni inscription, plus l'historique complet en CSV. Licence CC BY 4.0.",
      "Win probabilities and projected scores for every NBA game in JSON, no key or sign-up, plus the full history as CSV. CC BY 4.0 license.",
      "Probabilidades de victoria y marcadores proyectados de cada partido NBA en JSON, sin clave ni registro, y el historial completo en CSV. Licencia CC BY 4.0.",
      "Probabilidades de vitória e placares projetados de cada jogo da NBA em JSON, sem chave nem cadastro, e o histórico completo em CSV. Licença CC BY 4.0."
    ),
    path: "/app/donnees",
    L,
  });
}

export default async function DataPage() {
  const L = await getL();
  const season = seasonForDate(nbaToday());
  const api = `${SITE}/api/v1/predictions`;
  const sample = `{
  "source": "Basketlog (https://basketlog-app.com)",
  "license": "CC BY 4.0",
  "date": "${nbaToday()}",
  "count": 1,
  "games": [{
    "id": "401809300",
    "tipoff": "2026-11-22T00:30:00Z",
    "status": "scheduled",
    "home": { "name": "Boston Celtics", "abbreviation": "BOS" },
    "away": { "name": "Orlando Magic", "abbreviation": "ORL" },
    "home_win_probability": 0.612,
    "away_win_probability": 0.388,
    "projected_score": { "home": 114, "away": 109 },
    "url": "https://basketlog-app.com/en/nba/magic-vs-celtics-2026-11-21"
  }]
}`;
  const faq = [
    { q: L.t("Faut-il une clé ou un compte ?", "Do I need a key or an account?", "¿Hace falta una clave o una cuenta?", "Preciso de chave ou conta?"), a: L.t("Non. L'API est ouverte à tous, sans clé ni inscription. Les réponses sont mises en cache 10 minutes.", "No. The API is open to everyone, with no key or sign-up. Responses are cached for 10 minutes.", "No. La API está abierta a todos, sin clave ni registro. Las respuestas se guardan en caché 10 minutos.", "Não. A API é aberta a todos, sem chave nem cadastro. As respostas ficam em cache por 10 minutos.") },
    { q: L.t("Puis-je utiliser ces données sur mon site ?", "Can I use this data on my site?", "¿Puedo usar estos datos en mi web?", "Posso usar esses dados no meu site?"), a: L.t("Oui, y compris pour un usage commercial (licence CC BY 4.0), à condition de citer Basketlog avec un lien vers basketlog-app.com.", "Yes, including commercial use (CC BY 4.0 license), as long as you credit Basketlog with a link to basketlog-app.com.", "Sí, también para uso comercial (licencia CC BY 4.0), siempre que cites a Basketlog con un enlace a basketlog-app.com.", "Sim, inclusive para uso comercial (licença CC BY 4.0), desde que você cite o Basketlog com um link para basketlog-app.com.") },
    { q: L.t("Comment sont calculées les probabilités ?", "How are the probabilities computed?", "¿Cómo se calculan las probabilidades?", "Como as probabilidades são calculadas?"), a: L.t("Avec le modèle Basketlog : niveau de chaque équipe, avantage du terrain, fatigue et absences. La méthode et le bilan complet sont publics.", "With the Basketlog model: each team's strength, home court, fatigue and injuries. The method and the full track record are public.", "Con el modelo de Basketlog: nivel de cada equipo, ventaja de campo, cansancio y bajas. El método y el balance completo son públicos.", "Com o modelo do Basketlog: força de cada time, mando de quadra, cansaço e desfalques. A metodologia e o desempenho completo são públicos.") },
  ];
  return (
    <main className="app-page prose-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Données et API", "Data and API", "Datos y API", "Dados e API"), "/app/donnees"]]} />
      <AppTabs active="" />
      <div className="app-head">
        <h1>{L.t("API gratuite de pronostics NBA et données ouvertes", "Free NBA predictions API and open data", "API gratis de pronósticos NBA y datos abiertos", "API grátis de palpites NBA e dados abertos")}</h1>
        <p>{L.t("Les probabilités Basketlog, réutilisables librement avec un lien vers la source.", "Basketlog probabilities, free to reuse with a link back to the source.", "Las probabilidades de Basketlog, reutilizables libremente con un enlace a la fuente.", "As probabilidades do Basketlog, livres para reutilizar com um link para a fonte.")}</p>
      </div>
      <section className="card block">
        <h2>{L.t("API JSON : matchs du jour", "JSON API: today's games", "API JSON: partidos del día", "API JSON: jogos do dia")}</h2>
        <p className="narr"><code>GET {api}</code><br /><code>GET {api}?date=YYYYMMDD</code> <small>{L.t("(aujourd'hui à J+7)", "(today to 7 days ahead)", "(de hoy a 7 días)", "(de hoje a 7 dias)")}</small></p>
        <p className="narr"><a href={api} rel="nofollow">{L.t("Ouvrir la réponse du jour →", "Open today's response →", "Abrir la respuesta de hoy →", "Abrir a resposta de hoje →")}</a></p>
        <p className="note">{L.t("Exemple de réponse (valeurs fictives) :", "Sample response (illustrative values):", "Ejemplo de respuesta (valores ficticios):", "Exemplo de resposta (valores fictícios):")}</p>
        <div className="tbl-scroll"><pre className="code-sample"><code>{sample}</code></pre></div>
      </section>
      <section className="card block">
        <h2>{L.t("Historique complet (CSV)", "Full history (CSV)", "Historial completo (CSV)", "Histórico completo (CSV)")}</h2>
        <ul className="narr">
          <li><a href={`/data/${csvName(season)}`}>{csvName(season)}</a> {L.t("(saison en cours, mis à jour chaque jour)", "(current season, updated daily)", "(temporada en curso, actualizado cada día)", "(temporada atual, atualizado todo dia)")}</li>
          <li><a href={`/data/${csvName(season - 1)}`}>{csvName(season - 1)}</a></li>
          <li><a href={KAGGLE} rel="noopener" target="_blank">{L.t("Le même jeu de données sur Kaggle", "The same dataset on Kaggle", "El mismo conjunto de datos en Kaggle", "O mesmo conjunto de dados no Kaggle")}</a></li>
        </ul>
      </section>
      <section className="card block">
        <h2>{L.t("Widget à intégrer", "Embeddable widget", "Widget para insertar", "Widget para incorporar")}</h2>
        <p className="narr">{L.t("Pour afficher les probabilités du soir sans écrire de code : ", "To show tonight's probabilities without writing code: ", "Para mostrar las probabilidades de hoy sin programar: ", "Para mostrar as probabilidades de hoje sem programar: ")}<Link href={L.href("/widget")}>{L.t("le widget Basketlog", "the Basketlog widget", "el widget de Basketlog", "o widget do Basketlog")}</Link>.</p>
      </section>
      <QuickFaq L={L} items={faq} />
      <p className="team-rec"><Link href={L.href("/methode")}>{L.t("La méthode", "The method", "El método", "A metodologia")}</Link>{" · "}<Link href={L.href("/app/bilan")}>{L.t("Le bilan public", "The public track record", "El balance público", "O desempenho público")}</Link></p>
      {/* Fiche « Dataset » : rend l'API et les fichiers CSV trouvables dans Google Dataset Search. */}
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Dataset",
        name: "Basketlog NBA win probabilities (daily, free API)",
        description: "Pre-game win probability and projected score for every NBA game of the day from the Basketlog model, as free JSON (no key, CORS enabled), plus season files in CSV with final scores and whether the favorite won.",
        url: `${SITE}${L.href("/app/donnees")}`,
        creator: { "@id": `${SITE}/#organisation` },
        license: "https://creativecommons.org/licenses/by/4.0/",
        isAccessibleForFree: true,
        keywords: ["NBA", "basketball", "win probability", "predictions", "sports analytics", "API"],
        distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/api/v1/predictions` }],
      }} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "WebAPI", name: "Basketlog NBA predictions API", url: `${SITE}${L.href("/app/donnees")}`, documentation: `${SITE}${L.href("/app/donnees")}`, termsOfService: "https://creativecommons.org/licenses/by/4.0/", provider: { "@id": `${SITE}/#organisation` } }} />
    </main>
  );
}
