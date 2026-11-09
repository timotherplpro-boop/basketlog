"use client";
// Monte la fenêtre « Créer un compte / Se connecter » quand un bouton du site la demande (openAuth, lib/auth-client.js),
// ou quand l'adresse contient ?connexion=1 ou ?inscription=1 (liens envoyés par e-mail, retour de Google en erreur :
// ?erreur_auth=…, affiché dans la fenêtre).
import { useEffect, useState } from "react";
import { AUTH_EVENT } from "../lib/auth-client";
import { useProStatus } from "../lib/useProStatus";
import { useL } from "./LangProvider";
import AuthModal from "./AuthModal";

function authError(code, L) {
  switch (code) {
    case "google_off": return L.t("La connexion avec Google n'est pas encore activée : utilise ton e-mail et un mot de passe.", "Google sign-in isn't turned on yet: use your email and a password.", "El inicio de sesión con Google aún no está activado: usa tu correo y una contraseña.");
    case "google_indispo": return L.t("Google ne répond pas pour le moment. Réessaie dans un instant, ou utilise ton e-mail et un mot de passe.", "Google isn't responding right now. Try again in a moment, or use your email and a password.", "Google no responde por ahora. Vuelve a intentarlo en un instante o usa tu correo y una contraseña.");
    case "google_non_verifie": return L.t("Ton adresse Google n'est pas vérifiée chez Google : inscris-toi avec ton e-mail et un mot de passe.", "Your Google address isn't verified by Google: sign up with your email and a password.", "Tu dirección de Google no está verificada por Google: regístrate con tu correo y una contraseña.");
    case "indispo": return L.t("Le service est momentanément indisponible, réessaie dans un instant.", "The service is temporarily unavailable, please try again in a moment.", "El servicio no está disponible por el momento, inténtalo de nuevo en un instante.");
    case "trop": return L.t("Trop d'essais. Attends quelques minutes avant de réessayer.", "Too many attempts. Wait a few minutes before trying again.", "Demasiados intentos. Espera unos minutos antes de volver a intentarlo.");
    case "google_annule": return null; // le visiteur a fermé la page Google : pas de message
    default: return L.t("La connexion avec Google n'a pas abouti. Réessaie, ou utilise ton e-mail et un mot de passe.", "Signing in with Google didn't work. Try again, or use your email and a password.", "No se ha podido iniciar sesión con Google. Vuelve a intentarlo o usa tu correo y una contraseña.");
  }
}

export default function AuthHost({ googleOn = false }) {
  const L = useL();
  const [open, setOpen] = useState(null);
  const pro = useProStatus();
  const connected = !!pro?.connected;

  useEffect(() => {
    const on = (e) => setOpen({ mode: "inscription", ...(e.detail || {}), key: Date.now() });
    window.addEventListener(AUTH_EVENT, on);
    return () => window.removeEventListener(AUTH_EVENT, on);
  }, []);

  // ?connexion=1 / ?inscription=1 : ouverture automatique (une seule fois), puis l'adresse est nettoyée.
  useEffect(() => {
    if (!pro || connected) return;
    const u = new URL(location.href);
    const mode = u.searchParams.has("connexion") ? "connexion" : u.searchParams.has("inscription") ? "inscription" : null;
    if (!mode) return;
    const code = u.searchParams.get("erreur_auth");
    for (const k of ["connexion", "inscription", "erreur_auth"]) u.searchParams.delete(k);
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    setOpen({ mode, source: code ? "google_retour" : "lien", error: code ? authError(code, L) : null, key: Date.now() });
  }, [pro, connected]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || connected) return null;
  return <AuthModal key={open.key} initial={open} googleOn={googleOn} onClose={() => setOpen(null)} />;
}
