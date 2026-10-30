import Link from "next/link";
import CookieSettingsButton from "./CookieSettingsButton";
import LangSwitch from "./LangSwitch";
import { InstallButton } from "./InstallApp";
import { LEGAL, LEGAL_PAGES } from "../lib/legal";

const LEGAL_EN = { "/mentions-legales": "Legal notice", "/cgu": "Terms of use", "/cgv": "Terms of sale", "/confidentialite": "Privacy", "/cookies": "Cookies" };
const LEGAL_ES = { "/mentions-legales": "Aviso legal", "/cgu": "Condiciones de uso", "/cgv": "Condiciones de venta", "/confidentialite": "Privacidad", "/cookies": "Cookies" };

// Pied de page du site. Version compacte dans l'espace membre : mentions légales et avertissements seulement.
export default function SiteFooter({ L, compact = false }) {
  const legal = (
    <nav className="foot-links foot-legal" aria-label={L.t("Informations légales", "Legal information", "Información legal")}>
      {LEGAL_PAGES.map(([href, label]) => <Link key={href} href={L.href(href)}>{L.t(label, LEGAL_EN[href], LEGAL_ES[href])}</Link>)}
      <CookieSettingsButton />
      {!compact && <InstallButton source="pied_de_page" />}
      {!compact && <LangSwitch />}
    </nav>
  );
  const notBetting = L.t("Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes. Réservé aux 18 ans et plus.", "Statistical analysis, not a betting service. Probabilities are estimates, never certainties. For adults 18 and over.", "Análisis estadístico, no un servicio de apuestas. Las probabilidades son estimaciones, nunca certezas. Solo para mayores de 18 años.");
  const gambling = L.t(
    <>Les jeux d&apos;argent comportent des risques : endettement, dépendance… Appelle le {LEGAL.jeu.tel} ({LEGAL.jeu.nom}, appel non surtaxé).</>,
    <>Gambling involves risks such as debt and addiction. If you need help in France, call {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>,
    <>El juego conlleva riesgos como el endeudamiento o la adicción. En España puedes pedir ayuda en jugarbien.es; en Francia, en el {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>
  );

  if (compact) {
    return (
      <footer className="shell-foot">
        {legal}
        <div>{notBetting}</div>
        <div>{gambling}</div>
      </footer>
    );
  }
  return (
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
        {legal}
        <div>{notBetting}</div>
        <div>{gambling}</div>
        <div>{L.t("Données : flux publics NBA et EuroLeague · Photos : Unsplash", "Data: public NBA and EuroLeague feeds · Photos: Unsplash", "Datos: fuentes públicas de la NBA y la Euroliga · Fotos: Unsplash")} · © {new Date().getFullYear()} Basketlog</div>
      </div>
    </footer>
  );
}
