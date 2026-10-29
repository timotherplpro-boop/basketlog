import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";

export const metadata = pageMeta({
  title: "Conditions générales d'utilisation (CGU) – Basketlog",
  description: "Conditions générales d'utilisation de Basketlog : description du service, âge minimum, avertissement sur les pronostics, règles d'usage et responsabilité.",
  path: "/cgu",
});

export default function CGU() {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Conditions générales d'utilisation"
      path="/cgu"
      intro={`Les présentes conditions générales d'utilisation (« CGU ») encadrent l'accès et l'utilisation du site Basketlog, édité par ${e.nom} (« nous »). En utilisant le site, tu acceptes les CGU et la politique de confidentialité. Les abonnements payants sont en plus régis par les conditions générales de vente (CGV).`}
    >
      <Sec n={1} title="Le service">
        <p>Basketlog analyse les matchs de NBA et d&apos;EuroLeague. Le site rassemble des données statistiques publiques (résultats, classements, scores, absences, calendrier) et les passe dans un modèle de calcul qui produit, pour chaque match, des probabilités de victoire, un score projeté, des scénarios et une analyse rédigée automatiquement.</p>
        <p>Une partie du service est gratuite : les probabilités de victoire et les chiffres clés de chaque match, le classement, les fiches équipes et le bilan du modèle. Les analyses complètes sont réservées aux abonnés Starter, Pro et Lifetime, dans les conditions prévues par les <Link href="/cgv">CGV</Link>.</p>
      </Sec>

      <Sec n={2} title="Âge minimum">
        <p>Le service est réservé aux personnes âgées d&apos;au moins 18 ans et capables de contracter. En t&apos;abonnant, tu déclares remplir ces conditions. Si nous apprenons qu&apos;un abonné est mineur, nous pouvons mettre fin à son accès.</p>
      </Sec>

      <Sec n={3} title="Avertissement sur les pronostics">
        <p>Les probabilités, scores projetés et analyses sont des estimations statistiques fournies à titre informatif et de divertissement. Ils peuvent être faux, incomplets ou reposer sur des données dépassées (par exemple une absence annoncée tardivement). Ils ne constituent ni une garantie de résultat, ni un conseil de pari, ni un conseil financier.</p>
        <p>Basketlog n&apos;est pas un opérateur de jeux d&apos;argent : aucune mise n&apos;est possible sur le site. Si tu utilises nos contenus pour parier ailleurs, tu le fais sous ta seule responsabilité et dans le respect des lois de ton pays. Les jeux d&apos;argent comportent des risques : {LEGAL.jeu.nom}, {LEGAL.jeu.tel} (appel non surtaxé).</p>
        <p>Le taux de réussite du modèle est publié en toute transparence sur la page <Link href="/app/bilan">Bilan</Link>. Les résultats passés ne préjugent pas des résultats futurs.</p>
      </Sec>

      <Sec n={4} title="Accès et compte abonné">
        <p>Le site est accessible sans inscription. Pour les abonnés, la connexion se fait avec le compte Whop utilisé lors du paiement (« Me connecter avec Whop »). Nous ne recevons jamais ton mot de passe Whop : seulement ton identifiant Whop, ton nom d&apos;utilisateur et la formule à laquelle tu as accès.</p>
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
