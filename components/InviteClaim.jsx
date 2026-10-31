"use client";
import { useState } from "react";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

// Bouton d'activation d'un lien d'invitation, puis direction l'espace membre avec l'accès complet.
export default function InviteClaim({ code, admin = false }) {
  const L = useL();
  const [state, setState] = useState({ busy: false, error: "" });

  async function claim() {
    setState({ busy: true, error: "" });
    try {
      const res = await fetch("/api/invitation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, lang: L.lang }) });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) { setState({ busy: false, error: j.error || L.t("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.") }); return; }
      track("Invitation activée", { role: j.role || (admin ? "admin" : "createur") });
      window.location.href = `${L.href("/app")}?bienvenue=${j.role === "admin" ? "admin" : "createur"}`;
    } catch {
      setState({ busy: false, error: L.t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") });
    }
  }

  return (
    <>
      <button type="button" className="btn-solid" onClick={claim} disabled={state.busy}>
        {state.busy
          ? L.t("Activation…", "Activating…", "Activando…")
          : admin
            ? L.t("Activer mon accès admin", "Activate my admin access", "Activar mi acceso de administrador")
            : L.t("Activer mon accès créateur", "Activate my creator access", "Activar mi acceso de creador")}
      </button>
      {state.error && <p className="invite-err" role="alert">{state.error}</p>}
    </>
  );
}
