/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
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
