"use client";
// Parcours des visiteurs vers l'abonnement, compté pour tout le monde sans cookie, sans stockage et sans identifiant :
// chaque étape part au plus une fois par onglet ouvert, avec la source d'arrivée (TikTok, Instagram, Google…) et la
// langue. Rien d'autre n'est envoyé. Les chiffres s'affichent dans l'admin (page Statistiques) ; l'admin, les créateurs
// et les abonnés ne sont pas comptés (vérifié côté serveur, /api/stats).
import { STEP_IDS, sourceFrom } from "./funnel-steps";

const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|telegram|discord/i;
const sent = new Set();
let source = null;

// Source de l'arrivée sur le site (calculée une fois, à la première étape de l'onglet).
function arrival() {
  try {
    const q = new URLSearchParams(location.search);
    const utm = (q.get("utm_source") || "").toLowerCase().slice(0, 40);
    if (utm) return sourceFrom(utm) || "autre";
    let ref = "";
    try { ref = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : ""; } catch {}
    if (ref && ref !== location.hostname && !ref.endsWith("basketlog-app.com")) return sourceFrom(ref) || "site";
    // Lien ouvert dans le navigateur d'une appli (TikTok, Instagram…), souvent sans référent
    const ua = (navigator.userAgent || "").toLowerCase();
    if (/musical_ly|bytedance|tiktok/.test(ua)) return "tiktok";
    if (/instagram/.test(ua)) return "instagram";
    if (/fban|fbav|fb_iab|messenger/.test(ua)) return "facebook";
    if (/snapchat/.test(ua)) return "snapchat";
    return "direct";
  } catch {
    return "direct";
  }
}

export function funnel(step) {
  if (typeof window === "undefined" || !STEP_IDS.has(step) || sent.has(step)) return;
  try { if (navigator.webdriver || BOT.test(navigator.userAgent || "")) return; } catch {}
  sent.add(step);
  if (!source) source = arrival();
  const lang = (/^\/(en|es)(?=\/|$)/.exec(location.pathname) || [])[1] || "fr";
  const body = JSON.stringify({ e: step, s: source, l: lang });
  try {
    if (navigator.sendBeacon && navigator.sendBeacon("/api/stats", body)) return;
  } catch {}
  try { fetch("/api/stats", { method: "POST", body, keepalive: true, credentials: "same-origin" }).catch(() => {}); } catch {}
}
