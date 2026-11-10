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
  const [step, setStep] = useState(0); // 0 : compétition, 1 : équipe NBA
  const [league, setLeague] = useState(null);
  const box = useRef(null);
  useFocusTrap(box, open, null);

  useEffect(() => {
    const show = () => {
      if (onboardingDone(localStore())) return; // déjà vues (répondues ou ignorées) : jamais redemandées
      setStep(0);
      setLeague(null);
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
    track("Onboarding ignoré", { etape: step === 0 ? "ligue" : "equipe", ligue: league || "aucune" });
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

  const pick = (id) => {
    setLeague(id);
    track("Onboarding étape", { etape: "ligue", valeur: id });
    if (id === "euroleague") finish(id, null); // pas de choix d'équipe : la page EuroLeague
    else setStep(1);
  };

  return createPortal(
    <div className="modal onb" role="dialog" aria-modal="true" aria-labelledby="onb-title" onClick={(e) => e.target === e.currentTarget && skip()}>
      <div className="modal-box onb-box" ref={box} tabIndex={-1}>
        <button type="button" className="ulk-x" onClick={skip} aria-label={L.t("Fermer", "Close", "Cerrar")}><Cross /></button>
        <div className="onb-dots" aria-hidden><i className="on" /><i className={step === 1 ? "on" : ""} /></div>
        {step === 0 ? (
          <>
            <h3 id="onb-title">{L.t("Bienvenue ! Qu'est-ce que tu suis ?", "Welcome! What do you follow?", "¡Bienvenido! ¿Qué sigues?")}</h3>
            <p className="onb-sub">{L.t("Deux touches, et on te montre les bons matchs.", "Two taps, and we'll show you the right games.", "Dos toques y te mostramos los partidos adecuados.")}</p>
            <div className="onb-leagues">
              {LEAGUES.map((l) => (
                <button type="button" key={l.id} className="onb-opt" onClick={() => pick(l.id)}>{labelOf(l, L)}</button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 id="onb-title">{L.t("Ton équipe NBA ?", "Your NBA team?", "¿Tu equipo de la NBA?")}</h3>
            <p className="onb-sub">{L.t("On t'affiche ses prochains matchs.", "We'll show you their next games.", "Te mostramos sus próximos partidos.")}</p>
            <div className="onb-teams">
              {teams.map((t) => (
                <button type="button" key={t.id} className="onb-opt onb-team" onClick={() => finish(league, t.id)}>{t.short}</button>
              ))}
            </div>
            <button type="button" className="onb-link" onClick={() => finish(league, null)}>{L.t("Pas d'équipe en particulier", "No team in particular", "Ningún equipo en particular")}</button>
            <button type="button" className="onb-link" onClick={() => setStep(0)}>{L.t("← Retour", "← Back", "← Volver")}</button>
          </>
        )}
        <button type="button" className="onb-skip" onClick={skip}>{L.t("Passer", "Skip", "Saltar")}</button>
      </div>
    </div>,
    document.body
  );
}
