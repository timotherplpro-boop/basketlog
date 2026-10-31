/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Polices des images de partage, lues au moment de générer l'image (lib/og.jsx).
  outputFileTracingIncludes: { "/api/og": ["./assets/fonts/*"], "/opengraph-image": ["./assets/fonts/*"] },
  // Robots (Google, Bing, IA…) : titres, descriptions et balises dans le <head> dès le premier octet,
  // sans streaming. Les visiteurs gardent le rendu en streaming, plus rapide.
  htmlLimitedBots: /bot|crawl|spider|slurp|Google|Bing|yandex|baidu|Lighthouse|facebookexternalhit|facebookcatalog|WhatsApp|Twitter|LinkedIn|Slack|Discord|SkypeUriPreview|vkShare|quora|tumblr|ia_archiver|Yeti|Perplexity|ChatGPT|Claude|Applebot/i,
  // L'ancienne adresse Vercel renvoie définitivement vers le nom de domaine.
  // Service worker de l'appli installable : toujours la dernière version.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] }];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "basketlog-zeta.vercel.app" }],
        destination: "https://basketlog-app.com/:path*",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
