"use client";
// Offre de dernière chance (voir lib/exit-offer.js) : une remise unique, proposée une fois à un compte gratuit qui s'en va
// sans s'abonner. Deux endroits : la fenêtre « analyse complète » (UnlockModal, quand on la ferme, sur téléphone comme sur
// ordinateur) et la page /pro (sortie de la souris par le haut de la fenêtre, ordinateur seulement). Éteinte par défaut :
// /api/offre ne répond un code que si l'offre est réglée ET confirmée par Whop. Jamais de fausse urgence : pas de minuteur.
import { trialTexts } from "../lib/pricing";
import { useCurrency } from "../lib/use-currency";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "../lib/analytics";
import { CODE_RE } from "../lib/promo";
import { pctOf } from "../lib/i18n";
import { localStore } from "../lib/safe-store";
import { EXIT_ARM_MS, exitAllowed, exitMark, offerLine } from "../lib/exit-offer-ui";
import { useL } from "./LangProvider";
import { useFocusTrap } from "./useFocusTrap";

let asked = null; // une seule demande à /api/offre par page chargée

// L'offre active { code, pct, mois }, ou null tant qu'elle est éteinte (ou pas encore connue).
export function useExitOffer(enabled = true) {
  const [offer, setOffer] = useState(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    asked ||= fetch("/api/offre").then((r) => r.json()).catch(() => ({}));
    asked.then((j) => {
      if (!alive || !j || !CODE_RE.test(String(j.code)) || !Number.isInteger(j.pct) || j.pct < 1 || j.pct > 90) return;
      setOffer({ code: j.code, pct: j.pct, mois: Number.isInteger(j.mois) && j.mois >= 0 && j.mois <= 36 ? j.mois : 1 });
    });
    return () => { alive = false; };
  }, [enabled]);
  return offer;
}

const Cross = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
);

// Contenu de l'offre. `href` : le bouton est un lien (vers /pro avec le code) ; sans `href`, c'est un bouton (la page /pro
// applique elle-même le code).
export function ExitOfferBody({ offer, href, onAccept, onDecline, titleId = "exo-title", trial = 0 }) {
  const L = useL();
  const tt = trialTexts(L, useCurrency());
  // 20/11/2026 : dans la fenêtre « analyse complète », l'offre de sortie propose l'essai gratuit Pro (plus parlant que
  // la remise : 2 clics sur 30 affichages) ; la page /pro garde la remise.
  if (trial > 0) {
    return (
      <div className="exo">
        <span className="exo-eyebrow">{L.t("Avant de partir", "Before you go", "Antes de irte", "Antes de você ir")}</span>
        <h3 id={titleId}>{L.t(`Essaie Pro ${trial} jours pour ${tt.one}`, `Try Pro for ${trial} days for ${tt.one}`, `Prueba Pro ${trial} días por ${tt.one}`, `Teste o Pro por ${trial} dias por ${tt.one}`)}</h3>
        <p className="exo-sub">{L.t(`Toutes les analyses complètes, sur tous les matchs. ${tt.one} aujourd'hui (+ taxes), puis ${tt.pro}/mois + taxes. Résiliable à tout moment avant la fin de l'essai.`, `Every full analysis, on every game. ${tt.one} today (+ tax), then ${tt.pro}/mo (+ tax). Cancel anytime before the trial ends.`, `Todos los análisis completos, en todos los partidos. ${tt.one} hoy (+ impuestos), luego ${tt.pro}/mes + impuestos. Cancela cuando quieras antes de que termine la prueba.`, `Todas as análises completas, em todos os jogos. ${tt.one} hoje (+ impostos), depois ${tt.pro}/mês + impostos. Cancele quando quiser antes do fim do teste.`)}</p>
        <a href={href} className="btn-solid exo-cta" onClick={onAccept}>🎁 {L.t(`Démarrer l'essai à ${tt.one}`, `Start the ${tt.one} trial`, `Empezar la prueba por ${tt.one}`, `Começar o teste por ${tt.one}`)}</a>
        <button type="button" className="exo-no" onClick={onDecline}>{L.t("Non merci", "No thanks", "No, gracias", "Não, obrigado")}</button>
      </div>
    );
  }
  const cta = L.t("Profiter de la remise", "Claim the discount", "Aprovechar el descuento", "Aproveitar o desconto");
  return (
    <div className="exo">
      <span className="exo-eyebrow">{L.t("Avant de partir", "Before you go", "Antes de irte", "Antes de você ir")}</span>
      <h3 id={titleId}>{offerLine(L, pctOf(offer.pct / 100, L), offer.mois)}</h3>
      <p className="exo-sub">
        {L.t("Un coup de pouce pour te lancer. Le code ", "A little help to get you started. Code ", "Un empujón para empezar. El código ", "Um empurrãozinho para começar. O código ")}
        <b className="exo-code">{offer.code}</b>
        {href
          ? L.t(" s'applique tout seul sur la page des formules.", " is applied automatically on the plans page.", " se aplica solo en la página de planes.", " é aplicado sozinho na página de planos.")
          : L.t(" s'applique en un clic sur les prix.", " is applied in one click on the prices.", " se aplica con un clic en los precios.", " é aplicado com um clique nos preços.")}
      </p>
      {href
        ? <a href={href} className="btn-solid exo-cta" onClick={onAccept}>{cta}</a>
        : <button type="button" className="btn-solid exo-cta" onClick={onAccept}>{cta}</button>}
      <button type="button" className="exo-no" onClick={onDecline}>{L.t("Non merci", "No thanks", "No, gracias", "Não, obrigado")}</button>
    </div>
  );
}

