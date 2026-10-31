"use client";
import { useState } from "react";

const NAMES = { compte: "Compte gratuit", starter: "Starter", pro: "Pro", lifetime: "Lifetime" };

// Barre affichée à l'admin qui regarde le site comme un client d'une formule : rappel et retour en admin.
export default function PreviewBar({ tier }) {
  const [busy, setBusy] = useState(false);
  async function exit() {
    setBusy(true);
    try {
      await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apercu", tier: null }) });
    } catch {}
    try { sessionStorage.removeItem("bl_tier_reload"); } catch {}
    window.location.href = "/app/admin";
  }
  return (
    <div className="preview-bar" role="status">
      <span>Aperçu client : <b>{NAMES[tier] || tier}</b></span>
      <a href="/app/admin#formules">Changer</a>
      <button type="button" onClick={exit} disabled={busy}>{busy ? "Retour…" : "Revenir en admin"}</button>
    </div>
  );
}
