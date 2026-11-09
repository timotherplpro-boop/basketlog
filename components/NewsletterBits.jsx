"use client";
// Morceaux communs à la carte d'invitation (NewsletterInvite) et au réglage de « Mon compte » (NewsletterSettings) :
// le texte de consentement (ce que le membre accepte, à quelle adresse, qui traite l'adresse, comment se désinscrire)
// et le texte d'erreur. Un seul endroit pour que les deux écrans disent exactement la même chose.
import Link from "next/link";
import { useL } from "./LangProvider";
import { NETWORK } from "../lib/useNewsletter";

const CONTACT = "contact@basketlog-app.com";

// Phrase d'accord affichée juste avant le bouton d'inscription. `email` : adresse masquée (peut manquer).
export function Consent({ email, lead }) {
  const L = useL();
  const T = L.t;
  const where = email ? ` (${email})` : "";
  const policy = <Link href={L.href("/confidentialite")} target="_blank">{T("Politique de confidentialité", "Privacy policy", "Política de privacidad")}</Link>;
  return (
    <p className="nl-fine">
      {T(
        <>En cliquant sur « {lead} », j&apos;accepte de recevoir cette newsletter à l&apos;adresse de mon compte Whop{where}. Basketlog la transmet à Resend, son prestataire d&apos;envoi, uniquement pour cet usage. Je peux me désinscrire à tout moment. {policy}.</>,
        <>By clicking “{lead}”, I agree to receive this newsletter at the address of my Whop account{where}. Basketlog passes it to Resend, its email delivery provider, for this sole purpose. I can unsubscribe at any time. {policy}.</>,
        <>Al hacer clic en «{lead}», acepto recibir esta newsletter en la dirección de mi cuenta de Whop{where}. Basketlog la transmite a Resend, su proveedor de envío, únicamente para este fin. Puedo darme de baja en cualquier momento. {policy}.</>
      )}
    </p>
  );
}

// Message à afficher pour une erreur de l'API : soit le message du serveur (déjà dans la bonne langue), soit « connexion impossible ».
export function useNewsletterError(error) {
  const { t } = useL();
  if (!error) return "";
  return error === NETWORK ? t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") : error;
}

// Message quand l'état de la newsletter ne peut pas être lu (problem : "email" ou "down").
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
