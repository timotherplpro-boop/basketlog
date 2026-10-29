"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

function todayKey() {
  return "hs_views_" + new Date().toISOString().slice(0, 10);
}

// Analyse complète : comme Visifoot, il faut un compte gratuit pour la débloquer.
// Compte gratuit = 1 analyse par jour, Starter = 5, Pro et Lifetime = illimitées.
// Sans compte, seules les probabilités et les chiffres clés en haut de la fiche sont visibles.
export default function Gate({ matchId, league = "NBA", children }) {
  const L = useL();
  const pro = useProStatus();
  const [state, setState] = useState({ locked: false, used: 0, ready: false });
  const [here, setHere] = useState("");
  useEffect(() => { setHere(encodeURIComponent(location.pathname + location.search)); }, []);

  useEffect(() => {
    if (!pro) return;
    const limit = pro.perDay; // null = illimité
    if (limit == null) {
      setState({ locked: false, used: 0, ready: true, unlimited: true });
      track("Analyse consultée", { match_id: String(matchId), ligue: league, formule: pro.tier });
      return;
    }
    let views = [];
    try { views = JSON.parse(localStorage.getItem(todayKey()) || "[]"); } catch {}
    if (!views.includes(matchId)) {
      if (views.length >= limit) {
        setState({ locked: true, used: views.length, limit, ready: true });
        track(limit === 0 ? "Analyse bloquée" : "Limite d'analyses atteinte", { formule: pro.tier, limite: limit, ligue: league });
        return;
      }
      views.push(matchId);
      try { localStorage.setItem(todayKey(), JSON.stringify(views)); } catch {}
    }
    setState({ locked: false, used: views.length, limit, ready: true });
    track("Analyse consultée", { match_id: String(matchId), ligue: league, formule: pro.tier });
  }, [matchId, pro, league]);

  const visitor = !pro || !pro.connected; // pas encore de compte
  const tier = pro?.tier;
  const label = tier === "starter" ? "Starter" : L.t("gratuite", "free", "gratis");

  return (
    <>
      {state.ready && !state.unlimited && !state.locked && state.limit > 0 && (
        <div className="counter">
          {L.t(
            <>Analyse {label} <b>{state.used}/{state.limit}</b> aujourd&apos;hui</>,
            <>{tier === "starter" ? "Starter" : "Free"} analysis <b>{state.used}/{state.limit}</b> today</>,
            <>Análisis {label} <b>{state.used}/{state.limit}</b> hoy</>
          )} · <Link href={L.href("/pro")} onClick={() => track("Clic Passer Pro", { source: "compteur" })}>{tier === "starter" ? L.t("Passer Pro", "Go Pro", "Hazte Pro") : L.t("Débloquer plus d'analyses", "Unlock more analyses", "Desbloquear más análisis")}</Link>
        </div>
      )}
      <div className={`gated ${state.locked ? "locked" : ""}`}>
        <div className="gate-content">{children}</div>
        {state.locked && (
          <div className="gate-overlay">
            <div className="gate-box">
              {visitor ? (
                <>
                  <h3>{L.t("Crée ton compte gratuit pour débloquer l'analyse complète", "Create your free account to unlock the full analysis", "Crea tu cuenta gratis para desbloquear el análisis completo")}</h3>
                  <p>{L.t("Score projeté détaillé, facteurs, scénarios, stats comparées, joueurs à suivre et forme récente. Avec un compte gratuit, tu as 1 analyse complète offerte chaque jour.", "Detailed projected score, key factors, scenarios, stat comparison, players to watch and recent form. A free account gives you 1 full analysis every day.", "Marcador proyectado detallado, factores clave, escenarios, estadísticas comparadas, jugadores a seguir y forma reciente. Una cuenta gratis te da 1 análisis completo cada día.")}</p>
                  <a href={`/api/whop/signup?next=${here}`} className="btn-solid" onClick={() => track("Clic créer un compte", { source: "analyse_bloquee", ligue: league })}>{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratis")}</a>
                  <a href={`/api/whop/login?next=${here}`} className="gate-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "analyse_bloquee" })}>{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión")}</a>
                </>
              ) : tier === "starter" ? (
                <>
                  <h3>{L.t("Tes 5 analyses Starter du jour sont utilisées", "You've used today's 5 Starter analyses", "Ya has usado tus 5 análisis Starter de hoy")}</h3>
                  <p>{L.t("Passe à Pro pour des analyses illimitées, ou reviens demain.", "Upgrade to Pro for unlimited analyses, or come back tomorrow.", "Pásate a Pro para tener análisis ilimitados, o vuelve mañana.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite" })}>{L.t("Passer à Pro", "Upgrade to Pro", "Pasar a Pro")}</Link>
                </>
              ) : (
                <>
                  <h3>{L.t("Ton analyse gratuite du jour est utilisée", "You've used today's free analysis", "Ya has usado tu análisis gratis de hoy")}</h3>
                  <p>{L.t("Starter t'offre 5 analyses complètes par jour, Pro les rend illimitées. Sinon, reviens demain pour ta prochaine analyse offerte.", "Starter gives you 5 full analyses a day, Pro makes them unlimited. Or come back tomorrow for your next free analysis.", "Starter te da 5 análisis completos al día y Pro los hace ilimitados. Si no, vuelve mañana para tu próximo análisis gratis.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite_compte" })}>{L.t("Voir les formules dès 10 €/mois", "See plans from €10/month", "Ver planes desde 10 €/mes")}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
