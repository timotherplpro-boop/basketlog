import Link from "next/link";
import CreatorEarnings from "../../../components/CreatorEarnings";
import AuthButton from "../../../components/AuthButton";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";
import { memberSession } from "../../../lib/usage";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Mes gains – Basketlog", "My earnings – Basketlog", "Mis ganancias – Basketlog", "Meus ganhos – Basketlog"),
    description: L.t("Les personnes qui ont utilisé ton code promo et ce que cela te rapporte.", "The people who used your promo code and what it earns you.", "Las personas que usaron tu código promocional y lo que te aporta.", "As pessoas que usaram seu código promocional e o que ele rende para você."),
    path: "/app/gains",
    noindex: true,
    L,
  });
}

// Rubrique des créateurs : combien de personnes ont utilisé leur code, par formule, et ce que cela leur rapporte (€ ou $), en direct.
// La page ne contient aucun chiffre : ils sont lus par le navigateur depuis /api/gains, qui vérifie le rôle de créateur côté serveur.
export default async function GainsPage() {
  const L = await getL();
  const m = await memberSession();

  return (
    <main className="app-page">
      <div className="app-head">
        <h1>{L.t("Mes gains", "My earnings", "Mis ganancias", "Meus ganhos")}</h1>
        <p>{L.t("Qui a utilisé ton code, sur quelle formule, et ce que cela te rapporte, en direct.", "Who used your code, on which plan, and what it earns you, live.", "Quién usó tu código, en qué plan y lo que te aporta, en directo.", "Quem usou seu código, em qual plano e o que isso rende para você, ao vivo.")}</p>
      </div>
      {!m ? (
        <div className="panel hist-empty">
          <b>{L.t("Connecte-toi pour voir tes gains", "Log in to see your earnings", "Inicia sesión para ver tus ganancias", "Faça login para ver seus ganhos")}</b>
          <p>{L.t("Cette rubrique est réservée aux créateurs Basketlog.", "This section is reserved for Basketlog creators.", "Esta sección está reservada a los creadores de Basketlog.", "Esta seção é reservada aos criadores do Basketlog.")}</p>
          <AuthButton mode="connexion" source="mes_gains" next={L.href("/app/gains")} className="btn-solid">{L.t("Se connecter", "Log in", "Iniciar sesión", "Entrar")}</AuthButton>
          <Link href={L.href("/pro")} className="comp-more">{L.t("Voir les formules", "See the plans", "Ver los planes", "Ver os planos")} →</Link>
        </div>
      ) : (
        <CreatorEarnings />
      )}
    </main>
  );
}
