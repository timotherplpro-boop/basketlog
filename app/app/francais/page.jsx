import NationalsView from "../../../components/NationalsView";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { GROUPS, nationalTitle, nationalDescription } from "../../../lib/nationals.js";
import { nationalData } from "../../../lib/nationals-data";
import { nbaToday, seasonForDate } from "../../../lib/espn";

export const dynamic = "force-dynamic";

// « Joueurs français en NBA », « Wembanyama ce soir heure française », « French players NBA » : qui joue cette nuit, à quelle heure, contre qui, avec les chances de victoire de son équipe et les stats de la saison.
const group = GROUPS.fr;
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
