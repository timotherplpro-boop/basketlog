"use client";
// Invitation aux notifications du soir dans l'appli installée (27/11/2026 : 30 installations, 123 ouvertures et seulement
// 3 abonnés en 30 jours). Petite carte en bas de l'écran, jamais bloquante, à partir de la 2e ouverture de l'appli, tant que
// les notifications ne sont pas actives sur l'appareil et que la permission n'a pas été refusée. « Activer » : demande de
// permission et abonnement par le circuit de PushOptIn ; « Plus tard » : plus rien pendant 7 jours (règles : lib/push-invite.js).
// Jamais sur une fiche match ou un résultat d'analyse (la fenêtre « analyse complète » s'y ouvre), ni sur la page des formules
// ou le paiement (lib/push-invite.js, invitePathOk), ni pendant une fenêtre
// (questions d'accueil, offre de sortie, analyse complète, connexion…), le bandeau cookies, le menu ou l'encart de paiement.
// Rien n'est demandé au serveur avant le geste « Activer » (aucune consommation Vercel en plus).
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { isStandalone } from "../lib/pwa";
import { localStore } from "../lib/safe-store";
import { inviteDue, invitePathOk, markShown, noteOpen, noteSeen, snoozeInvite } from "../lib/push-invite";
import { PUSH_EVENT, activatePush, pushState } from "./PushOptIn";
import { useL } from "./LangProvider";

// Tout ce qui occupe déjà l'écran : les fenêtres (aria-modal), le bandeau cookies, l'encart de retour de paiement, la question
// « comment as-tu connu Basketlog ? », le menu mobile ouvert et la barre d'aperçu de l'admin.
const BUSY = '[aria-modal="true"], .cookie-banner, .pay-return, .src-ask, .mmenu.open, .preview-bar';
const QUIET_MS = 3000; // la carte n'arrive qu'après 3 secondes d'écran libre (pas pendant le chargement ni juste après une fenêtre)

export default function PushInvite() {
  const L = useL();
  // N° de l'ouverture en cours quand la carte est à proposer (2e ouverture ou plus, pas de « Plus tard » récent, notifications
  // pas actives), 0 sinon : l'événement « affichée » repart ainsi à chaque nouvelle ouverture.
  const [due, setDue] = useState(0);
  const [free, setFree] = useState(false); // rien d'autre à l'écran, et pas sur une fiche match
  const [busy, setBusy] = useState(false); // demande de permission en cours
  const [done, setDone] = useState(false); // confirmation après l'activation (quelques secondes)

  // Compte des ouvertures de l'appli installée, et vérification de l'état des notifications sur l'appareil.
  useEffect(() => {
    if (!isStandalone()) return;
    const store = localStore();
    if (!store) return;
    let alive = true;
    const check = async () => {
      const s = noteOpen(store);
      if (!inviteDue(s)) { setDue(0); return; }
      const st = await pushState();
      if (alive) setDue(st === "off" ? s.n : 0);
    };
    const vis = () => (document.visibilityState === "visible" ? check() : noteSeen(store));
    const bye = () => noteSeen(store);
    // Notifications activées ou coupées ailleurs (page des matchs, barre latérale) : la carte s'efface. Coupées à la main :
    // on ne relance pas l'invitation avant 7 jours.
    const onPush = (e) => { if (e.detail === "off") snoozeInvite(store); setDue(0); };
    check();
    document.addEventListener("visibilitychange", vis);
    window.addEventListener("pagehide", bye);
    window.addEventListener(PUSH_EVENT, onPush);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", vis);
      window.removeEventListener("pagehide", bye);
      window.removeEventListener(PUSH_EVENT, onPush);
    };
  }, []);

  // Écran libre ? Vérifié chaque seconde tant que la carte est à proposer (fenêtre qui s'ouvre, changement de page…).
  useEffect(() => {
    if (!due) { setFree(false); return; }
    let quiet = Date.now();
    const tick = () => {
      if (!invitePathOk(location.pathname, location.search) || document.querySelector(BUSY)) { quiet = 0; setFree(false); return; }
      if (!quiet) quiet = Date.now();
      setFree(Date.now() - quiet >= QUIET_MS);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [due]);

  // Première apparition pendant cette ouverture : un seul événement « affichée », même si la carte s'efface et revient.
  useEffect(() => {
    if (!due || !free) return;
    const store = localStore();
    if (markShown(store)) track("Invitation notifications affichée", { ouverture: due });
  }, [due, free]);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 3500);
    return () => clearTimeout(t);
  }, [done]);

  const accept = async () => {
    // activatePush demande la permission tout de suite : rien d'asynchrone avant (iPhone exige le geste).
    setBusy(true);
    track("Invitation notifications acceptée", { ouverture: due });
    const r = await activatePush(L.lang, "invitation");
    setBusy(false);
    if (r === "error") return; // panne passagère : la carte reste, la personne peut réessayer
    if (r === "off") snoozeInvite(localStore()); // fenêtre de permission fermée sans réponse : on n'insiste pas avant 7 jours
    setDue(0);
    if (r === "on") setDone(true);
  };

  const later = () => {
    track("Invitation notifications refusée", { ouverture: due });
    snoozeInvite(localStore());
    setDue(0);
  };

  if (done) {
    return (
      <div className="push-invite pi-done" role="status">
        <b>🔔 {L.t("C'est activé : une notification par jour, avant les matchs.", "You're in: one alert a day, before the games.", "Listo: un aviso al día, antes de los partidos.", "Pronto: um aviso por dia, antes dos jogos.")}</b>
      </div>
    );
  }
  if (!due || !free) return null;
  return (
    <div className="push-invite" role="dialog" aria-labelledby="pi-title">
      <div className="pi-text">
        <b id="pi-title">🔔 {L.t("Chaque soir, les matchs à ne pas rater", "Every evening, the games you can't miss", "Cada noche, los partidos que no te puedes perder", "Toda noite, os jogos que você não pode perder")}</b>
        <span>{L.t("Une notification par jour, avant les matchs. Tu peux l'arrêter quand tu veux.", "One alert a day, before the games. Turn it off anytime.", "Un aviso al día, antes de los partidos. Puedes quitarlo cuando quieras.", "Um aviso por dia, antes dos jogos. Você pode desativar quando quiser.")}</span>
      </div>
      <div className="pi-actions">
        <button type="button" className="pi-go" onClick={accept} disabled={busy}>{L.t("Activer", "Turn on", "Activar", "Ativar")}</button>
        <button type="button" className="pi-later" onClick={later} disabled={busy}>{L.t("Plus tard", "Later", "Más tarde", "Mais tarde")}</button>
      </div>
    </div>
  );
}
