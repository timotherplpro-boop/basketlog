"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";
import AnalysisProgress, { useAnalysisRun } from "./AnalysisProgress";
import UnlockModal from "./UnlockModal";

// Robots d'indexation : pas de fenêtre par-dessus le contenu.
const BOT = /bot|crawl|spider|slurp|lighthouse/i;
const SEEN = "bl-unlock-seen";

// Fin de l'analyse, comme Visifoot : sans l'analyse complète, on ne voit qu'une partie (forme, résumé, scénario n° 1,
// confiance) et le reste est flouté sous « Tu n'as accès qu'à X % de l'analyse ». Dès qu'une analyse s'affiche ainsi,
// la fenêtre « Tu veux voir l'analyse complète ? » s'ouvre (après le formulaire d'analyse, ou en arrivant sur la
// partie verrouillée d'une fiche match, une fois par session).
// Compte gratuit = 1 analyse complète par jour, Starter = 5, Pro et Lifetime = illimitées. La limite est comptée par
// le serveur, par compte : revenir en arrière, recharger ou changer d'appareil ne donne pas d'analyse en plus.
// Tant que l'analyse complète n'est pas lancée, son contenu n'est pas envoyé au navigateur.
export default function Gate({ access, target, pct = 30, proof = null, match = null, mode = "page", children }) {
  const L = useL();
  const router = useRouter();
  const run = useAnalysisRun();
  const [state, setState] = useState(access.state);
  const [here, setHere] = useState("");
  const [back, setBack] = useState(""); // retour après l'inscription : l'analyse complète se lance toute seule
  const [modal, setModal] = useState(false);
  const box = useRef(null);
  const autoRun = useRef(false);
  useEffect(() => { setState(access.state); }, [access.state]);
  useEffect(() => {
    const u = new URL(location.href);
    u.searchParams.delete("unlock");
    setHere(encodeURIComponent(u.pathname + u.search));
    u.searchParams.set("unlock", "1");
    setBack(encodeURIComponent(u.pathname + u.search + (mode === "analyzer" ? "#resultat" : "")));
  }, [mode]);
  useEffect(() => {
    const props = { match_id: target.id, ligue: target.league, formule: access.tier || "visiteur" };
    if (access.state === "open") track("Analyse consultée", props);
    else if (access.state === "limit") track("Limite d'analyses atteinte", { ...props, limite: access.limit });
    else if (access.state === "visitor") track("Analyse bloquée", props);
  }, [access.state, access.tier, access.limit, target.id, target.league]);

  const { used = 0, limit = null, tier } = access;

  const start = run.start;
  const launch = useCallback((source = "fiche") => {
    track("Analyse lancée", { match_id: target.id, ligue: target.league, formule: tier, source });
    start(
      () => fetch("/api/pro/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(target) }).then((r) => r.json()),
      (r) => {
        if (r?.used != null) window.dispatchEvent(new CustomEvent("bl-views", { detail: { used: r.used } }));
        if (r?.state === "limit") setState("limit");
        router.refresh();
      }
    );
  }, [start, router, target, tier]);

  // Retour d'inscription (« Débloquer l'analyse complète » sans compte) : on lance l'analyse complète directement.
  useEffect(() => {
    const u = new URL(location.href);
    if (u.searchParams.get("unlock") !== "1") return;
    u.searchParams.delete("unlock");
    window.history.replaceState(null, "", u.pathname + u.search + u.hash);
    if (access.state === "available" && !autoRun.current) {
      autoRun.current = true;
      launch("retour_inscription");
    }
  }, [access.state, launch]);

  // « Tu veux voir l'analyse complète ? » dès que l'analyse s'affiche sans sa partie complète.
  useEffect(() => {
    if ((state !== "visitor" && state !== "limit") || BOT.test(navigator.userAgent)) return;
    const show = () => {
      setModal(true);
      track("Fenêtre analyse complète affichée", { source: mode === "analyzer" ? "formulaire" : "fiche", ligue: target.league, etat: state });
    };
    if (mode === "analyzer") {
      const t = setTimeout(show, 900);
      return () => clearTimeout(t);
    }
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN) === "1"; } catch {}
    if (seen || !box.current || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      try { sessionStorage.setItem(SEEN, "1"); } catch {}
      show();
    }, { threshold: 0.6 });
    io.observe(box.current);
    return () => io.disconnect();
  }, [state, mode, target.league]);

  const close = useCallback(() => {
    setModal(false);
    track("Fenêtre analyse complète fermée", { ligue: target.league });
  }, [target.league]);

  if (state === "open") {
    return (
      <>
        {limit != null && (
          <div className="counter">
            {L.t(
              <>Analyse complète <b>{used}/{limit}</b> aujourd&apos;hui</>,
              <>Full analysis <b>{used}/{limit}</b> today</>,
              <>Análisis completo <b>{used}/{limit}</b> hoy</>
            )} · <Link href={L.href("/pro")} onClick={() => track("Clic Passer Pro", { source: "compteur" })}>{tier === "starter" ? L.t("Passer Pro", "Go Pro", "Hazte Pro") : L.t("Débloquer plus d'analyses", "Unlock more analyses", "Desbloquear más análisis")}</Link>
          </div>
        )}
        {children}
      </>
    );
  }

  const left = limit == null ? null : Math.max(0, limit - used);
  const pctTxt = `${pct}${L.en ? "%" : " %"}`;
  const contents = L.t(
    "L'analyse complète contient les probabilités exactes, l'argumentation du modèle, tous les scénarios, les stats comparées et l'infirmerie.",
    "The full analysis includes exact probabilities, the model's reasoning, every scenario, the stat comparison and the injury report.",
    "El análisis completo incluye las probabilidades exactas, la argumentación del modelo, todos los escenarios, las estadísticas comparadas y el parte médico."
  );
  const signup = `/api/whop/signup?next=${back}`;

  return (
    <div className="gated locked ar-locked">
      <div className="ar-sec ar-lockhead"><h3>📈 {L.t("Probabilités exactes", "Exact probabilities", "Probabilidades exactas")}</h3></div>
      <div className="gate-content" aria-hidden>
        <div className="card block ghost"><div className="gl w40" /><div className="gl" /><div className="gl" /><div className="gl w70" /></div>
        <div className="grid2">
          <div className="card block ghost"><div className="gl w60" /><div className="gl" /><div className="gl" /><div className="gl w40" /></div>
          <div className="card block ghost"><div className="gl w50" /><div className="gl" /><div className="gl w70" /><div className="gl" /></div>
        </div>
        <div className="card block ghost"><div className="gl w40" /><div className="gl" /><div className="gl w60" /></div>
        <div className="card block ghost"><div className="gl w50" /><div className="gl" /><div className="gl w70" /></div>
      </div>
      <div className="gate-overlay">
        <div className="gate-box" ref={box}>
          {run.running ? (
            <AnalysisProgress p={run.p} league={target.league} />
          ) : (
            <>
              <h3>{L.t(`Tu n'as accès qu'à ${pctTxt} de l'analyse`, `You only have access to ${pctTxt} of the analysis`, `Solo tienes acceso al ${pctTxt} del análisis`)}</h3>
              <div className="gate-meter"><i style={{ width: `${pct}%` }} /></div>
              {state === "available" ? (
                <>
                  <p>{contents} {left == null
                    ? L.t("Ta formule les débloque sans limite.", "Your plan unlocks them with no limit.", "Tu plan los desbloquea sin límite.")
                    : L.t(`Il te reste ${left} analyse${left > 1 ? "s" : ""} complète${left > 1 ? "s" : ""} aujourd'hui.`, `You have ${left} full analys${left > 1 ? "es" : "is"} left today.`, `Te queda${left > 1 ? "n" : ""} ${left} análisis completo${left > 1 ? "s" : ""} hoy.`)}</p>
                  <button type="button" className="btn-solid" onClick={() => launch()}>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo")}</button>
                </>
              ) : state === "visitor" ? (
                <>
                  <p>{contents} {L.t("Avec un compte gratuit, tu en débloques 1 par jour.", "A free account unlocks 1 per day.", "Con una cuenta gratis, desbloqueas 1 al día.")}</p>
                  <a href={signup} className="btn-solid" onClick={() => track("Clic créer un compte", { source: "analyse_bloquee", ligue: target.league })}>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo")}</a>
                  <a href={`/api/whop/login?next=${here}`} className="gate-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "analyse_bloquee" })}>{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión")}</a>
                </>
              ) : (
                <>
                  <p>{contents} {tier === "starter"
                    ? L.t("Tes 5 analyses Starter du jour sont utilisées : Pro les rend illimitées.", "Your 5 Starter analyses for today are used: Pro makes them unlimited.", "Ya has usado tus 5 análisis Starter de hoy: Pro los hace ilimitados.")
                    : L.t("Ton analyse complète gratuite du jour est utilisée : Starter t'en offre 5 par jour, Pro les rend illimitées.", "Today's free full analysis is used: Starter gives you 5 a day, Pro makes them unlimited.", "Ya has usado tu análisis completo gratis de hoy: Starter te da 5 al día y Pro los hace ilimitados.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: tier === "starter" ? "limite" : "limite_compte" })}>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo")}</Link>
                  <small className="gate-reset">{L.t("Ou reviens demain : le compteur repart à minuit.", "Or come back tomorrow: the counter resets at midnight (Paris time).", "O vuelve mañana: el contador se reinicia a medianoche (hora de París).")}</small>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {modal && (state === "visitor" || state === "limit") && (
        <UnlockModal
          state={state}
          tier={tier}
          proof={proof}
          match={match}
          league={target.league}
          href={state === "visitor" ? signup : L.href("/pro")}
          onClose={close}
          onCta={() => state === "visitor"
            ? track("Clic créer un compte", { source: "fenetre_analyse", ligue: target.league })
            : track("Clic Passer Pro", { source: "fenetre_analyse", ligue: target.league })}
        />
      )}
    </div>
  );
}
