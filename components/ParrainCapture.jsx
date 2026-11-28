"use client";
// Arrivée par un lien de parrainage (?parrain=CODE, lib/parrainage.js) : le serveur vérifie le code ; l'adresse est nettoyée,
// puis un court message accueille l'ami invité.
// Décision de Tim (27/11/2026, « oui fais tout ») : le code n'est gardé 30 jours dans le cookie httpOnly bl_parrain (repris au
// paiement, app/api/pay) qu'avec l'accord du bandeau cookies (lib/consent.js). Sans accord, il reste seulement en mémoire pendant
// la visite et il est gardé dès que l'ami accepte. Si l'accord est retiré, le cookie est effacé.
import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "../lib/analytics";
import { getConsent } from "../lib/consent";
import { useL } from "./LangProvider";

const CODE = /^[bw][A-Za-z0-9_-]{14,80}$/; // même forme que REF_RE (lib/parrainage.js, côté serveur)
let pending = null; // code reçu pendant cette visite, en attente de l'accord aux cookies

const post = (body) =>
  fetch("/api/parrainage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json().catch(() => ({})))
    .catch(() => ({}));

export default function ParrainCapture() {
  const L = useL();
  const [show, setShow] = useState(false);
  useEffect(() => {
    let timer;
    let accepted = !!getConsent()?.analytics;
    // Choix fait dans le bandeau (ou dans « Réglages des cookies ») pendant la visite.
    const onConsent = (e) => {
      const ok = !!e?.detail?.analytics;
      if (ok && pending) post({ action: "arrivee", code: pending });
      if (!ok && accepted) post({ action: "retirer" }); // seulement si l'accord avait été donné : un cookie peut exister
      accepted = ok;
    };
    window.addEventListener("bl-consent", onConsent);
    const u = new URL(location.href);
    const code = u.searchParams.get("parrain");
    if (code != null) {
      u.searchParams.delete("parrain");
      history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
      if (CODE.test(code)) {
        const keep = accepted;
        if (!keep) pending = code; // tout de suite : l'ami peut accepter avant la réponse du serveur
        post({ action: keep ? "arrivee" : "verifier", code }).then((j) => {
          if (!j?.ok || j.self) {
            pending = null;
            return;
          }
          track("Arrivée par parrainage", { page: u.pathname });
          setShow(true);
          timer = setTimeout(() => setShow(false), 10000);
        });
      }
    }
    return () => {
      clearTimeout(timer);
      window.removeEventListener("bl-consent", onConsent);
    };
  }, []);
  if (!show) return null;
  return (
    <div className="welcome-toast" role="status" onClick={() => setShow(false)}>
      {L.t(
        "Un ami t'invite sur Basketlog 🏀 Les probabilités de victoire NBA sont gratuites chaque soir, et l'analyse complète s'essaie 1 jour gratuitement. ",
        "A friend invited you to Basketlog 🏀 NBA win probabilities are free every night, and you can try the full analysis free for 1 day. ",
        "Un amigo te invita a Basketlog 🏀 Las probabilidades de victoria de la NBA son gratis cada noche, y el análisis completo se prueba 1 día gratis. ",
        "Um amigo convidou você para o Basketlog 🏀 As probabilidades de vitória da NBA são grátis toda noite, e a análise completa pode ser testada por 1 dia grátis. ",
      )}
      <Link href={L.href("/pro")} style={{ color: "inherit", fontWeight: 700 }}>{L.t("Voir l'offre", "See the offer", "Ver la oferta", "Ver a oferta")}</Link>
    </div>
  );
}
