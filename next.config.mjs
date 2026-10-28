/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Robots (Google, Bing, IA…) : titres, descriptions et balises dans le <head> dès le premier octet,
  // sans streaming. Les visiteurs gardent le rendu en streaming, plus rapide.
  htmlLimitedBots: /bot|crawl|spider|slurp|Google|Bing|yandex|baidu|Lighthouse|facebookexternalhit|facebookcatalog|WhatsApp|Twitter|LinkedIn|Slack|Discord|SkypeUriPreview|vkShare|quora|tumblr|ia_archiver|Yeti|Perplexity|ChatGPT|Claude|Applebot/i,
  // L'ancienne adresse Vercel renvoie définitivement vers le nom de domaine.
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
