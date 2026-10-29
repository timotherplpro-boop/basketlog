import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";

export const metadata = pageMeta({
  title: "Conditions générales de vente (CGV) – Basketlog",
  description: "Conditions générales de vente des abonnements Basketlog Starter, Pro et Lifetime : prix, paiement, renouvellement, résiliation, rétractation et remboursement.",
  path: "/cgv",
});

const OFFRES = [
  ["Starter", "10 € par mois", "1 analyse complète par jour", "Abonnement mensuel, renouvelé automatiquement chaque mois"],
  ["Pro", "19 € par mois", "Analyses complètes illimitées", "Abonnement mensuel, renouvelé automatiquement chaque mois"],
  ["Lifetime", "99 € une seule fois", "Analyses complètes illimitées, comme Pro", "Paiement unique, sans renouvellement, pour toute la durée d'exploitation du service"],
];

export default function CGV() {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Conditions générales de vente"
      path="/cgv"
      intro="Les présentes conditions générales de vente (« CGV ») s'appliquent à tout achat d'une formule payante Basketlog. Elles complètent les conditions générales d'utilisation (CGU). Elles sont accessibles avant chaque achat et s'appliquent dès la validation du paiement."
    >
      <Sec n={1} title="Vendeur">
        <p>{e.nom}, {e.statut}, {e.adresse}. SIREN {e.siren} — SIRET {e.siret}, immatriculé au {e.registre}. {e.tva}. Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
      </Sec>

      <Sec n={2} title="Formules et prix">
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Formule</th><th>Prix</th><th>Contenu</th><th>Durée</th></tr></thead>
            <tbody>{OFFRES.map((o) => <tr key={o[0]}>{o.map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>Une analyse complète est la fiche détaillée d&apos;un match : score projeté, facteurs, scénarios, stats comparées, joueurs à suivre, forme récente, confrontations et absences. Les probabilités de victoire et les chiffres clés restent gratuits pour tous.</p>
        <p>Les prix sont en euros, sans frais supplémentaires de notre part ({e.tva.charAt(0).toLowerCase() + e.tva.slice(1)}). Le prix total est affiché sur la page de paiement avant validation. Les prix peuvent évoluer ; un changement de prix ne s&apos;applique jamais à une période déjà payée, et les abonnés sont prévenus avant toute hausse.</p>
      </Sec>

      <Sec n={3} title="Commande et paiement">
        <p>La commande se fait depuis la page <Link href="/pro">Basketlog Pro</Link>, puis sur la page de paiement sécurisée de notre prestataire {LEGAL.paiement.nom} (« Whop »). Le paiement est débité à la validation de la commande, puis à chaque renouvellement pour les abonnements mensuels. Nous ne voyons ni ne stockons tes données bancaires.</p>
        <p>Whop t&apos;envoie par e-mail la confirmation de ta commande et ton reçu. L&apos;achat vaut acceptation des présentes CGV.</p>
      </Sec>

      <Sec n={4} title="Accès au service">
        <p>L&apos;accès est ouvert dès la confirmation du paiement : reviens sur la page Pro et clique sur « Me connecter avec Whop » avec le même compte Whop que pour le paiement. Ta formule est alors activée automatiquement sur Basketlog, sur tous tes appareils.</p>
      </Sec>

      <Sec n={5} title="Renouvellement et résiliation">
        <p>Les abonnements Starter et Pro sont sans engagement. Ils se renouvellent automatiquement chaque mois, à la date anniversaire de l&apos;achat, jusqu&apos;à leur résiliation.</p>
        <p>Tu peux résilier à tout moment, en quelques clics, depuis ton compte Whop (<a href={LEGAL.paiement.commandes} rel="noopener" target="_blank">whop.com, rubrique Commandes</a>), ou en nous écrivant à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. La résiliation prend effet à la fin de la période déjà payée : tu gardes l&apos;accès jusqu&apos;à cette date et aucun nouveau paiement n&apos;est prélevé. Hors droit de rétractation (article 6), une période commencée n&apos;est pas remboursée au prorata.</p>
        <p>La formule Lifetime est un paiement unique : il n&apos;y a rien à résilier.</p>
      </Sec>

      <Sec n={6} title="Droit de rétractation et remboursement">
        <p>Tu disposes d&apos;un délai de <b>14 jours</b> à compter de ton achat pour te rétracter, sans avoir à te justifier, y compris si tu as déjà commencé à utiliser le service. Nous te remboursons alors <b>intégralement</b>, sans déduction, au plus tard 14 jours après ta demande, avec le moyen de paiement utilisé pour l&apos;achat. Ton accès payant prend fin au remboursement.</p>
        <p>Pour te rétracter, envoie-nous une déclaration claire à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> (en indiquant l&apos;e-mail de ton compte Whop), ou utilise le formulaire type ci-dessous. Ce droit s&apos;applique au premier achat de chaque formule ; les renouvellements mensuels suivants n&apos;ouvrent pas de nouveau délai.</p>
      </Sec>

      <Sec n={7} title="Garanties légales">
        <p>Tu bénéficies de la garantie légale de conformité applicable aux contenus et services numériques (articles L224-25-12 et suivants du Code de la consommation) pendant toute la durée de fourniture du service. En cas de défaut, écris-nous : nous rétablissons le service, ou à défaut nous t&apos;accordons une réduction de prix ou un remboursement, comme le prévoit la loi. Rien dans les CGV ne limite ces garanties.</p>
        <p>Les pronostics sont des estimations : un pronostic qui ne se réalise pas n&apos;est pas un défaut du service (voir l&apos;article 3 des <Link href="/cgu">CGU</Link>).</p>
      </Sec>

      <Sec n={8} title="Service client">
        <p>Pour toute question, réclamation ou demande de remboursement : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Nous répondons sous 7 jours ouvrés au plus tard.</p>
      </Sec>

      <Sec n={9} title="Médiation de la consommation">
        <p>Conformément aux articles L611-1 et suivants du Code de la consommation, si ta réclamation écrite n&apos;a pas été résolue, tu peux recourir gratuitement au médiateur de la consommation : <b>{LEGAL.mediateur.nom}</b>, {LEGAL.mediateur.adresse}, <a href={LEGAL.mediateur.site} rel="noopener" target="_blank">cm2c.net</a>, dans l&apos;année qui suit ta réclamation.</p>
      </Sec>

      <Sec n={10} title="Données personnelles">
        <p>Les données liées à ta commande sont traitées comme indiqué dans la <Link href="/confidentialite">politique de confidentialité</Link>.</p>
      </Sec>

      <Sec n={11} title="Droit applicable">
        <p>Les CGV sont soumises au droit français. Si tu résides dans un autre pays de l&apos;Union européenne, tu gardes la protection des règles impératives de ton pays. À défaut d&apos;accord amiable, les tribunaux compétents sont ceux désignés par la loi.</p>
      </Sec>

      <Sec title="Annexe — Formulaire type de rétractation">
        <p className="legal-form">
          À l&apos;attention de {e.nom} (Basketlog), {e.adresse}, {LEGAL.email} :<br /><br />
          Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous :<br />
          — Formule souscrite : …………<br />
          — Commandée le : …………<br />
          — Nom du consommateur : …………<br />
          — E-mail du compte Whop : …………<br />
          — Adresse du consommateur : …………<br />
          — Date : …………<br />
          — Signature (uniquement en cas d&apos;envoi papier) : …………
        </p>
      </Sec>
    </LegalDoc>
  );
}
