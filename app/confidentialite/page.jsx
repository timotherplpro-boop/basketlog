import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";
import { aiReady, aiVendor } from "../../lib/pro";
import { googleReady } from "../../lib/google-auth";
import { mailReady } from "../../lib/mail";

// Prestataire d'IA réellement branché (Anthropic en direct, ou modèle via Vercel AI Gateway).
const AI_TXT = {
  fr: { pays: "États-Unis", via: "via", q: "IA qui répond aux questions des abonnés", n: " et rédige l'argumentation des analyses" },
  en: { pays: "United States", via: "via", q: "AI that answers subscribers' questions", n: " and writes the analysis reasoning" },
  es: { pays: "Estados Unidos", via: "a través de", q: "IA que responde a las preguntas de los suscriptores", n: " y redacta la argumentación de los análisis" },
};
// Lignes réservées à un service réellement branché : « ia » (IA), « google » (connexion avec Google), « mail » (envoi d'e-mails).
const on = (f) => !f || (f === "ia" ? aiReady() : f === "google" ? googleReady() : f === "mail" ? mailReady() : true);
const withAi = (lang) => ([n, r, f]) => {
  if (f !== "ia") return [n, r];
  const v = aiVendor(), t = AI_TXT[lang];
  return [`${v.name} (${t.pays})${v.via ? `, ${t.via} ${v.via}` : ""}`, t.q + (v.narrative ? t.n : "")];
};

export async function generateMetadata() {
  const L = await getL();
  if (L.es) return pageMeta({ title: "Política de privacidad – Basketlog", description: "Qué datos recoge Basketlog, por qué, con qué proveedores, cuánto tiempo se conservan y cómo ejercer tus derechos (RGPD).", path: "/confidentialite", L });
  return L.en
    ? pageMeta({ title: "Privacy policy – Basketlog", description: "What data Basketlog collects, why, with which providers, how long it is kept and how to exercise your rights (GDPR).", path: "/confidentialite", L })
    : pageMeta({ title: "Politique de confidentialité – Basketlog", description: "Quelles données Basketlog collecte, pourquoi, avec quels prestataires, combien de temps elles sont conservées et comment exercer tes droits (RGPD).", path: "/confidentialite" });
}

const DONNEES = [
  ["Navigation", "Adresse IP, navigateur, pages demandées, date et heure (journaux techniques de l'hébergeur)", "Faire fonctionner et sécuriser le site", "Intérêt légitime", "Quelques semaines, selon la durée de rétention de Vercel"],
  ["Mesure d'audience (si tu l'acceptes)", "Pages vues, clics, durée et nombre de visites, type d'appareil, pays et ville approximatifs, identifiant aléatoire stocké dans un cookie", "Comprendre l'usage du site et l'améliorer", "Consentement", "Cookies : 12 mois maximum ; statistiques : 25 mois maximum"],
  ["Compte Basketlog", "Adresse e-mail, empreinte du mot de passe (jamais le mot de passe lui-même) ou, avec Google, identifiant du compte Google et prénom ; langue, dates de création et de dernière connexion", "Créer ton compte, te connecter et te reconnaître sur tous tes appareils", "Exécution du contrat", "Tant que ton compte existe (suppression immédiate depuis Mon compte)"],
  ["Abonnés", "Identifiant et nom d'utilisateur du compte Whop relié après le paiement, formule active, date de vérification", "Activer ta formule et vérifier ton abonnement", "Exécution du contrat", "Tant que ton compte existe, puis 3 ans"],
  ["Mot de passe oublié", "Adresse e-mail ; lien à usage unique, gardé seulement sous forme d'empreinte", "T'envoyer un lien pour choisir un nouveau mot de passe", "Exécution du contrat", "1 heure (le lien), puis effacé", "mail"],
  ["E-mails de Basketlog (si tu les acceptes)", "Adresse e-mail, langue, date de ton accord", "T'envoyer les analyses et les offres de Basketlog", "Consentement, retirable à tout moment depuis Mon compte", "Jusqu'au retrait de ton accord ou à la suppression de ton compte"],
  ["Sécurité des connexions", "Empreinte de l'adresse IP et de l'adresse e-mail utilisées, nombre d'essais", "Limiter les essais de connexion, d'inscription et de mot de passe oublié", "Intérêt légitime", "2 jours"],
  ["Analyses lancées", "Identifiant de ton compte, match analysé, date et heure de l'analyse", "Appliquer la limite d'analyses du jour de ta formule et afficher ton historique", "Exécution du contrat", "12 mois"],
  ["Questions à l'IA", "Texte de ta question et données du match, transmis à l'IA pour obtenir la réponse ; nombre de questions posées par jour", "Répondre à tes questions et appliquer la limite de ta formule", "Exécution du contrat", "Texte non conservé par Basketlog ; compteur : 90 jours", "ia"],
  ["Paiement", "Données de paiement et de facturation (traitées directement par Whop, jamais par Basketlog)", "Encaisser les paiements, établir les reçus", "Exécution du contrat, obligation légale", "10 ans pour les pièces comptables"],
  ["Avis (abonnés)", "Prénom, description facultative, note, texte de l'avis ; identifiant du compte et formule au moment de l'avis, jamais affichés", "Publier les avis des abonnés après relecture (un par compte), avec la mention « Abonné vérifié »", "Consentement", "Jusqu'à ta demande de suppression"],
  ["Accès créateur ou admin (sur invitation)", "Identifiant et nom du compte, rôle, nom noté sur l'invitation, date d'activation", "Ouvrir l'accès complet offert aux créateurs partenaires et aux administrateurs", "Exécution du contrat", "Jusqu'au retrait de l'accès"],
  ["Contact", "Adresse e-mail et contenu de tes messages", "Répondre à tes demandes", "Intérêt légitime", "3 ans après le dernier échange"],
];

