import Link from "next/link";
import { upcomingGames } from "../../../lib/data";
import UpcomingList from "../../../components/UpcomingList";
import AppTabs from "../../../components/AppTabs";
import JsonLd from "../../../components/JsonLd";
import { pageMeta, topFavorites } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { SITE } from "../../../lib/site";
import { nbaPath } from "../../../lib/slug";

export const dynamic = "force-dynamic";

// Recherche US de saison (novembre-décembre) : « nba cup predictions ». Les matchs de la NBA Cup sont repérés
// grâce à la mention ESPN du match (« Emirates NBA Cup - East Group B »…).
const isCup = (g) => /cup/i.test(g.note || "");
const yearOf = () => new Date().getFullYear();

export async function generateMetadata() {
  const L = await getL();
  const y = yearOf();
  return pageMeta({
    title: L.t(`Pronostics NBA Cup ${y} : probabilités de chaque match`, `NBA Cup predictions ${y}: win probabilities for every game`, `Pronósticos NBA Cup ${y}: probabilidades de cada partido`),
    description: L.t(
      `Tous les matchs de la NBA Cup ${y} analysés : favori, probabilités de victoire et score projeté, phase de groupes et phase finale.`,
      `Every ${y} NBA Cup game analyzed: the favorite, win probabilities and projected score, from the group stage to the knockout rounds.`,
      `Todos los partidos de la NBA Cup ${y} analizados: favorito, probabilidades de victoria y marcador proyectado, de la fase de grupos a la fase final.`
    ),
    path: "/app/nba-cup",
    L,
  });
}

export default async function NbaCupPage() {
  const L = await getL();
  let games = [];
  try { games = (await upcomingGames(21)).filter(isCup); } catch {}
  const favs = topFavorites(games, L);
  return (
    <main className="app-page">
      <AppTabs active="matchs" />
      <div className="app-head">
        <h1>{L.t(`Pronostics NBA Cup ${yearOf()}`, `NBA Cup predictions ${yearOf()}`, `Pronósticos NBA Cup ${yearOf()}`)}</h1>
        <p>{games.length
          ? L.t(`${games.length} matchs de NBA Cup à venir, chacun avec ses probabilités de victoire et son score projeté.`, `${games.length} upcoming NBA Cup games, each with win probabilities and a projected score.`, `${games.length} partidos de NBA Cup próximos, cada uno con probabilidades de victoria y marcador proyectado.`)
          : L.t("Pas de match de NBA Cup dans les trois prochaines semaines.", "No NBA Cup games in the next three weeks.", "No hay partidos de NBA Cup en las próximas tres semanas.")}</p>
        {favs.length > 0 && <p>{L.t("Plus gros favoris : ", "Biggest favorites: ", "Grandes favoritos: ")}{favs.join(", ")}</p>}
      </div>
      {games.length > 0 && <UpcomingList games={games} title="" L={L} />}
      <p className="team-rec">
        <Link href={L.href("/app/matchs")}>{L.t("Tous les matchs NBA du soir", "All of tonight's NBA games", "Todos los partidos NBA de hoy")}</Link>
        {" · "}
        <Link href={L.href("/app/power-rankings")}>{L.t("Power ranking NBA", "NBA power rankings", "Power ranking NBA")}</Link>
      </p>
      {games.length > 0 && (
        <JsonLd data={{
          "@context": "https://schema.org", "@type": "ItemList",
          name: L.t("Pronostics NBA Cup", "NBA Cup predictions", "Pronósticos NBA Cup"),
          itemListElement: games.map((g, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}${L.href(nbaPath(g, g.d))}`, name: `${g.away.name} vs ${g.home.name}` })),
        }} />
      )}
    </main>
  );
}
