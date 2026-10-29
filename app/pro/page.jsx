import ProPlans from "../../components/ProPlans";
import Faq from "../../components/Faq";
import { pageMeta } from "../../lib/seo";

export const metadata = pageMeta({
  title: "Basketlog Pro : analyses NBA complètes dès 10 €/mois",
  description: "Starter 10 €/mois, Pro 19 €/mois ou Lifetime 99 € une seule fois : débloque les analyses complètes des matchs NBA et EuroLeague. Paiement sécurisé par Whop.",
  path: "/pro",
});

export default async function ProPage({ searchParams }) {
  const sp = await searchParams;
  const checkout = {
    starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER || "",
    pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "",
    lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME || "",
  };
  const loginReady = !!process.env.WHOP_CLIENT_ID;
  const faq = [
    { q: "Comment se passe le paiement ?", a: "Le paiement est géré par Whop, une plateforme de paiement sécurisée utilisée par des milliers de créateurs. Basketlog ne voit jamais ta carte bancaire." },
    { q: "Comment activer mon abonnement sur Basketlog ?", a: "Après le paiement, reviens sur cette page et clique sur « Me connecter avec Whop ». Tu te connectes avec le même compte Whop, et Basketlog débloque ta formule automatiquement." },
    { q: "Puis-je annuler quand je veux ?", a: "Oui. Les abonnements Starter et Pro se gèrent depuis ton compte Whop (whop.com, rubrique Commandes). Tu gardes l'accès jusqu'à la fin de la période déjà payée. Lifetime se paie une seule fois : rien à annuler." },
    { q: "Puis-je être remboursé ?", a: "Oui. Pendant 14 jours après ton achat, tu peux te rétracter sans justification et être remboursé intégralement, même si tu as déjà utilisé tes analyses. Il suffit d'écrire à support@bpm-raw.com avec l'e-mail de ton compte Whop. Le détail est dans les CGV (/cgv)." },
    { q: "Quelle différence entre Starter, Pro et Lifetime ?", a: "Starter donne 1 analyse complète par jour. Pro rend les analyses illimitées. Lifetime offre la même chose que Pro, à vie, pour un paiement unique de 99 €." },
    { q: "Qu'est-ce qu'une analyse complète ?", a: "La fiche détaillée d'un match : score projeté, facteurs, scénarios, stats comparées, joueurs à suivre, forme récente, confrontations et deuxième avis. Sans abonnement, tu vois gratuitement les probabilités de victoire et les chiffres clés de chaque match." },
    { q: "Basketlog est-il un site de paris ?", a: "Non. Basketlog est un outil d'analyse statistique pour comprendre les matchs. Aucune prise de pari n'est possible et aucune probabilité n'est une garantie." },
  ];
  return (
    <main className="pro-page">
      <section className="pro-hero">
        <div className="pill-tag">Basketlog Pro</div>
        <h1 className="t-80">Choisis ton plan</h1>
        <p className="lead">Accède à des analyses complètes et des pronostics détaillés, NBA et EuroLeague.</p>
      </section>
      <ProPlans checkout={checkout} loginReady={loginReady} notice={sp?.ok ? "ok" : sp?.erreur || ""} />
      <section className="pro-faq">
        <h2 className="t-80" style={{ fontSize: "clamp(28px,4vw,40px)" }}>Questions fréquentes</h2>
        <Faq items={faq} />
      </section>
    </main>
  );
}
