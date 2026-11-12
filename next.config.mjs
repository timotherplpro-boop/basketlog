/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Ne pas annoncer « x-powered-by: Next.js » dans les réponses.
  poweredByHeader: false,
  // Polices des images de partage, lues au moment de générer l'image (lib/og.jsx).
  outputFileTracingIncludes: { "/api/og": ["./assets/fonts/*"], "/opengraph-image": ["./assets/fonts/*"] },
  // Robots (Google, Bing, IA…) : titres, descriptions et balises dans le <head> dès le premier octet,
  // sans streaming. Les visiteurs gardent le rendu en streaming, plus rapide.
  htmlLimitedBots: /bot|crawl|spider|slurp|Google|Bing|yandex|baidu|Lighthouse|facebookexternalhit|facebookcatalog|WhatsApp|Twitter|LinkedIn|Slack|Discord|SkypeUriPreview|vkShare|quora|tumblr|ia_archiver|Yeti|Perplexity|ChatGPT|Claude|Applebot/i,
  // L'ancienne adresse Vercel renvoie définitivement vers le nom de domaine.
  // Service worker de l'appli installable : toujours la dernière version.
  async headers() {
    return [
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Service-Worker-Allowed", value: "/" }] },
      // En-têtes de sécurité sur toutes les pages (sans effet sur le fonctionnement du site).
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
          // Interdit d'intégrer le site dans la page d'un autre site, les objets Flash/plugins et le détournement de <base>.
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
        ],
      },
    ];
  },
  // Nom de domaine comme nom de compte Bluesky : identifiant du compte servi par app/api/atproto-did.
  async rewrites() {
    return [{ source: "/.well-known/atproto-did", destination: "/api/atproto-did" }];
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
