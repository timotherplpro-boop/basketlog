"use client";
import { useEffect } from "react";
import { initAnalytics, stopAnalytics } from "../lib/analytics";
import { getConsent } from "../lib/consent";
import { funnel } from "../lib/funnel";

// Démarre la mesure d'audience si l'utilisateur l'a acceptée, et suit ses changements d'avis.
// Le compteur anonyme du parcours (lib/funnel.js) part dans tous les cas : il ne dépose rien et n'identifie personne.
export default function Analytics() {
  useEffect(() => {
    funnel("visite"); // compteur anonyme du parcours (sans cookie), une fois par onglet
    const c = getConsent();
    if (c && !c.analytics) stopAnalytics(); // refus : on nettoie les traceurs restants
    else initAnalytics();
    const on = (e) => (e.detail?.analytics ? initAnalytics() : stopAnalytics());
    window.addEventListener("bl-consent", on);
    return () => window.removeEventListener("bl-consent", on);
  }, []);
  return null;
}
