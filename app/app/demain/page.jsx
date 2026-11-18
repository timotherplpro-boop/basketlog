import MatchsPage, { generateMetadata as matchsMeta } from "../matchs/page";
import { nbaToday, shiftDate } from "../../../lib/espn";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

export const dynamic = "force-dynamic";

// Recherche fréquente : « nba predictions tomorrow » / « pronostic nba demain » / « pronósticos nba mañana ».
// Même contenu que /app/matchs?d=<demain>, sous une adresse stable qui ne change pas chaque jour.
const tomorrow = () => shiftDate(nbaToday(), 1);
const short = (d, L) =>
  new Intl.DateTimeFormat(L.locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), 12))).replace(/\.$/, "");

export async function generateMetadata() {
  const L = await getL();
  const d = tomorrow();
  const base = await matchsMeta({ searchParams: Promise.resolve({ d }) });
  return pageMeta({
    title: L.t(`Pronostic NBA demain (${short(d, L)}) : probabilités de chaque match`, `NBA predictions tomorrow (${short(d, L)}): win probabilities for every game`, `Pronósticos NBA mañana (${short(d, L)}): probabilidades de cada partido`, `Palpites NBA amanhã (${short(d, L)}): probabilidades de cada jogo`),
    description: base.description,
    path: "/app/demain",
    L,
  });
}

export default async function DemainPage() {
  return MatchsPage({ searchParams: Promise.resolve({ d: tomorrow() }) });
}
