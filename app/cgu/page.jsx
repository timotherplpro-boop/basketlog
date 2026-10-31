import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
  if (L.es) return pageMeta({ title: "Condiciones de uso – Basketlog", description: "Condiciones de uso de Basketlog: descripción del servicio, edad mínima, advertencia sobre los pronósticos, normas de uso y responsabilidad.", path: "/cgu", L });
  return L.en
    ? pageMeta({ title: "Terms of use – Basketlog", description: "Basketlog terms of use: description of the service, minimum age, disclaimer about predictions, rules of use and liability.", path: "/cgu", L })
    : pageMeta({ title: "Conditions générales d'utilisation (CGU) – Basketlog", description: "Conditions générales d'utilisation de Basketlog : description du service, âge minimum, avertissement sur les pronostics, règles d'usage et responsabilité.", path: "/cgu" });
}

function CGUFr() {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Conditions générales d'utilisation"
      path="/cgu"
      intro={`Les présentes conditions générales d'utilisation (« CGU ») encadrent l'accès et l'utilisation du site Basketlog, édité par ${e.nom} (« nous »). En utilisant le site, tu acceptes les CGU et la politique de confidentialité. Les abonnements payants sont en plus régis par les conditions générales de vente (CGV).`}
    >
      <Sec n={1} title="Le service">
        <p>Basketlog analyse les matchs de NBA et d&apos;EuroLeague. Le site rassemble des données statistiques publiques (résultats, classements, scores, absences, calendrier) et les passe dans un modèle de calcul qui produit, pour chaque match, des probabilités de victoire, un score projeté, des scénarios et une analyse rédigée automatiquement.</p>
        <p>Une partie du service est gratuite : les probabilités de victoire et les chiffres clés de chaque match, l&apos;aperçu de chaque analyse (forme récente, résumé rapide, scénario n° 1 et confiance du modèle), le classement, les fiches équipes et le bilan du modèle. Les analyses sont réservées aux abonnés : Starter (1 analyse réduite par jour), Pro et Lifetime (analyses complètes illimitées), dans les conditions prévues par les <Link href="/cgv">CGV</Link>.</p>
      </Sec>

      <Sec n={2} title="Âge minimum">
        <p>Le service est réservé aux personnes âgées d&apos;au moins 18 ans et capables de contracter. En t&apos;abonnant, tu déclares remplir ces conditions. Si nous apprenons qu&apos;un abonné est mineur, nous pouvons mettre fin à son accès.</p>
      </Sec>

      <Sec n={3} title="Avertissement sur les pronostics">
        <p>Les probabilités, scores projetés et analyses sont des estimations statistiques fournies à titre informatif et de divertissement. Ils peuvent être faux, incomplets ou reposer sur des données dépassées (par exemple une absence annoncée tardivement). Ils ne constituent ni une garantie de résultat, ni un conseil de pari, ni un conseil financier.</p>
        <p>Basketlog n&apos;est pas un opérateur de jeux d&apos;argent : aucune mise n&apos;est possible sur le site. Si tu utilises nos contenus pour parier ailleurs, tu le fais sous ta seule responsabilité et dans le respect des lois de ton pays. Les jeux d&apos;argent comportent des risques : {LEGAL.jeu.nom}, {LEGAL.jeu.tel} (appel non surtaxé).</p>
        <p>Le taux de réussite du modèle est publié en toute transparence sur la page <Link href="/app/bilan">Bilan</Link>. Les résultats passés ne préjugent pas des résultats futurs.</p>
      </Sec>

      <Sec n={4} title="Compte gratuit et compte abonné">
        <p>Le site est accessible sans inscription. Le compte gratuit se crée avec un compte Whop (par e-mail, Google ou Apple) et donne accès à l&apos;espace membre ; il ne comprend pas d&apos;analyse complète. Les abonnés se connectent avec le compte Whop utilisé lors du paiement. Nous ne recevons jamais ton mot de passe : seulement ton identifiant Whop, ton nom d&apos;utilisateur et la formule à laquelle tu as accès. Tu peux supprimer ton compte gratuit à tout moment en nous écrivant.</p>
        <p>Ton accès est personnel. Il est interdit de le partager, de le revendre ou de le prêter. Tu es responsable de la sécurité de ton compte Whop.</p>
      </Sec>

      <Sec n={5} title="Avis des utilisateurs">
        <p>Si tu as une formule payante active (Starter, Pro ou Lifetime), tu peux publier un avis sur Basketlog, un seul par compte : prénom, description facultative, note et texte. Il porte la mention « Abonné vérifié ». Chaque avis est relu avant publication et peut être refusé s&apos;il est injurieux, hors sujet, publicitaire ou illicite. En publiant un avis, tu nous autorises à l&apos;afficher sur le site, sans contrepartie. Tu peux en demander la suppression à tout moment.</p>
      </Sec>

      <Sec n={6} title="Ce qui est interdit">
        <ul>
          <li>Utiliser le site à des fins illégales, frauduleuses ou trompeuses.</li>
          <li>Contourner les limites techniques, notamment l&apos;accès réservé aux abonnés ou le nombre d&apos;analyses par jour.</li>
          <li>Copier automatiquement (scraping) tout ou partie du site, des probabilités ou des analyses.</li>
          <li>Revendre, republier ou exploiter commercialement les analyses, y compris dans un groupe ou un canal payant.</li>
          <li>Perturber le fonctionnement du site ou tenter d&apos;accéder à nos systèmes sans autorisation.</li>
        </ul>
      </Sec>

      <Sec n={7} title="Propriété intellectuelle">
        <p>Le site, ses textes, son design, son code, son modèle et ses analyses sont protégés. Nous t&apos;accordons un droit d&apos;utilisation personnel, non exclusif et non transférable, pour ton usage privé. Partager une capture ou un lien en citant Basketlog est bienvenu ; reproduire les analyses en masse ne l&apos;est pas.</p>
        <p>Les noms et logos des équipes et des compétitions appartiennent à leurs titulaires. Basketlog n&apos;est affilié ni à la NBA ni à l&apos;EuroLeague.</p>
      </Sec>

      <Sec n={8} title="Disponibilité et responsabilité">
        <p>Nous faisons notre possible pour que le site soit disponible et que les données soient à jour, sans pouvoir le garantir en permanence : nos sources peuvent être interrompues ou en retard. Nous pouvons faire évoluer, suspendre ou arrêter une fonctionnalité gratuite à tout moment.</p>
        <p>Dans les limites permises par la loi, nous ne sommes pas responsables des décisions prises sur la base des analyses, ni des pertes qui pourraient en découler, notamment en cas de pari. Rien dans les présentes CGU ne limite les droits que la loi accorde aux consommateurs.</p>
      </Sec>

      <Sec n={9} title="Données personnelles">
        <p>Le traitement de tes données est décrit dans la <Link href="/confidentialite">politique de confidentialité</Link> et la <Link href="/cookies">politique de cookies</Link>, qui font partie des présentes CGU.</p>
      </Sec>

      <Sec n={10} title="Suspension">
        <p>Nous pouvons suspendre ou supprimer l&apos;accès d&apos;un utilisateur qui ne respecte pas les CGU (partage de compte, scraping, fraude…), après l&apos;avoir prévenu lorsque c&apos;est possible.</p>
      </Sec>

      <Sec n={11} title="Modification des CGU">
        <p>Nous pouvons modifier les CGU pour suivre l&apos;évolution du service ou de la loi. La date de mise à jour figure en haut de la page. Les abonnés sont prévenus des changements importants avant leur entrée en vigueur.</p>
      </Sec>

      <Sec n={12} title="Droit applicable et litiges">
        <p>Les CGU sont soumises au droit français. En cas de litige, écris-nous d&apos;abord à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> : nous cherchons toujours une solution amiable. Si tu es consommateur, tu peux aussi recourir gratuitement au médiateur de la consommation indiqué dans les <Link href="/mentions-legales">mentions légales</Link>. À défaut d&apos;accord, les tribunaux compétents sont ceux désignés par la loi.</p>
      </Sec>
    </LegalDoc>
  );
}

