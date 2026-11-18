import { notFound, permanentRedirect } from "next/navigation";
import { elContext } from "../../../../../lib/euroleague";
import { getL } from "../../../../../lib/lang-server";
import { elPath } from "../../../../../lib/slug";

export const dynamic = "force-dynamic";

// Ancienne adresse des fiches EuroLeague : redirection permanente vers l'adresse lisible (/euroleague/a-vs-b-date).
export default async function OldELMatchPage({ params }) {
  const { code } = await params;
  const ctx = await elContext();
  const g = ctx.games.find((x) => x.id === String(code));
  if (!g) notFound();
  const L = await getL();
  permanentRedirect(L.href(elPath(g)));
}
