import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { CHECKOUT, COOKIE, FREE_SIGNUP_URL, aiReady, decodeSession, whopConfigured, whopTier } from "../../../lib/pro";
import { CHECKOUT_USD } from "../../../lib/pricing";
import { adminData, getRole } from "../../../lib/roles";
import { getL } from "../../../lib/lang-server";
import AdminPanel from "../../../components/AdminPanel";
import AdminNav from "../../../components/AdminNav";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return {
    title: L.t("Admin – Basketlog", "Admin – Basketlog", "Administración – Basketlog"),
    robots: { index: false, follow: false },
  };
}

// Espace admin : avis, formules (avec aperçu « comme un client »), créateurs et état du back-office,
// en français, anglais et espagnol (adresses /app/admin, /en/app/admin et /es/app/admin).
// Les statistiques (abonnés, paiements, parcours des visiteurs) sont sur /app/admin/stats.
// Le rôle est relu dans la base à chaque affichage ; pour tout autre compte (ou un visiteur), la page n'existe pas.
export default async function AdminPage() {
  const L = await getL();
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
    checkoutUsd: CHECKOUT_USD,
  };

  return (
    <main className="app-page wide">
      <div className="app-head">
        <h1>{L.t("Admin", "Admin", "Administración")}</h1>
        <p>{L.t("Avis, formules, créateurs et état du site.", "Reviews, plans, creators and site status.", "Opiniones, planes, creadores y estado del sitio.")}</p>
      </div>
      <AdminNav active="gestion" />
      <AdminPanel initial={data} me={s.uid} preview={s.preview || null} health={health} />
    </main>
  );
}
