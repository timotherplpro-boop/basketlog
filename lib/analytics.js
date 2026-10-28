"use client";
// Amplitude (centre de données EU), chargé en différé pour ne pas alourdir les pages.
// Sans clé configurée, tout est ignoré sans erreur.
const KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY || "";
let amp = null;
let loading = null;
const queue = [];

export function initAnalytics() {
  if (loading || !KEY || typeof window === "undefined") return;
  loading = import("@amplitude/analytics-browser").then((a) => {
    a.init(KEY, {
      serverZone: "EU",
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
    while (queue.length) queue.shift()(a);
  }).catch(() => {});
}

function run(fn) {
  initAnalytics();
  if (!KEY) return;
  if (amp) { try { fn(amp); } catch {} } else queue.push((a) => { try { fn(a); } catch {} });
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
