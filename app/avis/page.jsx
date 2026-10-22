import { getReviews } from "../../lib/reviews";
import ReviewCards from "../../components/ReviewCards";
import RevealObserver from "../../components/RevealObserver";

export const dynamic = "force-dynamic";
export const metadata = { title: "Avis des utilisateurs – Basketlog" };

export default async function AvisPage() {
  const { list, count, avg } = await getReviews(200);
  return (
    <main className="voices" style={{ paddingTop: 140, minHeight: "80vh" }}>
      <RevealObserver />
      <h1 className="t-80">Les avis Basketlog</h1>
      <p className="lead" style={{ marginTop: 24 }}>
        {count ? `${count} avis · note moyenne ${avg.toFixed(1).replace(".", ",")}/5` : "Aucun avis publié pour l'instant."}
      </p>
      <ReviewCards reviews={list} max={200} more={false} />
    </main>
  );
}
