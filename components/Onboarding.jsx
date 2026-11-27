"use client";
// Questions d'accueil après la création d'un compte (deux touches, ignorables) : quelle compétition, puis quelle équipe NBA.
// On envoie ensuite la personne sur les prochains matchs de son équipe (la liste de /app se filtre déjà avec ?team=).
// Ouverte par WelcomeToast (événement bl-onboarding) seulement pour un compte tout juste créé, hors fiche match et hors
// résultat d'analyse : la personne y vient justement pour lire l'analyse, la fenêtre « analyse complète » s'y ouvre déjà,
// et deux fenêtres l'une sur l'autre feraient fuir. Réponses gardées dans le navigateur (bl-profil), envoyées à Amplitude
// seulement avec l'accord à la mesure d'audience.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { setUserProps, track } from "../lib/analytics";
import { TEAMS } from "../lib/teams";
import { localStore } from "../lib/safe-store";
import { LEAGUES, ONBOARDING_EVENT, labelOf, onboardingDone, onboardingTarget, saveProfile } from "../lib/onboarding";
import { useL } from "./LangProvider";
import { useFocusTrap } from "./useFocusTrap";

const Cross = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 6l12 12M18 6L6 18" /></svg>
);

export default function Onboarding() {
  const L = useL();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0); // 0 : compétition, 1 : équipe NBA, 2 : e-mail du dimanche (27/11/2026)
  const [league, setLeague] = useState(null);
  const [choice, setChoice] = useState(null); // { ligue, equipe } gardé pendant l'étape 2
  const [nlBusy, setNlBusy] = useState(false);
  const box = useRef(null);
  useFocusTrap(box, open, null);

  useEffect(() => {
    const show = () => {
      if (onboardingDone(localStore())) return; // déjà vues (répondues ou ignorées) : jamais redemandées
      setStep(0);
      setLeague(null);
      setChoice(null);
      setOpen(true);
      track("Onboarding affiché");
    };
    window.addEventListener(ONBOARDING_EVENT, show);
    return () => window.removeEventListener(ONBOARDING_EVENT, show);
  }, []);

  const teams = useMemo(() => [...TEAMS].sort((a, b) => a.short.localeCompare(b.short, "en")), []);

  const finish = useCallback((ligue, equipe) => {
    const profile = saveProfile(localStore(), { ligue, equipe });
    track("Onboarding terminé", { ligue, equipe: equipe ? TEAMS.find((t) => t.id === equipe)?.abbr : "aucune" });
    setUserProps({ ligue_suivie: ligue, equipe_favorite: equipe ? TEAMS.find((t) => t.id === equipe)?.abbr : "" });
    setOpen(false);
    router.push(onboardingTarget(profile, L));
  }, [L, router]);

  const skip = useCallback(() => {
    saveProfile(localStore(), { passe: true });
    track("Onboarding ignoré", { etape: step === 0 ? "ligue" : step === 1 ? "equipe" : "newsletter", ligue: league || "aucune" });
    setOpen(false);
  }, [step, league]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && skip();
    document.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", esc); };
  }, [open, skip]);

  if (!open) return null;

  // Étape 2 (Tim, 27/11/2026 : « il faut absolument qu'on fasse plus de ventes ») : proposer l'e-mail du dimanche, avec
  // accord explicite (bouton « Oui »), jamais coché d'avance. « Oui » passe par /api/compte/newsletter (même chemin que
  // « Mon compte » : confirmation par e-mail pour un compte e-mail + mot de passe). Dans tous les cas, on termine ensuite.
  const toNewsletter = (ligue, equipe) => { setChoice({ ligue, equipe }); setStep(2); };
  const answerNewsletter = async (yes) => {
    if (yes) {
      setNlBusy(true);
      try {
        const res = await fetch("/api/compte/newsletter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "abonner", lang: L.lang }), cache: "no-store" });
        const j = await res.json().catch(() => null);
        track("Onboarding étape", { etape: "newsletter", valeur: res.ok && j?.ok ? (j.pending ? "a_confirmer" : "oui") : "erreur" });
      } catch {
        track("Onboarding étape", { etape: "newsletter", valeur: "erreur" });
      }
      setNlBusy(false);
    } else {
      track("Onboarding étape", { etape: "newsletter", valeur: "non" });
    }
    finish(choice?.ligue || league, choice?.equipe || null);
  };

  const pick = (id) => {
    setLeague(id);
    track("Onboarding étape", { etape: "ligue", valeur: id });
    if (id === "euroleague") toNewsletter(id, null); // pas de choix d'équipe : la page EuroLeague
    else setStep(1);
  };

  return createPortal(
    <div className="modal onb" role="dialog" aria-modal="true" aria-labelledby="onb-title" onClick={(e) => e.target === e.currentTarget && skip()}>
      <div className="modal-box onb-box" ref={box} tabIndex={-1}>
        <button type="button" className="ulk-x" onClick={skip} aria-label={L.t("Fermer", "Close", "Cerrar", "Fechar")}><Cross /></button>
        <div className="onb-dots" aria-hidden><i className="on" /><i className={step >= 1 ? "on" : ""} /><i className={step === 2 ? "on" : ""} /></div>
        {step === 0 ? (
          <>
            <h3 id="onb-title">{L.t("Bienvenue ! Qu'est-ce que tu suis ?", "Welcome! What do you follow?", "¡Bienvenido! ¿Qué sigues?", "Bem-vindo! O que você acompanha?")}</h3>
            <p className="onb-sub">{L.t("Deux touches, et on te montre les bons matchs.", "Two taps, and we'll show you the right games.", "Dos toques y te mostramos los partidos adecuados.", "Dois toques e mostramos os jogos certos para você.")}</p>
            <div className="onb-leagues">
              {LEAGUES.map((l) => (
                <button type="button" key={l.id} className="onb-opt" onClick={() => pick(l.id)}>{labelOf(l, L)}</button>
              ))}
            </div>
          </>
        ) : step === 2 ? (
          <>
            <h3 id="onb-title">{L.t("Dernière chose : on t'écrit le dimanche ?", "One last thing: a Sunday email?", "Una última cosa: ¿te escribimos el domingo?", "Última coisa: um e-mail no domingo?")}</h3>
            <p className="onb-sub">{L.t("Chaque dimanche : les matchs à ne pas rater de la semaine et les offres Basketlog. Désinscription en un clic.", "Every Sunday: the week's must-watch games and Basketlog offers. Unsubscribe in one click.", "Cada domingo: los partidos imprescindibles de la semana y las ofertas de Basketlog. Baja en un clic.", "Todo domingo: os jogos imperdíveis da semana e as ofertas do Basketlog. Cancelamento em um clique.")}</p>
            <div className="onb-leagues">
              <button type="button" className="onb-opt" disabled={nlBusy} onClick={() => answerNewsletter(true)}>{L.t("Oui, je m'inscris", "Yes, sign me up", "Sí, me apunto", "Sim, quero")}</button>
              <button type="button" className="onb-opt" disabled={nlBusy} onClick={() => answerNewsletter(false)}>{L.t("Non merci", "No thanks", "No, gracias", "Não, obrigado")}</button>
            </div>
          </>
        ) : (
          <>
            <h3 id="onb-title">{L.t("Ton équipe NBA ?", "Your NBA team?", "¿Tu equipo de la NBA?", "Seu time da NBA?")}</h3>
            <p className="onb-sub">{L.t("On t'affiche ses prochains matchs.", "We'll show you their next games.", "Te mostramos sus próximos partidos.", "Mostramos os próximos jogos dele.")}</p>
            <div className="onb-teams">
              {teams.map((t) => (
                <button type="button" key={t.id} className="onb-opt onb-team" onClick={() => toNewsletter(league, t.id)}>{t.short}</button>
              ))}
            </div>
            <button type="button" className="onb-link" onClick={() => toNewsletter(league, null)}>{L.t("Pas d'équipe en particulier", "No team in particular", "Ningún equipo en particular", "Nenhum time em especial")}</button>
            <button type="button" className="onb-link" onClick={() => setStep(0)}>{L.t("← Retour", "← Back", "← Volver", "← Voltar")}</button>
          </>
        )}
        <button type="button" className="onb-skip" disabled={nlBusy} onClick={step === 2 ? () => answerNewsletter(false) : skip}>{L.t("Passer", "Skip", "Saltar", "Pular")}</button>
      </div>
    </div>,
    document.body
  );
}
