import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";

export const metadata = pageMeta({
  title: "Politique de confidentialité – Basketlog",
  description: "Quelles données Basketlog collecte, pourquoi, avec quels prestataires, combien de temps elles sont conservées et comment exercer tes droits (RGPD).",
  path: "/confidentialite",
});

const DONNEES = [
  ["Navigation", "Adresse IP, navigateur, pages demandées, date et heure (journaux techniques de l'hébergeur)", "Faire fonctionner et sécuriser le site", "Intérêt légitime", "Quelques semaines, selon la durée de rétention de Vercel"],
  ["Mesure d'audience (si tu l'acceptes)", "Pages vues, clics, durée et nombre de visites, type d'appareil, pays et ville approximatifs, identifiant aléatoire stocké dans un cookie", "Comprendre l'usage du site et l'améliorer", "Consentement", "Cookies : 12 mois maximum ; statistiques : 25 mois maximum"],
  ["Abonnés", "Identifiant et nom d'utilisateur Whop, formule active, date de vérification", "Activer ta formule et vérifier ton abonnement", "Exécution du contrat", "Tant que ton abonnement est actif, puis 3 ans"],
  ["Paiement", "Données de paiement et de facturation (traitées directement par Whop, jamais par Basketlog)", "Encaisser les paiements, établir les reçus", "Exécution du contrat, obligation légale", "10 ans pour les pièces comptables"],
  ["Avis", "Prénom, description facultative, note, texte de l'avis", "Publier les avis après relecture", "Consentement", "Jusqu'à ta demande de suppression"],
  ["Contact", "Adresse e-mail et contenu de tes messages", "Répondre à tes demandes", "Intérêt légitime", "3 ans après le dernier échange"],
];

const PRESTATAIRES = [
  ["Vercel Inc. (États-Unis)", "Hébergement du site et des serveurs"],
  ["Supabase (région de Paris, UE)", "Base de données des avis"],
  ["Whop, Inc. (États-Unis)", "Paiement, gestion des abonnements, connexion des abonnés"],
  ["Amplitude, Inc. (données dans l'UE)", "Mesure d'audience, uniquement avec ton accord"],
  ["Zoho Corporation (données dans l'UE)", "Messagerie de l'adresse de contact"],
];

export default function Confidentialite() {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Politique de confidentialité"
      path="/confidentialite"
      intro="Cette politique explique quelles données personnelles Basketlog collecte, pourquoi, avec qui elles sont partagées, combien de temps elles sont gardées et comment exercer tes droits. Basketlog ne vend aucune donnée et ne fait aucune publicité ciblée."
    >
      <Sec n={1} title="Responsable du traitement">
        <p>{e.nom}, {e.statut}, {e.adresse} (SIRET {e.siret}). Contact pour toute question sur tes données : <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
      </Sec>

      <Sec n={2} title="Les données collectées et pourquoi">
        <p>Tu peux consulter Basketlog sans créer de compte. Nous collectons seulement ce qui est nécessaire :</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Quand</th><th>Données</th><th>Pourquoi</th><th>Base légale</th><th>Durée</th></tr></thead>
            <tbody>{DONNEES.map((d) => <tr key={d[0]}>{d.map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>Le nombre d&apos;analyses consultées chaque jour est compté dans ton navigateur (stockage local) et n&apos;est pas envoyé à nos serveurs. Si tu es abonné et que tu acceptes la mesure d&apos;audience, ton identifiant Whop et ta formule sont associés à tes statistiques d&apos;usage, pour savoir quelles fonctionnalités servent le plus.</p>
      </Sec>

      <Sec n={3} title="Paiement et comptes abonnés">
        <p>Le paiement est réalisé sur la page sécurisée de Whop. Basketlog ne reçoit jamais ton numéro de carte. Lorsque tu te connectes avec Whop, nous recevons seulement ton identifiant, ton nom d&apos;utilisateur et la formule à laquelle tu as accès. Whop traite tes données selon sa propre <a href={LEGAL.paiement.confidentialite} rel="noopener" target="_blank">politique de confidentialité</a>.</p>
      </Sec>

      <Sec n={4} title="Prestataires">
        <p>Nous partageons des données uniquement avec les prestataires nécessaires au service, qui agissent pour notre compte :</p>
        <ul>{PRESTATAIRES.map(([n, r]) => <li key={n}><b>{n}</b> : {r}</li>)}</ul>
        <p>Pour les statistiques sportives (ESPN, EuroLeague) et la rédaction automatique des analyses, nous n&apos;envoyons que des données de matchs, jamais tes données personnelles. Les logos des équipes et certaines photos (Unsplash) sont chargés depuis les serveurs de ces services, qui reçoivent donc ton adresse IP comme pour tout site web. Les polices d&apos;écriture sont hébergées par Basketlog.</p>
      </Sec>

      <Sec n={5} title="Transferts hors de l'Union européenne">
        <p>Vercel et Whop sont établis aux États-Unis. Les transferts vers ces prestataires reposent sur les garanties prévues par le RGPD : décision d&apos;adéquation de la Commission européenne pour les entreprises certifiées au cadre de protection des données UE–États-Unis, ou clauses contractuelles types de la Commission européenne.</p>
      </Sec>

      <Sec n={6} title="Sécurité">
        <p>Les échanges avec le site sont chiffrés (HTTPS). La session des abonnés est stockée dans un cookie signé, inaccessible aux scripts de la page, et revérifiée régulièrement auprès de Whop. L&apos;accès aux données est limité à l&apos;éditeur. Aucun système n&apos;est infaillible, mais nous corrigeons au plus vite tout problème signalé.</p>
      </Sec>

      <Sec n={7} title="Tes droits">
        <p>Conformément au RGPD et à la loi Informatique et Libertés, tu peux à tout moment :</p>
        <ul>
          <li>accéder à tes données et en obtenir une copie ;</li>
          <li>les faire rectifier ou effacer ;</li>
          <li>t&apos;opposer à leur traitement ou en demander la limitation ;</li>
          <li>récupérer les données que tu nous as fournies dans un format lisible (portabilité) ;</li>
          <li>retirer ton consentement à la mesure d&apos;audience, à tout moment, avec le lien « Gérer mes cookies » en bas de chaque page ;</li>
          <li>définir des directives sur le sort de tes données après ton décès.</li>
        </ul>
        <p>Écris-nous à <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Nous répondons sous un mois au plus. Tu peux aussi introduire une réclamation auprès de la CNIL : <a href="https://www.cnil.fr" rel="noopener" target="_blank">cnil.fr</a>.</p>
      </Sec>

      <Sec n={8} title="Mineurs">
        <p>Basketlog est réservé aux personnes de 18 ans et plus. Nous ne collectons pas sciemment de données de mineurs. Si tu penses qu&apos;un mineur nous a transmis des données, écris-nous : nous les supprimerons.</p>
      </Sec>

      <Sec n={9} title="Cookies">
        <p>Les cookies et autres traceurs utilisés, et la façon de les gérer, sont détaillés dans la <Link href="/cookies">politique de cookies</Link>.</p>
      </Sec>

      <Sec n={10} title="Modifications">
        <p>Cette politique peut évoluer avec le service ou la loi. La date de mise à jour figure en haut de la page. En cas de changement important, nous te prévenons sur le site.</p>
      </Sec>
    </LegalDoc>
  );
}
