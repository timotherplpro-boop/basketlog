"use client";
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { localStore } from "../lib/safe-store";
import { ONBOARDING_EVENT, SOURCE_EVENT, isAnalysisPath, onboardingDone } from "../lib/onboarding";
import { useL } from "./LangProvider";

const MSG = {
  inscription: ["Bienvenue sur Basketlog ! Ton compte est créé. Les analyses se débloquent avec Starter, Pro ou Lifetime.", "Welcome to Basketlog! Your account is ready. Analyses unlock with Starter, Pro or Lifetime.", "¡Bienvenido a Basketlog! Tu cuenta está creada. Los análisis se desbloquean con Starter, Pro o Lifetime."],
  nouveau: ["Bienvenue sur Basketlog ! Ton compte gratuit est créé : tu vois l'aperçu des analyses. L'analyse complète se débloque avec Starter, Pro ou Lifetime.", "Welcome to Basketlog! Your free account is ready: you can see the analysis previews. The full analysis unlocks with Starter, Pro or Lifetime.", "¡Bienvenido a Basketlog! Tu cuenta gratis está creada: ves el avance de los análisis. El análisis completo se desbloquea con Starter, Pro o Lifetime."],
  connexion: ["Te revoilà ! Tu es connecté.", "Welcome back! You're signed in.", "¡Hola de nuevo! Has iniciado sesión."],
  retour: ["Te revoilà ! Tu es connecté.", "Welcome back! You're signed in.", "¡Hola de nuevo! Has iniciado sesión."],
  abonne: ["Ton abonnement est actif. Bonnes analyses !", "Your subscription is active. Enjoy the analyses!", "Tu suscripción está activa. ¡Buenos análisis!"],
  whop_vide: ["Ton compte Whop est relié à ton compte Basketlog, mais aucun abonnement actif n'a été trouvé dessus. Si tu as payé, connecte-toi à Whop avec le compte utilisé pour le paiement, puis réessaie.", "Your Whop account is linked to your Basketlog account, but no active subscription was found on it. If you paid, log in to Whop with the account you paid with, then try again.", "Tu cuenta de Whop está vinculada a tu cuenta de Basketlog, pero no tiene ninguna suscripción activa. Si has pagado, inicia sesión en Whop con la cuenta con la que pagaste y vuelve a intentarlo."],
  mdp: ["Ton nouveau mot de passe est enregistré. Tu es connecté.", "Your new password is saved. You're signed in.", "Tu nueva contraseña está guardada. Has iniciado sesión."],
  createur: ["Ton accès créateur est activé : toute l'application est ouverte. Bonnes vidéos !", "Your creator access is on: the whole app is unlocked. Enjoy filming!", "Tu acceso de creador está activado: toda la aplicación está abierta. ¡Buenos vídeos!"],
  admin: ["Ton accès admin est activé.", "Your admin access is on.", "Tu acceso de administrador está activado."],
};
const WARN = new Set(["whop_vide"]);

// Message de bienvenue après l'inscription ou la connexion (paramètre ?bienvenue=…), puis l'adresse est nettoyée.
// Comptes Basketlog (fenêtre d'inscription) : « nouveau-email », « nouveau-google », « retour-email », « retour-google ».
export default function WelcomeToast() {
  const L = useL();
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const u = new URL(location.href);
    const raw = u.searchParams.get("bienvenue");
    const m = /^(nouveau|retour)-(email|google)$/.exec(raw || "");
    const k = m ? m[1] : raw;
    if (!k || !MSG[k]) return;
    if (m) {
      // Compte Basketlog : statistiques envoyées ici, une fois la page d'arrivée chargée (plus fiable qu'avant le départ).
      let source = "site";
      try { source = sessionStorage.getItem("bl_auth_src") || "site"; sessionStorage.removeItem("bl_auth_src"); } catch {}
      track(m[1] === "nouveau" ? "Compte créé" : "Connexion", { methode: m[2], source });
    } else if (k === "inscription" || k === "connexion" || k === "abonne") {
      track(k === "inscription" ? "Compte créé" : "Connexion Whop", { etape: "réussie", type: k });
    } else if (k === "whop_vide") {
      track("Connexion Whop", { etape: "reliée sans abonnement" });
    }
    u.searchParams.delete("bienvenue");
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    // Page d'invitation : elle affiche elle-même l'étape suivante (activer l'accès), pas de message par-dessus.
    if (/^\/(?:(?:en|es)\/)?invitation\//.test(u.pathname)) return;
    // Compte tout juste créé hors d'une page d'analyse : les questions d'accueil (components/Onboarding.jsx) prennent la
    // place du message, qu'elles recouvriraient. Sur une fiche match, la personne vient lire l'analyse : pas de questions.
    if (m && m[1] === "nouveau" && !isAnalysisPath(u.pathname, u.search) && !onboardingDone(localStore())) {
      const t = setTimeout(() => window.dispatchEvent(new Event(ONBOARDING_EVENT)), 700);
      return () => clearTimeout(t);
    }
    setMsg({ text: MSG[k][L.en ? 1 : L.es ? 2 : 0], warn: WARN.has(k) });
    const timers = [setTimeout(() => setMsg(null), WARN.has(k) ? 12000 : 6000)];
    // Abonnement activé : une question sur la source (components/SourceAsk.jsx), une fois le message de bienvenue passé.
    if (k === "abonne") timers.push(setTimeout(() => window.dispatchEvent(new Event(SOURCE_EVENT)), 3500));
    return () => timers.forEach(clearTimeout);
  }, []);
  if (!msg) return null;
  return <div className={`welcome-toast${msg.warn ? " warn" : ""}`} role="status" onClick={() => setMsg(null)}>{msg.text}</div>;
}
