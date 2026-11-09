import ResetForm from "../../components/ResetForm";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

// Lien « mot de passe oublié » reçu par e-mail : …/reinitialiser#<jeton> (aussi /en/reinitialiser et /es/reinitialiser).
export async function generateMetadata() {
  const L = await getL();
  return {
    ...pageMeta({
      title: L.t("Nouveau mot de passe", "New password", "Nueva contraseña"),
      description: L.t("Choisis un nouveau mot de passe pour ton compte Basketlog.", "Choose a new password for your Basketlog account.", "Elige una nueva contraseña para tu cuenta de Basketlog."),
      path: "/reinitialiser",
      noindex: true,
      L,
    }),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default function ReinitialiserPage() {
  return (
    <main className="auth-page-wrap">
      <ResetForm />
    </main>
  );
}
