import Link from "next/link";
import AppTabs from "../../../components/AppTabs";
import Crumbs from "../../../components/Crumbs";
import JsonLd from "../../../components/JsonLd";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { TERMS, tr } from "../../../lib/glossary";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Lexique du basket NBA : net rating, play-in, back-to-back…", "NBA glossary: net rating, play-in, back-to-back and more", "Glosario NBA: net rating, play-in, back-to-back…", "Glossário da NBA: net rating, play-in, back-to-back…"),
    description: L.t("Les mots du basket et des pronostics expliqués simplement : probabilité de victoire, net rating, écart de points, play-in, back-to-back, loterie de la draft.", "Basketball and forecasting terms explained simply: win probability, net rating, point differential, play-in, back-to-back, draft lottery.", "Los términos del baloncesto y de los pronósticos explicados de forma sencilla: probabilidad de victoria, net rating, diferencia de puntos, play-in, back-to-back, lotería del draft.", "Os termos do basquete e dos palpites explicados de forma simples: probabilidade de vitória, net rating, saldo de pontos, play-in, back-to-back, loteria do draft."),
    path: "/app/lexique",
    L,
  });
}

export default async function GlossaryPage() {
  const L = await getL();
  return (
    <main className="app-page">
      <Crumbs L={L} items={[[L.t("Accueil", "Home", "Inicio", "Início"), "/"], [L.t("Lexique", "Glossary", "Glosario", "Glossário"), "/app/lexique"]]} />
      <AppTabs active="" />
      <div className="app-head">
        <h1>{L.t("Lexique du basket et des probabilités", "Basketball and forecasting glossary", "Glosario de baloncesto y probabilidades", "Glossário de basquete e probabilidades")}</h1>
        <p>{L.t("Les mots qu'on croise sur les pages de pronostics, expliqués en quelques lignes.", "The terms you see on prediction pages, explained in a few lines.", "Los términos que aparecen en las páginas de pronósticos, explicados en pocas líneas.", "Os termos que aparecem nas páginas de palpites, explicados em poucas linhas.")}</p>
      </div>
      <ul className="card block wk-list">
        {TERMS.map((x) => <li key={x.slug}><Link href={L.href(`/app/lexique/${x.slug}`)}><b>{tr(x.t, L.lang)}</b></Link><small> · {tr(x.d, L.lang).split(". ")[0]}.</small></li>)}
      </ul>
      <JsonLd data={{ "@context": "https://schema.org", "@type": "DefinedTermSet", name: L.t("Lexique Basketlog", "Basketlog glossary", "Glosario Basketlog", "Glossário Basketlog"), url: `${SITE}${L.href("/app/lexique")}`, hasDefinedTerm: TERMS.map((x) => ({ "@type": "DefinedTerm", name: tr(x.t, L.lang), url: `${SITE}${L.href(`/app/lexique/${x.slug}`)}` })) }} />
    </main>
  );
}
