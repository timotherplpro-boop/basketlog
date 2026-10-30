"use client";
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

const MSG = {
  inscription: ["Bienvenue sur Basketlog ! Ton compte est créé. Les analyses complètes se débloquent avec Starter, Pro ou Lifetime.", "Welcome to Basketlog! Your account is ready. Full analyses unlock with Starter, Pro or Lifetime.", "¡Bienvenido a Basketlog! Tu cuenta está creada. Los análisis completos se desbloquean con Starter, Pro o Lifetime."],
  connexion: ["Te revoilà ! Tu es connecté.", "Welcome back! You're signed in.", "¡Hola de nuevo! Has iniciado sesión."],
  abonne: ["Ton abonnement est actif. Bonnes analyses !", "Your subscription is active. Enjoy the analyses!", "Tu suscripción está activa. ¡Buenos análisis!"],
};

// Message de bienvenue après l'inscription ou la connexion (paramètre ?bienvenue=…), puis l'adresse est nettoyée.
export default function WelcomeToast() {
  const L = useL();
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const u = new URL(location.href);
    const k = u.searchParams.get("bienvenue");
    if (!k || !MSG[k]) return;
    setMsg(MSG[k][L.en ? 1 : L.es ? 2 : 0]);
    track(k === "inscription" ? "Compte créé" : "Connexion Whop", { etape: "réussie", type: k });
    u.searchParams.delete("bienvenue");
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return <div className="welcome-toast" role="status" onClick={() => setMsg(null)}>{msg}</div>;
}
