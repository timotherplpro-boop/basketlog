import Link from "next/link";
import LegalDoc, { Sec } from "../../components/LegalDoc";
import CookieSettingsButton from "../../components/CookieSettingsButton";
import { pageMeta } from "../../lib/seo";
import { getL } from "../../lib/lang-server";

export async function generateMetadata() {
  const L = await getL();
  return L.en
    ? pageMeta({ title: "Cookie policy – Basketlog", description: "The cookies and trackers Basketlog uses, their purpose, their duration and how to accept or refuse audience measurement.", path: "/cookies", L })
    : pageMeta({ title: "Politique de cookies – Basketlog", description: "Les cookies et traceurs utilisés par Basketlog, leur rôle, leur durée et comment accepter ou refuser la mesure d'audience.", path: "/cookies" });
}

const TRACEURS = [
  ["bl_consent", "Stockage local", "Mémoriser ton choix sur les cookies", "Nécessaire", "6 mois"],
  ["hs_views_…", "Stockage local", "Compter les analyses complètes consultées dans la journée (formule Starter)", "Nécessaire", "La journée"],
  ["bl_pro", "Cookie", "Garder ta session d'abonné connectée (cookie signé, inaccessible aux scripts)", "Nécessaire", "60 jours"],
  ["whop_state, whop_pkce", "Cookie", "Sécuriser la connexion avec Whop", "Nécessaire", "10 minutes"],
  ["AMP_…, AMP_MKTG_…", "Cookie", "Mesure d'audience Amplitude : identifiant aléatoire de visiteur et de session, source de la visite", "Consentement", "12 mois"],
  ["AMP_unsent_…, AMP_remote_config_…", "Stockage local", "Mesure d'audience Amplitude : file d'attente des événements et réglages", "Consentement", "Jusqu'au refus ou à l'effacement"],
];

function CookiesFr() {
  return (
    <LegalDoc
      title="Politique de cookies"
      path="/cookies"
      intro="Un cookie est un petit fichier déposé dans ton navigateur. Basketlog en utilise très peu : ceux qui font fonctionner le site, et, seulement si tu l'acceptes, ceux de la mesure d'audience. Aucun cookie publicitaire."
    >
      <Sec n={1} title="Les traceurs utilisés">
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Nom</th><th>Type</th><th>Rôle</th><th>Accord</th><th>Durée</th></tr></thead>
            <tbody>{TRACEURS.map((t) => <tr key={t[0]}>{t.map((c, i) => <td key={i}>{i === 0 ? <code>{c}</code> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Sec>

      <Sec n={2} title="Cookies nécessaires">
        <p>Ils servent uniquement au fonctionnement du site (connexion des abonnés, limite d&apos;analyses, mémorisation de ton choix). La loi les dispense de consentement. Les bloquer dans ton navigateur peut empêcher la connexion des abonnés.</p>
      </Sec>

      <Sec n={3} title="Mesure d'audience (Amplitude)">
        <p>Avec ton accord, Basketlog utilise Amplitude (données hébergées dans l&apos;Union européenne) pour savoir quelles pages et fonctionnalités sont utilisées, et améliorer le site. Ces statistiques ne servent jamais à la publicité et ne sont pas revendues. Sans ton accord, aucun de ces traceurs n&apos;est déposé.</p>
      </Sec>

      <Sec n={4} title="Services tiers">
        <p>La page de paiement est hébergée par Whop (whop.com), qui dépose ses propres cookies selon sa politique. Les logos des équipes et certaines photos sont chargés depuis d&apos;autres serveurs (ESPN, EuroLeague, Unsplash), sans cookie de notre part.</p>
      </Sec>

      <Sec n={5} title="Accepter, refuser, changer d'avis">
        <p>À ta première visite, une bannière te permet d&apos;accepter ou de refuser la mesure d&apos;audience, aussi simplement l&apos;un que l&apos;autre. Ton choix est gardé 6 mois, puis la question t&apos;est reposée. Tu peux changer d&apos;avis à tout moment :</p>
        <p><CookieSettingsButton className="btn-white" /></p>
        <p>Tu peux aussi supprimer les cookies dans les réglages de ton navigateur. Plus d&apos;informations dans la <Link href="/confidentialite">politique de confidentialité</Link> et sur le site de la CNIL : <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" rel="noopener" target="_blank">cnil.fr</a>.</p>
      </Sec>
    </LegalDoc>
  );
}

const TRACKERS_EN = [
  ["bl_consent", "Local storage", "Remember your cookie choice", "Necessary", "6 months"],
  ["hs_views_…", "Local storage", "Count the full analyses viewed during the day (daily limit)", "Necessary", "The day"],
  ["bl_pro", "Cookie", "Keep your account session logged in (signed cookie, not accessible to scripts)", "Necessary", "60 days"],
  ["whop_state, whop_pkce", "Cookie", "Secure the login with Whop", "Necessary", "10 minutes"],
  ["AMP_…, AMP_MKTG_…", "Cookie", "Amplitude audience measurement: random visitor and session ID, visit source", "Consent", "12 months"],
  ["AMP_unsent_…, AMP_remote_config_…", "Local storage", "Amplitude audience measurement: event queue and settings", "Consent", "Until you refuse or clear it"],
];

function CookiesEn({ L }) {
  return (
    <LegalDoc
      title="Cookie policy"
      path="/cookies"
      L={L}
      intro="A cookie is a small file stored in your browser. Basketlog uses very few: those that make the website work and, only if you accept them, those for audience measurement. No advertising cookies. This English version is a translation provided for convenience; in case of any discrepancy, the French version prevails."
    >
      <Sec n={1} title="Trackers used">
        <div className="legal-table-wrap">
          <table className="legal-table">
            <thead><tr><th>Name</th><th>Type</th><th>Purpose</th><th>Consent</th><th>Duration</th></tr></thead>
            <tbody>{TRACKERS_EN.map((t) => <tr key={t[0]}>{t.map((c, i) => <td key={i}>{i === 0 ? <code>{c}</code> : c}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </Sec>

      <Sec n={2} title="Necessary cookies">
        <p>They are only used to make the website work (account login, analysis limit, remembering your choice). The law exempts them from consent. Blocking them in your browser may prevent you from logging in.</p>
      </Sec>

      <Sec n={3} title="Audience measurement (Amplitude)">
        <p>With your consent, Basketlog uses Amplitude (data hosted in the European Union) to know which pages and features are used, and to improve the website. These statistics are never used for advertising and are not sold. Without your consent, none of these trackers is set.</p>
      </Sec>

      <Sec n={4} title="Third-party services">
        <p>The checkout page is hosted by Whop (whop.com), which sets its own cookies under its own policy. Team logos and some photos are loaded from other servers (ESPN, EuroLeague, Unsplash), without any cookie from us.</p>
      </Sec>

      <Sec n={5} title="Accept, refuse, change your mind">
        <p>On your first visit, a banner lets you accept or refuse audience measurement, as easily one as the other. Your choice is kept for 6 months, then you are asked again. You can change your mind at any time:</p>
        <p><CookieSettingsButton className="btn-white" /></p>
        <p>You can also delete cookies in your browser settings. More information in the <Link href={L.href("/confidentialite")}>privacy policy</Link> and on the CNIL website: <a href="https://www.cnil.fr/fr/cookies-et-autres-traceurs" rel="noopener" target="_blank">cnil.fr</a>.</p>
      </Sec>
    </LegalDoc>
  );
}

export default async function CookiesPage() {
  const L = await getL();
  return L.en ? <CookiesEn L={L} /> : <CookiesFr />;
}
