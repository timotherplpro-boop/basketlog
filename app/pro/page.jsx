import ProPlans from "../../components/ProPlans";
import Faq from "../../components/Faq";
import ProSample from "../../components/ProSample";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { aiReady } from "../../lib/pro";
import { googleReady } from "../../lib/google-auth";
import { checkoutFor, price } from "../../lib/pricing";
import { getCurrency } from "../../lib/currency-server";
import { cookies } from "next/headers";
import { SWITCH_COOKIE } from "../../lib/switch";

export async function generateMetadata() {
  const L = await getL();
  return pageMeta({
    // Résultats de recherche : euros pour les pages française et espagnole, dollars pour la page anglaise.
    title: L.t(`Basketlog Pro : analyses NBA dès ${price("pro", "EUR", L)}/mois`, `Basketlog Pro: NBA analyses from ${price("pro", "USD", L)}/month`, `Basketlog Pro: análisis NBA desde ${price("pro", "EUR", L)}/mes`, `Basketlog Pro: análises NBA a partir de ${price("pro", "EUR", L)}/mês`),
    description: L.t(
      `Pro ${price("pro", "EUR", L)}/mois ou Lifetime ${price("lifetime", "EUR", L)} une seule fois : débloque les analyses des matchs NBA et EuroLeague. Paiement sécurisé par Whop.`,
      `Pro ${price("pro", "USD", L)}/month or Lifetime ${price("lifetime", "USD", L)} one-time: unlock NBA and EuroLeague game analyses. Secure payment by Whop.`, `Pro ${price("pro", "EUR", L)}/mes o Lifetime ${price("lifetime", "EUR", L)} en un solo pago: desbloquea los análisis de los partidos de la NBA y la Euroliga. Pago seguro con Whop.`, `Pro ${price("pro", "EUR", L)}/mês ou Lifetime ${price("lifetime", "EUR", L)} em pagamento único: desbloqueie as análises dos jogos da NBA e da Euroliga. Pagamento seguro com a Whop.`
    ),
    path: "/pro",
    L,
  });
}