function CGUEn({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Terms of use"
      path="/cgu"
      L={L}
      intro={`These terms of use (the “Terms”) govern access to and use of the Basketlog website, published by ${e.nom} (“we”). By using the website, you accept the Terms and the privacy policy. Paid subscriptions are also governed by the terms of sale. This English version is a translation provided for convenience; in case of any discrepancy, the French version prevails.`}
    >
      <Sec n={1} title="The service">
        <p>Basketlog analyzes NBA and EuroLeague games. The website gathers public statistical data (results, standings, scores, injuries, schedule) and runs it through a model that produces, for each game, win probabilities, a projected score, scenarios and an automatically written analysis.</p>
        <p>Part of the service is free: win probabilities and key figures for every game, a preview of every analysis (recent form, quick summary, #1 scenario and the model&apos;s confidence), the standings, team pages and the model&apos;s track record. Analyses are reserved for subscribers: Starter (1 reduced analysis per day), Pro and Lifetime (unlimited full analyses), under the conditions set out in the <Link href={L.href("/cgv")}>terms of sale</Link>.</p>
      </Sec>

      <Sec n={2} title="Minimum age">
        <p>The service is reserved for people aged at least 18 who have the legal capacity to enter into a contract. By subscribing, you declare that you meet these conditions. If we learn that a subscriber is a minor, we may end their access.</p>
      </Sec>

      <Sec n={3} title="Disclaimer about predictions">
        <p>Probabilities, projected scores and analyses are statistical estimates provided for information and entertainment. They may be wrong, incomplete or based on outdated data (for example an injury announced late). They are neither a guarantee of results, nor betting advice, nor financial advice.</p>
        <p>Basketlog is not a gambling operator: no bets can be placed on the website. If you use our content to bet elsewhere, you do so at your own risk and in compliance with the laws of your country. Gambling involves risks: in France, {LEGAL.jeu.nom}, {LEGAL.jeu.tel} (standard rate).</p>
        <p>The model&apos;s accuracy is published transparently on the <Link href={L.href("/app/bilan")}>Track record</Link> page. Past results do not guarantee future results.</p>
      </Sec>

      <Sec n={4} title="Free account and subscriber account">
        <p>The website can be used without signing up. The free account is created with a Whop account (by email, Google or Apple) and gives access to the member area; it does not include full analyses. Subscribers log in with the Whop account used for payment. We never receive your password: only your Whop ID, your username and the plan you have access to. You can delete your free account at any time by emailing us.</p>
        <p>Your access is personal. Sharing, reselling or lending it is prohibited. You are responsible for the security of your Whop account.</p>
      </Sec>

      <Sec n={5} title="User reviews">
        <p>If you have an active paid plan (Starter, Pro or Lifetime), you can post a review of Basketlog, one per account: first name, optional description, rating and text. It carries a “Verified subscriber” label. Every review is checked before publication and may be rejected if it is abusive, off-topic, promotional or illegal. By posting a review, you allow us to display it on the website, free of charge. You can ask for it to be removed at any time.</p>
      </Sec>

      <Sec n={6} title="What is prohibited">
        <ul>
          <li>Using the website for illegal, fraudulent or misleading purposes.</li>
          <li>Circumventing technical limits, in particular subscriber-only access or the number of analyses per day.</li>
          <li>Automatically copying (scraping) all or part of the website, probabilities or analyses.</li>
          <li>Reselling, republishing or commercially exploiting the analyses, including in a paid group or channel.</li>
          <li>Disrupting the website or attempting to access our systems without authorization.</li>
        </ul>
      </Sec>

      <Sec n={7} title="Intellectual property">
        <p>The website, its texts, design, code, model and analyses are protected. We grant you a personal, non-exclusive and non-transferable right of use for your private use. Sharing a screenshot or a link that credits Basketlog is welcome; reproducing analyses in bulk is not.</p>
        <p>Team and competition names and logos belong to their owners. Basketlog is not affiliated with the NBA or the EuroLeague.</p>
      </Sec>

      <Sec n={8} title="Availability and liability">
        <p>We do our best to keep the website available and the data up to date, but cannot guarantee it at all times: our sources may be interrupted or delayed. We may change, suspend or discontinue a free feature at any time.</p>
        <p>To the extent permitted by law, we are not liable for decisions made on the basis of the analyses, or for any resulting losses, in particular from betting. Nothing in these Terms limits the rights that the law grants to consumers.</p>
      </Sec>

      <Sec n={9} title="Personal data">
        <p>How your data is processed is described in the <Link href={L.href("/confidentialite")}>privacy policy</Link> and the <Link href={L.href("/cookies")}>cookie policy</Link>, which form part of these Terms.</p>
      </Sec>

      <Sec n={10} title="Suspension">
        <p>We may suspend or delete the access of a user who breaches the Terms (account sharing, scraping, fraud…), after notifying them where possible.</p>
      </Sec>

      <Sec n={11} title="Changes to the Terms">
        <p>We may change the Terms to reflect changes to the service or the law. The update date is shown at the top of the page. Subscribers are informed of significant changes before they take effect.</p>
      </Sec>

      <Sec n={12} title="Governing law and disputes">
        <p>The Terms are governed by French law. In the event of a dispute, please email us first at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>: we always look for an amicable solution. If you are a consumer, you can also refer the matter free of charge to the consumer mediator listed in the <Link href={L.href("/mentions-legales")}>legal notice</Link>. Failing agreement, the competent courts are those designated by law.</p>
      </Sec>
    </LegalDoc>
  );
}

function CGUEs({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Condiciones de uso"
      path="/cgu"
      L={L}
      intro={`Estas condiciones de uso (las «Condiciones») regulan el acceso y el uso del sitio Basketlog, editado por ${e.nom} («nosotros»). Al usar el sitio, aceptas las Condiciones y la política de privacidad. Las suscripciones de pago se rigen además por las condiciones de venta. Esta versión en español es una traducción que se ofrece para tu comodidad; en caso de discrepancia, prevalece la versión francesa.`}
    >
      <Sec n={1} title="El servicio">
        <p>Basketlog analiza los partidos de la NBA y de la Euroliga. El sitio reúne datos estadísticos públicos (resultados, clasificaciones, marcadores, bajas, calendario) y los pasa por un modelo de cálculo que genera, para cada partido, probabilidades de victoria, un marcador proyectado, escenarios y un análisis redactado automáticamente.</p>
        <p>Una parte del servicio es gratuita: las probabilidades de victoria y las cifras clave de cada partido, el avance de cada análisis (forma reciente, resumen rápido, escenario n.º 1 y confianza del modelo), la clasificación, las fichas de los equipos y el balance del modelo. Los análisis están reservados a los suscriptores: Starter (1 análisis reducido al día), Pro y Lifetime (análisis completos ilimitados), en las condiciones previstas en las <Link href={L.href("/cgv")}>condiciones de venta</Link>.</p>
      </Sec>

      <Sec n={2} title="Edad mínima">
        <p>El servicio está reservado a personas de al menos 18 años con capacidad para contratar. Al suscribirte, declaras cumplir estas condiciones. Si sabemos que un suscriptor es menor de edad, podemos poner fin a su acceso.</p>
      </Sec>

      <Sec n={3} title="Advertencia sobre los pronósticos">
        <p>Las probabilidades, los marcadores proyectados y los análisis son estimaciones estadísticas que se ofrecen a título informativo y de entretenimiento. Pueden ser erróneos, incompletos o basarse en datos desactualizados (por ejemplo, una baja anunciada a última hora). No constituyen ni una garantía de resultado, ni un consejo de apuestas, ni un consejo financiero.</p>
        <p>Basketlog no es un operador de juego: en el sitio no se puede apostar. Si usas nuestros contenidos para apostar en otro lugar, lo haces bajo tu exclusiva responsabilidad y respetando las leyes de tu país. El juego conlleva riesgos: en España, <a href="https://www.jugarbien.es" rel="noopener" target="_blank">jugarbien.es</a>; en Francia, {LEGAL.jeu.nom}, {LEGAL.jeu.tel}.</p>
        <p>El porcentaje de acierto del modelo se publica con total transparencia en la página <Link href={L.href("/app/bilan")}>Balance</Link>. Los resultados pasados no garantizan los resultados futuros.</p>
      </Sec>

      <Sec n={4} title="Cuenta gratis y cuenta de suscriptor">
        <p>El sitio se puede usar sin registrarse. La cuenta gratis se crea con una cuenta de Whop (por correo electrónico, Google o Apple) y da acceso al área de miembros; no incluye análisis completos. Los suscriptores inician sesión con la cuenta de Whop que usaron para pagar. Nunca recibimos tu contraseña: solo tu identificador de Whop, tu nombre de usuario y el plan al que tienes acceso. Puedes eliminar tu cuenta gratis en cualquier momento escribiéndonos.</p>
        <p>Tu acceso es personal. Está prohibido compartirlo, revenderlo o prestarlo. Eres responsable de la seguridad de tu cuenta de Whop.</p>
      </Sec>

      <Sec n={5} title="Opiniones de los usuarios">
        <p>Si tienes un plan de pago activo (Starter, Pro o Lifetime), puedes publicar una opinión sobre Basketlog, una por cuenta: nombre, descripción opcional, nota y texto. Lleva la mención «Suscriptor verificado». Cada opinión se revisa antes de publicarse y puede rechazarse si es injuriosa, ajena al tema, publicitaria o ilícita. Al publicar una opinión, nos autorizas a mostrarla en el sitio, sin contraprestación. Puedes pedir que se elimine en cualquier momento.</p>
      </Sec>

      <Sec n={6} title="Lo que está prohibido">
        <ul>
          <li>Usar el sitio con fines ilegales, fraudulentos o engañosos.</li>
          <li>Eludir los límites técnicos, en particular el acceso reservado a suscriptores o el número de análisis al día.</li>
          <li>Copiar de forma automática (scraping) todo o parte del sitio, de las probabilidades o de los análisis.</li>
          <li>Revender, republicar o explotar comercialmente los análisis, incluso en un grupo o canal de pago.</li>
          <li>Perturbar el funcionamiento del sitio o intentar acceder a nuestros sistemas sin autorización.</li>
        </ul>
      </Sec>

      <Sec n={7} title="Propiedad intelectual">
        <p>El sitio, sus textos, su diseño, su código, su modelo y sus análisis están protegidos. Te concedemos un derecho de uso personal, no exclusivo e intransferible, para tu uso privado. Compartir una captura o un enlace citando a Basketlog es bienvenido; reproducir los análisis de forma masiva, no.</p>
        <p>Los nombres y logotipos de los equipos y de las competiciones pertenecen a sus titulares. Basketlog no está afiliado ni a la NBA ni a la Euroliga.</p>
      </Sec>

      <Sec n={8} title="Disponibilidad y responsabilidad">
        <p>Hacemos todo lo posible para que el sitio esté disponible y los datos actualizados, sin poder garantizarlo en todo momento: nuestras fuentes pueden interrumpirse o retrasarse. Podemos modificar, suspender o suprimir una función gratuita en cualquier momento.</p>
        <p>En la medida permitida por la ley, no somos responsables de las decisiones tomadas a partir de los análisis ni de las pérdidas que pudieran derivarse, en particular en caso de apuesta. Nada de lo dispuesto en estas Condiciones limita los derechos que la ley reconoce a los consumidores.</p>
      </Sec>

      <Sec n={9} title="Datos personales">
        <p>El tratamiento de tus datos se describe en la <Link href={L.href("/confidentialite")}>política de privacidad</Link> y en la <Link href={L.href("/cookies")}>política de cookies</Link>, que forman parte de estas Condiciones.</p>
      </Sec>

      <Sec n={10} title="Suspensión">
        <p>Podemos suspender o suprimir el acceso de un usuario que no respete las Condiciones (cuenta compartida, scraping, fraude…), tras avisarle cuando sea posible.</p>
      </Sec>

      <Sec n={11} title="Modificación de las Condiciones">
        <p>Podemos modificar las Condiciones para adaptarlas a la evolución del servicio o de la ley. La fecha de actualización figura en la parte superior de la página. Los suscriptores reciben aviso de los cambios importantes antes de su entrada en vigor.</p>
      </Sec>

      <Sec n={12} title="Ley aplicable y litigios">
        <p>Las Condiciones se rigen por el derecho francés. En caso de litigio, escríbenos primero a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>: siempre buscamos una solución amistosa. Si eres consumidor, también puedes acudir gratuitamente al mediador de consumo indicado en el <Link href={L.href("/mentions-legales")}>aviso legal</Link>. A falta de acuerdo, serán competentes los tribunales que designe la ley.</p>
      </Sec>
    </LegalDoc>
  );
}

export default async function CGUPage() {
  const L = await getL();
  return L.es ? <CGUEs L={L} /> : L.en ? <CGUEn L={L} /> : <CGUFr />;
}
