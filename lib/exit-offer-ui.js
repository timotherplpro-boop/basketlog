// Offre de dernière chance, côté navigateur (components/ExitOffer.jsx, components/UnlockModal.jsx) : fréquence d'affichage,
// lien vers /pro avec le code, phrase de la remise. Aucune dépendance à Next ni au serveur : testé dans tests/unit.mjs.
// La vérification du code chez Whop est dans lib/exit-offer.js (serveur seulement).

// Sur ordinateur, la souris doit rester 8 secondes sur /pro avant qu'une sortie par le haut de la fenêtre déclenche l'offre.
export const EXIT_ARM_MS = 8000;

// Une même personne ne voit l'offre qu'une fois tous les 14 jours (marque dans le navigateur). Sans stockage disponible,
// on ne la montre pas du tout plutôt que de la répéter.
export const EXIT_KEY = "bl-exit";
export const EXIT_GAP = 14 * 864e5;
export function exitAllowed(store, now = Date.now()) {
  try {
    const at = Number(store.getItem(EXIT_KEY));
    return !(at && now - at < EXIT_GAP);
  } catch {
    return false;
  }
}
export function exitMark(store, now = Date.now()) {
  try { store.setItem(EXIT_KEY, String(now)); } catch { /* stockage refusé : exitAllowed renverra false */ }
}

// La page des formules avec le code déjà appliqué (/pro?code=NOM : ProPlans le vérifie auprès de /api/promo).
export function proUrlWithCode(href, code) {
  return `${href}${String(href).includes("?") ? "&" : "?"}code=${encodeURIComponent(code)}`;
}

// « −10 % sur ton premier paiement », même sens que l'encart du code appliqué sur /pro. pctText : « 10 % » ou « 10% ».
// mois : nombre de paiements remisés (1 : le premier seulement, 0 : tous).
export function offerLine(L, pctText, mois) {
  const n = Number(mois);
  if (L.en) return `${pctText} off ${n === 0 ? "your plan" : n === 1 ? "your first payment" : `your first ${n} payments`}`;
  if (L.es) return `−${pctText} en ${n === 0 ? "tu plan" : n === 1 ? "tu primer pago" : `tus ${n} primeros pagos`}`;
  return `−${pctText} sur ${n === 0 ? "ta formule" : n === 1 ? "ton premier paiement" : `tes ${n} premiers paiements`}`;
}
