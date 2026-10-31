// Polices hébergées sur Basketlog (aucun appel à Google Fonts : rien n'est transmis à Google)
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import "@fontsource/inter/latin-800.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "@fontsource/tilt-warp/latin-400.css";
import "./globals.css";
import { cookies } from "next/headers";
import Nav from "../components/Nav";
import Analytics from "../components/Analytics";
import CookieBanner from "../components/CookieBanner";
import WelcomeToast from "../components/WelcomeToast";
import JsonLd from "../components/JsonLd";
import { SITE, GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION } from "../lib/site";
import { getL, getPath } from "../lib/lang-server";
import LangProvider from "../components/LangProvider";
import InstallApp from "../components/InstallApp";
import SiteFooter from "../components/SiteFooter";
import SiteChrome from "../components/SiteChrome";
import { COOKIE, decodeSession, aiReady } from "../lib/pro";
import { homeTitle } from "../lib/seo";

export async function generateMetadata() {
  const L = await getL();
  const title = homeTitle(L, aiReady());
  const description = L.t(
    "Pronostics NBA et EuroLeague pour chaque match : probabilités de victoire gratuites, score projeté, absences, forme et scénarios. Taux de réussite public.",
    "NBA and EuroLeague predictions for every game: free win probabilities, projected score, injuries, form and scenarios. Public track record.",
    "Pronósticos de la NBA y la Euroliga para cada partido: probabilidades de victoria gratis, marcador proyectado, bajas, forma y escenarios. Balance público."
  );
  return {
    metadataBase: new URL(SITE),
    title,
    applicationName: "Basketlog",
    formatDetection: { telephone: false },
    twitter: { card: "summary_large_image" },
    description,
    openGraph: { title, description, type: "website", locale: L.og, siteName: "Basketlog" },
  };
}

export const viewport = { themeColor: "#040817", width: "device-width", initialScale: 1 };

const SITE_LD = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organisation`,
    name: "Basketlog",
    url: SITE,
    logo: `${SITE}/icon.svg`,
    description: "Analyses et pronostics statistiques des matchs NBA et EuroLeague.",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#site`,
    name: "Basketlog",
    alternateName: ["Basket Log", "basketlog-app.com"],
    url: SITE,
    inLanguage: ["fr-FR", "en-US"],
    publisher: { "@id": `${SITE}/#organisation` },
  },
];

export default async function RootLayout({ children }) {
  const L = await getL();
  const path = await getPath();
  // Membre connecté : dans l'espace analyse (/app, /pro), la barre latérale remplace l'en-tête et le pied de page du site.
  const member = !!decodeSession((await cookies()).get(COOKIE)?.value)?.uid;
  return (
    <html lang={L.lang}>
      <head>
        {/* Validations Search Console et Bing : écrites en dur pour être toujours dans le <head>, quel que soit le visiteur */}
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
        <meta name="msvalidate.01" content={BING_SITE_VERIFICATION} />
        <link rel="preconnect" href="https://images.unsplash.com" />
        {/* Appli installable : manifeste et icônes dans le <head> dès le premier octet (requis par Chrome et Safari) */}
        <link rel="manifest" href={L.t("/manifest.webmanifest", "/manifest-en.webmanifest", "/manifest-es.webmanifest")} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Basketlog" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <LangProvider lang={L.lang} path={path}>
          <JsonLd data={SITE_LD} />
          <Analytics />
          <SiteChrome member={member}><Nav /></SiteChrome>
          {children}
          <SiteChrome member={member}><SiteFooter L={L} /></SiteChrome>
          <WelcomeToast />
          <CookieBanner />
          <InstallApp />
        </LangProvider>
      </body>
    </html>
  );
}
