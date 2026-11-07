"use client";
import { useState } from "react";
import { useL } from "./LangProvider";

// Barre affichée à l'admin qui regarde le site comme un client d'une formule : rappel et retour en admin.
export default function PreviewBar({ tier }) {
  const L = useL();
  const t = L.t;
  const [busy, setBusy] = useState(false);
  const names = { compte: t("Compte gratuit", "Free account", "Cuenta gratuita"), starter: "Starter", pro: "Pro", lifetime: "Lifetime" };
  async function exit() {
    setBusy(true);
    try {
      await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apercu", tier: null, lang: L.lang }) });
    } catch {}
    try { sessionStorage.removeItem("bl_tier_reload"); } catch {}
    window.location.href = L.href("/app/admin");
  }
  return (
    <div className="preview-bar" role="status">
      <span>{t("Aperçu client", "Customer preview", "Vista previa de cliente")}{L.fr ? " : " : ": "}<b>{names[tier] || tier}</b></span>
      <a href={L.href("/app/admin") + "#formules"}>{t("Changer", "Change", "Cambiar")}</a>
      <button type="button" onClick={exit} disabled={busy}>{busy ? t("Retour…", "Going back…", "Volviendo…") : t("Revenir en admin", "Back to admin", "Volver a admin")}</button>
    </div>
  );
}
