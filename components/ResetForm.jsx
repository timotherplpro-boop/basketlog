"use client";
// Page « Choisir un nouveau mot de passe », ouverte depuis le lien reçu par e-mail (…/reinitialiser#<jeton>).
// Le jeton est lu dans le fragment de l'adresse puis aussitôt retiré de la barre d'adresse (il ne part ni dans les
// statistiques ni dans l'historique) ; il n'est envoyé qu'au serveur, dans le corps des requêtes.
import { useEffect, useRef, useState } from "react";
import { useL } from "./LangProvider";
import { openAuth } from "../lib/auth-client";
import { track } from "../lib/analytics";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export default function ResetForm() {
  const L = useL();
  const token = useRef("");
  const [state, setState] = useState("check"); // check | ok | invalid | done
  const [mdp, setMdp] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const t = (location.hash || "").replace(/^#/, "");
    if (location.hash) history.replaceState(null, "", location.pathname);
    if (!TOKEN_RE.test(t)) { setState("invalid"); return; }
    token.current = t;
    fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verifier", jeton: t, lang: L.lang }) })
      .then((r) => r.json())
      .then((j) => setState(j?.ok && j.valide ? "ok" : j?.ok ? "invalid" : "down"))
      .catch(() => setState("down"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    if (mdp.length < 6) { setError(L.t("Ton mot de passe doit faire au moins 6 caractères.", "Your password must be at least 6 characters.", "Tu contraseña debe tener al menos 6 caracteres.")); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reinit", jeton: token.current, mdp, lang: L.lang }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        setState("done");
        track("Mot de passe oublié", { etape: "changé" });
        setTimeout(() => window.location.assign(`${L.href("/app")}?bienvenue=mdp`), 600);
        return;
      }
      setError(j.error || L.t("Réessaie dans un instant.", "Please try again in a moment.", "Inténtalo de nuevo en un instante."));
      if (res.status === 400 && !j.field) setState("invalid");
    } catch {
      setError(L.t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo."));
    }
    setBusy(false);
  };

  return (
    <section className="auth-box auth-page">
      <h1>{L.t("Nouveau mot de passe", "New password", "Nueva contraseña")}</h1>
      {state === "check" && <p className="auth-sub" role="status">{L.t("Vérification du lien…", "Checking the link…", "Comprobando el enlace…")}</p>}
      {state === "down" && <p className="auth-sub" role="alert">{L.t("Le service ne répond pas pour le moment. Recharge la page dans un instant.", "The service isn't responding right now. Reload the page in a moment.", "El servicio no responde por ahora. Recarga la página en un instante.")}</p>}
      {state === "invalid" && (
        <>
          <p className="auth-sub" role="alert">{L.t("Ce lien n'est plus valable : il a déjà servi ou il a expiré (il marche 1 heure).", "This link is no longer valid: it has already been used or has expired (it works for 1 hour).", "Este enlace ya no es válido: ya se ha usado o ha caducado (funciona durante 1 hora).")}</p>
          <button type="button" className="auth-submit" onClick={() => openAuth({ mode: "oubli", source: "reinitialiser" })}>{L.t("Recevoir un nouveau lien", "Get a new link", "Recibir un enlace nuevo")}</button>
        </>
      )}
      {state === "done" && <p className="auth-sub" role="status">{L.t("C'est enregistré ! Tu es connecté.", "Saved! You're logged in.", "¡Guardado! Has iniciado sesión.")}</p>}
      {state === "ok" && (
        <form className="auth-form" onSubmit={submit} noValidate>
          <p className="auth-sub">{L.t("Choisis ton nouveau mot de passe (6 caractères minimum). Tes autres appareils seront déconnectés.", "Choose your new password (at least 6 characters). Your other devices will be logged out.", "Elige tu nueva contraseña (mínimo 6 caracteres). Tus otros dispositivos cerrarán sesión.")}</p>
          <label className="vh" htmlFor="reset-mdp">{L.t("Nouveau mot de passe", "New password", "Nueva contraseña")}</label>
          <div className="auth-pw">
            <input id="reset-mdp" type={show ? "text" : "password"} autoComplete="new-password" placeholder={L.t("Nouveau mot de passe (min. 6 caractères)", "New password (min. 6 characters)", "Nueva contraseña (mín. 6 caracteres)")} value={mdp} onChange={(e) => setMdp(e.target.value)} minLength={6} maxLength={200} required autoFocus />
            <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-pressed={show} aria-label={show ? L.t("Masquer le mot de passe", "Hide password", "Ocultar la contraseña") : L.t("Afficher le mot de passe", "Show password", "Mostrar la contraseña")}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{show && <path d="M4 4l16 16" />}</svg>
            </button>
          </div>
          {error && <p className="auth-err" role="alert">{error}</p>}
          <button type="submit" className="auth-submit" disabled={busy} aria-busy={busy}>{busy ? <span className="auth-spin" aria-hidden /> : null}{L.t("Enregistrer mon mot de passe", "Save my password", "Guardar mi contraseña")}</button>
        </form>
      )}
    </section>
  );
}
