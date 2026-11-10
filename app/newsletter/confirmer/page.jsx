import NewsletterConfirm from "../../../components/NewsletterConfirm";
import { pageMeta } from "../../../lib/seo";
import { getL } from "../../../lib/lang-server";

// Lien « Confirme ton inscription » reçu par e-mail : …/newsletter/confirmer#<jeton> (aussi /en/newsletter/confirmer et /es/newsletter/confirmer).
export async function generateMetadata() {
  const L = await getL();
  return {
    ...pageMeta({
      title: L.t("Confirme ton inscription à la newsletter", "Confirm your newsletter signup", "Confirma tu suscripción a la newsletter"),
      description: L.t("Confirme ton adresse e-mail pour recevoir la newsletter du dimanche de Basketlog.", "Confirm your email address to receive Basketlog's Sunday newsletter.", "Confirma tu correo para recibir la newsletter del domingo de Basketlog."),
      path: "/newsletter/confirmer",
      noindex: true,
      L,
    }),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default function ConfirmerPage() {
  return (
    <main className="auth-page-wrap">
      <NewsletterConfirm />
    </main>
  );
}
