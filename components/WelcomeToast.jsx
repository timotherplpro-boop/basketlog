"use client";
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

const MSG = {
  inscription: ["Bienvenue sur Basketlog ! Ton compte gratuit est créé : 1 analyse complète offerte chaque jour.", "Welcome to Basketlog! Your free account is ready: 1 full analysis free every day.", "¡Bienvenido a Basketlog! Tu cuenta gratis está creada: 1 análisis completo gratis cada día."],
  connexion: ["Te revoilà ! Tu es connecté : ton analyse complète gratuite du jour t'attend.", "Welcome back! You're signed in: today's free full analysis is waiting.", "¡Hola de nuevo! Has iniciado sesión: te espera tu análisis completo gratis del día."],
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
