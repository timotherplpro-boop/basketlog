"use client";
import { useEffect } from "react";
import { initAnalytics, stopAnalytics } from "../lib/analytics";
import { getConsent } from "../lib/consent";

// Démarre la mesure d'audience si l'utilisateur l'a acceptée, et suit ses changements d'avis.
export default function Analytics() {
  useEffect(() => {
    const c = getConsent();
    if (c && !c.analytics) stopAnalytics(); // refus : on nettoie les traceurs restants
    else initAnalytics();
    const on = (e) => (e.detail?.analytics ? initAnalytics() : stopAnalytics());
    window.addEventListener("bl-consent", on);
    return () => window.removeEventListener("bl-consent", on);
  }, []);
  return null;
}
