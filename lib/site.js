// Adresse publique du site. Pour passer sur un nom de domaine, définir NEXT_PUBLIC_SITE_URL dans Vercel.
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://basketlog-app.com").replace(/\/$/, "");
