// Adresse e-mail du membre connecté, lue côté serveur (jamais envoyée par la page), pour la newsletter du dimanche :
// - compte Basketlog (e-mail + mot de passe, ou Google) : l'adresse du compte, gardée dans la session signée (le site vérifie à
//   chaque requête que le compte existe toujours) ou relue dans la base quand `fiche` est fourni ; `proven` dit si l'adresse
//   est prouvée (connexion Google, ou lien « mot de passe oublié » déjà utilisé) ;
// - compte Whop : l'adresse que Whop donne pour ce compte (lib/whop-email.js), prouvée par Whop.
// Aucune dépendance à Next : la lecture chez Whop (`lookup`) et la fiche du compte dans la base (`fiche`) sont injectées.
import { accountIdOf, isAccountSession } from "./auth-utils.js";
import { WhopEmailError, memberEmail } from "./whop-email.js";

const EMAIL = /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]{2,}$/;
const clean = (e) => String(e ?? "").trim().toLowerCase();

// Renvoie { email, account, proven } ou lève une erreur (WhopEmailError pour Whop ; erreur de la base telle quelle).
export async function sessionEmail(session, { lookup = memberEmail, fiche = null } = {}) {
  if (isAccountSession(session)) {
    const c = fiche ? await fiche(accountIdOf(session.uid)) : null;
    if (fiche && !c) throw new WhopEmailError("noemail", "compte Basketlog introuvable");
    const email = clean(c?.email || session.email);
    if (!EMAIL.test(email) || email.length > 254) throw new WhopEmailError("noemail", "compte Basketlog sans adresse lisible");
    return { email, account: true, proven: c?.email_ok === true };
  }
  return { email: await lookup(session?.uid), account: false, proven: true };
}
