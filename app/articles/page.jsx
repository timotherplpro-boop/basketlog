import Link from "next/link";
import { getL } from "../../lib/lang-server";
import { pageMeta } from "../../lib/seo";
import AppTabs from "../../components/AppTabs";
import Crumbs from "../../components/Crumbs";
import { articleDates, articlePath, articleTitle } from "../../lib/articles";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Articles NBA : les matchs à suivre chaque soir", "NBA articles: the games to watch every night", "Artículos NBA: los partidos a seguir cada noche"),
    description: L.t("Chaque jour, les trois matchs NBA à suivre selon le modèle Basketlog, avec probabilités, scores projetés et absences.", "Every day, the three NBA games to watch according to the Basketlog model, with win probabilities, projected scores and injuries.", "Cada día, los tres partidos de la NBA a seguir según el modelo de Basketlog, con probabilidades, marcadores proyectados y bajas."),
    path: "/articles",
    L,
  });
}

export default async function ArticlesIndex() {
  const L = await getL();
  return (
    <main className="app-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio"), "/"], [L.t("Articles NBA", "NBA articles", "Artículos NBA"), "/articles"]]} />
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t("Articles NBA", "NBA articles", "Artículos NBA")}</h1>
        <p>{L.t("Les matchs à suivre chaque soir, choisis par le modèle Basketlog.", "The games to watch every night, picked by the Basketlog model.", "Los partidos a seguir cada noche, elegidos por el modelo de Basketlog.")}</p>
      </div>
      <section className="card block">
        <ul className="wk-list">
          {articleDates(60).map((d) => <li key={d}><Link href={L.href(articlePath(d))}>{articleTitle(L, d)}</Link></li>)}
        </ul>
      </section>
    </main>
  );
}
