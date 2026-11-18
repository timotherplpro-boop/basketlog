"use client";
// Page /paiement (voir lib/whop-pay.js) : crée le paiement étiqueté pour ce visiteur, puis l'envoie sur la page de paiement
// Whop de ce paiement (e-mail + carte, Apple Pay, Google Pay : aucun compte à créer). Après le paiement, Whop le renvoie sur
// /api/pay/retour, qui vérifie le paiement et ouvre son accès sur Basketlog, sans « Activer mon abonnement ».
// (Le formulaire intégré dans la page, @whop/checkout, est refusé par Whop pour ce compte le 16/11/2026 : « This checkout is
// no longer available ». La page Whop de la même configuration fonctionne.)
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

export default function PayCheckout({ plan, planName, priceText, perText, code = "" }) {
  const L = useL();
  const lang = L.en ? "en" : L.es ? "es" : L.pt ? "pt" : "fr";
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let next = "";
    try { next = sessionStorage.getItem("bl_pay_next") || ""; } catch {}
    track("Paiement intégré", { etape: "ouvert", formule: plan, ...(code ? { code_promo: code } : {}) });
    fetch("/api/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, lang, next }) })
      .then((r) => r.json().catch(() => ({})))
      .then((j) => {
        if (!j?.ok || !j.url) { setError(j?.error || "whop"); return; }
        const u = new URL(j.url);
        if (code) u.searchParams.set("promoCode", code); // Whop pré-remplit le code promo du créateur
        window.location.assign(u.toString());
      })
      .catch(() => setError("reseau"));
  }, [plan, lang, code]);

  return (
    <div className="pay-box">
      <div className="pay-sum">
        <span className="pay-plan">{planName}</span>
        <b>{priceText}</b><span className="pay-per">{perText}</span>
        {code && <small className="pay-code">{L.t(`Code ${code} appliqué au paiement`, `Code ${code} applied at checkout`, `Código ${code} aplicado al pago`, `Código ${code} aplicado ao pagamento`)}</small>}
      </div>
      {error ? (
        <div className="pay-err" role="alert">
          <p>{error === "config"
            ? L.t("Le paiement n'est pas disponible pour le moment. Reviens très bientôt.", "Payment isn't available right now. Please come back soon.", "El pago no está disponible por ahora. Vuelve muy pronto.", "O pagamento não está disponível no momento. Volte em breve.")
            : error === "trop"
              ? L.t("Trop d'essais. Attends quelques minutes avant de réessayer.", "Too many attempts. Wait a few minutes before trying again.", "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.", "Tentativas demais. Espere alguns minutos antes de tentar novamente.")
              : L.t("Le paiement n'a pas pu s'ouvrir. Réessaie dans un instant.", "The checkout couldn't open. Please try again in a moment.", "El pago no se ha podido abrir. Inténtalo de nuevo en un instante.", "Não foi possível abrir o pagamento. Tente novamente em instantes.")}</p>
          <button type="button" className="btn-solid" onClick={() => window.location.reload()}>{L.t("Réessayer", "Try again", "Reintentar", "Tentar novamente")}</button>
        </div>
      ) : (
        <div className="pay-loading" aria-busy="true">{L.t("Ouverture du paiement sécurisé…", "Opening secure checkout…", "Abriendo el pago seguro…", "Abrindo o pagamento seguro…")}</div>
      )}
      <p className="pay-safe">🔒 {L.t(
        "Paiement sécurisé par Whop (carte, Apple Pay, Google Pay). Pas de compte à créer : ton accès s'ouvre dès le paiement.",
        "Secure payment by Whop (card, Apple Pay, Google Pay). No account to create: your access opens as soon as you pay.",
        "Pago seguro con Whop (tarjeta, Apple Pay, Google Pay). Sin cuenta que crear: tu acceso se abre en cuanto pagas.", "Pagamento seguro com a Whop (cartão, Apple Pay, Google Pay). Sem conta para criar: seu acesso é liberado assim que você paga."
      )}</p>
      <p className="pay-back"><Link href={L.href("/pro")}>{L.t("← Changer de formule", "← Change plan", "← Cambiar de plan", "← Trocar de plano")}</Link></p>
    </div>
  );
}
