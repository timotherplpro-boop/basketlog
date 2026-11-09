"use client";
// Retour sur Basketlog après un paiement chez Whop : tant que l'abonnement n'est pas encore relié au compte, un bandeau
// propose de l'activer en un clic (connexion Whop avec le compte qui a payé ; app/api/whop/callback le relie au compte).
// Le bandeau ne s'affiche que si le visiteur a cliqué sur une formule dans les 48 dernières heures (repère gardé dans
// son navigateur), et disparaît dès que la formule payée est active ou s'il le ferme.
import { useEffect, useState } from "react";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { getConsent } from "../lib/consent";
import { useL } from "./LangProvider";

const KEY = "bl_paiement";
const MAX_AGE = 48 * 3600e3;

function readFlag() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "null");
    if (v && typeof v.at === "number" && Date.now() - v.at < MAX_AGE) return v;
    localStorage.removeItem(KEY);
  } catch {}
  return null;
}
const clearFlag = () => { try { localStorage.removeItem(KEY); } catch {} };

export default function PaymentReturn() {
  const L = useL();
  const pro = useProStatus();
  const [flag, setFlag] = useState(null);
  const [here, setHere] = useState("/app");
  const [cookieDone, setCookieDone] = useState(false); // le bandeau des cookies, en bas aussi, passe d'abord

  useEffect(() => {
    setFlag(readFlag());
    setHere(location.pathname + location.search);
    setCookieDone(!!getConsent());
    const on = () => setCookieDone(true);
    window.addEventListener("bl-consent", on);
    return () => window.removeEventListener("bl-consent", on);
  }, []);
  useEffect(() => {
    if (!pro || !flag) return;
    // Formule payée active (ou rôle) : c'est fait, le repère n'a plus de raison d'être.
    if (pro.connected && pro.tier !== "compte") { clearFlag(); setFlag(null); }
  }, [pro, flag]);

  if (!flag || !cookieDone || !pro?.connected || pro.tier !== "compte") return null;
  if (/^\/(?:(?:en|es)\/)?(?:pro|app\/compte)(?:\/|$|\?)/.test(here)) return null; // ces pages ont déjà leur lien

  return (
    <div className="pay-return" role="status">
      <p>
        <b>{L.t("Tu viens de payer ta formule ?", "Just paid for your plan?", "¿Acabas de pagar tu plan?")}</b>{" "}
        {L.t("Active-la sur ton compte : connecte-toi à Whop avec le compte utilisé pour le paiement.", "Activate it on your account: log in to Whop with the account you paid with.", "Actívalo en tu cuenta: inicia sesión en Whop con la cuenta con la que pagaste.")}
      </p>
      <div className="pay-return-actions">
        <a className="btn-solid" href={`/api/whop/login?next=${encodeURIComponent(here)}`} onClick={() => track("Connexion Whop", { etape: "actualiser", source: "bandeau_paiement" })}>{L.t("Activer mon abonnement", "Activate my subscription", "Activar mi suscripción")}</a>
        <button type="button" className="pay-return-x" onClick={() => { clearFlag(); setFlag(null); }}>{L.t("Plus tard", "Later", "Más tarde")}</button>
      </div>
    </div>
  );
}
