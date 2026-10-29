"use client";
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";

const MSG = {
  inscription: "Bienvenue sur Basketlog ! Ton compte gratuit est créé : 1 analyse complète offerte chaque jour.",
  connexion: "Te revoilà ! Tu es connecté : ton analyse complète gratuite du jour t'attend.",
  abonne: "Ton abonnement est actif. Bonnes analyses !",
};

// Message de bienvenue après l'inscription ou la connexion (paramètre ?bienvenue=…), puis l'adresse est nettoyée.
export default function WelcomeToast() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const u = new URL(location.href);
    const k = u.searchParams.get("bienvenue");
    if (!k || !MSG[k]) return;
    setMsg(MSG[k]);
    track(k === "inscription" ? "Compte créé" : "Connexion Whop", { etape: "réussie", type: k });
    u.searchParams.delete("bienvenue");
    history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
    const t = setTimeout(() => setMsg(null), 6000);
    return () => clearTimeout(t);
  }, []);
  if (!msg) return null;
  return <div className="welcome-toast" role="status" onClick={() => setMsg(null)}>{msg}</div>;
}
