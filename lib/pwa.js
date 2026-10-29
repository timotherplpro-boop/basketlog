"use client";
// Installation de l'appli : on garde l'invitation du navigateur (Chrome, Edge, Android) pour l'afficher au bon moment.
let deferred = null;
const subs = new Set();
const emit = () => subs.forEach((f) => f());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; emit(); });
  window.addEventListener("appinstalled", () => { deferred = null; try { localStorage.setItem("bl_installed", "1"); } catch {} emit(); });
}

export function subscribe(f) { subs.add(f); return () => subs.delete(f); }

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
}

export function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent || "");
}

// "prompt" : invitation native disponible · "ios" : instructions Safari · null : rien à proposer.
export function installMode() {
  if (isStandalone()) return null;
  if (deferred) return "prompt";
  if (isIOS()) return "ios";
  return null;
}

export async function promptInstall() {
  if (!deferred) return null;
  const e = deferred;
  deferred = null;
  emit();
  e.prompt();
  const { outcome } = await e.userChoice;
  return outcome;
}
