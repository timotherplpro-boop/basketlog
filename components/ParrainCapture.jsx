"use client";
// Arrivée par un lien de parrainage (?parrain=CODE, lib/parrainage.js) : le serveur vérifie le code et le garde 30 jours dans un
// cookie httpOnly, repris au paiement (app/api/pay). L'adresse est nettoyée, puis un court message accueille l'ami invité.
import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

const CODE = /^[bw][A-Za-z0-9_-]{14,80}$/; // même forme que REF_RE (lib/parrainage.js, côté serveur)

export default function ParrainCapture() {
  const L = useL();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const u = new URL(location.href);
    const code = u.searchParams.get("parrain");
    if (code == null) return;
    u.searchParams.delete("parrain");
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    if (!CODE.test(code)) return;
    let timer;
    fetch("/api/parrainage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "arrivee", code }) })
      .then((r) => r.json().catch(() => ({})))
      .then((j) => {
        if (!j?.ok || j.self) return;
        track("Arrivée par parrainage", { page: u.pathname });
        setShow(true);
        timer = setTimeout(() => setShow(false), 10000);
      })
      .catch(() => {});
    return () => clearTimeout(timer);
  }, []);
  if (!show) return null;
  return (
    <div className="welcome-toast" role="status" onClick={() => setShow(false)}>
      {L.t(
        "Un ami t'invite sur Basketlog 🏀 Les probabilités de victoire NBA sont gratuites chaque soir, et l'analyse complète s'essaie 3 jours pour 1 €. ",
        "A friend invited you to Basketlog 🏀 NBA win probabilities are free every night, and you can try the full analysis for 3 days for €1. ",
        "Un amigo te invita a Basketlog 🏀 Las probabilidades de victoria de la NBA son gratis cada noche, y el análisis completo se prueba 3 días por 1 €. ",
        "Um amigo convidou você para o Basketlog 🏀 As probabilidades de vitória da NBA são grátis toda noite, e a análise completa pode ser testada por 3 dias por 1 €. ",
      )}
      <Link href={L.href("/pro")} style={{ color: "inherit", fontWeight: 700 }}>{L.t("Voir l'offre", "See the offer", "Ver la oferta", "Ver a oferta")}</Link>
    </div>
  );
}
