"use client";
// Fenêtre « Créer un compte / Se connecter » (components/AuthModal.jsx, montée une fois dans app/layout.jsx) :
// n'importe quel bouton du site l'ouvre avec openAuth({ mode, source, next }).
export const AUTH_EVENT = "bl-auth";

// mode : « inscription » (par défaut), « connexion » ou « oubli » ; source : où le visiteur a cliqué (statistiques) ;
// next : page où aller après la connexion (par défaut, la page actuelle, rechargée) ; then : « paiement » pour partir
// payer juste après l'inscription (lien de paiement donné dans checkout).
export function openAuth(opts = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: opts }));
}
