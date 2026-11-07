import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { COOKIE, decodeSession } from "../../../../lib/pro";
import { getRole } from "../../../../lib/roles";
import { adminStats } from "../../../../lib/admin-stats";
import AdminStats, { PERIODS } from "../../../../components/AdminStats";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const metadata = { title: "Statistiques – Admin Basketlog", robots: { index: false, follow: false } };

// Statistiques de l'espace admin : abonnés, paiements, codes créateurs et parcours des visiteurs jusqu'au paiement.
// Le rôle est relu dans la base à chaque affichage ; pour tout autre compte (ou un visiteur), la page n'existe pas.
export default async function AdminStatsPage({ searchParams }) {
  const s = decodeSession((await cookies()).get(COOKIE)?.value);
  let role = null;
  if (s?.uid) {
    try { role = await getRole(s.uid); } catch { role = null; }
  }
  if (role !== "admin") notFound();
  const sp = (await searchParams) || {};
  const days = PERIODS.includes(Number(sp.p)) ? Number(sp.p) : 30;
  return <AdminStats st={await adminStats(days)} />;
}
