"use client";
// Formulaire de paiement Whop intégré à la page /paiement (voir lib/whop-pay.js) : le visiteur paie sans quitter
// Basketlog et sans créer de compte Whop. Au paiement confirmé, il part sur /api/pay/retour, qui vérifie le paiement chez
// Whop et ouvre son accès.
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

export default function PayCheckout({ plan, planName, priceText, perText, code = "" }) {
  const L = useL();
  const lang = L.en ? "en" : L.es ? "es" : "fr";
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [stateId, setStateId] = useState(undefined);
  const done = useRef(false);

  const finish = (payment, status = "succeeded") => {
    if (done.current) return;
    done.current = true;
    track("Paiement intégré", { etape: "réussi", formule: plan });
    window.location.assign(`/api/pay/retour?payment=${encodeURIComponent(payment)}&status=${encodeURIComponent(status)}&l=${lang}`);
  };

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    // Retour d'une étape de validation bancaire (3D Secure) : Whop renvoie ici avec le paiement, ou un état à restaurer.
    const payment = q.get("payment");
    if (payment) { finish(payment, q.get("status") || "succeeded"); return; }
    if (q.get("state_id")) setStateId(q.get("state_id"));
    let next = "";
    try { next = sessionStorage.getItem("bl_pay_next") || ""; } catch {}
    track("Paiement intégré", { etape: "ouvert", formule: plan, ...(code ? { code_promo: code } : {}) });
    fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, lang, next }) })
      .then((r) => r.json().catch(() => ({})))
      .then((j) => (j?.ok && j.session ? setSession(j.session) : setError(j?.error || "whop")))
      .catch(() => setError("reseau"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan]);

  const returnUrl = typeof window !== "undefined"
    ? `${window.location.origin}${window.location.pathname}?plan=${plan}${code ? `&code=${encodeURIComponent(code)}` : ""}`
    : undefined;

  return (
    <div className="pay-box">
      <div className="pay-sum">
        <span className="pay-plan">{planName}</span>
        <b>{priceText}</b><span className="pay-per">{perText}</span>
        {code && <small className="pay-code">{L.t(`Code ${code} appliqué au paiement`, `Code ${code} applied at checkout`, `Código ${code} aplicado al pago`)}</small>}
      </div>
      {error ? (
        <div className="pay-err" role="alert">
          <p>{error === "config"
            ? L.t("Le paiement n'est pas disponible pour le moment. Reviens très bientôt.", "Payment isn't available right now. Please come back soon.", "El pago no está disponible por ahora. Vuelve muy pronto.")
            : error === "trop"
              ? L.t("Trop d'essais. Attends quelques minutes avant de réessayer.", "Too many attempts. Wait a few minutes before trying again.", "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.")
              : L.t("Le formulaire de paiement n'a pas pu se charger. Réessaie dans un instant.", "The payment form couldn't load. Please try again in a moment.", "El formulario de pago no se ha podido cargar. Inténtalo de nuevo en un instante.")}</p>
          <button type="button" className="btn-solid" onClick={() => window.location.reload()}>{L.t("Réessayer", "Try again", "Reintentar")}</button>
        </div>
      ) : !session ? (
        <div className="pay-loading" aria-busy="true">{L.t("Chargement du paiement sécurisé…", "Loading secure checkout…", "Cargando el pago seguro…")}</div>
      ) : (
        <div className="pay-embed">
          <WhopCheckoutEmbed
            sessionId={session}
            theme="dark"
            themeOptions={{ accentColor: "#ff7a1a", backgroundColor: "#0d1322", borderRadius: 12, buttonText: L.t("Payer et débloquer", "Pay and unlock", "Pagar y desbloquear") }}
            locale={lang}
            promoCode={code || undefined}
            hideAddressForm
            skipRedirect
            returnUrl={returnUrl}
            stateId={stateId}
            fallback={<div className="pay-loading">{L.t("Chargement du paiement sécurisé…", "Loading secure checkout…", "Cargando el pago seguro…")}</div>}
            onComplete={(_planId, receiptId) => {
              if (receiptId) finish(receiptId);
              else setError("whop");
            }}
            onPaymentError={() => track("Paiement intégré", { etape: "refusé", formule: plan })}
          />
        </div>
      )}
      <p className="pay-safe">🔒 {L.t(
        "Paiement sécurisé par Whop (carte, Apple Pay, Google Pay). Pas de compte à créer : ton accès s'ouvre dès le paiement.",
        "Secure payment by Whop (card, Apple Pay, Google Pay). No account to create: your access opens as soon as you pay.",
        "Pago seguro con Whop (tarjeta, Apple Pay, Google Pay). Sin cuenta que crear: tu acceso se abre en cuanto pagas."
      )}</p>
      <p className="pay-back"><Link href={L.href("/pro")}>{L.t("← Changer de formule", "← Change plan", "← Cambiar de plan")}</Link></p>
    </div>
  );
}
