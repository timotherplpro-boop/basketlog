import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CHECKOUT, COOKIE, FREE_SIGNUP_URL, aiReady, decodeSession, whopConfigured, whopTier } from "../../../lib/pro";
import { adminData, getRole } from "../../../lib/roles";
import AdminPanel from "../../../components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin – Basketlog", robots: { index: false, follow: false } };

// Espace admin : avis, formules (avec aperçu « comme un client »), créateurs et état du back-office.
// Le rôle est relu dans la base à chaque affichage ; pour tout autre compte (ou un visiteur), la page n'existe pas.
export default async function AdminPage() {
  const s = decodeSession((await cookies()).get(COOKIE)?.value);
  let role = null;
  if (s?.uid) {
    try { role = await getRole(s.uid); } catch { role = null; }
  }
  if (role !== "admin") notFound();

  const [data, seen] = await Promise.all([
    adminData().catch(() => null),
    whopConfigured() ? whopTier(s.uid).catch(() => "erreur") : Promise.resolve(null), // vérification d'accès réelle chez Whop
  ]);
  const health = {
    login: whopConfigured(),
    products: { starter: !!process.env.WHOP_PRODUCT_STARTER, pro: !!process.env.WHOP_PRODUCT_PRO, lifetime: !!process.env.WHOP_PRODUCT_LIFETIME },
    seen,
    db: !!data,
    ai: aiReady(),
    checkout: { ...CHECKOUT, compte: FREE_SIGNUP_URL },
  };

  return (
    <main className="app-page wide">
      <div className="app-head">
        <h1>Admin</h1>
        <p>Avis, formules, créateurs et état du site.</p>
      </div>
      <AdminPanel initial={data} me={s.uid} preview={s.preview || null} health={health} />
    </main>
  );
}
