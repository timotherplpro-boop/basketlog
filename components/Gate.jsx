"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";
import AnalysisProgress, { useAnalysisRun } from "./AnalysisProgress";

// Analyse complète, comme Visifoot : il faut un compte et la lancer (« Analyser le match »).
// Compte gratuit = 1 analyse par jour, Starter = 5, Pro et Lifetime = illimitées. La limite est vérifiée par le serveur,
// par compte : revenir en arrière, recharger, changer d'appareil ou de navigateur ne donne pas d'analyse en plus.
// Tant que l'analyse n'est pas lancée, son contenu n'est pas envoyé au navigateur.
export default function Gate({ access, target, children }) {
  const L = useL();
  const router = useRouter();
  const run = useAnalysisRun();
  const [state, setState] = useState(access.state);
  const [here, setHere] = useState("");
  useEffect(() => { setState(access.state); }, [access.state]);
  useEffect(() => { setHere(encodeURIComponent(location.pathname + location.search)); }, []);
  useEffect(() => {
    const props = { match_id: target.id, ligue: target.league, formule: access.tier || "visiteur" };
    if (access.state === "open") track("Analyse consultée", props);
    else if (access.state === "limit") track("Limite d'analyses atteinte", { ...props, limite: access.limit });
    else if (access.state === "visitor") track("Analyse bloquée", props);
  }, [access.state, access.tier, access.limit, target.id, target.league]);

  const { used = 0, limit = null, tier } = access;
  const plan = tier === "starter" ? "Starter" : L.t("gratuite", "free", "gratis");

  const launch = () => {
    track("Analyse lancée", { match_id: target.id, ligue: target.league, formule: tier, source: "fiche" });
    run.start(
      () => fetch("/api/pro/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target) }).then((r) => r.json()),
      (r) => {
        if (r?.used != null) window.dispatchEvent(new CustomEvent("bl-views", { detail: { used: r.used } }));
        if (r?.state === "limit") setState("limit");
        router.refresh();
      }
    );
  };

  if (state === "open") {
    return (
      <>
        {limit != null && (
          <div className="counter">
            {L.t(
              <>Analyse {plan} <b>{used}/{limit}</b> aujourd&apos;hui</>,
              <>{tier === "starter" ? "Starter" : "Free"} analysis <b>{used}/{limit}</b> today</>,
              <>Análisis {plan} <b>{used}/{limit}</b> hoy</>
            )} · <Link href={L.href("/pro")} onClick={() => track("Clic Passer Pro", { source: "compteur" })}>{tier === "starter" ? L.t("Passer Pro", "Go Pro", "Hazte Pro") : L.t("Débloquer plus d'analyses", "Unlock more analyses", "Desbloquear más análisis")}</Link>
          </div>
        )}
        {children}
      </>
    );
  }

  if (state === "available") {
    const left = limit == null ? null : Math.max(0, limit - used);
    return (
      <div className="card block an-card">
        {run.running ? (
          <AnalysisProgress p={run.p} league={target.league} />
        ) : (
          <div className="an-start">
            <h2>{L.t("Analyse complète", "Full analysis", "Análisis completo")}</h2>
            <p>{L.t("Score projeté détaillé, facteurs, scénarios, stats comparées, joueurs à suivre et infirmerie.", "Detailed projected score, key factors, scenarios, stat comparison, players to watch and injury report.", "Marcador proyectado detallado, factores clave, escenarios, estadísticas comparadas, jugadores a seguir y parte médico.")}</p>
            <button type="button" className="btn-solid" onClick={launch}>{L.t("Analyser le match", "Analyze the game", "Analizar el partido")}</button>
            <small>
              {left == null
                ? L.t("Analyses illimitées avec ta formule", "Unlimited analyses with your plan", "Análisis ilimitados con tu plan")
                : L.t(
                  `${left} analyse${left > 1 ? "s" : ""} restante${left > 1 ? "s" : ""} aujourd'hui`,
                  `${left} analys${left > 1 ? "es" : "is"} left today`,
                  `${left} análisis restante${left > 1 ? "s" : ""} hoy`
                )}
            </small>
          </div>
        )}
      </div>
    );
  }

  const visitor = state === "visitor";
  return (
    <div className="gated locked">
      <div className="gate-content" aria-hidden>
        <div className="card block ghost"><div className="gl w40" /><div className="gl" /><div className="gl" /><div className="gl w70" /></div>
        <div className="grid2">
          <div className="card block ghost"><div className="gl w60" /><div className="gl" /><div className="gl" /><div className="gl w40" /></div>
          <div className="card block ghost"><div className="gl w50" /><div className="gl" /><div className="gl w70" /><div className="gl" /></div>
        </div>
        <div className="card block ghost"><div className="gl w40" /><div className="gl" /><div className="gl w60" /></div>
      </div>
      <div className="gate-overlay">
        <div className="gate-box">
          {visitor ? (
            <>
              <h3>{L.t("Crée ton compte gratuit pour lancer l'analyse complète", "Create your free account to run the full analysis", "Crea tu cuenta gratis para lanzar el análisis completo")}</h3>
              <p>{L.t("Score projeté détaillé, facteurs, scénarios, stats comparées, joueurs à suivre et forme récente. Avec un compte gratuit, tu as 1 analyse complète offerte chaque jour.", "Detailed projected score, key factors, scenarios, stat comparison, players to watch and recent form. A free account gives you 1 full analysis every day.", "Marcador proyectado detallado, factores clave, escenarios, estadísticas comparadas, jugadores a seguir y forma reciente. Una cuenta gratis te da 1 análisis completo cada día.")}</p>
              <a href={`/api/whop/signup?next=${here}`} className="btn-solid" onClick={() => track("Clic créer un compte", { source: "analyse_bloquee", ligue: target.league })}>{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratis")}</a>
              <a href={`/api/whop/login?next=${here}`} className="gate-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "analyse_bloquee" })}>{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión")}</a>
            </>
          ) : tier === "starter" ? (
            <>
              <h3>{L.t("Tes 5 analyses Starter du jour sont utilisées", "You've used today's 5 Starter analyses", "Ya has usado tus 5 análisis Starter de hoy")}</h3>
              <p>{L.t("Passe à Pro pour des analyses illimitées, ou reviens demain (le compteur repart à minuit).", "Upgrade to Pro for unlimited analyses, or come back tomorrow (the counter resets at midnight, Paris time).", "Pásate a Pro para tener análisis ilimitados, o vuelve mañana (el contador se reinicia a medianoche, hora de París).")}</p>
              <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite" })}>{L.t("Passer à Pro", "Upgrade to Pro", "Pasar a Pro")}</Link>
            </>
          ) : (
            <>
              <h3>{L.t("Ton analyse gratuite du jour est utilisée", "You've used today's free analysis", "Ya has usado tu análisis gratis de hoy")}</h3>
              <p>{L.t("Starter t'offre 5 analyses complètes par jour, Pro les rend illimitées. Sinon, reviens demain : le compteur repart à minuit.", "Starter gives you 5 full analyses a day, Pro makes them unlimited. Or come back tomorrow: the counter resets at midnight, Paris time.", "Starter te da 5 análisis completos al día y Pro los hace ilimitados. Si no, vuelve mañana: el contador se reinicia a medianoche, hora de París.")}</p>
              <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite_compte" })}>{L.t("Voir les formules dès 10 €/mois", "See plans from €10/month", "Ver planes desde 10 €/mes")}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
