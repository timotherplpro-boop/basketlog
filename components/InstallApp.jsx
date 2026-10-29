"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useL } from "./LangProvider";
import { subscribe, installMode, promptInstall } from "../lib/pwa";
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

async function install(mode, source) {
  track("Clic installer appli", { source, mode });
  if (mode === "prompt") {
    const outcome = await promptInstall();
    track("Installation appli", { source, resultat: outcome || "indisponible" });
  } else if (mode === "ios") {
    window.dispatchEvent(new Event("bl-install-ios"));
  }
}

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M12 7v7M9 11l3 3 3-3" /></svg>
);

// Bouton « Installer l'appli » (menu, pied de page) : visible seulement quand l'installation est possible.
export function InstallButton({ className = "linklike", source = "bouton", icon = false }) {
  const L = useL();
  const mode = useInstallMode();
  if (!mode) return null;
  return (
    <button type="button" className={className} onClick={() => install(mode, source)}>
      {icon && <PhoneIcon />}{L.t("Installer l'appli", "Install the app")}
    </button>
  );
}

// Enregistre le service worker, propose l'installation sur mobile et affiche le mode d'emploi iPhone.
export default function InstallApp() {
  const L = useL();
  const mode = useInstallMode();
  const path = usePathname();
  const [banner, setBanner] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const reg = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (document.readyState === "complete") reg(); else window.addEventListener("load", reg, { once: true });
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get("source") === "pwa") track("Ouverture appli", {});
  }, []);

  useEffect(() => {
    const open = () => setIos(true);
    window.addEventListener("bl-install-ios", open);
    return () => window.removeEventListener("bl-install-ios", open);
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

  return (
    <>
      {banner && mode && (
        <div className="install-banner" role="dialog" aria-label={L.t("Installer l'appli Basketlog", "Install the Basketlog app")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={44} height={44} />
          <div className="ib-text">
            <b>{L.t("Basketlog sur ton écran d'accueil", "Basketlog on your home screen")}</b>
            <span>{L.t("Les pronostics du soir en un geste, comme une vraie appli. Gratuit.", "Tonight's predictions in one tap, like a real app. Free.")}</span>
          </div>
          <button type="button" className="ib-go" onClick={() => { setBanner(false); install(mode, "banniere"); }}>{L.t("Installer", "Install")}</button>
          <button type="button" className="ib-x" onClick={close} aria-label={L.t("Fermer", "Close")}>×</button>
        </div>
      )}
      {ios && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="ios-title" onClick={(e) => e.target === e.currentTarget && setIos(false)}>
          <div className="modal-box ios-sheet">
            <button className="modal-x" onClick={() => setIos(false)} aria-label={L.t("Fermer", "Close")}>×</button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="" width={64} height={64} className="ios-icon" />
            <h3 id="ios-title">{L.t("Installer Basketlog sur ton iPhone", "Install Basketlog on your iPhone")}</h3>
            <ol>
              <li>{L.en ? <>Tap the <b>Share</b> button <ShareIcon /> in Safari&apos;s toolbar.</> : <>Touche le bouton <b>Partager</b> <ShareIcon /> dans la barre de Safari.</>}</li>
              <li>{L.en ? <>Scroll down and choose <b>Add to Home Screen</b>.</> : <>Descends et choisis <b>Sur l&apos;écran d&apos;accueil</b>.</>}</li>
              <li>{L.en ? <>Tap <b>Add</b>: Basketlog appears next to your apps.</> : <>Touche <b>Ajouter</b> : Basketlog apparaît à côté de tes applis.</>}</li>
            </ol>
            <button className="btn-solid" onClick={() => setIos(false)}>{L.t("J'ai compris", "Got it")}</button>
          </div>
        </div>
      )}
    </>
  );
}

function ShareIcon() {
  return (
    <svg className="ios-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M12 3v12M8 7l4-4 4 4" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></svg>
  );
}
