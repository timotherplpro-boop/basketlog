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
import WelcomeToast from "../components/WelcomeToast";
import CookieSettingsButton from "../components/CookieSettingsButton";
import { LEGAL, LEGAL_PAGES } from "../lib/legal";
import JsonLd from "../components/JsonLd";
import { SITE, GOOGLE_SITE_VERIFICATION, BING_SITE_VERIFICATION } from "../lib/site";
import { getL, getPath } from "../lib/lang-server";
import LangProvider from "../components/LangProvider";
import LangSwitch from "../components/LangSwitch";

export async function generateMetadata() {
  const L = await getL();
  const title = L.t("Basketlog : pronostics NBA et EuroLeague analysés par IA", "Basketlog: AI-powered NBA and EuroLeague predictions");
  const description = L.t(
    "Pronostics NBA et EuroLeague pour chaque match : probabilités de victoire gratuites, score projeté, absences, forme et scénarios. Taux de réussite public.",
    "NBA and EuroLeague predictions for every game: free win probabilities, projected score, injuries, form and scenarios. Public track record."
  );
  return {
    metadataBase: new URL(SITE),
    title,
    applicationName: "Basketlog",
    twitter: { card: "summary_large_image" },
    description,
    openGraph: { title, description, type: "website", locale: L.en ? "en_US" : "fr_FR", siteName: "Basketlog" },
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
  const LEGAL_EN = { "/mentions-legales": "Legal notice", "/cgu": "Terms of use", "/cgv": "Terms of sale", "/confidentialite": "Privacy", "/cookies": "Cookies" };
  return (
    <html lang={L.lang}>
      <head>
        {/* Validations Search Console et Bing : écrites en dur pour être toujours dans le <head>, quel que soit le visiteur */}
        <meta name="google-site-verification" content={GOOGLE_SITE_VERIFICATION} />
        <meta name="msvalidate.01" content={BING_SITE_VERIFICATION} />
        <link rel="preconnect" href="https://images.unsplash.com" />
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <LangProvider lang={L.lang} path={path}>
          <JsonLd data={SITE_LD} />
          <Analytics />
          <Nav />
          {children}
          <footer>
            <div className="foot">
              <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
              <nav className="foot-links" aria-label={L.t("Liens du site", "Site links")}>
                <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du jour", "Today's NBA predictions")}</Link>
                <Link href={L.href("/app/classement")}>{L.t("Classement NBA", "NBA standings")}</Link>
                <Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague", "EuroLeague predictions")}</Link>
                <Link href={L.href("/app/bilan")}>{L.t("Taux de réussite", "Track record")}</Link>
                <Link href={L.href("/methode")}>{L.t("Méthode", "Methodology")}</Link>
                <Link href={L.href("/pro")}>Basketlog Pro</Link>
                <Link href={L.href("/avis")}>{L.t("Avis", "Reviews")}</Link>
              </nav>
              <nav className="foot-links foot-legal" aria-label={L.t("Informations légales", "Legal information")}>
                {LEGAL_PAGES.map(([href, label]) => <Link key={href} href={L.href(href)}>{L.en ? LEGAL_EN[href] : label}</Link>)}
                <CookieSettingsButton />
                <LangSwitch />
              </nav>
              <div>{L.t("Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes. Réservé aux 18 ans et plus.", "Statistical analysis, not a betting service. Probabilities are estimates, never certainties. For adults 18 and over.")}</div>
              <div>{L.en ? <>Gambling involves risks such as debt and addiction. If you need help in France, call {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</> : <>Les jeux d&apos;argent comportent des risques : endettement, dépendance… Appelle le {LEGAL.jeu.tel} ({LEGAL.jeu.nom}, appel non surtaxé).</>}</div>
              <div>{L.t("Données : flux publics NBA et EuroLeague · Photos : Unsplash", "Data: public NBA and EuroLeague feeds · Photos: Unsplash")} · © {new Date().getFullYear()} Basketlog</div>
            </div>
          </footer>
          <WelcomeToast />
          <CookieBanner />
        </LangProvider>
      </body>
    </html>
  );
}
