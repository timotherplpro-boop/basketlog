"use client";
// Visiteur sans compte sur une analyse, comme chez Visifoot : la fenêtre « Créer un compte » s'ouvre tout de suite,
// avant toute analyse, et l'analyse reste floutée tant qu'il n'est pas inscrit (fermer la fenêtre laisse l'encadré
// « Crée ton compte gratuit », qui la rouvre). Après l'inscription, la page se recharge avec l'aperçu gratuit et la
// fenêtre « Tu veux voir l'analyse complète ? » (components/Gate.jsx), qui mène aux formules.
// Les robots d'indexation reçoivent le même contenu dans la page, sans fenêtre par-dessus.
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";
import { openAuth } from "../lib/auth-client";
import { useL } from "./LangProvider";

const BOT = /bot|crawl|spider|slurp|lighthouse/i; // comme components/Gate.jsx

export default function SignupWall({ target, mode = "page", children }) {
  const L = useL();
  const source = mode === "analyzer" ? "formulaire" : "analyse";
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    track("Analyse bloquée", { match_id: target.id, ligue: target.league, formule: "visiteur" });
    if (BOT.test(navigator.userAgent || "")) return;
    const t = setTimeout(() => openAuth({ mode: "inscription", source }), mode === "analyzer" ? 400 : 250);
    return () => clearTimeout(t);
  }, [target.id, target.league, source, mode]);

  const open = (m) => () => openAuth({ mode: m, source });

  return (
    <div className="gated locked ar-locked ar-wall">
      <div className="gate-content ar-wall-content" aria-hidden>
        {children}
        <div className="card block ghost"><div className="gl w40" /><div className="gl" /><div className="gl" /><div className="gl w70" /></div>
        <div className="grid2">
          <div className="card block ghost"><div className="gl w60" /><div className="gl" /><div className="gl" /><div className="gl w40" /></div>
          <div className="card block ghost"><div className="gl w50" /><div className="gl" /><div className="gl w70" /><div className="gl" /></div>
        </div>
      </div>
      <div className="gate-overlay">
        <div className="gate-box ar-wall-box">
          <h3>{L.t("Crée ton compte gratuit pour voir l'analyse", "Create your free account to see the analysis", "Crea tu cuenta gratis para ver el análisis")}</h3>
          <p>{L.t(
            "Inscription gratuite en quelques secondes, avec Google ou ton e-mail. Tu verras ensuite la forme des équipes, le résumé du match, le scénario le plus probable et la confiance du modèle.",
            "Free sign-up in a few seconds, with Google or your email. You'll then see both teams' form, the game summary, the most likely scenario and the model's confidence.",
            "Registro gratis en unos segundos, con Google o con tu correo. Después verás la forma de los equipos, el resumen del partido, el escenario más probable y la confianza del modelo."
          )}</p>
          <button type="button" className="btn-solid" onClick={open("inscription")} disabled={!ready}>{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratis")}</button>
          <button type="button" className="gate-login" onClick={open("connexion")} disabled={!ready}>{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión")}</button>
        </div>
      </div>
    </div>
  );
}
