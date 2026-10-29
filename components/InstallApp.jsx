"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useL } from "./LangProvider";
import { subscribe, installMode, promptInstall, isStandalone, isIOS, isAndroid } from "../lib/pwa";
import { getConsent } from "../lib/consent";
import { track } from "../lib/analytics";

const DISMISS = "bl_install_dismiss";
const SNOOZE = 30 * 864e5; // bannière refermée : on ne la remontre pas avant 30 jours

function useInstallMode() {
  const [mode, setMode] = useState(null);
  useEffect(() => {
    const up = () => setMode(installMode());
    up();
    return subscribe(up);
  }, []);
  return mode;
}

// Invitation native (Chrome, Edge, Android), mode d'emploi iPhone, sinon fenêtre « sur ton téléphone » (QR code).
// Avec une plateforme (boutons iPhone / Android de l'en-tête) : le mode d'emploi de ce téléphone-là.
async function install(mode, source, platform) {
  track("Clic installer appli", { source, mode: mode || "aide", ...(platform && { plateforme: platform }) });
  if (platform) {
    // Sur un téléphone, on installe sur ce téléphone quel que soit le bouton touché ;
    // sur ordinateur, QR code et étapes du téléphone choisi.
    const device = isIOS() ? "ios" : isAndroid() ? "android" : null;
    if (device === "ios") {
      window.dispatchEvent(new Event("bl-install-ios"));
      return;
    }
    if (!(device === "android" && mode === "prompt")) {
      window.dispatchEvent(new CustomEvent("bl-install-help", { detail: { platform: device || platform } }));
      return;
    }
  }
  if (mode === "prompt") {
    const outcome = await promptInstall();
    track("Installation appli", { source, resultat: outcome || "indisponible" });
  } else if (mode === "ios") {
    window.dispatchEvent(new Event("bl-install-ios"));
  } else {
    window.dispatchEvent(new Event("bl-install-help"));
  }
}

export const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M12 7v7M9 11l3 3 3-3" /></svg>
);

// Bouton « Installer l'appli » (menu, pied de page) : visible seulement quand l'installation directe est possible.
export function InstallButton({ className = "linklike", source = "bouton", icon = false }) {
  const L = useL();
  const mode = useInstallMode();
  if (!mode) return null;
  return (
    <button type="button" className={className} onClick={() => install(mode, source)}>
      {icon && <PhoneIcon />}{L.t("Installer l'appli", "Install the app", "Instalar la app")}
    </button>
  );
}

