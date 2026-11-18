import { getReviews } from "../../lib/reviews";
import ReviewCards from "../../components/ReviewCards";
import RevealObserver from "../../components/RevealObserver";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Avis sur Basketlog : ce qu'en pensent les utilisateurs", "Basketlog reviews: what users think", "Opiniones sobre Basketlog: lo que piensan los usuarios", "Avaliações do Basketlog: o que os usuários pensam"),
    description: L.t(
      "Les avis des utilisateurs de Basketlog, l'outil d'analyse et de pronostics NBA et EuroLeague. Chaque avis est publié tel quel, après relecture.",
      "Reviews from Basketlog users, the NBA and EuroLeague analysis and prediction tool. Every review is published as is, after a check.", "Las opiniones de los usuarios de Basketlog, la herramienta de análisis y pronósticos de la NBA y la Euroliga. Cada opinión se publica tal cual, tras una revisión.", "As avaliações dos usuários do Basketlog, a ferramenta de análise e palpites da NBA e da Euroliga. Cada avaliação é publicada como está, após uma revisão."
    ),
    path: "/avis",
    L,
  });
}

export default async function AvisPage() {
  const L = await getL();
  const { list, count, avg } = await getReviews(200, L.lang);
  return (
    <main className="voices" style={{ paddingTop: 140, minHeight: "80vh" }}>
      <RevealObserver />
      <h1 className="t-80">{L.t("Les avis Basketlog", "Basketlog reviews", "Las opiniones de Basketlog", "As avaliações do Basketlog")}</h1>
      <p className="lead" style={{ marginTop: 24 }}>
        {count
          ? L.t(`${count} avis · note moyenne ${avg.toFixed(1).replace(".", ",")}/5`, `${count} review${count > 1 ? "s" : ""} · average rating ${avg.toFixed(1)}/5`, `${count} ${count > 1 ? "opiniones" : "opinión"} · nota media ${avg.toFixed(1).replace(".", ",")}/5`, `${count} ${count > 1 ? "avaliações" : "avaliação"} · nota média ${avg.toFixed(1).replace(".", ",")}/5`)
          : L.t("Aucun avis publié pour l'instant.", "No reviews published yet.", "Todavía no hay opiniones publicadas.", "Ainda não há avaliações publicadas.")}
      </p>
      <ReviewCards reviews={list} max={200} more={false} L={L} />
    </main>
  );
}
