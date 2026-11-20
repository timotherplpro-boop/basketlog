import NationalsView from "../../../components/NationalsView";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { GROUPS, nationalTitle, nationalDescription } from "../../../lib/nationals.js";
import { nationalData } from "../../../lib/nationals-data";
import { nbaToday, seasonForDate } from "../../../lib/espn";

export const dynamic = "force-dynamic";

// « Españoles en la NBA », « latinos en la NBA », « mexicanos en la NBA » : qui joue ce soir, à quelle heure (fuseau du visiteur), contre qui, avec les stats de la saison. Public visé : Espagne, Mexique, Amérique latine.
const group = GROUPS.es;
const season = () => { const s = seasonForDate(nbaToday()); return `${s - 1}-${String(s).slice(2)}`; };

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({ title: nationalTitle(group, L, season()), description: nationalDescription(group, L), path: group.path, L });
}

export default async function Page() {
  const L = await getL();
  const data = await nationalData(group);
  return <NationalsView group={group} L={L} data={data} />;
}
