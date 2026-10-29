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
import InstallApp, { InstallButton } from "../components/InstallApp";

export async function generateMetadata() {
  const L = await getL();
  const title = L.t("Basketlog : pronostics NBA et EuroLeague analysés par IA", "Basketlog: AI-powered NBA and EuroLeague predictions", "Basketlog: pronósticos NBA y Euroliga analizados con IA");
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
  const LEGAL_EN = { "/mentions-legales": "Legal notice", "/cgu": "Terms of use", "/cgv": "Terms of sale", "/confidentialite": "Privacy", "/cookies": "Cookies" };
  const LEGAL_ES = { "/mentions-legales": "Aviso legal", "/cgu": "Condiciones de uso", "/cgv": "Condiciones de venta", "/confidentialite": "Privacidad", "/cookies": "Cookies" };
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
          <Nav />
          {children}
          <footer>
            <div className="foot">
              <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
              <nav className="foot-links" aria-label={L.t("Liens du site", "Site links", "Enlaces del sitio")}>
                <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du jour", "Today's NBA predictions", "Pronósticos NBA de hoy")}</Link>
                <Link href={L.href("/app/classement")}>{L.t("Classement NBA", "NBA standings", "Clasificación NBA")}</Link>
                <Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague", "EuroLeague predictions", "Pronósticos Euroliga")}</Link>
                <Link href={L.href("/app/bilan")}>{L.t("Taux de réussite", "Track record", "Porcentaje de acierto")}</Link>
                <Link href={L.href("/methode")}>{L.t("Méthode", "Methodology", "Metodología")}</Link>
                <Link href={L.href("/pro")}>Basketlog Pro</Link>
                <Link href={L.href("/avis")}>{L.t("Avis", "Reviews", "Opiniones")}</Link>
              </nav>
              <nav className="foot-links foot-legal" aria-label={L.t("Informations légales", "Legal information", "Información legal")}>
                {LEGAL_PAGES.map(([href, label]) => <Link key={href} href={L.href(href)}>{L.t(label, LEGAL_EN[href], LEGAL_ES[href])}</Link>)}
                <CookieSettingsButton />
                <InstallButton source="pied_de_page" />
                <LangSwitch />
              </nav>
              <div>{L.t("Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes. Réservé aux 18 ans et plus.", "Statistical analysis, not a betting service. Probabilities are estimates, never certainties. For adults 18 and over.", "Análisis estadístico, no un servicio de apuestas. Las probabilidades son estimaciones, nunca certezas. Solo para mayores de 18 años.")}</div>
              <div>{L.t(
                <>Les jeux d&apos;argent comportent des risques : endettement, dépendance… Appelle le {LEGAL.jeu.tel} ({LEGAL.jeu.nom}, appel non surtaxé).</>,
                <>Gambling involves risks such as debt and addiction. If you need help in France, call {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>,
                <>El juego conlleva riesgos como el endeudamiento o la adicción. En España puedes pedir ayuda en jugarbien.es; en Francia, en el {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>
              )}</div>
              <div>{L.t("Données : flux publics NBA et EuroLeague · Photos : Unsplash", "Data: public NBA and EuroLeague feeds · Photos: Unsplash", "Datos: fuentes públicas de la NBA y la Euroliga · Fotos: Unsplash")} · © {new Date().getFullYear()} Basketlog</div>
            </div>
          </footer>
          <WelcomeToast />
          <CookieBanner />
          <InstallApp />
        </LangProvider>
      </body>
    </html>
  );
}
