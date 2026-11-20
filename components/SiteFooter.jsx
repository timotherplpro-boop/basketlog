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
    <nav className="foot-links foot-legal" aria-label={L.t("Informations légales", "Legal information", "Información legal", "Informações legais")}>
      {LEGAL_PAGES.map(([href, label]) => <Link key={href} href={L.href(href)}>{L.t(label, LEGAL_EN[href], LEGAL_ES[href], LEGAL_ES[href])}</Link>)}
      {/* Fonction de résiliation visible de toutes les pages (résiliation en ligne), qui mène à « Mon compte ». */}
      <Link href={L.href("/app/compte")}>{L.t("Résilier mon abonnement", "Cancel my subscription", "Cancelar mi suscripción", "Cancelar minha assinatura")}</Link>
      <CookieSettingsButton />
      {!compact && <InstallButton source="pied_de_page" />}
      {!compact && <LangSwitch />}
    </nav>
  );
  const notBetting = L.t("Analyses statistiques, pas un service de paris. Les probabilités sont des estimations, jamais des certitudes. Réservé aux 18 ans et plus.", "Statistical analysis, not a betting service. Probabilities are estimates, never certainties. For adults 18 and over.", "Análisis estadístico, no un servicio de apuestas. Las probabilidades son estimaciones, nunca certezas. Solo para mayores de 18 años.", "Análise estatística, não um serviço de apostas. As probabilidades são estimativas, nunca certezas. Somente para maiores de 18 anos.");
  const gambling = L.t(
    <>Les jeux d&apos;argent comportent des risques : endettement, dépendance… Appelle le {LEGAL.jeu.tel} ({LEGAL.jeu.nom}, appel non surtaxé).</>,
    <>Gambling involves risks such as debt and addiction. If you need help in the US, call 1-800-GAMBLER (National Problem Gambling Helpline); in France, {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>,
    <>El juego conlleva riesgos como el endeudamiento o la adicción. En España puedes pedir ayuda en jugarbien.es; en Francia, en el {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>, <>Apostas envolvem riscos como endividamento e dependência. Se precisar de ajuda, procure os Jogadores Anônimos (jogadoresanonimos.com.br); na França, ligue para {LEGAL.jeu.tel} ({LEGAL.jeu.nom}).</>
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
        <nav className="foot-links" aria-label={L.t("Liens du site", "Site links", "Enlaces del sitio", "Links do site")}>
          <Link href={L.href("/pronostic-basket")}>{L.t("Pronostic basket", "Basketball predictions", "Pronósticos de baloncesto", "Palpites de basquete")}</Link>
          <Link href={L.href("/analyse-basket")}>{L.t("Analyse basket", "Basketball analysis", "Análisis de baloncesto", "Análise de basquete")}</Link>
          <Link href={L.href("/app/matchs")}>{L.t("Pronostics NBA du jour", "Today's NBA predictions", "Pronósticos NBA de hoy", "Palpites NBA de hoje")}</Link>
          <Link href={L.href("/app/classement")}>{L.t("Classement NBA", "NBA standings", "Clasificación NBA", "Classificação NBA")}</Link>
          <Link href={L.href("/app/simulation")}>{L.t("Chances de playoffs NBA", "NBA playoff odds", "Probabilidades de playoffs NBA", "Chances de playoffs da NBA")}</Link>
          <Link href={L.href("/app/defi")}>{L.t("Jeu : bats le modèle", "Game: beat the model", "Juego: gana al modelo", "Jogo: vença o modelo")}</Link>
          <Link href={L.href("/app/noel")}>{L.t("Matchs NBA de Noël", "NBA Christmas Day games", "NBA en Navidad", "NBA no Natal")}</Link>
          <Link href={L.href("/app/francais")}>{L.t("Les Français en NBA", "French players in the NBA", "Franceses en la NBA", "Franceses na NBA")}</Link>
          <Link href={L.href("/app/espagnols")}>{L.t("Espagnols et Latinos en NBA", "Spanish and Latino NBA players", "Españoles y latinos en la NBA", "Espanhóis e latinos na NBA")}</Link>
          <Link href={L.href("/app/resultats")}>{L.t("Résultats NBA de la nuit", "NBA scores last night", "Resultados NBA de anoche", "Resultados da NBA de ontem")}</Link>
          <Link href={L.href("/app/programme")}>{L.t("Programme NBA et où regarder", "NBA TV schedule", "Horarios NBA y dónde ver", "Jogos da NBA e onde assistir")}</Link>
          <Link href={L.href("/app/leaders")}>{L.t("Meilleurs marqueurs NBA", "NBA scoring leaders", "Máximos anotadores NBA", "Cestinhas da NBA")}</Link>
          <Link href={L.href("/app/nba-cup")}>{L.t("NBA Cup", "NBA Cup", "NBA Cup", "NBA Cup")}</Link>
          <Link href={L.href("/app/euroleague")}>{L.t("Pronostics EuroLeague", "EuroLeague predictions", "Pronósticos Euroliga", "Palpites Euroliga")}</Link>
          <Link href={L.href("/app/bilan")}>{L.t("Taux de réussite", "Track record", "Porcentaje de acierto", "Taxa de acerto")}</Link>
          <Link href={L.href("/methode")}>{L.t("Méthode", "Methodology", "Metodología", "Metodologia")}</Link>
          <Link href={L.href("/fivethirtyeight-nba")}>{L.t("Alternative à FiveThirtyEight", "FiveThirtyEight alternative", "Alternativa a FiveThirtyEight", "Alternativa ao FiveThirtyEight")}</Link>
          <Link href={L.href("/pro")}>Basketlog Pro</Link>
          <Link href={L.href("/avis")}>{L.t("Avis", "Reviews", "Opiniones", "Avaliações")}</Link>
          <Link href={L.href("/widget")}>{L.t("Widget pour votre site", "Widget for your site", "Widget para tu web", "Widget para o seu site")}</Link>
          {/* Comptes officiels (mêmes adresses que sameAs dans app/layout.jsx) : liens visibles pour que Google
              relie ces pages au nom « Basketlog » et les découvre depuis le site. */}
          <a href="https://x.com/Basketlog" target="_blank" rel="me noopener">{L.t("Basketlog sur X", "Basketlog on X", "Basketlog en X", "Basketlog no X")}</a>
          <a href="https://www.youtube.com/@basketlog" target="_blank" rel="me noopener">{L.t("Basketlog sur YouTube", "Basketlog on YouTube", "Basketlog en YouTube", "Basketlog no YouTube")}</a>
          <a href="https://www.tiktok.com/@basketlog" target="_blank" rel="me noopener">{L.t("Basketlog sur TikTok", "Basketlog on TikTok", "Basketlog en TikTok", "Basketlog no TikTok")}</a>
          <a href="https://bsky.app/profile/basketlog.bsky.social" target="_blank" rel="me noopener">{L.t("Basketlog sur Bluesky", "Basketlog on Bluesky", "Basketlog en Bluesky", "Basketlog no Bluesky")}</a>
          <a href="https://www.instagram.com/basketlog_app/" target="_blank" rel="me noopener">{L.t("Basketlog sur Instagram", "Basketlog on Instagram", "Basketlog en Instagram", "Basketlog no Instagram")}</a>
          <a href="https://www.facebook.com/profile.php?id=61596281440513" target="_blank" rel="me noopener">{L.t("Basketlog sur Facebook", "Basketlog on Facebook", "Basketlog en Facebook", "Basketlog no Facebook")}</a>
          <a href="https://www.linkedin.com/company/basketlog" target="_blank" rel="me noopener">{L.t("Basketlog sur LinkedIn", "Basketlog on LinkedIn", "Basketlog en LinkedIn", "Basketlog no LinkedIn")}</a>
          <a href="https://t.me/basketlog" target="_blank" rel="me noopener">{L.t("Basketlog sur Telegram", "Basketlog on Telegram", "Basketlog en Telegram", "Basketlog no Telegram")}</a>
        </nav>
        {legal}
        <div>{notBetting}</div>
        <div>{gambling}</div>
        <div>{L.t("Données : flux publics NBA et EuroLeague · Photos : Unsplash", "Data: public NBA and EuroLeague feeds · Photos: Unsplash", "Datos: fuentes públicas de la NBA y la Euroliga · Fotos: Unsplash", "Dados: fontes públicas da NBA e da Euroliga · Fotos: Unsplash")} · © {new Date().getFullYear()} Basketlog</div>
      </div>
    </footer>
  );
}
