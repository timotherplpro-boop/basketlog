import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
  return L.en
    ? pageMeta({ title: "Legal notice – Basketlog", description: "Basketlog legal notice: publisher, publication director, host, intellectual property and consumer mediation.", path: "/mentions-legales", L })
    : pageMeta({ title: "Mentions légales – Basketlog", description: "Mentions légales du site Basketlog : éditeur, directeur de la publication, hébergeur, propriété intellectuelle et médiation de la consommation.", path: "/mentions-legales" });
}

function MentionsLegalesFr() {
  const e = LEGAL.editeur;
  return (
    <LegalDoc title="Mentions légales" path="/mentions-legales">
      <Sec n={1} title="Éditeur du site">
        <p>Le site {LEGAL.url.replace("https://", "")} (« Basketlog ») est édité par <b>{e.nom}</b>, {e.statut}, {e.adresse}.</p>
        <ul>
          <li>SIREN {e.siren} — SIRET {e.siret}, immatriculé au {e.registre}</li>
          <li>{e.tva}</li>
          <li>Contact : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        </ul>
        <p>Directeur de la publication : {LEGAL.directeur}.</p>
      </Sec>

      <Sec n={2} title="Hébergement">
        <p>Le site est hébergé par <b>{LEGAL.hebergeur.nom}</b>, {LEGAL.hebergeur.adresse}, téléphone {LEGAL.hebergeur.tel}, <a href={LEGAL.hebergeur.site} rel="noopener" target="_blank">vercel.com</a>.</p>
        <p>La base de données des avis est hébergée par {LEGAL.base.nom} (<a href={LEGAL.base.site} rel="noopener" target="_blank">supabase.com</a>), {LEGAL.base.detail}.</p>
        <p>Les paiements et les comptes abonnés sont gérés par {LEGAL.paiement.nom}, {LEGAL.paiement.adresse} (<a href={LEGAL.paiement.site} rel="noopener" target="_blank">whop.com</a>).</p>
      </Sec>

      <Sec n={3} title="Propriété intellectuelle">
        <p>Le nom Basketlog, le site, ses textes, son design, son code et son modèle d&apos;analyse appartiennent à {e.nom}. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite est interdite.</p>
        <p>Les noms, logos et marques des équipes, de la NBA et de l&apos;EuroLeague appartiennent à leurs titulaires. Ils sont cités à titre purement informatif : Basketlog n&apos;est affilié ni à la NBA, ni à l&apos;EuroLeague, ni à aucun club. Les statistiques proviennent de flux publics (ESPN, EuroLeague). Les photos d&apos;illustration proviennent d&apos;Unsplash et sont utilisées selon la licence Unsplash.</p>
      </Sec>

      <Sec n={4} title="Pronostics et jeu responsable">
        <p>Basketlog est un outil d&apos;analyse statistique. Ce n&apos;est ni un opérateur de jeux d&apos;argent ni un service de conseil en paris : aucune mise n&apos;est possible sur le site et aucune probabilité n&apos;est une garantie. Le service est réservé aux personnes majeures (18 ans et plus).</p>
        <p>Les jeux d&apos;argent comportent des risques : endettement, dépendance… Si tu as besoin d&apos;aide : {LEGAL.jeu.nom}, {LEGAL.jeu.tel} (appel non surtaxé), <a href={LEGAL.jeu.site} rel="noopener" target="_blank">joueurs-info-service.fr</a>.</p>
      </Sec>

      <Sec n={5} title="Signalement, réclamations et médiation">
        <p>Pour signaler un contenu illicite ou faire une réclamation : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
        <p>Conformément aux articles L611-1 et suivants du Code de la consommation, si un litige n&apos;est pas résolu après une réclamation écrite à cette adresse, tu peux recourir gratuitement au médiateur de la consommation : <b>{LEGAL.mediateur.nom}</b>, {LEGAL.mediateur.adresse}, <a href={LEGAL.mediateur.site} rel="noopener" target="_blank">cm2c.net</a>. La demande doit être faite dans l&apos;année qui suit ta réclamation écrite.</p>
      </Sec>

      <Sec n={6} title="Données personnelles et cookies">
        <p>La collecte et l&apos;utilisation de tes données sont décrites dans la <Link href="/confidentialite">politique de confidentialité</Link> et la <Link href="/cookies">politique de cookies</Link>.</p>
      </Sec>
    </LegalDoc>
  );
}

