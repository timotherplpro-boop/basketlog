import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";

export const metadata = pageMeta({
  title: "Mentions légales – Basketlog",
  description: "Mentions légales du site Basketlog : éditeur, directeur de la publication, hébergeur, propriété intellectuelle et médiation de la consommation.",
  path: "/mentions-legales",
});

export default function MentionsLegales() {
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
