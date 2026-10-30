import ProPlans from "../../components/ProPlans";
import Faq from "../../components/Faq";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { aiReady } from "../../lib/pro";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    title: L.t("Basketlog Pro : analyses NBA dès 10 €/mois", "Basketlog Pro: NBA analyses from €10/month", "Basketlog Pro: análisis NBA desde 10 €/mes"),
    description: L.t(
      "Starter 10 €/mois, Pro 19 €/mois ou Lifetime 99 € une seule fois : débloque les analyses des matchs NBA et EuroLeague. Paiement sécurisé par Whop.",
      "Starter €10/month, Pro €19/month or Lifetime €99 one-time: unlock NBA and EuroLeague game analyses. Secure payment by Whop.", "Starter 10 €/mes, Pro 19 €/mes o Lifetime 99 € en un solo pago: desbloquea los análisis de los partidos de la NBA y la Euroliga. Pago seguro con Whop."
    ),
    path: "/pro",
    L,
  });
}

export default async function ProPage({ searchParams }) {
  const L = await getL();
  const sp = await searchParams;
  // Paiement direct Whop (page de paiement, comme Visifoot), pas la fiche produit de la boutique.
  const checkout = {
    starter: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_STARTER || "https://whop.com/checkout/plan_c8MZCxs2q1nl5/",
    pro: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "https://whop.com/checkout/plan_9LcgVO0AP56pI/",
    lifetime: process.env.NEXT_PUBLIC_WHOP_CHECKOUT_LIFETIME || "https://whop.com/checkout/plan_LEqDYDZ6KkVUL/",
  };
  const loginReady = !!process.env.WHOP_CLIENT_ID;
  const ai = aiReady();
  const faqEs = [
    { q: "¿Cómo funciona el pago?", a: "El pago lo gestiona Whop, una plataforma de pago segura que usan miles de creadores. Basketlog nunca ve tu tarjeta." },
    { q: "¿Cómo activo mi suscripción en Basketlog?", a: "Después de pagar, vuelve a esta página y haz clic en «Iniciar sesión». Entra con la misma cuenta de Whop y Basketlog desbloquea tu plan automáticamente." },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Starter y Pro se gestionan desde tu cuenta de Whop (whop.com, apartado Pedidos). Mantienes el acceso hasta el final del periodo ya pagado. Lifetime es un pago único: no hay nada que cancelar." },
    { q: "¿Puedo pedir un reembolso?", a: "Un periodo empezado no se reembolsa: al suscribirte, pides acceso inmediato a tus análisis y renuncias al derecho de desistimiento de 14 días, como permite la ley para los contenidos digitales. Eso sí, puedes cancelar tu suscripción en cualquier momento y sin coste para que no se te vuelva a cobrar. Si hay un problema técnico, escríbenos y lo solucionaremos. Los detalles están en las Condiciones de venta (/es/cgv)." },
    { q: "¿Qué diferencia hay entre Starter, Pro y Lifetime?", a: `Starter da 1 análisis reducido al día (probabilidades exactas y estadísticas clave). Pro hace los análisis completos ilimitados, con las noticias en tiempo real${ai ? " y 1 pregunta al día a la IA" : ""}. Lifetime ofrece lo mismo que Pro, de por vida, con un único pago de 99 €${ai ? ", y preguntas a la IA ilimitadas" : ""}. Sin suscripción, cuenta gratis incluida, ves un avance de cada análisis.` },
    { q: "¿Qué es un análisis completo?", a: "La ficha detallada de un partido: marcador proyectado, factores, escenarios, estadísticas comparadas, jugadores a seguir, forma reciente, enfrentamientos y segunda opinión. Sin suscripción, ves gratis las probabilidades de victoria y las cifras clave de cada partido." },
    { q: "¿Basketlog es una web de apuestas?", a: "No. Basketlog es una herramienta de análisis estadístico para entender los partidos. No se puede apostar y ninguna probabilidad es una garantía." },
  ];
  const faq = L.es ? faqEs : L.en
    ? [
        { q: "How does payment work?", a: "Payment is handled by Whop, a secure payment platform used by thousands of creators. Basketlog never sees your card." },
        { q: "How do I activate my subscription on Basketlog?", a: "After paying, come back to this page and click “Log in”. Sign in with the same Whop account and Basketlog unlocks your plan automatically." },
        { q: "Can I cancel anytime?", a: "Yes. Starter and Pro are managed from your Whop account (whop.com, Orders). You keep access until the end of the period already paid. Lifetime is a one-time payment: nothing to cancel." },
        { q: "Can I get a refund?", a: "A started period is not refunded: by subscribing, you request immediate access to your analyses and waive the 14-day withdrawal right, as the law allows for digital content. You can cancel anytime, at no cost, so you are not charged again. If something breaks on our side, write to us and we'll sort it out. Details are in the Terms of Sale (/en/cgv)." },
        { q: "What's the difference between Starter, Pro and Lifetime?", a: `Starter gives 1 reduced analysis per day (exact probabilities and key stats). Pro makes full analyses unlimited, with real-time news${ai ? " and 1 question a day to the AI" : ""}. Lifetime is the same as Pro, for life, for a one-time payment of €99${ai ? ", with unlimited questions to the AI" : ""}. Without a subscription, free account included, you see a preview of every analysis.` },
        { q: "What is a full analysis?", a: "The detailed game page: projected score, key factors, scenarios, stat comparison, players to watch, recent form, head-to-head and a second opinion. Without a subscription, win probabilities and key numbers for every game are free." },
        { q: "Is Basketlog a betting site?", a: "No. Basketlog is a statistical analysis tool to understand games. No bets can be placed and no probability is a guarantee." },
      ]
    : [
        { q: "Comment se passe le paiement ?", a: "Le paiement est géré par Whop, une plateforme de paiement sécurisée utilisée par des milliers de créateurs. Basketlog ne voit jamais ta carte bancaire." },
        { q: "Comment activer mon abonnement sur Basketlog ?", a: "Après le paiement, reviens sur cette page et clique sur « Me connecter ». Tu te connectes avec le même compte Whop, et Basketlog débloque ta formule automatiquement." },
        { q: "Puis-je annuler quand je veux ?", a: "Oui. Les abonnements Starter et Pro se gèrent depuis ton compte Whop (whop.com, rubrique Commandes). Tu gardes l'accès jusqu'à la fin de la période déjà payée. Lifetime se paie une seule fois : rien à annuler." },
        { q: "Puis-je être remboursé ?", a: "Une période commencée n'est pas remboursée : en t'abonnant, tu demandes l'accès immédiat à tes analyses et tu renonces au droit de rétractation de 14 jours, comme le permet la loi pour un contenu numérique. Tu peux en revanche arrêter ton abonnement à tout moment, sans frais, pour ne plus être prélevé. En cas de problème technique, écris-nous : nous trouverons une solution. Le détail est dans les CGV (/cgv)." },
        { q: "Quelle différence entre Starter, Pro et Lifetime ?", a: `Starter donne 1 analyse réduite par jour (probabilités exactes et stats clés). Pro rend les analyses complètes illimitées, avec les actualités en temps réel${ai ? " et 1 question par jour à l'IA" : ""}. Lifetime offre la même chose que Pro, à vie, pour un paiement unique de 99 €${ai ? ", avec les questions à l'IA illimitées" : ""}. Sans abonnement, compte gratuit compris, tu vois l'aperçu de chaque analyse.` },
        { q: "Qu'est-ce qu'une analyse complète ?", a: "La fiche détaillée d'un match : score projeté, facteurs, scénarios, stats comparées, joueurs à suivre, forme récente, confrontations et deuxième avis. Sans abonnement, tu vois gratuitement les probabilités de victoire et les chiffres clés de chaque match." },
        { q: "Basketlog est-il un site de paris ?", a: "Non. Basketlog est un outil d'analyse statistique pour comprendre les matchs. Aucune prise de pari n'est possible et aucune probabilité n'est une garantie." },
      ];
  return (
    <main className="pro-page">
      <section className="pro-hero">
        <div className="pill-tag">Basketlog Pro</div>
        <h1 className="t-80">{L.t("Choisis ton plan", "Choose your plan", "Elige tu plan")}</h1>
        <p className="lead">{L.t("Accède à des analyses complètes et des pronostics détaillés", "Get full analyses and detailed predictions", "Accede a análisis completos y pronósticos detallados")}</p>
      </section>
      <ProPlans checkout={checkout} loginReady={loginReady} ai={ai} notice={sp?.ok || sp?.bienvenue === "abonne" ? "ok" : sp?.bienvenue ? "compte" : sp?.erreur || ""} />
      <section className="pro-faq">
        <h2 className="t-80" style={{ fontSize: "clamp(28px,4vw,40px)" }}>{L.t("Questions fréquentes", "FAQ", "Preguntas frecuentes")}</h2>
        <Faq items={faq} />
      </section>
    </main>
  );
}