const NOTE_EN = "This English version is a translation provided for convenience. In case of any discrepancy, the French version prevails.";

function MentionsLegalesEn({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc title="Legal notice" path="/mentions-legales" intro={NOTE_EN} L={L}>
      <Sec n={1} title="Publisher">
        <p>The website {LEGAL.url.replace("https://", "")} (“Basketlog”) is published by <b>{e.nom}</b>, sole proprietor (French micro-entreprise), {e.adresse}.</p>
        <ul>
          <li>SIREN {e.siren} — SIRET {e.siret}, registered with the French national business register (RNE)</li>
          <li>VAT not applicable, article 293 B of the French General Tax Code</li>
          <li>Contact: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        </ul>
        <p>Publication director: {LEGAL.directeur}.</p>
      </Sec>

      <Sec n={2} title="Hosting">
        <p>The website is hosted by <b>{LEGAL.hebergeur.nom}</b>, 440 North Barranca Avenue, Suite 4133, Covina, CA 91723, United States, phone {LEGAL.hebergeur.tel}, <a href={LEGAL.hebergeur.site} rel="noopener" target="_blank">vercel.com</a>.</p>
        <p>The reviews database is hosted by {LEGAL.base.nom} (<a href={LEGAL.base.site} rel="noopener" target="_blank">supabase.com</a>), with data stored in the AWS Paris region (eu-west-3).</p>
        <p>Payments and subscriber accounts are handled by {LEGAL.paiement.nom}, 300 Kent Avenue #401, Brooklyn, NY 11249, United States (<a href={LEGAL.paiement.site} rel="noopener" target="_blank">whop.com</a>).</p>
      </Sec>

      <Sec n={3} title="Intellectual property">
        <p>The Basketlog name, the website, its texts, design, code and analysis model belong to {e.nom}. Any full or partial reproduction or reuse without written permission is prohibited.</p>
        <p>Team, NBA and EuroLeague names, logos and trademarks belong to their respective owners. They are mentioned for information only: Basketlog is not affiliated with the NBA, the EuroLeague or any club. Statistics come from public feeds (ESPN, EuroLeague). Illustration photos come from Unsplash and are used under the Unsplash license.</p>
      </Sec>

      <Sec n={4} title="Predictions and responsible gambling">
        <p>Basketlog is a statistical analysis tool. It is neither a gambling operator nor a betting advice service: no bets can be placed on the website and no probability is a guarantee. The service is reserved for adults (18 and over).</p>
        <p>Gambling involves risks such as debt and addiction. If you need help in France: {LEGAL.jeu.nom}, {LEGAL.jeu.tel} (standard rate), <a href={LEGAL.jeu.site} rel="noopener" target="_blank">joueurs-info-service.fr</a>. Elsewhere, contact your local gambling helpline.</p>
      </Sec>

      <Sec n={5} title="Reporting, complaints and mediation">
        <p>To report illegal content or make a complaint: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
        <p>In accordance with articles L611-1 et seq. of the French Consumer Code, if a dispute is not resolved after a written complaint to this address, you can refer it free of charge to the consumer mediator: <b>{LEGAL.mediateur.nom}</b>, {LEGAL.mediateur.adresse}, France, <a href={LEGAL.mediateur.site} rel="noopener" target="_blank">cm2c.net</a>. The request must be made within one year of your written complaint.</p>
      </Sec>

      <Sec n={6} title="Personal data and cookies">
        <p>How your data is collected and used is described in the <Link href={L.href("/confidentialite")}>privacy policy</Link> and the <Link href={L.href("/cookies")}>cookie policy</Link>.</p>
      </Sec>
    </LegalDoc>
  );
}

export default async function MentionsLegalesPage() {
  const L = await getL();
  return L.en ? <MentionsLegalesEn L={L} /> : <MentionsLegalesFr />;
}
