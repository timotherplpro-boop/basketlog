import Link from "next/link";
import AccountPanel from "../../../components/AccountPanel";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { memberSession } from "../../../lib/usage";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Mon compte – Basketlog", "My account – Basketlog", "Mi cuenta – Basketlog"),
    description: L.t("Ton nom, ton abonnement et tes données Basketlog.", "Your name, subscription and Basketlog data.", "Tu nombre, tu suscripción y tus datos de Basketlog."),
    path: "/app/compte",
    noindex: true,
    L,
  });
}

// Espace « Mon compte » : choisir son nom, résilier ou reprendre son abonnement, supprimer son compte, sans quitter le site.
export default async function ComptePage() {
  const L = await getL();
  const m = await memberSession();
  const next = encodeURIComponent(L.href("/app/compte"));

  return (
    <main className="app-page">
      <div className="app-head">
        <h1>{L.t("Mon compte", "My account", "Mi cuenta")}</h1>
        <p>{L.t("Ton nom, ton abonnement et tes données, directement ici.", "Your name, subscription and data, right here.", "Tu nombre, tu suscripción y tus datos, directamente aquí.")}</p>
      </div>
      {!m ? (
        <div className="panel hist-empty">
          <b>{L.t("Connecte-toi pour gérer ton compte", "Log in to manage your account", "Inicia sesión para gestionar tu cuenta")}</b>
          <p>{L.t("Tu pourras y choisir ton nom, résilier ou reprendre ton abonnement et supprimer ton compte.", "You'll be able to choose your name, cancel or resume your subscription and delete your account.", "Podrás elegir tu nombre, cancelar o reanudar tu suscripción y eliminar tu cuenta.")}</p>
          <a href={`/api/whop/login?next=${next}`} className="btn-solid">{L.t("Se connecter", "Log in", "Iniciar sesión")}</a>
          <Link href={L.href("/pro")} className="comp-more">{L.t("Voir les formules", "See the plans", "Ver los planes")} →</Link>
        </div>
      ) : (
        <AccountPanel />
      )}
    </main>
  );
}
