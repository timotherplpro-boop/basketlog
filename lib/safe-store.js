// localStorage, ou null quand le navigateur refuse même d'y accéder (navigation privée stricte, cookies bloqués).
// Les fonctions de lib/onboarding.js et lib/exit-offer-ui.js acceptent null : elles ne posent alors aucune question et ne montrent aucune offre.
export function localStore() {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}
