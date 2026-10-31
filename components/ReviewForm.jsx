"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusTrap } from "./useFocusTrap";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";
import { useProStatus } from "../lib/useProStatus";

// Bouton "Donner mon avis" + fenêtre de dépôt, pour tous : avec un compte (mention « Abonné vérifié » ou « Membre
// vérifié ») ou sans compte (avis sans mention). Les avis sont publiés après validation.
export default function ReviewForm({ label, className = "btn-white" }) {
  const L = useL();
  const status = useProStatus();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState({ status: "idle", error: "" });
  const openedAt = useRef(0); // heure d'ouverture du formulaire (un envoi en moins de 3 s = robot)

  const boxRef = useRef(null);
  const closeForm = useCallback(() => setOpen(false), []);
  useFocusTrap(boxRef, open, closeForm); // Tab reste dans la fenêtre, Échap la ferme
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ status: "sending", error: "" });
    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: f.get("prenom"), profil: f.get("profil"), texte: f.get("texte"), site: f.get("site"), note, lang: L.lang, elapsed: Date.now() - openedAt.current }),
      });
      const j = await res.json();
      if (j.ok) { setState({ status: "done", error: "" }); track("Avis envoyé", { note }); }
      else setState({ status: "idle", error: j.error || L.t("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.") });
    } catch {
      setState({ status: "idle", error: L.t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") });
    }
  }

  if (!status) return null; // formule en cours de vérification
  // Admin : lien vers la relecture des avis. Créateur partenaire : pas d'avis (accès offert).
  if (status.role === "admin") return <p className="reviews-only"><a href="/app/admin">{L.t("Relire les avis (admin)", "Review submissions (admin)", "Revisar las opiniones (admin)")}</a></p>;
  if (status.role) return null;
  const guest = !status.connected; // visiteur sans compte : avis possible, publié sans mention de vérification
  const back = encodeURIComponent(location.pathname + location.search);
  const first = (status.name || "").trim().split(/\s+/)[0] || "";
  const firstName = !guest && /^\p{L}[\p{L}'-]{1,39}$/u.test(first) ? first : "";

  return (
    <>
      <button type="button" className={className} onClick={() => { openedAt.current = Date.now(); setOpen(true); setState({ status: "idle", error: "" }); }}>{label || L.t("Donner mon avis", "Leave a review", "Dar mi opinión")}</button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="avis-title" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box" ref={boxRef} tabIndex={-1}>
            <button className="modal-x" onClick={() => setOpen(false)} aria-label={L.t("Fermer", "Close", "Cerrar")}>×</button>
            {state.status === "done" ? (
              <div className="modal-done">
                <span className="ball big-ball" aria-hidden />
                <h3 id="avis-title">{L.t("Merci pour ton avis !", "Thanks for your review!", "¡Gracias por tu opinión!")}</h3>
                <p>{L.t("Il sera affiché sur Basketlog dès qu'il aura été relu.", "It will appear on Basketlog once it has been reviewed.", "Se mostrará en Basketlog en cuanto la hayamos revisado.")}</p>
                <button className="btn-solid" onClick={() => setOpen(false)}>{L.t("Fermer", "Close", "Cerrar")}</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 id="avis-title">{L.t("Ton avis sur Basketlog", "Your review of Basketlog", "Tu opinión sobre Basketlog")}</h3>
                <p className="modal-sub">{L.t("Il sera publié avec ton prénom après relecture.", "It will be published with your first name after review.", "Se publicará con tu nombre tras una revisión.")} <a href={L.href("/confidentialite")} target="_blank" rel="noopener">{L.t("Tes données", "Your data", "Tus datos")}</a></p>
                {guest && (
                  <p className="modal-sub guest">
                    {L.t("Sans compte, ton avis est publié sans mention de vérification.", "Without an account, your review is published without a verification label.", "Sin cuenta, tu opinión se publica sin mención de verificación.")}{" "}
                    <a href={`/api/whop/login?next=${back}`}>{L.t("Se connecter", "Log in", "Iniciar sesión")}</a>
                    {" · "}
                    <a href={`/api/whop/signup?next=${back}`}>{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratuita")}</a>
                  </p>
                )}
                <div className="stars" role="radiogroup" aria-label={L.t("Note", "Rating", "Nota")} onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} role="radio" aria-checked={note === n} aria-label={L.t(`${n} étoile${n > 1 ? "s" : ""}`, `${n} star${n > 1 ? "s" : ""}`, `${n} estrella${n > 1 ? "s" : ""}`)}
                      className={(hover || note) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setNote(n)}>★</button>
                  ))}
                </div>
                <label>{L.t("Prénom", "First name", "Nombre")}<input name="prenom" required minLength={2} maxLength={40} defaultValue={firstName} placeholder={L.t("Ex : Karim", "E.g. Jordan", "P. ej.: Javier")} autoComplete="given-name" /></label>
                <label><span>{L.t("Qui es-tu ?", "Who are you?", "¿Quién eres?")} <small>{L.t("(facultatif)", "(optional)", "(opcional)")}</small></span><input name="profil" maxLength={60} placeholder={L.t("Ex : Fan des Celtics depuis 2008", "E.g. Celtics fan since 2008", "P. ej.: fan de los Celtics desde 2008")} /></label>
                <label>{L.t("Ton avis", "Your review", "Tu opinión")}<textarea name="texte" required minLength={15} maxLength={500} rows={4} placeholder={L.t("Qu'est-ce que Basketlog t'apporte ?", "What does Basketlog do for you?", "¿Qué te aporta Basketlog?")} /></label>
                <input name="site" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
                {state.error && <p className="modal-err">{state.error}</p>}
                <button className="btn-solid" disabled={!note || state.status === "sending"}>{state.status === "sending" ? L.t("Envoi…", "Sending…", "Enviando…") : note ? L.t("Envoyer mon avis", "Send my review", "Enviar mi opinión") : L.t("Choisis une note", "Pick a rating", "Elige una nota")}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
