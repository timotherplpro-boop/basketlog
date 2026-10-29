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
import Link from "next/link";
import Nav from "../components/Nav";
import Analytics from "../components/Analytics";
import CookieBanner from "../components/CookieBanner";
import CookieSettingsButton from "../components/CookieSettingsButton";
import { LEGAL, LEGAL_PAGES } from "../lib/legal";
import JsonLd from "../components/JsonLd";
import { SITE, GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION } from "../lib/site";

export const metadata = {
  metadataBase: new URL(SITE),
  title: "Basketlog : pronostics NBA et EuroLeague analysés par IA",
  applicationName: "Basketlog",
  twitter: { card: "summary_large_image" },
  description:
    "Pronostics NBA et EuroLeague pour chaque match : probabilités de victoire gratuites, score projeté, absences, forme et scénarios. Taux de réussite public.",
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
        {/* Validations Search Console et Bing : écrites en dur pour être toujours dans le <head>, quel que soit le visiteur */}
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
        <meta name="msvalidate.01" content={BING_SITE_VERIFICATION} />
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
            <nav className="foot-links" aria-label="Liens du site">
              <Link href="/app/matchs">Pronostics NBA du jour</Link>
              <Link href="/app/classement">Classement NBA</Link>
              <Link href="/app/euroleague">Pronostics EuroLeague</Link>
              <Link href="/app/bilan">Taux de réussite</Link>
              <Link href="/methode">Méthode</Link>
              <Link href="/pro">Basketlog Pro</Link>
              <Link href="/avis">Avis</Link>
            </nav>
            <nav className="foot-links foot-legal" aria-label="Informations légales">
              {LEGAL_PAGES.map(([href, label]) => <Link key={href} href={href}>{label}</Link>)}
              <CookieSettingsButton />
            </nav>
            <div>Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes. Réservé aux 18 ans et plus.</div>
            <div>Les jeux d&apos;argent comportent des risques : endettement, dépendance… Appelle le {LEGAL.jeu.tel} ({LEGAL.jeu.nom}, appel non surtaxé).</div>
            <div>Données : flux publics NBA et EuroLeague · Photos : Unsplash · © {new Date().getFullYear()} Basketlog</div>
          </div>
        </footer>
        <CookieBanner />
      </body>
    </html>
  );
}
