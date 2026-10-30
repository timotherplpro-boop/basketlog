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
// Visiteur et compte gratuit = aperçu seulement (comme Visifoot, 0/0), Starter = 5 analyses complètes par jour,
// Pro et Lifetime = illimitées. La limite est comptée par le serveur, par compte : revenir en arrière, recharger
// ou changer d'appareil ne donne pas d'analyse en plus.
// Tant que l'analyse complète n'est pas lancée, son contenu n'est pas envoyé au navigateur.
export default function Gate({ access, target, pct = 30, proof = null, match = null, mode = "page", children }) {
  const L = useL();
  const router = useRouter();
  const run = useAnalysisRun();
  const [state, setState] = useState(access.state);
  const [here, setHere] = useState("");
  const [modal, setModal] = useState(false);
  const box = useRef(null);
  useEffect(() => { setState(access.state); }, [access.state]);
  useEffect(() => { setHere(encodeURIComponent(location.pathname + location.search)); }, []);
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
  const free = tier === "compte"; // compte gratuit : aucune analyse complète, comme Visifoot

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
                  <p>{contents} {L.t("Elle est incluse dans les formules Starter, Pro et Lifetime.", "It comes with the Starter, Pro and Lifetime plans.", "Está incluido en los planes Starter, Pro y Lifetime.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "analyse_bloquee", ligue: target.league })}>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo")}</Link>
                  <a href={`/api/whop/login?next=${here}`} className="gate-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "analyse_bloquee" })}>{L.t("Déjà abonné ? Se connecter", "Already subscribed? Log in", "¿Ya estás suscrito? Inicia sesión")}</a>
                </>
              ) : (
                <>
                  <p>{contents} {tier === "starter"
                    ? L.t("Tes 5 analyses Starter du jour sont utilisées : Pro les rend illimitées.", "Your 5 Starter analyses for today are used: Pro makes them unlimited.", "Ya has usado tus 5 análisis Starter de hoy: Pro los hace ilimitados.")
                    : L.t("Elle est réservée aux abonnés : Starter en offre 5 par jour, Pro et Lifetime les rendent illimitées.", "It's for subscribers: Starter gives you 5 a day, Pro and Lifetime make them unlimited.", "Está reservado a los suscriptores: Starter te da 5 al día, Pro y Lifetime los hacen ilimitados.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => track("Clic Passer Pro", { source: free ? "compte_gratuit" : "limite" })}>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo")}</Link>
                  {!free && <small className="gate-reset">{L.t("Ou reviens demain : le compteur repart à minuit.", "Or come back tomorrow: the counter resets at midnight (Paris time).", "O vuelve mañana: el contador se reinicia a medianoche (hora de París).")}</small>}
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
          href={L.href("/pro")}
          onClose={close}
          onCta={() => track("Clic Passer Pro", { source: "fenetre_analyse", ligue: target.league, etat: state === "visitor" ? "visiteur" : tier })}
        />
      )}
    </div>
  );
}