// Boutons iPhone et Android de l'en-tête, disposés comme les boutons de store de Visifoot.
// Icônes maison, pas les logos d'Apple ni de Google : Basketlog n'est pas sur leurs stores,
// ces boutons installent l'appli depuis le navigateur.
const IconIPhone = () => (
  <svg viewBox="0 0 24 24" aria-hidden>
    <rect x="1" y="1" width="22" height="22" rx="5.5" fill="#131515" />
    <path d="M12 5.6v8.6M8.9 8.7 12 5.6l3.1 3.1M9.2 11.4h-1a1.2 1.2 0 0 0-1.2 1.2v4.6a1.2 1.2 0 0 0 1.2 1.2h7.6a1.2 1.2 0 0 0 1.2-1.2v-4.6a1.2 1.2 0 0 0-1.2-1.2h-1" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconAndroid = () => (
  <svg viewBox="2.5 2.5 19 19" fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3.6v10.6M7.5 9.7l4.5 4.5 4.5-4.5M4.6 15.6v2.6a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-2.6" />
  </svg>
);
export function InstallPlatforms({ source = "en_tete", box = false, className = "" }) {
  const L = useL();
  const mode = useInstallMode();
  const [inApp, setInApp] = useState(false);
  useEffect(() => { setInApp(isStandalone()); }, []);
  if (inApp) return null;
  const buttons = [["ios", "iPhone", IconIPhone], ["android", "Android", IconAndroid]].map(([platform, name, Icon]) => {
    const label = L.t(`Installer l'appli Basketlog sur ${name}`, `Install the Basketlog app on ${name}`, `Instalar la app de Basketlog en ${name}`);
    return (
      <button key={platform} type="button" className="nav-sq nav-store" aria-label={label} title={label} onClick={() => install(mode, source, platform)}>
        <Icon />
      </button>
    );
  });
  return box ? <div className={`nav-box ${className}`.trim()}>{buttons}</div> : buttons;
}

function ShareIcon() {
  return (
    <svg className="ios-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
  );
}

// Enregistre le service worker, propose l'installation sur mobile et affiche les modes d'emploi.
export default function InstallApp() {
  const L = useL();
  const mode = useInstallMode();
  const path = usePathname();
  const [banner, setBanner] = useState(false);
  const [sheet, setSheet] = useState(null); // "ios" | "help" | null
  const [plat, setPlat] = useState(null); // "ios" | "android" | null : téléphone choisi dans l'en-tête
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const reg = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") reg(); else window.addEventListener("load", reg, { once: true });
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("source") === "pwa") track("Ouverture appli", {});
  }, []);

  useEffect(() => {
    const ios = () => setSheet("ios");
    const help = (e) => { setPlat(e?.detail?.platform || null); setMobile(window.matchMedia?.("(pointer: coarse)").matches && window.innerWidth < 900); setSheet("help"); };
    window.addEventListener("bl-install-ios", ios);
    window.addEventListener("bl-install-help", help);
    return () => { window.removeEventListener("bl-install-ios", ios); window.removeEventListener("bl-install-help", help); };
  }, []);

  // Bannière : mobile, après le choix sur les cookies, à partir de la 2e page vue, pas si refermée récemment.
  useEffect(() => {
    let views = 0;
    try { views = Number(sessionStorage.getItem("bl_views") || 0) + 1; sessionStorage.setItem("bl_views", String(views)); } catch {}
    if (!mode || window.innerWidth > 860 || !getConsent() || views < 2) return;
    let last = 0;
    try { last = Number(localStorage.getItem(DISMISS) || 0); } catch {}
    if (Date.now() - last < SNOOZE) return;
    setBanner(true);
  }, [path, mode]);

  const close = () => {
    setBanner(false);
    try { localStorage.setItem(DISMISS, String(Date.now())); } catch {}
  };

  const steps = {
    ios: L.t(
      <>
        <li>Touche le bouton <b>Partager</b> <ShareIcon /> dans la barre de Safari.</li>
        <li>Descends et choisis <b>Sur l&apos;écran d&apos;accueil</b>.</li>
        <li>Touche <b>Ajouter</b> : Basketlog apparaît à côté de tes applis.</li>
      </>,
      <>
        <li>Tap the <b>Share</b> button <ShareIcon /> in Safari&apos;s toolbar.</li>
        <li>Scroll down and choose <b>Add to Home Screen</b>.</li>
        <li>Tap <b>Add</b>: Basketlog appears next to your apps.</li>
      </>,
      <>
        <li>Toca el botón <b>Compartir</b> <ShareIcon /> en la barra de Safari.</li>
        <li>Desliza y elige <b>Añadir a pantalla de inicio</b>.</li>
        <li>Toca <b>Añadir</b>: Basketlog aparece junto a tus apps.</li>
      </>
    ),
    android: L.t(
      <><b>Android</b> : ouvre le menu <b>⋮</b> de Chrome, puis <b>Installer l&apos;application</b> (ou <b>Ajouter à l&apos;écran d&apos;accueil</b>).</>,
      <><b>Android</b>: open Chrome&apos;s <b>⋮</b> menu, then <b>Install app</b> (or <b>Add to Home screen</b>).</>,
      <><b>Android</b>: abre el menú <b>⋮</b> de Chrome y elige <b>Instalar aplicación</b> (o <b>Añadir a pantalla de inicio</b>).</>
    ),
    iphone: L.t(
      <><b>iPhone</b> : dans Safari, touche <b>Partager</b> <ShareIcon /> puis <b>Sur l&apos;écran d&apos;accueil</b>.</>,
      <><b>iPhone</b>: in Safari, tap <b>Share</b> <ShareIcon /> then <b>Add to Home Screen</b>.</>,
      <><b>iPhone</b>: en Safari, toca <b>Compartir</b> <ShareIcon /> y luego <b>Añadir a pantalla de inicio</b>.</>
    ),
  };

  return (
    <>
      {banner && mode && (
        <div className="install-banner" role="dialog" aria-label={L.t("Installer l'appli Basketlog", "Install the Basketlog app", "Instalar la app de Basketlog")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={44} height={44} />
          <div className="ib-text">
            <b>{L.t("Basketlog sur ton écran d'accueil", "Basketlog on your home screen", "Basketlog en tu pantalla de inicio")}</b>
            <span>{L.t("Les pronostics du soir en un geste, comme une vraie appli. Gratuit.", "Tonight's predictions in one tap, like a real app. Free.", "Los pronósticos de la noche en un toque, como una app de verdad. Gratis.")}</span>
          </div>
          <button type="button" className="ib-go" onClick={() => { setBanner(false); install(mode, "banniere"); }}>{L.t("Installer", "Install", "Instalar")}</button>
          <button type="button" className="ib-x" onClick={close} aria-label={L.t("Fermer", "Close", "Cerrar")}>×</button>
        </div>
      )}
      {sheet && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="install-title" onClick={(e) => e.target === e.currentTarget && setSheet(null)}>
          <div className="modal-box ios-sheet">
            <button className="modal-x" onClick={() => setSheet(null)} aria-label={L.t("Fermer", "Close", "Cerrar")}>×</button>
            {sheet === "ios" ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/icons/icon-192.png" alt="" width={64} height={64} className="ios-icon" />
                <h3 id="install-title">{L.t("Installer Basketlog sur ton iPhone", "Install Basketlog on your iPhone", "Instala Basketlog en tu iPhone")}</h3>
                <ol>{steps.ios}</ol>
              </>
            ) : (
              <>
                {mobile
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src="/icons/icon-192.png" alt="" width={64} height={64} className="ios-icon" />
                  : /* eslint-disable-next-line @next/next/no-img-element */ <img src={`/qr/${L.lang}.svg`} alt={L.t("QR code vers Basketlog", "QR code to Basketlog", "Código QR de Basketlog")} width={168} height={168} className="qr" />}
                <h3 id="install-title">{plat === "ios"
                  ? L.t("Basketlog sur ton iPhone", "Basketlog on your iPhone", "Basketlog en tu iPhone")
                  : plat === "android"
                    ? L.t("Basketlog sur ton téléphone Android", "Basketlog on your Android phone", "Basketlog en tu móvil Android")
                    : L.t("Basketlog sur ton téléphone", "Basketlog on your phone", "Basketlog en tu móvil")}</h3>
                <p className="modal-sub">
                  {plat
                    ? (mobile
                      ? L.t(`Pas besoin ${plat === "ios" ? "de l'App Store" : "de Google Play"} : l'appli s'installe directement depuis le navigateur, gratuitement.`, `No ${plat === "ios" ? "App Store" : "Google Play"} needed: the app installs straight from your browser, for free.`, `No hace falta ${plat === "ios" ? "el App Store" : "Google Play"}: la app se instala directamente desde el navegador, gratis.`)
                      : L.t(`Pas besoin ${plat === "ios" ? "de l'App Store" : "de Google Play"} : scanne ce code avec ton ${plat === "ios" ? "iPhone" : "téléphone Android"}, puis installe l'appli depuis le navigateur. C'est gratuit.`, `No ${plat === "ios" ? "App Store" : "Google Play"} needed: scan this code with your ${plat === "ios" ? "iPhone" : "Android phone"}, then install the app from the browser. It's free.`, `No hace falta ${plat === "ios" ? "el App Store" : "Google Play"}: escanea este código con tu ${plat === "ios" ? "iPhone" : "móvil Android"} y luego instala la app desde el navegador. Es gratis.`))
                    : mobile
                      ? L.t("L'appli s'installe directement depuis le navigateur, gratuitement, sans passer par un store.", "The app installs straight from your browser, for free, without any app store.", "La app se instala directamente desde el navegador, gratis, sin pasar por ninguna tienda.")
                      : L.t("Scanne ce code avec ton téléphone, puis installe l'appli depuis le navigateur : c'est gratuit et sans store.", "Scan this code with your phone, then install the app from the browser: it's free and needs no app store.", "Escanea este código con tu móvil y luego instala la app desde el navegador: es gratis y sin tiendas.")}
                </p>
                <ul className="install-steps">
                  {plat !== "android" && <li>{steps.iphone}</li>}
                  {plat !== "ios" && <li>{steps.android}</li>}
                </ul>
              </>
            )}
            <button className="btn-solid" onClick={() => setSheet(null)}>{L.t("J'ai compris", "Got it", "Entendido")}</button>
          </div>
        </div>
      )}
    </>
  );
}
