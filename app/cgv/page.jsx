import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
  return L.en
    ? pageMeta({ title: "Terms of sale – Basketlog", description: "Terms of sale for Basketlog Starter, Pro and Lifetime: prices, payment, renewal, cancellation, withdrawal and refunds.", path: "/cgv", L })
    : pageMeta({ title: "Conditions générales de vente (CGV) – Basketlog", description: "Conditions générales de vente des abonnements Basketlog Starter, Pro et Lifetime : prix, paiement, renouvellement, résiliation, rétractation et remboursement.", path: "/cgv" });
}

const OFFRES = [
  ["Starter", "10 € par mois", "5 analyses complètes par jour", "Abonnement mensuel, renouvelé automatiquement chaque mois"],
  ["Pro", "19 € par mois", "Analyses complètes illimitées", "Abonnement mensuel, renouvelé automatiquement chaque mois"],
  ["Lifetime", "99 € une seule fois", "Analyses complètes illimitées, comme Pro", "Paiement unique, sans renouvellement, pour toute la durée d'exploitation du service"],
];

function CGVFr() {
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
        <p>Tu peux résilier à tout moment, en quelques clics, depuis ton compte Whop (<a href={LEGAL.paiement.commandes} rel="noopener" target="_blank">whop.com, rubrique Commandes</a>), ou en nous écrivant à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Pense à résilier au moins 24 heures avant la date de renouvellement. La résiliation prend effet à la fin de la période déjà payée : tu gardes l&apos;accès jusqu&apos;à cette date et aucun nouveau paiement n&apos;est prélevé. Une période commencée n&apos;est pas remboursée, ni en totalité ni au prorata.</p>
        <p>La formule Lifetime est un paiement unique : il n&apos;y a rien à résilier.</p>
      </Sec>

      <Sec n={6} title="Droit de rétractation et remboursement">
        <p>Les analyses Basketlog sont un contenu numérique fourni immédiatement, sans support matériel. Avant de payer, tu coches sur la page Pro la case par laquelle tu demandes l&apos;accès immédiat à tes analyses et tu reconnais perdre ainsi ton droit de rétractation de 14 jours, conformément à l&apos;article L221-28 13° du Code de la consommation. Ton accès est ouvert dès la confirmation du paiement.</p>
        <p>En conséquence, un achat n&apos;est pas remboursable une fois l&apos;accès ouvert, comme chez la plupart des services d&apos;analyse par abonnement. Cette règle ne limite pas les garanties légales (article 7) : en cas de problème technique qui t&apos;empêche d&apos;accéder au service, écris-nous et nous trouverons une solution (rétablissement, prolongation ou remboursement).</p>
        <p>Si, pour une raison quelconque, le paiement a été effectué sans que cette case ait été cochée, tu gardes ton droit de rétractation de 14 jours : il suffit de nous envoyer une déclaration claire à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> ou d&apos;utiliser le formulaire type ci-dessous.</p>
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

const OFFERS_EN = [
  ["Starter", "€10 per month", "5 full analyses per day", "Monthly subscription, renewed automatically every month"],
  ["Pro", "€19 per month", "Unlimited full analyses", "Monthly subscription, renewed automatically every month"],
  ["Lifetime", "€99 one-time", "Unlimited full analyses, same as Pro", "One-time payment, no renewal, for as long as the service is operated"],
];

function CGVEn({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Terms of sale"
      path="/cgv"
      L={L}
      intro="These terms of sale apply to any purchase of a paid Basketlog plan. They supplement the terms of use. They are available before every purchase and apply as soon as payment is confirmed. This English version is a translation provided for convenience; in case of any discrepancy, the French version prevails."
    >
      <Sec n={1} title="Seller">
        <p>{e.nom}, sole proprietor (French micro-entreprise), {e.adresse}. SIREN {e.siren} — SIRET {e.siret}, registered with the French national business register (RNE). VAT not applicable, article 293 B of the French General Tax Code. Contact: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
      </Sec>

      <Sec n={2} title="Plans and prices">
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Plan</th><th>Price</th><th>Content</th><th>Term</th></tr></thead>
            <tbody>{OFFERS_EN.map((o) => <tr key={o[0]}>{o.map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>A full analysis is the detailed page for a game: projected score, factors, scenarios, stat comparison, players to watch, recent form, head-to-head and injuries. Win probabilities and key figures remain free for everyone.</p>
        <p>Prices are in euros, with no additional fees from us (VAT not applicable). The total price is shown on the checkout page before you confirm. Prices may change; a price change never applies to a period already paid, and subscribers are notified before any increase.</p>
      </Sec>

      <Sec n={3} title="Ordering and payment">
        <p>Orders are placed from the <Link href={L.href("/pro")}>Basketlog Pro</Link> page, then on the secure checkout page of our provider {LEGAL.paiement.nom} (“Whop”). Payment is charged when the order is confirmed, then at each renewal for monthly subscriptions. We never see or store your bank details.</p>
        <p>Whop emails you your order confirmation and receipt. Purchasing implies acceptance of these terms of sale.</p>
      </Sec>

      <Sec n={4} title="Access to the service">
        <p>Access opens as soon as payment is confirmed: go back to the Pro page and log in with the same Whop account you paid with. Your plan is then activated automatically on Basketlog, on all your devices.</p>
      </Sec>

      <Sec n={5} title="Renewal and cancellation">
        <p>Starter and Pro subscriptions have no commitment. They renew automatically every month, on the anniversary date of the purchase, until cancelled.</p>
        <p>You can cancel at any time, in a few clicks, from your Whop account (<a href={LEGAL.paiement.commandes} rel="noopener" target="_blank">whop.com, Orders section</a>), or by emailing us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Remember to cancel at least 24 hours before the renewal date. Cancellation takes effect at the end of the period already paid: you keep access until that date and no new payment is taken. A started period is not refunded, either in full or pro rata.</p>
        <p>The Lifetime plan is a one-time payment: there is nothing to cancel.</p>
      </Sec>

      <Sec n={6} title="Right of withdrawal and refunds">
        <p>Basketlog analyses are digital content supplied immediately, without a physical medium. Before paying, you tick the box on the Pro page by which you request immediate access to your analyses and acknowledge that you thereby lose your 14-day right of withdrawal, in accordance with article L221-28 13° of the French Consumer Code. Your access opens as soon as payment is confirmed.</p>
        <p>As a result, a purchase is not refundable once access has opened, as with most subscription analysis services. This rule does not limit the legal guarantees (article 7): if a technical problem prevents you from accessing the service, email us and we will find a solution (restoring access, an extension or a refund).</p>
        <p>If, for any reason, payment was made without this box being ticked, you keep your 14-day right of withdrawal: just send us a clear statement at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a> or use the model form below.</p>
      </Sec>

      <Sec n={7} title="Legal guarantees">
        <p>You benefit from the legal guarantee of conformity applicable to digital content and services (articles L224-25-12 et seq. of the French Consumer Code) for as long as the service is supplied. In the event of a defect, email us: we restore the service or, failing that, grant you a price reduction or a refund, as provided by law. Nothing in these terms of sale limits these guarantees.</p>
        <p>Predictions are estimates: a prediction that doesn&apos;t come true is not a defect of the service (see article 3 of the <Link href={L.href("/cgu")}>terms of use</Link>).</p>
      </Sec>

      <Sec n={8} title="Customer service">
        <p>For any question, complaint or refund request: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We reply within 7 business days at the latest.</p>
      </Sec>

      <Sec n={9} title="Consumer mediation">
        <p>In accordance with articles L611-1 et seq. of the French Consumer Code, if your written complaint has not been resolved, you can refer it free of charge to the consumer mediator: <b>{LEGAL.mediateur.nom}</b>, {LEGAL.mediateur.adresse}, France, <a href={LEGAL.mediateur.site} rel="noopener" target="_blank">cm2c.net</a>, within one year of your complaint.</p>
      </Sec>

      <Sec n={10} title="Personal data">
        <p>Data related to your order is processed as described in the <Link href={L.href("/confidentialite")}>privacy policy</Link>.</p>
      </Sec>

      <Sec n={11} title="Governing law">
        <p>These terms of sale are governed by French law. If you live in another European Union country, you keep the protection of the mandatory rules of your country. Failing an amicable agreement, the competent courts are those designated by law.</p>
      </Sec>

      <Sec title="Appendix — Model withdrawal form">
        <p className="legal-form">
          To {e.nom} (Basketlog), {e.adresse}, {LEGAL.email}:<br /><br />
          I hereby give notice that I withdraw from my contract for the provision of the following service:<br />
          — Plan purchased: …………<br />
          — Ordered on: …………<br />
          — Name of consumer: …………<br />
          — Whop account email: …………<br />
          — Address of consumer: …………<br />
          — Date: …………<br />
          — Signature (only if sent on paper): …………
        </p>
      </Sec>
    </LegalDoc>
  );
}

export default async function CGVPage() {
  const L = await getL();
  return L.en ? <CGVEn L={L} /> : <CGVFr />;
}
