"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";
import AnalysisProgress, { useAnalysisRun } from "./AnalysisProgress";
import UnlockModal from "./UnlockModal";
import { openAuth } from "../lib/auth-client";
import { PRO_TRIAL_DAYS } from "../lib/pricing";

// Robots d'indexation : pas de fenêtre par-dessus le contenu.
const BOT = /bot|crawl|spider|slurp|lighthouse/i;
const SEEN = "bl-unlock-seen";
// Fiche d'où part le visiteur vers les formules : il y revient, débloquée, après le paiement intégré (components/PayCheckout.jsx).
const rememberHere = () => { try { sessionStorage.setItem("bl_pay_next", location.pathname + location.search); } catch {} };

// Fin de l'analyse, comme Visifoot : sans l'analyse complète, on ne voit qu'une partie (forme, résumé, scénario n° 1,
// confiance) et le reste est flouté sous « Tu n'as accès qu'à X % de l'analyse ». Dès qu'une analyse s'affiche ainsi,
// la fenêtre « Tu veux voir l'analyse complète ? » s'ouvre (après le formulaire d'analyse, ou en arrivant sur la
// partie verrouillée d'une fiche match, une fois par session).
// Depuis le 16/11/2026, plus d'inscription forcée : un visiteur sans compte voit le même aperçu qu'un compte gratuit, et le
// bouton mène directement aux formules puis au paiement intégré (pas de compte à créer).
// Visiteur et compte gratuit = aperçu seulement (comme Visifoot, 0/0), Starter = 1 analyse réduite par jour
// (probabilités exactes et stats clés), Pro et Lifetime = analyses complètes illimitées. La limite est comptée par le serveur, par compte : revenir en arrière, recharger
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
              <>Analyse réduite <b>{used}/{limit}</b> aujourd&apos;hui</>,
              <>Reduced analysis <b>{used}/{limit}</b> today</>,
              <>Análisis reducido <b>{used}/{limit}</b> hoy</>, <>Análise reduzida <b>{used}/{limit}</b> hoje</>
            )} · <Link href={L.href("/pro")} onClick={() => track("Clic Passer Pro", { source: "compteur" })}>{tier === "starter" ? L.t("Passer Pro", "Go Pro", "Hazte Pro", "Assine o Pro") : L.t("Débloquer plus d'analyses", "Unlock more analyses", "Desbloquear más análisis", "Desbloquear mais análises")}</Link>
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
    "El análisis completo incluye las probabilidades exactas, la argumentación del modelo, todos los escenarios, las estadísticas comparadas y el parte médico.", "A análise completa inclui as probabilidades exatas, a argumentação do modelo, todos os cenários, as estatísticas comparadas e o boletim médico."
  );
  const free = tier === "compte"; // compte gratuit : aucune analyse complète, comme Visifoot
  // Essai Pro (20/11/2026) : sur les écrans verrouillés, le bouton annonce l'essai gratuit plutôt qu'un simple « Débloquer ».
  const trial = PRO_TRIAL_DAYS > 0 && tier !== "starter";
  const trialCta = L.t(`Essai ${PRO_TRIAL_DAYS} jours à 1 €`, `Start ${PRO_TRIAL_DAYS}-day trial for €1`, `Prueba ${PRO_TRIAL_DAYS} días por 1 €`, `Teste ${PRO_TRIAL_DAYS} dias por 1 €`);
  // Pass 24 h (21/11/2026) : lien discret sous le bouton d'essai, vers la carte du pass sur /pro (case des CGV à cocher là-bas).
  const passLink = (source) => (
    <Link href={`${L.href("/pro")}#pass`} className="gate-pass" onClick={() => { rememberHere(); track("Clic pass 24 h", { source }); }}>
      {L.t("ou juste pour ce soir : pass 24 h à 1,99 € →", "or just for tonight: 24-hour pass for €1.99 →", "o solo para esta noche: pase 24 h por 1,99 € →", "ou só para esta noite: passe 24 h por 1,99 € →")}
    </Link>
  );
  const trialLine = L.t(`${PRO_TRIAL_DAYS} jours à 1 €, puis 9,99 €/mois + taxes. Résiliable à tout moment.`, `${PRO_TRIAL_DAYS} days for €1, then €9.99/mo (+ tax). Cancel anytime.`, `${PRO_TRIAL_DAYS} días por 1 €, luego 9,99 €/mes + impuestos. Cancela cuando quieras.`, `${PRO_TRIAL_DAYS} dias por 1 €, depois 9,99 €/mês + impostos. Cancele quando quiser.`);

  return (
    <div className="gated locked ar-locked">
      <div className="ar-sec ar-lockhead"><h3>📈 {L.t("Probabilités exactes", "Exact probabilities", "Probabilidades exactas", "Probabilidades exatas")}</h3></div>
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
              {state === "available" ? (
                // Abonné : l'analyse est incluse, on ne lui dit pas qu'il n'a accès qu'à une partie.
                <h3>{left == null
                  ? L.t("L'analyse complète est incluse dans ta formule", "The full analysis is included in your plan", "El análisis completo está incluido en tu plan", "A análise completa está incluída no seu plano")
                  : L.t("Ton analyse Starter du jour est disponible", "Your daily Starter analysis is available", "Tu análisis Starter del día está disponible", "Sua análise Starter do dia está disponível")}</h3>
              ) : (
                <>
                  <h3>{L.t(`Tu n'as accès qu'à ${pctTxt} de l'analyse`, `You only have access to ${pctTxt} of the analysis`, `Solo tienes acceso al ${pctTxt} del análisis`, `Você só tem acesso a ${pctTxt} da análise`)}</h3>
                  <div className="gate-meter"><i style={{ width: `${pct}%` }} /></div>
                </>
              )}
              {state === "available" ? (
                <>
                  <p>{left == null
                    ? <>{contents} {L.t("Ta formule les débloque sur tous les matchs, sans limite.", "Your plan unlocks them on every game, with no limit.", "Tu plan los desbloquea en todos los partidos, sin límite.", "Seu plano as desbloqueia em todos os jogos, sem limite.")}</>
                    : L.t(`Ton analyse Starter du jour montre les probabilités exactes, le score projeté et les stats clés du match. Il te reste ${left} analyse aujourd'hui.`, `Your daily Starter analysis shows the exact probabilities, projected score and key stats. You have ${left} analysis left today.`, `Tu análisis Starter del día muestra las probabilidades exactas, el marcador proyectado y las estadísticas clave. Te queda ${left} análisis hoy.`, `Sua análise Starter do dia mostra as probabilidades exatas, o placar projetado e as estatísticas-chave. Resta ${left} análise hoje.`)}</p>
                  <button type="button" className="btn-solid" onClick={() => launch()}>🔓 {left == null ? L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo", "Desbloquear a análise completa") : L.t("Débloquer mon analyse du jour", "Unlock my daily analysis", "Desbloquear mi análisis del día", "Desbloquear minha análise do dia")}</button>
                </>
              ) : state === "visitor" ? (
                <>
                  <p>{contents} {L.t("Elle est incluse dans Pro et Lifetime.", "It comes with Pro and Lifetime.", "Está incluido en Pro y Lifetime.", "Está incluída no Pro e no Lifetime.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => { rememberHere(); track("Clic Passer Pro", { source: "visiteur" }); }}>{trial ? `🎁 ${trialCta}` : <>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo", "Desbloquear a análise completa")}</>}</Link>
                  {trial && <small className="gate-trial">{trialLine}</small>}
                  {passLink("visiteur")}
                  <button type="button" className="gate-login" onClick={() => openAuth({ mode: "connexion", source: "analyse" })}>{L.t("Déjà abonné ? Se connecter", "Already subscribed? Log in", "¿Ya estás suscrito? Inicia sesión", "Já é assinante? Entre")}</button>
                </>
              ) : (
                <>
                  <p>{contents} {tier === "starter"
                    ? L.t("Ton analyse Starter du jour est utilisée : Pro rend les analyses complètes illimitées.", "Today's Starter analysis is used: Pro makes full analyses unlimited.", "Ya has usado tu análisis Starter de hoy: Pro hace los análisis completos ilimitados.", "Você já usou sua análise Starter de hoje: o Pro deixa as análises completas ilimitadas.")
                    : L.t("Elle est incluse dans Pro et Lifetime.", "It comes with Pro and Lifetime.", "Está incluido en Pro y Lifetime.", "Está incluída no Pro e no Lifetime.")}</p>
                  <Link href={L.href("/pro")} className="btn-solid" onClick={() => { rememberHere(); track("Clic Passer Pro", { source: free ? "compte_gratuit" : "limite" }); }}>{trial ? `🎁 ${trialCta}` : <>🔓 {L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo", "Desbloquear a análise completa")}</>}</Link>
                  {trial && <small className="gate-trial">{trialLine}</small>}
                  {passLink(free ? "compte_gratuit" : "limite")}
                  {!free && <small className="gate-reset">{L.t("Ou reviens demain : le compteur repart à minuit.", "Or come back tomorrow: the counter resets at midnight (Paris time).", "O vuelve mañana: el contador se reinicia a medianoche (hora de París).", "Ou volte amanhã: o contador zera à meia-noite (horário de Paris).")}</small>}
                  <a href={`/api/whop/login?next=${here}`} className="gate-login" onClick={() => track("Connexion Whop", { etape: "actualiser", source: "analyse_bloquee" })}>{L.t("Tu viens de payer ? Activer mon abonnement", "Just paid? Activate my subscription", "¿Acabas de pagar? Activar mi suscripción", "Acabou de pagar? Ativar minha assinatura")}</a>
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
          onCta={() => { rememberHere(); track("Clic Passer Pro", { source: "fenetre_analyse", ligue: target.league, etat: state === "visitor" ? "visiteur" : tier }); }}
        />
      )}
    </div>
  );
}