export default async function ProPage({ searchParams }) {
  const L = await getL();
  const sp = await searchParams;
  // Paiement direct Whop (page de paiement, comme Visifoot), pas la fiche produit de la boutique.
  // Euros dans la zone euro, dollars ailleurs (liens Whop en dollars des mêmes produits).
  const cur = await getCurrency(L);
  const checkout = checkoutFor(cur);
  const loginReady = !!process.env.WHOP_CLIENT_ID;
  const ai = aiReady();
  // Un changement de formule est en cours (cookie posé par « Mon compte ») : la page le suit et l'achève après le paiement.
  const switching = (await cookies()).has(SWITCH_COOKIE);
  // « avec Google » seulement quand la connexion Google est branchée (sinon : e-mail et mot de passe uniquement).
  const g = googleReady();
  const gFr = g ? " (avec Google ou ton e-mail)" : "", gEn = g ? " (with Google or your email)" : "", gEs = g ? " (con Google o con tu correo)" : "";
  const faqEs = [
    { q: "¿Cómo funciona el pago?", a: "El pago lo gestiona Whop, una plataforma de pago segura que usan miles de creadores. Basketlog nunca ve tu tarjeta." },
    { q: "¿Tengo que crear una cuenta?", a: `No. Eliges tu plan y pagas directamente aquí, en Basketlog (formulario seguro de Whop): tu acceso se abre en cuanto pagas, sin cuenta que crear. Si ya tienes una cuenta de Basketlog${gEs}, inicia sesión antes de pagar y el plan se añade a tu cuenta. ¿Pagaste en la antigua página de Whop? Haz clic en «Activar mi suscripción».` },
    { q: "¿Puedo cancelar cuando quiera?", a: "Sí. Pro se cancela en unos clics desde la página Mi cuenta de este sitio (basketlog-app.com/es/app/compte), con una confirmación antes de que surta efecto. Mantienes el acceso hasta el final del periodo ya pagado. Lifetime es un pago único: no hay nada que cancelar." },
    { q: "¿Cómo cambio de plan?", a: "Desde la página Mi cuenta (basketlog-app.com/es/app/compte). Para pasar de Pro a Lifetime, un clic en «Pasar a…» te lleva a pagar el nuevo plan en Whop; en cuanto se confirme tu pago, tu suscripción anterior se detiene automáticamente al final de su periodo: la conservas hasta entonces, pero ese periodo, ya pagado, no se reembolsa. No se detiene nada hasta que el pago esté confirmado. Para pasar a un plan más barato, cancela tu suscripción desde Mi cuenta y elige el nuevo plan aquí al terminar el periodo." },
    { q: "¿Puedo pedir un reembolso?", a: "Un periodo empezado no se reembolsa: al suscribirte, pides acceso inmediato a tus análisis y renuncias al derecho de desistimiento de 14 días, como permite la ley para los contenidos digitales. Eso sí, puedes cancelar tu suscripción en cualquier momento y sin coste para que no se te vuelva a cobrar. Si hay un problema técnico, escríbenos y lo solucionaremos. Los detalles están en las Condiciones de venta (/es/cgv)." },
    { q: "¿Qué diferencia hay entre Gratis, Pro y Lifetime?", a: `Gratis: las probabilidades de victoria de todos los partidos y una vista previa de cada análisis. Pro hace los análisis completos ilimitados, con las noticias en tiempo real${ai ? " y 1 pregunta al día a la IA" : ""}. Lifetime ofrece lo mismo que Pro, de por vida, con un único pago de ${price("lifetime", cur, L)}${ai ? ", y preguntas a la IA ilimitadas" : ""}. Sin suscripción, cuenta gratis incluida, ves un avance de cada análisis.` },
    { q: "¿Qué es un análisis completo?", a: "La ficha detallada de un partido: marcador proyectado, factores, escenarios, estadísticas comparadas, jugadores a seguir, forma reciente, enfrentamientos y segunda opinión. Sin suscripción, ves gratis las probabilidades de victoria y las cifras clave de cada partido." },
    { q: "¿Basketlog es una web de apuestas?", a: "No. Basketlog es una herramienta de análisis estadístico para entender los partidos. No se puede apostar y ninguna probabilidad es una garantía." },
  ];
  const gPt = g ? " (com o Google ou seu e-mail)" : "";
  const faqPt = [
    { q: "Como funciona o pagamento?", a: "O pagamento é feito pela Whop, uma plataforma de pagamento segura usada por milhares de criadores. O Basketlog nunca vê o seu cartão." },
    { q: "Preciso criar uma conta?", a: `Não. Você escolhe seu plano e paga direto aqui, no Basketlog (formulário seguro da Whop): seu acesso é liberado assim que você paga, sem conta para criar. Se já tem uma conta do Basketlog${gPt}, entre antes de pagar e o plano é adicionado à sua conta. Pagou na antiga página da Whop? Clique em «Ativar minha assinatura».` },
    { q: "Posso cancelar quando quiser?", a: "Sim. O Pro é cancelado em poucos cliques pela página Minha conta deste site (basketlog-app.com/pt/app/compte), com uma confirmação antes de valer. Você mantém o acesso até o fim do período já pago. O Lifetime é um pagamento único: não há nada para cancelar." },
    { q: "Como troco de plano?", a: "Pela página Minha conta (basketlog-app.com/pt/app/compte). Para passar do Pro para o Lifetime, um clique em «Passar para…» leva você ao pagamento do novo plano na Whop; assim que o pagamento é confirmado, sua assinatura anterior termina sozinha no fim do período: você a mantém até lá, mas esse período, já pago, não é reembolsado. Nada é interrompido antes da confirmação do pagamento. Para passar a um plano mais barato, cancele sua assinatura em Minha conta e escolha o novo plano aqui quando o período terminar." },
    { q: "Posso pedir reembolso?", a: "Um período iniciado não é reembolsado: ao assinar, você pede acesso imediato às suas análises e renuncia ao direito de arrependimento de 14 dias, como a lei permite para conteúdos digitais. Você pode cancelar a qualquer momento, sem custo, para não ser cobrado de novo. Se houver um problema técnico, escreva para nós e resolvemos. Os detalhes estão nas Condições de venda (/pt/cgv)." },
    { q: "Qual a diferença entre Grátis, Pro e Lifetime?", a: `Grátis: as probabilidades de vitória de todos os jogos e uma prévia de cada análise. O Pro deixa as análises completas ilimitadas, com as notícias em tempo real${ai ? " e 1 pergunta por dia à IA" : ""}. O Lifetime oferece o mesmo que o Pro, para sempre, com um pagamento único de ${price("lifetime", cur, L)}${ai ? ", e perguntas à IA ilimitadas" : ""}. Sem assinatura, com a conta grátis incluída, você vê uma prévia de cada análise.` },
    { q: "O que é uma análise completa?", a: "A ficha detalhada de um jogo: placar projetado, fatores, cenários, estatísticas comparadas, jogadores para acompanhar, fase recente, confrontos e segunda opinião. Sem assinatura, as probabilidades de vitória e os números-chave de cada jogo são grátis." },
    { q: "O Basketlog é um site de apostas?", a: "Não. O Basketlog é uma ferramenta de análise estatística para entender os jogos. Não dá para apostar e nenhuma probabilidade é uma garantia." },
  ];
  const faq = L.pt ? faqPt : L.es ? faqEs : L.en
    ? [
        { q: "How does payment work?", a: "Payment is handled by Whop, a secure payment platform used by thousands of creators. Basketlog never sees your card." },
        { q: "Do I need to create an account?", a: `No. Pick your plan and pay right here on Basketlog (secure Whop form): your access opens as soon as you pay, with no account to create. Already have a Basketlog account${gEn}? Log in before paying and the plan is added to your account. Paid on the old Whop page? Click “Activate my subscription”.` },
        { q: "Can I cancel anytime?", a: "Yes. Pro is cancelled in a few clicks from the My account page of this site (basketlog-app.com/en/app/compte), with a confirmation before it takes effect. You keep access until the end of the period already paid. Lifetime is a one-time payment: nothing to cancel." },
        { q: "How do I change plan?", a: "From the My account page (basketlog-app.com/en/app/compte). To move from Pro to Lifetime, one click on “Switch to…” takes you to pay for the new plan on Whop; as soon as your payment is confirmed, your previous subscription stops automatically at the end of its period: you keep it until then, but that period, already paid, is not refunded. Nothing is stopped until the payment is confirmed. To move to a cheaper plan, cancel your subscription from My account, then choose the new plan here when the period ends." },
        { q: "Can I get a refund?", a: "A started period is not refunded: by subscribing, you request immediate access to your analyses and waive the 14-day withdrawal right, as the law allows for digital content. You can cancel anytime, at no cost, so you are not charged again. If something breaks on our side, write to us and we'll sort it out. Details are in the Terms of Sale (/en/cgv)." },
        { q: "What's the difference between Free, Pro and Lifetime?", a: `Free: win probabilities for every game and a preview of every analysis. Pro makes full analyses unlimited, with real-time news${ai ? " and 1 question a day to the AI" : ""}. Lifetime is the same as Pro, for life, for a one-time payment of ${price("lifetime", cur, L)}${ai ? ", with unlimited questions to the AI" : ""}. Without a subscription, free account included, you see a preview of every analysis.` },
        { q: "What is a full analysis?", a: "The detailed game page: projected score, key factors, scenarios, stat comparison, players to watch, recent form, head-to-head and a second opinion. Without a subscription, win probabilities and key numbers for every game are free." },
        { q: "Is Basketlog a betting site?", a: "No. Basketlog is a statistical analysis tool to understand games. No bets can be placed and no probability is a guarantee." },
      ]
    : [
        { q: "Comment se passe le paiement ?", a: "Le paiement est géré par Whop, une plateforme de paiement sécurisée utilisée par des milliers de créateurs. Basketlog ne voit jamais ta carte bancaire." },
        { q: "Dois-je créer un compte ?", a: `Non. Tu choisis ta formule et tu paies directement ici, sur Basketlog (formulaire sécurisé Whop) : ton accès s'ouvre dès le paiement, sans compte à créer. Tu as déjà un compte Basketlog${gFr} ? Connecte-toi avant de payer et la formule s'ajoute à ton compte. Tu as payé sur l'ancienne page Whop ? Clique sur « Activer mon abonnement ».` },
        { q: "Puis-je annuler quand je veux ?", a: "Oui. L'abonnement Pro se résilie en quelques clics depuis la page Mon compte de ce site (basketlog-app.com/app/compte), avec une confirmation avant validation. Tu gardes l'accès jusqu'à la fin de la période déjà payée. Lifetime se paie une seule fois : rien à annuler." },
        { q: "Comment changer de formule ?", a: "Depuis la page Mon compte (basketlog-app.com/app/compte). Pour passer de Pro à Lifetime, un clic sur « Passer à… » t'envoie payer la nouvelle formule chez Whop ; dès que ton paiement est confirmé, ton ancien abonnement s'arrête automatiquement à la fin de sa période : tu le gardes jusque-là, mais cette période déjà payée n'est pas remboursée. Rien n'est arrêté tant que le paiement n'est pas confirmé. Pour passer à une formule moins chère, résilie ton abonnement depuis Mon compte, puis choisis la nouvelle formule ici à la fin de la période." },
        { q: "Puis-je être remboursé ?", a: "Une période commencée n'est pas remboursée : en t'abonnant, tu demandes l'accès immédiat à tes analyses et tu renonces au droit de rétractation de 14 jours, comme le permet la loi pour un contenu numérique. Tu peux en revanche arrêter ton abonnement à tout moment, sans frais, pour ne plus être prélevé. En cas de problème technique, écris-nous : nous trouverons une solution. Le détail est dans les CGV (/cgv)." },
        { q: "Quelle différence entre Gratuit, Pro et Lifetime ?", a: `Gratuit : les probabilités de victoire de tous les matchs et l'aperçu de chaque analyse. Pro rend les analyses complètes illimitées, avec les actualités en temps réel${ai ? " et 1 question par jour à l'IA" : ""}. Lifetime offre la même chose que Pro, à vie, pour un paiement unique de ${price("lifetime", cur, L)}${ai ? ", avec les questions à l'IA illimitées" : ""}. Sans abonnement, compte gratuit compris, tu vois l'aperçu de chaque analyse.` },
        { q: "Qu'est-ce qu'une analyse complète ?", a: "La fiche détaillée d'un match : score projeté, facteurs, scénarios, stats comparées, joueurs à suivre, forme récente, confrontations et deuxième avis. Sans abonnement, tu vois gratuitement les probabilités de victoire et les chiffres clés de chaque match." },
        { q: "Basketlog est-il un site de paris ?", a: "Non. Basketlog est un outil d'analyse statistique pour comprendre les matchs. Aucune prise de pari n'est possible et aucune probabilité n'est une garantie." },
      ];
  return (
    <main className="pro-page">
      <section className="pro-hero">
        <div className="pill-tag">Basketlog Pro</div>
        <h1 className="t-80">{L.t("Choisis ton plan", "Choose your plan", "Elige tu plan", "Escolha seu plano")}</h1>
        <p className="lead">{L.t("Accède à des analyses complètes et des pronostics détaillés", "Get full analyses and detailed predictions", "Accede a análisis completos y pronósticos detallados", "Acesse análises completas e palpites detalhados")}</p>
        <a href="#exemple" className="ps-link">👀 {L.t("Voir un exemple d'analyse complète", "See a full analysis example", "Ver un ejemplo de análisis completo", "Ver um exemplo de análise completa")}</a>
      </section>
      <ProPlans embed={process.env.PAY_EMBED === "1" || sp?.paiement === "test"} checkout={checkout} cur={cur} loginReady={loginReady} ai={ai} switching={switching} notice={sp?.ok || sp?.bienvenue === "abonne" ? "ok" : sp?.bienvenue ? "compte" : sp?.erreur || ""} />
      <ProSample L={L} />
      <section className="pro-faq">
        <h2 className="t-80" style={{ fontSize: "clamp(28px,4vw,40px)" }}>{L.t("Questions fréquentes", "FAQ", "Preguntas frecuentes", "Perguntas frequentes")}</h2>
        <Faq items={faq} />
      </section>
    </main>
  );
}
