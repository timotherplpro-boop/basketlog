import ProPlans from "../../components/ProPlans";
import Faq from "../../components/Faq";

export const metadata = {
  title: "Basketlog Pro : analyses illimitées NBA et EuroLeague",
  description: "Passe à Basketlog Pro : jusqu'à 10 analyses par jour avec le Mensuel, illimitées avec l'Annuel. Paiement sécurisé par Whop, sans engagement.",
};

export default async function ProPage({ searchParams }) {
  const sp = await searchParams;
  const checkout = {
    mensuel: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_MONTHLY || "",
    annuel: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_ANNUAL || "",
  };
  const loginReady = !!process.env.WHOP_CLIENT_ID;
  const faq = [
    { q: "Comment se passe le paiement ?", a: "Le paiement est géré par Whop, une plateforme de paiement sécurisée utilisée par des milliers de créateurs. Basketlog ne voit jamais ta carte bancaire." },
    { q: "Comment activer mon abonnement sur Basketlog ?", a: "Après le paiement, reviens sur cette page et clique sur « J'ai déjà un abonnement ». Tu te connectes avec le même compte Whop, et Basketlog débloque ta formule automatiquement." },
    { q: "Puis-je annuler quand je veux ?", a: "Oui. L'abonnement se gère depuis ton compte Whop (whop.com, rubrique Commandes). Tu gardes l'accès jusqu'à la fin de la période déjà payée." },
    { q: "Qu'est-ce qu'une analyse complète ?", a: "La fiche détaillée d'un match : score projeté, facteurs, scénarios, stats comparées, joueurs à suivre, forme récente, confrontations et deuxième avis. Les probabilités de victoire de tous les matchs restent gratuites pour tout le monde." },
    { q: "Basketlog est-il un site de paris ?", a: "Non. Basketlog est un outil d'analyse statistique pour comprendre les matchs. Aucune prise de pari n'est possible et aucune probabilité n'est une garantie." },
  ];
  return (
    <main className="pro-page">
      <section className="pro-hero">
        <div className="pill-tag">Basketlog Pro</div>
        <h1 className="t-80">Analyse <span className="accent">tous</span> les matchs.</h1>
        <p className="lead">NBA et EuroLeague, chaque soir. Choisis ta formule, sans engagement.</p>
      </section>
      <ProPlans checkout={checkout} loginReady={loginReady} notice={sp?.ok ? "ok" : sp?.erreur || ""} />
      <section className="pro-faq">
        <h2 className="t-80" style={{ fontSize: "clamp(28px,4vw,40px)" }}>Questions fréquentes</h2>
        <Faq items={faq} />
      </section>
    </main>
  );
}
