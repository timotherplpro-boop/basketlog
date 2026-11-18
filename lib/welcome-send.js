// Envoi de l'e-mail « Bienvenue » après la création d'un compte (lib/lifecycle-mail.js). Ne bloque jamais l'inscription :
// une erreur d'envoi est seulement notée dans les journaux. Rien ne part tant que LIFECYCLE_EMAILS ne vaut pas 1.
import { mailReady, sendMail } from "./mail";
import { lifecycleOn, welcomeEmail } from "./lifecycle-mail";

export async function sendWelcome({ to, lang, name }) {
  if (!to || !lifecycleOn() || !mailReady()) return false;
  try {
    await sendMail({ to, ...welcomeEmail({ lang, name, to }) });
    console.log("[bienvenue] e-mail envoyé");
    return true;
  } catch (e) {
    console.warn(`[bienvenue] envoi impossible : ${String(e?.message || e).slice(0, 200)}`);
    return false;
  }
}
