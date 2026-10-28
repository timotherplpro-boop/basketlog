const SITE = "https://basketlog-zeta.vercel.app";
export default function robots() {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/api/"] }], sitemap: `${SITE}/sitemap.xml` };
}
