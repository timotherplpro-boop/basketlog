"use client";
// Choix de l'utilisateur sur la mesure d'audience (CNIL : accord préalable, refus aussi simple que l'acceptation).
const KEY = "bl_consent";
const MAX_AGE = 182 * 864e5; // le choix est gardé 6 mois, puis redemandé

export function getConsent() {
  try {
    const c = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!c || typeof c.analytics !== "boolean" || Date.now() - (c.date || 0) > MAX_AGE) return null;
    return c;
  } catch {
    return null;
  }
}

export function setConsent(analytics) {
  const c = { v: 1, analytics: !!analytics, date: Date.now() };
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch {}
  window.dispatchEvent(new CustomEvent("bl-consent", { detail: c }));
  return c;
}

export function openConsent() {
  window.dispatchEvent(new Event("bl-consent-open"));
}
