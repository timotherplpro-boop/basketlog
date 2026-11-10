"use client";
// « Comment as-tu connu Basketlog ? » : une question, une fois, juste après l'activation d'un abonnement (le moment où la
// personne est la plus bienveillante). Une touche suffit ; pour TikTok, Instagram, YouTube et X, on peut en plus nommer le
// créateur (facultatif), ce qui dit quels créateurs font vraiment venir des abonnés.
// Posée seulement si la personne a accepté la mesure d'audience : sans accord la réponse ne serait enregistrée nulle part,
// inutile de la demander. Ouverte par WelcomeToast (événement bl-source).
import { useCallback, useEffect, useState } from "react";
import { getConsent } from "../lib/consent";
import { setUserProps, track } from "../lib/analytics";
import { localStore } from "../lib/safe-store";
import { SOURCE_CHOICES, SOURCE_EVENT, cleanCreator, labelOf, markSourceAsked, sourceAsked } from "../lib/onboarding";
import { useL } from "./LangProvider";

export default function SourceAsk() {
  const L = useL();
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(null); // choix qui demande en plus un nom de créateur
  const [name, setName] = useState("");
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    const show = () => {
      const store = localStore();
      if (!getConsent()?.analytics || sourceAsked(store)) return;
      setPick(null);
      setName("");
      setThanks(false);
      setOpen(true);
      track("Question source affichée");
    };
    window.addEventListener(SOURCE_EVENT, show);
    return () => window.removeEventListener(SOURCE_EVENT, show);
  }, []);

  useEffect(() => {
    if (!thanks) return;
    const t = setTimeout(() => setOpen(false), 2600);
    return () => clearTimeout(t);
  }, [thanks]);

  const send = useCallback((id, creator = "") => {
    markSourceAsked(localStore());
    const createur = cleanCreator(creator);
    track("Source déclarée", { source: id, ...(createur ? { createur } : {}) });
    setUserProps({ source_declaree: id });
    setThanks(true);
  }, []);

  const skip = useCallback(() => {
    markSourceAsked(localStore());
    track("Question source ignorée");
    setOpen(false);
  }, []);

  if (!open) return null;
  const choice = SOURCE_CHOICES.find((s) => s.id === pick);

  return (
    <div className="src-ask" role="dialog" aria-label={L.t("Une question rapide", "A quick question", "Una pregunta rápida")}>
      {thanks ? (
        <p className="src-thanks" role="status">{L.t("Merci ! Bonnes analyses 🏀", "Thanks! Enjoy the analyses 🏀", "¡Gracias! Buenos análisis 🏀")}</p>
      ) : (
        <>
          <button type="button" className="src-x" onClick={skip} aria-label={L.t("Fermer", "Close", "Cerrar")}>×</button>
          <strong className="src-title">{L.t("Une dernière question", "One last question", "Una última pregunta")}</strong>
          <p className="src-q">{L.t("Comment as-tu connu Basketlog ?", "How did you hear about Basketlog?", "¿Cómo conociste Basketlog?")}</p>
          <div className="src-chips">
            {SOURCE_CHOICES.map((s) => (
              <button
                type="button"
                key={s.id}
                className={`src-chip${pick === s.id ? " on" : ""}`}
                aria-pressed={pick === s.id}
                onClick={() => (s.creator ? setPick(s.id) : send(s.id))}
              >{labelOf(s, L)}</button>
            ))}
          </div>
          {choice && (
            <form className="src-form" onSubmit={(e) => { e.preventDefault(); send(choice.id, name); }}>
              <label className="vh" htmlFor="src-name">{L.t("Quel créateur ?", "Which creator?", "¿Qué creador?")}</label>
              <input
                id="src-name"
                value={name}
                maxLength={40}
                autoComplete="off"
                placeholder={L.t("Quel créateur ? (facultatif)", "Which creator? (optional)", "¿Qué creador? (opcional)")}
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit">{L.t("Envoyer", "Send", "Enviar")}</button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
