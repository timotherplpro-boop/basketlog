import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
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
        <p>Une partie du service est gratuite : les probabilités de victoire et les chiffres clés de chaque match, le classement, les fiches équipes et le bilan du modèle. Avec un compte gratuit, tu débloques 1 analyse complète par jour. Au-delà, les analyses complètes sont réservées aux abonnés Starter (5 par jour), Pro et Lifetime (illimitées), dans les conditions prévues par les <Link href="/cgv">CGV</Link>.</p>
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
        <p>Le site est accessible sans inscription. Le compte gratuit, créé avec un compte Whop (par e-mail, Google ou Apple), donne en plus 1 analyse complète par jour. Les abonnés se connectent avec le compte Whop utilisé lors du paiement. Nous ne recevons jamais ton mot de passe : seulement ton identifiant Whop, ton nom d&apos;utilisateur et la formule à laquelle tu as accès. Tu peux supprimer ton compte gratuit à tout moment en nous écrivant.</p>
        <p>Ton accès est personnel. Il est interdit de le partager, de le revendre ou de le prêter. Tu es responsable de la sécurité de ton compte Whop.</p>
      </Sec>

      <Sec n={5} title="Avis des utilisateurs">
        <p>Tu peux publier un avis sur Basketlog (prénom, description facultative, note et texte). Chaque avis est relu avant publication et peut être refusé s&apos;il est injurieux, hors sujet, publicitaire ou illicite. En publiant un avis, tu nous autorises à l&apos;afficher sur le site, sans contrepartie. Tu peux en demander la suppression à tout moment.</p>
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
        <p>Part of the service is free: win probabilities and key figures for every game, the standings, team pages and the model&apos;s track record. With a free account, you unlock 1 full analysis per day. Beyond that, full analyses are reserved for Starter (5 per day), Pro and Lifetime (unlimited) subscribers, under the conditions set out in the <Link href={L.href("/cgv")}>terms of sale</Link>.</p>
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
        <p>The website can be used without signing up. The free account, created with a Whop account (by email, Google or Apple), also gives you 1 full analysis per day. Subscribers log in with the Whop account used for payment. We never receive your password: only your Whop ID, your username and the plan you have access to. You can delete your free account at any time by emailing us.</p>
        <p>Your access is personal. Sharing, reselling or lending it is prohibited. You are responsible for the security of your Whop account.</p>
      </Sec>

      <Sec n={5} title="User reviews">
        <p>You can post a review of Basketlog (first name, optional description, rating and text). Every review is checked before publication and may be rejected if it is abusive, off-topic, promotional or illegal. By posting a review, you allow us to display it on the website, free of charge. You can ask for it to be removed at any time.</p>
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

export default async function CGUPage() {
  const L = await getL();
  return L.en ? <CGUEn L={L} /> : <CGUFr />;
}
