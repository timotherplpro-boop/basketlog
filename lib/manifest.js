// Manifeste de l'appli installable (PWA), en français ou en anglais.
export function buildManifest(lang = "fr") {
  const en = lang === "en";
  const base = en ? "/en" : "";
  return {
    id: base || "/",
    name: en ? "Basketlog: NBA and EuroLeague predictions" : "Basketlog : pronostics NBA et EuroLeague",
    short_name: "Basketlog",
    description: en
      ? "Win probabilities, projected score and full analysis for every NBA and EuroLeague game."
      : "Probabilités de victoire, score projeté et analyse complète de chaque match NBA et EuroLeague.",
    lang: en ? "en-US" : "fr-FR",
    dir: "ltr",
    start_url: `${base}/app/matchs?source=pwa`,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#040817",
    theme_color: "#040817",
    categories: ["sports"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: en ? "Today's games" : "Matchs du jour", url: `${base}/app/matchs?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: en ? "Analyze a game" : "Analyser un match", url: `${base}/app?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "EuroLeague", url: `${base}/app/euroleague?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: en ? "Track record" : "Bilan du modèle", url: `${base}/app/bilan?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

export function manifestResponse(lang) {
  return new Response(JSON.stringify(buildManifest(lang)), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
