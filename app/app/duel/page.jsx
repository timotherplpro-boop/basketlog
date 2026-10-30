import { redirect } from "next/navigation";
import { getL } from "../../../lib/lang-server";

export const dynamic = "force-dynamic";

// Ancienne adresse des duels : le résultat s'affiche désormais dans « Analyse de match », sous le formulaire.
export default async function DuelPage({ searchParams }) {
  const sp = (await searchParams) || {};
  const L = await getL();
  const q = new URLSearchParams();
  if (sp.home) q.set("home", String(sp.home));
  if (sp.away) q.set("away", String(sp.away));
  redirect(L.href(`/app${q.toString() ? `?${q}` : ""}`));
}
