import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { adminData, getRole } from "../../../lib/roles";
import AdminPanel from "../../../components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – Basketlog", robots: { index: false, follow: false } };

// Espace admin : relecture des avis et accès des créateurs. Le rôle est relu dans la base à chaque affichage ;
// pour tout autre compte (ou un visiteur), la page n'existe pas.
export default async function AdminPage() {
  const s = decodeSession((await cookies()).get(COOKIE)?.value);
  let role = null;
  if (s?.uid) {
    try { role = await getRole(s.uid); } catch { role = null; }
  }
  if (role !== "admin") notFound();
  let data = null;
  try { data = await adminData(); } catch {}
  return (
    <main className="app-page wide">
      <div className="app-head">
        <h1>Admin</h1>
        <p>Relis les avis des abonnés et gère l&apos;accès de tes créateurs.</p>
      </div>
      <AdminPanel initial={data} me={s.uid} />
    </main>
  );
}