// Page /pro, ordinateur seulement : la souris sort par le haut de la fenêtre (vers les onglets ou la barre d'adresse) après
// 8 secondes sur la page. `enabled` : la personne n'a jamais payé et n'a pas déjà un code appliqué. `onApply(code)` applique
// le code sur les prix de la page.
export function ProExitIntent({ enabled, onApply }) {
  const L = useL();
  const offer = useExitOffer(enabled);
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useFocusTrap(box, open, null);

  const decline = useCallback(() => {
    setOpen(false);
    track("Offre de sortie refusée", { lieu: "page_pro" });
  }, []);
  const accept = useCallback(() => {
    setOpen(false);
    track("Clic offre de sortie", { lieu: "page_pro", code: offer?.code, remise: offer?.pct });
    if (offer) onApply?.(offer.code);
  }, [offer, onApply]);

  useEffect(() => {
    if (!enabled || !offer || open) return;
    let fine = false;
    try { fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches; } catch {}
    if (!fine) return; // téléphone ou tablette : pas de « sortie » à repérer, la fenêtre « analyse complète » s'en charge
    let armed = false;
    const t = setTimeout(() => { armed = true; }, EXIT_ARM_MS);
    const out = (e) => {
      if (!armed || e.relatedTarget || e.clientY > 0) return; // sortie par le haut de la fenêtre seulement
      const store = localStore();
      if (!exitAllowed(store)) return;
      exitMark(store);
      setOpen(true);
      track("Offre de sortie affichée", { lieu: "page_pro", code: offer.code, remise: offer.pct });
    };
    document.addEventListener("mouseout", out);
    return () => { clearTimeout(t); document.removeEventListener("mouseout", out); };
  }, [enabled, offer, open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && decline();
    document.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", esc); };
  }, [open, decline]);

  if (!open || !offer) return null;
  return createPortal(
    <div className="modal exo-modal" role="dialog" aria-modal="true" aria-labelledby="exo-title" onClick={(e) => e.target === e.currentTarget && decline()}>
      <div className="modal-box exo-box" ref={box} tabIndex={-1}>
        <button type="button" className="ulk-x" onClick={decline} aria-label={L.t("Fermer", "Close", "Cerrar", "Fechar")}><Cross /></button>
        <ExitOfferBody offer={offer} onAccept={accept} onDecline={decline} />
      </div>
    </div>,
    document.body
  );
}
