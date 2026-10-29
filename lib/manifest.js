// Manifeste de l'appli installable (PWA), en français, anglais ou espagnol.
export function buildManifest(lang = "fr") {
  const en = lang === "en";
  const es = lang === "es";
  const t = (fr, enText, esText) => (en ? enText : es ? esText : fr);
  const base = en ? "/en" : es ? "/es" : "";
  return {
    id: base || "/",
    name: t("Basketlog : pronostics NBA et EuroLeague", "Basketlog: NBA and EuroLeague predictions", "Basketlog: pronósticos NBA y Euroliga"),
    short_name: "Basketlog",
    description: t(
      "Probabilités de victoire, score projeté et analyse complète de chaque match NBA et EuroLeague.",
      "Win probabilities, projected score and full analysis for every NBA and EuroLeague game.",
      "Probabilidades de victoria, marcador proyectado y análisis completo de cada partido de la NBA y la Euroliga."
    ),
    lang: t("fr-FR", "en-US", "es-ES"),
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
      { name: t("Matchs du jour", "Today's games", "Partidos de hoy"), url: `${base}/app/matchs?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: t("Analyser un match", "Analyze a game", "Analizar un partido"), url: `${base}/app?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: t("EuroLeague", "EuroLeague", "Euroliga"), url: `${base}/app/euroleague?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: t("Bilan du modèle", "Track record", "Balance del modelo"), url: `${base}/app/bilan?source=pwa`, icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

export function manifestResponse(lang) {
  return new Response(JSON.stringify(buildManifest(lang)), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
