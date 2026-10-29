"use client";
// Amplitude (centre de données EU), chargé en différé et seulement après accord (bannière cookies).
// Sans clé configurée ou sans accord, rien n'est chargé ni envoyé.
import { getConsent } from "./consent";

const KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || "";
let amp = null;
let loading = null;
const queue = []; // événements en attente du chargement d'Amplitude (uniquement après accord)

export function initAnalytics() {
  if (!KEY || typeof window === "undefined" || !getConsent()?.analytics) return;
  if (amp) { try { amp.setOptOut(false); } catch {} flush(); return; }
  if (loading) return;
  loading = import("@amplitude/analytics-browser").then((a) => {
    a.init(KEY, {
      serverZone: "EU",
      cookieOptions: { expiration: 365 },
      autocapture: {
        pageViews: { trackHistoryChanges: "pathOnly" },
        sessions: true,
        formInteractions: true,
        fileDownloads: false,
        elementInteractions: true,
        attribution: true,
        frustrationInteractions: true,
      },
    });
    amp = a;
    flush();
  }).catch(() => { loading = null; });
}

function flush() {
  while (queue.length) { const fn = queue.shift(); try { fn(amp); } catch {} }
}

// Refus ou retrait de l'accord : on coupe l'envoi et on efface les traceurs Amplitude.
function cleanup() {
  try {
    const host = location.hostname;
    const domains = ["", `; domain=${host}`, `; domain=.${host.split(".").slice(-2).join(".")}`];
    document.cookie.split(";").map((c) => c.trim().split("=")[0]).filter((n) => n.startsWith("AMP_"))
      .forEach((n) => domains.forEach((d) => { document.cookie = `${n}=; Max-Age=0; path=/${d}`; }));
    Object.keys(localStorage).filter((k) => k.startsWith("AMP_")).forEach((k) => localStorage.removeItem(k));
  } catch {}
}

export function stopAnalytics() {
  queue.length = 0;
  if (amp) { try { amp.setOptOut(true); } catch {} }
  cleanup();
  setTimeout(cleanup, 800); // Amplitude peut réécrire son cookie juste après le refus
}

function run(fn) {
  if (!KEY || typeof window === "undefined") return;
  if (!getConsent()?.analytics) return; // pas d'accord : rien n'est gardé ni envoyé
  if (amp) { try { fn(amp); } catch {} return; }
  if (queue.length < 50) queue.push(fn);
  initAnalytics();
}

export function track(name, props = {}) {
  run((a) => a.track(name, props));
}

export function identifyPro(userId, tier) {
  if (!userId) return;
  run((a) => {
    a.setUserId(userId);
    a.identify(new a.Identify().set("formule", tier || "gratuit"));
  });
}
