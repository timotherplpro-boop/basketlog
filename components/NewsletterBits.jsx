"use client";
// Morceaux communs à la carte d'invitation (NewsletterInvite), au réglage de « Mon compte » (NewsletterSettings) et à la page de
// confirmation (NewsletterConfirm) : le texte de consentement (ce que le membre accepte, à quelle adresse, qui traite l'adresse,
// comment se désinscrire), le message « e-mail de confirmation envoyé » et les textes d'erreur. Un seul endroit pour que tous les
// écrans disent exactement la même chose.
import Link from "next/link";
import { useL } from "./LangProvider";
import { NETWORK } from "../lib/useNewsletter";

const CONTACT = "contact@basketlog-app.com";

// Phrase d'accord affichée juste avant le bouton d'inscription. `email` : adresse masquée (peut manquer).
// `confirm` : adresse d'un compte pas encore prouvée, l'inscription passe par un e-mail de confirmation (lib/newsletter-confirm.js).
export function Consent({ email, lead, confirm = false }) {
  const L = useL();
  const T = L.t;
  const where = email ? ` (${email})` : "";
  const policy = <Link href={L.href("/confidentialite")} target="_blank">{T("Politique de confidentialité", "Privacy policy", "Política de privacidad")}</Link>;
  if (confirm) {
    return (
      <p className="nl-fine">
        {T(
          <>En cliquant sur « {lead} », je demande à recevoir cette newsletter à l&apos;adresse de mon compte{where}. Basketlog m&apos;envoie d&apos;abord un e-mail pour confirmer que cette adresse est bien la mienne : l&apos;inscription ne devient effective qu&apos;après mon clic sur le lien de cet e-mail. Basketlog transmet l&apos;adresse à Resend, son prestataire d&apos;envoi, uniquement pour cet usage. Je peux me désinscrire à tout moment. {policy}.</>,
          <>By clicking “{lead}”, I ask to receive this newsletter at my account&apos;s email address{where}. Basketlog first sends me an email to confirm that this address is mine: I&apos;m only signed up once I click the link in that email. Basketlog passes the address to Resend, its email delivery provider, for this sole purpose. I can unsubscribe at any time. {policy}.</>,
          <>Al hacer clic en «{lead}», pido recibir esta newsletter en la dirección de mi cuenta{where}. Basketlog me envía primero un correo para confirmar que esta dirección es mía: la suscripción solo es efectiva cuando hago clic en el enlace de ese correo. Basketlog transmite la dirección a Resend, su proveedor de envío, únicamente para este fin. Puedo darme de baja en cualquier momento. {policy}.</>
        )}
      </p>
    );
  }
  return (
    <p className="nl-fine">
      {T(
        <>En cliquant sur « {lead} », j&apos;accepte de recevoir cette newsletter à l&apos;adresse de mon compte{where}. Basketlog la transmet à Resend, son prestataire d&apos;envoi, uniquement pour cet usage. Je peux me désinscrire à tout moment. {policy}.</>,
        <>By clicking “{lead}”, I agree to receive this newsletter at my account&apos;s email address{where}. Basketlog passes it to Resend, its email delivery provider, for this sole purpose. I can unsubscribe at any time. {policy}.</>,
        <>Al hacer clic en «{lead}», acepto recibir esta newsletter en la dirección de mi cuenta{where}. Basketlog la transmite a Resend, su proveedor de envío, únicamente para este fin. Puedo darme de baja en cualquier momento. {policy}.</>
      )}
    </p>
  );
}

// « On t'a envoyé un e-mail de confirmation » : message affiché après la demande d'un compte dont l'adresse n'est pas encore prouvée.
export function pendingText(T, email) {
  return T(
    `On a envoyé un e-mail de confirmation à ${email || "l'adresse de ton compte"}. Ouvre-le et clique sur « Je confirme mon inscription » (le lien marche 48 heures) : tu ne recevras la newsletter qu'après. Rien dans ta boîte ? Regarde dans les indésirables.`,
    `We've sent a confirmation email to ${email || "your account's address"}. Open it and click “Confirm my signup” (the link works for 48 hours): you'll only get the newsletter after that. Nothing in your inbox? Check your spam folder.`,
    `Hemos enviado un correo de confirmación a ${email || "la dirección de tu cuenta"}. Ábrelo y haz clic en «Confirmo mi suscripción» (el enlace funciona durante 48 horas): solo recibirás la newsletter después. ¿No ves nada en tu bandeja? Mira en el correo no deseado.`
  );
}

// Message à afficher pour une erreur de l'API : soit le message du serveur (déjà dans la bonne langue), soit « connexion impossible ».
export function useNewsletterError(error) {
  const { t } = useL();
  if (!error) return "";
  return error === NETWORK ? t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") : error;
}

// Message quand l'état de la newsletter ne peut pas être lu (problem : "email", "down").
export function problemText(T, problem) {
  return problem === "email"
    ? T(`On n'arrive pas à lire ton adresse e-mail chez Whop pour le moment. Écris-nous à ${CONTACT} et on s'en occupe.`, `We can't read your email address at Whop right now. Write to us at ${CONTACT} and we'll sort it out.`, `No conseguimos leer tu correo en Whop por ahora. Escríbenos a ${CONTACT} y lo solucionamos.`)
    : T("Le service d'envoi ne répond pas pour le moment. Réessaie dans un instant.", "The email service isn't responding right now. Please try again in a moment.", "El servicio de correo no responde por ahora. Inténtalo de nuevo en un instante.");
}

export function blockedText(T) {
  return T(
    `Cette adresse s'est désinscrite de tous les e-mails de Basketlog. Pour la réactiver, écris-nous à ${CONTACT}.`,
    `This address has unsubscribed from all Basketlog emails. To turn it back on, write to us at ${CONTACT}.`,
    `Esta dirección se ha dado de baja de todos los correos de Basketlog. Para reactivarla, escríbenos a ${CONTACT}.`
  );
}
