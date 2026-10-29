import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import { LEGAL } from "../../lib/legal";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
  if (L.es) return pageMeta({ title: "Aviso legal – Basketlog", description: "Aviso legal de Basketlog: editor, director de la publicación, alojamiento, propiedad intelectual y mediación de consumo.", path: "/mentions-legales", L });
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

const NOTE_ES = "Esta versión en español es una traducción que se ofrece para tu comodidad. En caso de discrepancia, prevalece la versión francesa.";

function MentionsLegalesEs({ L }) {
  const e = LEGAL.editeur;
  return (
    <LegalDoc title="Aviso legal" path="/mentions-legales" intro={NOTE_ES} L={L}>
      <Sec n={1} title="Editor del sitio">
        <p>El sitio {LEGAL.url.replace("https://", "")} («Basketlog») lo edita <b>{e.nom}</b>, empresario individual (micro-entreprise francesa), {e.adresse}.</p>
        <ul>
          <li>SIREN {e.siren} — SIRET {e.siret}, inscrito en el Registro nacional de empresas francés (RNE)</li>
          <li>IVA no aplicable, artículo 293 B del Código General de Impuestos francés</li>
          <li>Contacto: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a></li>
        </ul>
        <p>Director de la publicación: {LEGAL.directeur}.</p>
      </Sec>

      <Sec n={2} title="Alojamiento">
        <p>El sitio está alojado por <b>{LEGAL.hebergeur.nom}</b>, 440 North Barranca Avenue, Suite 4133, Covina, CA 91723, Estados Unidos, teléfono {LEGAL.hebergeur.tel}, <a href={LEGAL.hebergeur.site} rel="noopener" target="_blank">vercel.com</a>.</p>
        <p>La base de datos de opiniones está alojada por {LEGAL.base.nom} (<a href={LEGAL.base.site} rel="noopener" target="_blank">supabase.com</a>), con los datos almacenados en la región AWS de París (eu-west-3).</p>
        <p>Los pagos y las cuentas de suscriptores los gestiona {LEGAL.paiement.nom}, 300 Kent Avenue #401, Brooklyn, NY 11249, Estados Unidos (<a href={LEGAL.paiement.site} rel="noopener" target="_blank">whop.com</a>).</p>
      </Sec>

      <Sec n={3} title="Propiedad intelectual">
        <p>El nombre Basketlog, el sitio, sus textos, su diseño, su código y su modelo de análisis pertenecen a {e.nom}. Queda prohibida cualquier reproducción o reutilización, total o parcial, sin autorización por escrito.</p>
        <p>Los nombres, logotipos y marcas de los equipos, de la NBA y de la Euroliga pertenecen a sus titulares. Se citan solo a título informativo: Basketlog no está afiliado a la NBA, a la Euroliga ni a ningún club. Las estadísticas proceden de fuentes públicas (ESPN, EuroLeague). Las fotos ilustrativas proceden de Unsplash y se usan conforme a la licencia de Unsplash.</p>
      </Sec>

      <Sec n={4} title="Pronósticos y juego responsable">
        <p>Basketlog es una herramienta de análisis estadístico. No es un operador de juego ni un servicio de consejos de apuestas: en el sitio no se puede apostar y ninguna probabilidad es una garantía. El servicio está reservado a mayores de edad (18 años o más).</p>
        <p>El juego conlleva riesgos como el endeudamiento o la adicción. Si necesitas ayuda en España, consulta <a href="https://www.jugarbien.es" rel="noopener" target="_blank">jugarbien.es</a>; en Francia: {LEGAL.jeu.nom}, {LEGAL.jeu.tel} (llamada sin recargo), <a href={LEGAL.jeu.site} rel="noopener" target="_blank">joueurs-info-service.fr</a>.</p>
      </Sec>

      <Sec n={5} title="Avisos, reclamaciones y mediación">
        <p>Para señalar un contenido ilícito o presentar una reclamación: <a href={`mailto:${LEGAL.email}`}>{LEGAL.email}</a>.</p>
        <p>De acuerdo con los artículos L611-1 y siguientes del Código de Consumo francés, si un litigio no se resuelve tras una reclamación por escrito a esta dirección, puedes acudir gratuitamente al mediador de consumo: <b>{LEGAL.mediateur.nom}</b>, {LEGAL.mediateur.adresse}, Francia, <a href={LEGAL.mediateur.site} rel="noopener" target="_blank">cm2c.net</a>. La solicitud debe presentarse en el plazo de un año desde tu reclamación por escrito.</p>
      </Sec>

      <Sec n={6} title="Datos personales y cookies">
        <p>La recogida y el uso de tus datos se describen en la <Link href={L.href("/confidentialite")}>política de privacidad</Link> y en la <Link href={L.href("/cookies")}>política de cookies</Link>.</p>
      </Sec>
    </LegalDoc>
  );
}

export default async function MentionsLegalesPage() {
  const L = await getL();
  return L.es ? <MentionsLegalesEs L={L} /> : L.en ? <MentionsLegalesEn L={L} /> : <MentionsLegalesFr />;
}
