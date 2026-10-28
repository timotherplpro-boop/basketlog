import "./globals.css";
import Link from "next/link";
import Nav from "../components/Nav";
import Analytics from "../components/Analytics";
import JsonLd from "../components/JsonLd";
import { SITE, GOOGLE_SITE_VERIFICATION } from "../lib/site";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "Basketlog : pronostics NBA et EuroLeague analysés par IA",
  applicationName: "Basketlog",
  twitter: { card: "summary_large_image" },
  description:
    "Pronostics NBA et EuroLeague pour chaque match : probabilités de victoire gratuites, score projeté, absences, forme et scénarios. Taux de réussite public.",
  verification: { google: GOOGLE_SITE_VERIFICATION },
  openGraph: {
    title: "Basketlog : pronostics NBA et EuroLeague analysés par IA",
    description: "Probabilités, score projeté et scénarios pour chaque match NBA et EuroLeague.",
    type: "website",
    locale: "fr_FR",
    siteName: "Basketlog",
  },
};

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
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE}/#organisation` },
  },
];

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Tilt+Warp&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <JsonLd data={SITE_LD} />
        <Analytics />
        <Nav />
        {children}
        <footer>
          <div className="foot">
            <Link href="/" className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
            <div>Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes.</div>
            <div>Données : flux publics NBA et EuroLeague · Photos : Unsplash · © {new Date().getFullYear()} Basketlog</div>
          </div>
        </footer>
      </body>
    </html>
  );
}