const PRESTATAIRES = [
  ["Vercel Inc. (États-Unis)", "Hébergement du site et des serveurs"],
  ["Supabase (Irlande, UE)", "Base de données des comptes, des avis et des analyses lancées"],
  ["Whop, Inc. (États-Unis)", "Paiement, gestion des abonnements, connexion des abonnés"],
  ["Google LLC (États-Unis)", "Connexion avec Google, seulement si tu la choisis : nous recevons ton adresse e-mail, ton prénom et l'identifiant de ton compte Google", "google"],
  ["Resend, Inc. (États-Unis)", "Envoi des e-mails du site (lien pour choisir un nouveau mot de passe)", "mail"],
  ["Amplitude, Inc. (données dans l'UE)", "Mesure d'audience, uniquement avec ton accord"],
  ["Zoho Corporation (données dans l'UE)", "Messagerie de l'adresse de contact"],
  ["Anthropic, PBC (États-Unis)", "IA qui répond aux questions des abonnés et rédige l'argumentation des analyses", "ia"],
];

function ConfidentialiteFr() {
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
            <tbody>{DONNEES.filter((d) => on(d[5])).map((d) => <tr key={d[0]}>{d.slice(0, 5).map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>Les analyses complètes que tu lances avec ton compte sont enregistrées avec l&apos;identifiant de ton compte, pour appliquer la limite du jour de ta formule sur tous tes appareils et t&apos;afficher ton historique. Si tu acceptes la mesure d&apos;audience, l&apos;identifiant de ton compte et ta formule sont associés à tes statistiques d&apos;usage, pour savoir quelles fonctionnalités servent le plus.</p>
      </Sec>

      <Sec n={3} title="Ton compte, le paiement et les abonnés">
        <p>Tu crées ton compte Basketlog avec ton adresse e-mail et un mot de passe{googleReady() ? <>, ou avec ton compte Google</> : null}. Le mot de passe n&apos;est jamais conservé : seule une empreinte (scrypt, avec un sel aléatoire) est gardée, qui permet de le vérifier sans pouvoir le retrouver.{googleReady() ? <> Avec Google, nous recevons seulement ton adresse e-mail (et si Google l&apos;a vérifiée), ton prénom et l&apos;identifiant de ton compte Google : ni tes contacts, ni tes fichiers, ni ton mot de passe Google.</> : null} Les e-mails de Basketlog (analyses, offres) ne te sont envoyés que si tu l&apos;acceptes dans <Link href="/app/compte">Mon compte</Link>.</p>
        <p>Le paiement est réalisé sur la page sécurisée de Whop. Basketlog ne reçoit jamais ton numéro de carte. Après le paiement, tu relies à ton compte le compte Whop utilisé pour payer : nous recevons seulement son identifiant, son nom d&apos;utilisateur et la formule à laquelle il donne accès. Whop traite tes données selon sa propre <a href={LEGAL.paiement.confidentialite} rel="noopener" target="_blank">politique de confidentialité</a>.</p>
      </Sec>

      <Sec n={4} title="Prestataires">
        <p>Nous partageons des données uniquement avec les prestataires nécessaires au service, qui agissent pour notre compte :</p>
        <ul>{PRESTATAIRES.filter(([, , f]) => on(f)).map(withAi("fr")).map(([n, r]) => <li key={n}><b>{n}</b> : {r}</li>)}</ul>
        <p>Pour les statistiques sportives (ESPN, EuroLeague) et la rédaction automatique des analyses, nous n&apos;envoyons que des données de matchs, jamais tes données personnelles. Les logos des équipes et certaines photos (Unsplash) sont chargés depuis les serveurs de ces services, qui reçoivent donc ton adresse IP comme pour tout site web. Les polices d&apos;écriture sont hébergées par Basketlog.</p>
      </Sec>

      <Sec n={5} title="Transferts hors de l'Union européenne">
        <p>Vercel, Whop{googleReady() ? ", Google" : ""}{mailReady() ? " et Resend" : ""} sont établis aux États-Unis. Les transferts vers ces prestataires reposent sur les garanties prévues par le RGPD : décision d&apos;adéquation de la Commission européenne pour les entreprises certifiées au cadre de protection des données UE–États-Unis, ou clauses contractuelles types de la Commission européenne.</p>
      </Sec>

      <Sec n={6} title="Sécurité">
        <p>Les échanges avec le site sont chiffrés (HTTPS). La session est stockée dans un cookie signé, inaccessible aux scripts de la page, et revérifiée régulièrement (auprès de Whop pour les abonnements). Les mots de passe ne sont gardés que sous forme d&apos;empreinte et les essais de connexion sont limités ; changer de mot de passe déconnecte tes autres appareils. L&apos;accès aux données est limité à l&apos;éditeur. Aucun système n&apos;est infaillible, mais nous corrigeons au plus vite tout problème signalé.</p>
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
        <p>Depuis la page <Link href="/app/compte">Mon compte</Link>, tu peux aussi choisir ton nom affiché, changer ton mot de passe, accepter ou refuser les e-mails de Basketlog et supprimer ton compte toi-même : ton compte (adresse e-mail, mot de passe, connexion Google) et tes données Basketlog (historique d&apos;analyses, questions, avis, nom affiché) sont alors effacés immédiatement. Les données gérées par Whop (e-mail, moyens de paiement, factures) se suppriment depuis <a href="https://whop.com/@me/settings/" rel="noopener" target="_blank">tes réglages Whop</a>.</p>
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

const DATA_EN = [
  ["Browsing", "IP address, browser, pages requested, date and time (host's technical logs)", "Run and secure the website", "Legitimate interest", "A few weeks, depending on Vercel's retention period"],
  ["Audience measurement (if you accept it)", "Page views, clicks, visit length and count, device type, approximate country and city, random ID stored in a cookie", "Understand how the website is used and improve it", "Consent", "Cookies: 12 months maximum; statistics: 25 months maximum"],
  ["Basketlog account", "Email address, password hash (never the password itself) or, with Google, your Google account ID and first name; language, creation and last login dates", "Create your account, log you in and recognize you on all your devices", "Performance of the contract", "As long as your account exists (immediate deletion from My account)"],
  ["Subscribers", "ID and username of the Whop account linked after payment, active plan, verification date", "Activate your plan and check your subscription", "Performance of the contract", "As long as your account exists, then 3 years"],
  ["Forgotten password", "Email address; single-use link, kept only as a hash", "Send you a link to choose a new password", "Performance of the contract", "1 hour (the link), then erased", "mail"],
  ["Basketlog emails (if you accept them)", "Email address, language, date of your consent", "Send you Basketlog's analyses and offers", "Consent, which you can withdraw at any time from My account", "Until you withdraw your consent or delete your account"],
  ["Login security", "Hash of the IP address and email address used, number of attempts", "Limit login, sign-up and forgotten-password attempts", "Legitimate interest", "2 days"],
  ["Analyses run", "Your account ID, game analyzed, date and time of the analysis", "Apply your plan's daily analysis limit and show your history", "Performance of the contract", "12 months"],
  ["Questions to the AI", "Your question and the game data, sent to the AI to get the answer; number of questions asked per day", "Answer your questions and apply your plan's limit", "Performance of the contract", "Basketlog does not keep the text; counter: 90 days", "ia"],
  ["Payment", "Payment and billing data (processed directly by Whop, never by Basketlog)", "Collect payments, issue receipts", "Performance of the contract, legal obligation", "10 years for accounting records"],
  ["Reviews (subscribers)", "First name, optional description, rating, review text; account ID and plan at the time of the review, never displayed", "Publish subscribers' reviews after they are checked (one per account), with a “Verified subscriber” label", "Consent", "Until you ask for removal"],
  ["Creator or admin access (by invitation)", "Account ID and name, role, name noted on the invitation, activation date", "Provide the free full access given to partner creators and administrators", "Performance of the contract", "Until the access is removed"],
  ["Contact", "Email address and content of your messages", "Reply to your requests", "Legitimate interest", "3 years after the last exchange"],
];

const PROVIDERS_EN = [
  ["Vercel Inc. (United States)", "Website and server hosting"],
  ["Supabase (Ireland, EU)", "Database for accounts, reviews and analyses run"],
  ["Whop, Inc. (United States)", "Payment, subscription management, subscriber login"],
  ["Google LLC (United States)", "Sign-in with Google, only if you choose it: we receive your email address, first name and Google account ID", "google"],
  ["Resend, Inc. (United States)", "Sending the website's emails (link to choose a new password)", "mail"],
  ["Amplitude, Inc. (data in the EU)", "Audience measurement, only with your consent"],
  ["Zoho Corporation (data in the EU)", "Email for the contact address"],
  ["Anthropic, PBC (United States)", "AI that answers subscribers' questions and writes the analysis reasoning", "ia"],
];

function ConfidentialiteEn({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Privacy policy"
      path="/confidentialite"
      L={L}
      intro="This policy explains what personal data Basketlog collects, why, who it is shared with, how long it is kept and how to exercise your rights. Basketlog sells no data and runs no targeted advertising. This English version is a translation provided for convenience; in case of any discrepancy, the French version prevails."
    >
      <Sec n={1} title="Data controller">
        <p>{e.nom}, sole proprietor (French micro-entreprise), {e.adresse} (SIRET {e.siret}). Contact for any question about your data: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
      </Sec>

      <Sec n={2} title="What data we collect and why">
        <p>You can browse Basketlog without creating an account. We only collect what is necessary:</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>When</th><th>Data</th><th>Why</th><th>Legal basis</th><th>Retention</th></tr></thead>
            <tbody>{DATA_EN.filter((d) => on(d[5])).map((d) => <tr key={d[0]}>{d.slice(0, 5).map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>The full analyses you run with your account are recorded with your account ID, to apply your plan&apos;s daily limit across all your devices and show your history. If you accept audience measurement, your account ID and plan are linked to your usage statistics, so we know which features are used most.</p>
      </Sec>

      <Sec n={3} title="Your account, payment and subscribers">
        <p>You create your Basketlog account with your email address and a password{googleReady() ? <>, or with your Google account</> : null}. The password is never stored: we only keep a hash (scrypt, with a random salt), which lets us check it without being able to recover it.{googleReady() ? <> With Google, we only receive your email address (and whether Google has verified it), your first name and your Google account ID: not your contacts, your files or your Google password.</> : null} Basketlog emails (analyses, offers) are only sent if you accept them in <Link href={L.href("/app/compte")}>My account</Link>.</p>
        <p>Payment is made on Whop&apos;s secure page. Basketlog never receives your card number. After paying, you link the Whop account you paid with to your account: we only receive its ID, its username and the plan it gives access to. Whop processes your data under its own <a href={LEGAL.paiement.confidentialite} rel="noopener" target="_blank">privacy policy</a>.</p>
      </Sec>

      <Sec n={4} title="Service providers">
        <p>We only share data with the providers needed to run the service, who act on our behalf:</p>
        <ul>{PROVIDERS_EN.filter(([, , f]) => on(f)).map(withAi("en")).map(([n, r]) => <li key={n}><b>{n}</b>: {r}</li>)}</ul>
        <p>For sports statistics (ESPN, EuroLeague) and the automatic writing of analyses, we only send game data, never your personal data. Team logos and some photos (Unsplash) are loaded from these services&apos; servers, which therefore receive your IP address as with any website. Fonts are hosted by Basketlog.</p>
      </Sec>

      <Sec n={5} title="Transfers outside the European Union">
        <p>Vercel, Whop{googleReady() ? ", Google" : ""}{mailReady() ? " and Resend" : ""} are based in the United States. Transfers to these providers rely on the safeguards provided by the GDPR: the European Commission&apos;s adequacy decision for companies certified under the EU–US Data Privacy Framework, or the European Commission&apos;s standard contractual clauses.</p>
      </Sec>

      <Sec n={6} title="Security">
        <p>Communication with the website is encrypted (HTTPS). The session is stored in a signed cookie that page scripts cannot access, and is regularly rechecked (with Whop for subscriptions). Passwords are only kept as hashes and login attempts are limited; changing your password logs out your other devices. Access to data is limited to the publisher. No system is foolproof, but we fix any reported issue as quickly as possible.</p>
      </Sec>

      <Sec n={7} title="Your rights">
        <p>Under the GDPR and the French Data Protection Act, you can at any time:</p>
        <ul>
          <li>access your data and get a copy of it;</li>
          <li>have it corrected or erased;</li>
          <li>object to its processing or ask for it to be restricted;</li>
          <li>get the data you provided to us in a readable format (portability);</li>
          <li>withdraw your consent to audience measurement at any time, with the “Manage cookies” link at the bottom of every page;</li>
          <li>set instructions for what happens to your data after your death.</li>
        </ul>
        <p>From the <Link href={L.href("/app/compte")}>My account</Link> page you can also choose your display name, change your password, accept or refuse Basketlog emails and delete your account yourself: your account (email address, password, Google sign-in) and your Basketlog data (analysis history, questions, review, display name) are then erased immediately. The data managed by Whop (email, payment methods, invoices) is deleted from <a href="https://whop.com/@me/settings/" rel="noopener" target="_blank">your Whop settings</a>.</p>
        <p>Email us at <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. We reply within one month at most. You can also lodge a complaint with the French data protection authority (CNIL): <a href="https://www.cnil.fr" rel="noopener" target="_blank">cnil.fr</a>, or with the authority of your country.</p>
      </Sec>

      <Sec n={8} title="Minors">
        <p>Basketlog is reserved for people aged 18 and over. We do not knowingly collect data from minors. If you think a minor has sent us data, email us: we will delete it.</p>
      </Sec>

      <Sec n={9} title="Cookies">
        <p>The cookies and other trackers used, and how to manage them, are detailed in the <Link href={L.href("/cookies")}>cookie policy</Link>.</p>
      </Sec>

      <Sec n={10} title="Changes">
        <p>This policy may change with the service or the law. The update date is shown at the top of the page. If there is a significant change, we will let you know on the website.</p>
      </Sec>
    </LegalDoc>
  );
}

const DATA_ES = [
  ["Navegación", "Dirección IP, navegador, páginas solicitadas, fecha y hora (registros técnicos del proveedor de alojamiento)", "Hacer funcionar y proteger el sitio", "Interés legítimo", "Unas semanas, según el periodo de conservación de Vercel"],
  ["Medición de audiencia (si la aceptas)", "Páginas vistas, clics, duración y número de visitas, tipo de dispositivo, país y ciudad aproximados, identificador aleatorio guardado en una cookie", "Entender el uso del sitio y mejorarlo", "Consentimiento", "Cookies: 12 meses como máximo; estadísticas: 25 meses como máximo"],
  ["Cuenta de Basketlog", "Correo electrónico, huella de la contraseña (nunca la contraseña en sí) o, con Google, identificador de la cuenta de Google y nombre; idioma, fechas de creación y de última conexión", "Crear tu cuenta, iniciar tu sesión y reconocerte en todos tus dispositivos", "Ejecución del contrato", "Mientras exista tu cuenta (eliminación inmediata desde Mi cuenta)"],
  ["Suscriptores", "Identificador y nombre de usuario de la cuenta de Whop vinculada tras el pago, plan activo, fecha de verificación", "Activar tu plan y verificar tu suscripción", "Ejecución del contrato", "Mientras exista tu cuenta y, después, 3 años"],
  ["Contraseña olvidada", "Correo electrónico; enlace de un solo uso, guardado solo como huella", "Enviarte un enlace para elegir una nueva contraseña", "Ejecución del contrato", "1 hora (el enlace), después se borra", "mail"],
  ["Correos de Basketlog (si los aceptas)", "Correo electrónico, idioma, fecha de tu consentimiento", "Enviarte los análisis y las ofertas de Basketlog", "Consentimiento, que puedes retirar en cualquier momento desde Mi cuenta", "Hasta que retires tu consentimiento o elimines tu cuenta"],
  ["Seguridad de los inicios de sesión", "Huella de la dirección IP y del correo usados, número de intentos", "Limitar los intentos de inicio de sesión, registro y contraseña olvidada", "Interés legítimo", "2 días"],
  ["Análisis realizados", "Identificador de tu cuenta, partido analizado, fecha y hora del análisis", "Aplicar el límite diario de análisis de tu plan y mostrar tu historial", "Ejecución del contrato", "12 meses"],
  ["Preguntas a la IA", "Tu pregunta y los datos del partido, enviados a la IA para obtener la respuesta; número de preguntas al día", "Responder a tus preguntas y aplicar el límite de tu plan", "Ejecución del contrato", "Basketlog no conserva el texto; contador: 90 días", "ia"],
  ["Pago", "Datos de pago y de facturación (tratados directamente por Whop, nunca por Basketlog)", "Cobrar los pagos y emitir los recibos", "Ejecución del contrato, obligación legal", "10 años para los documentos contables"],
  ["Opiniones (suscriptores)", "Nombre, descripción opcional, nota y texto de la opinión; identificador de la cuenta y plan en el momento de la opinión, nunca se muestran", "Publicar las opiniones de los suscriptores tras revisarlas (una por cuenta), con la mención «Suscriptor verificado»", "Consentimiento", "Hasta que pidas su eliminación"],
  ["Acceso de creador o administrador (por invitación)", "Identificador y nombre de la cuenta, rol, nombre anotado en la invitación, fecha de activación", "Dar el acceso completo gratuito a los creadores colaboradores y a los administradores", "Ejecución del contrato", "Hasta que se retire el acceso"],
  ["Contacto", "Dirección de correo electrónico y contenido de tus mensajes", "Responder a tus solicitudes", "Interés legítimo", "3 años después del último intercambio"],
];

const PROVIDERS_ES = [
  ["Vercel Inc. (Estados Unidos)", "Alojamiento del sitio y de los servidores"],
  ["Supabase (Irlanda, UE)", "Base de datos de cuentas, opiniones y análisis realizados"],
  ["Whop, Inc. (Estados Unidos)", "Pago, gestión de suscripciones, inicio de sesión de los suscriptores"],
  ["Google LLC (Estados Unidos)", "Inicio de sesión con Google, solo si lo eliges: recibimos tu correo, tu nombre y el identificador de tu cuenta de Google", "google"],
  ["Resend, Inc. (Estados Unidos)", "Envío de los correos del sitio (enlace para elegir una nueva contraseña)", "mail"],
  ["Amplitude, Inc. (datos en la UE)", "Medición de audiencia, solo con tu consentimiento"],
  ["Zoho Corporation (datos en la UE)", "Correo de la dirección de contacto"],
  ["Anthropic, PBC (Estados Unidos)", "IA que responde a las preguntas de los suscriptores y redacta la argumentación de los análisis", "ia"],
];

function ConfidentialiteEs({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc
      title="Política de privacidad"
      path="/confidentialite"
      L={L}
      intro="Esta política explica qué datos personales recoge Basketlog, por qué, con quién se comparten, cuánto tiempo se conservan y cómo ejercer tus derechos. Basketlog no vende ningún dato ni hace publicidad personalizada. Esta versión en español es una traducción que se ofrece para tu comodidad; en caso de discrepancia, prevalece la versión francesa."
    >
      <Sec n={1} title="Responsable del tratamiento">
        <p>{e.nom}, empresario individual (micro-entreprise francesa), {e.adresse} (SIRET {e.siret}). Contacto para cualquier pregunta sobre tus datos: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
      </Sec>

      <Sec n={2} title="Qué datos recogemos y por qué">
        <p>Puedes consultar Basketlog sin crear una cuenta. Solo recogemos lo necesario:</p>
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Cuándo</th><th>Datos</th><th>Para qué</th><th>Base legal</th><th>Conservación</th></tr></thead>
            <tbody>{DATA_ES.filter((d) => on(d[5])).map((d) => <tr key={d[0]}>{d.slice(0, 5).map((c, i) => <td key={i}>{i === 0 ? <b>{c}</b> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <p>Los análisis completos que realizas con tu cuenta se registran con el identificador de tu cuenta, para aplicar el límite diario de tu plan en todos tus dispositivos y mostrarte tu historial. Si aceptas la medición de audiencia, el identificador de tu cuenta y tu plan se asocian a tus estadísticas de uso, para saber qué funciones se usan más.</p>
      </Sec>

      <Sec n={3} title="Tu cuenta, el pago y los suscriptores">
        <p>Creas tu cuenta de Basketlog con tu correo y una contraseña{googleReady() ? <>, o con tu cuenta de Google</> : null}. La contraseña nunca se guarda: solo conservamos una huella (scrypt, con una sal aleatoria), que permite comprobarla sin poder recuperarla.{googleReady() ? <> Con Google, solo recibimos tu correo (y si Google lo ha verificado), tu nombre y el identificador de tu cuenta de Google: ni tus contactos, ni tus archivos, ni tu contraseña de Google.</> : null} Los correos de Basketlog (análisis, ofertas) solo se te envían si los aceptas en <Link href={L.href("/app/compte")}>Mi cuenta</Link>.</p>
        <p>El pago se realiza en la página segura de Whop. Basketlog nunca recibe el número de tu tarjeta. Después del pago, vinculas a tu cuenta la cuenta de Whop con la que pagaste: solo recibimos su identificador, su nombre de usuario y el plan al que da acceso. Whop trata tus datos según su propia <a href={LEGAL.paiement.confidentialite} rel="noopener" target="_blank">política de privacidad</a>.</p>
      </Sec>

      <Sec n={4} title="Proveedores">
        <p>Solo compartimos datos con los proveedores necesarios para el servicio, que actúan por cuenta nuestra:</p>
        <ul>{PROVIDERS_ES.filter(([, , f]) => on(f)).map(withAi("es")).map(([n, r]) => <li key={n}><b>{n}</b>: {r}</li>)}</ul>
        <p>Para las estadísticas deportivas (ESPN, EuroLeague) y la redacción automática de los análisis, solo enviamos datos de partidos, nunca tus datos personales. Los logotipos de los equipos y algunas fotos (Unsplash) se cargan desde los servidores de esos servicios, que reciben por tanto tu dirección IP, como en cualquier sitio web. Las tipografías están alojadas por Basketlog.</p>
      </Sec>

      <Sec n={5} title="Transferencias fuera de la Unión Europea">
        <p>Vercel, Whop{googleReady() ? ", Google" : ""}{mailReady() ? " y Resend" : ""} están establecidos en Estados Unidos. Las transferencias a estos proveedores se basan en las garantías previstas por el RGPD: la decisión de adecuación de la Comisión Europea para las empresas certificadas en el Marco de Privacidad de Datos UE–EE. UU., o las cláusulas contractuales tipo de la Comisión Europea.</p>
      </Sec>

      <Sec n={6} title="Seguridad">
        <p>Las comunicaciones con el sitio están cifradas (HTTPS). La sesión se guarda en una cookie firmada, inaccesible para los scripts de la página, y se verifica de nuevo con regularidad (con Whop para las suscripciones). Las contraseñas solo se guardan como huella y los intentos de inicio de sesión están limitados; cambiar la contraseña cierra la sesión en tus otros dispositivos. El acceso a los datos está limitado al editor. Ningún sistema es infalible, pero corregimos lo antes posible cualquier problema que se nos comunique.</p>
      </Sec>

      <Sec n={7} title="Tus derechos">
        <p>De acuerdo con el RGPD y la ley francesa de protección de datos, puedes en cualquier momento:</p>
        <ul>
          <li>acceder a tus datos y obtener una copia;</li>
          <li>rectificarlos o suprimirlos;</li>
          <li>oponerte a su tratamiento o pedir su limitación;</li>
          <li>recuperar los datos que nos facilitaste en un formato legible (portabilidad);</li>
          <li>retirar tu consentimiento a la medición de audiencia en cualquier momento, con el enlace «Gestionar cookies» al pie de cada página;</li>
          <li>dar instrucciones sobre el destino de tus datos después de tu fallecimiento.</li>
        </ul>
        <p>Desde la página <Link href={L.href("/app/compte")}>Mi cuenta</Link> también puedes elegir tu nombre mostrado, cambiar tu contraseña, aceptar o rechazar los correos de Basketlog y eliminar tu cuenta tú mismo: tu cuenta (correo, contraseña, inicio de sesión con Google) y tus datos de Basketlog (historial de análisis, preguntas, opinión, nombre mostrado) se borran entonces de inmediato. Los datos que gestiona Whop (correo, medios de pago, facturas) se eliminan desde <a href="https://whop.com/@me/settings/" rel="noopener" target="_blank">tus ajustes de Whop</a>.</p>
        <p>Escríbenos a <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>. Respondemos en el plazo máximo de un mes. También puedes presentar una reclamación ante la autoridad francesa de protección de datos (CNIL): <a href="https://www.cnil.fr" rel="noopener" target="_blank">cnil.fr</a>, o ante la de tu país (en España, la AEPD: <a href="https://www.aepd.es" rel="noopener" target="_blank">aepd.es</a>).</p>
      </Sec>

      <Sec n={8} title="Menores">
        <p>Basketlog está reservado a personas de 18 años o más. No recogemos a sabiendas datos de menores. Si crees que un menor nos ha enviado datos, escríbenos y los eliminaremos.</p>
      </Sec>

      <Sec n={9} title="Cookies">
        <p>Las cookies y otros rastreadores que se usan, y la forma de gestionarlos, se detallan en la <Link href={L.href("/cookies")}>política de cookies</Link>.</p>
      </Sec>

      <Sec n={10} title="Cambios">
        <p>Esta política puede cambiar con el servicio o con la ley. La fecha de actualización figura en la parte superior de la página. Si hay un cambio importante, te avisaremos en el sitio.</p>
      </Sec>
    </LegalDoc>
  );
}

export default async function ConfidentialitePage() {
  const L = await getL();
  return L.es ? <ConfidentialiteEs L={L} /> : L.en ? <ConfidentialiteEn L={L} /> : <ConfidentialiteFr />;
}
