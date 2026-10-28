"use client";
import { useEffect, useState } from "react";
import { track } from "../lib/analytics";

// Bouton "Donner mon avis" + fenêtre de dépôt. Les avis sont publiés après validation.
export default function ReviewForm({ label = "Donner mon avis", className = "btn-white" }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState({ status: "idle", error: "" });

  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = ""; };
  }, [open]);

  async function submit(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState({ status: "sending", error: "" });
    try {
      const res = await fetch("/api/avis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prenom: f.get("prenom"), profil: f.get("profil"), texte: f.get("texte"), site: f.get("site"), note }),
      });
      const j = await res.json();
      if (j.ok) { setState({ status: "done", error: "" }); track("Avis envoyé", { note }); }
      else setState({ status: "idle", error: j.error || "Une erreur est survenue." });
    } catch {
      setState({ status: "idle", error: "Connexion impossible, réessaie." });
    }
  }

  return (
    <>
      <button type="button" className={className} onClick={() => { setOpen(true); setState({ status: "idle", error: "" }); }}>{label}</button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="avis-title" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-box">
            <button className="modal-x" onClick={() => setOpen(false)} aria-label="Fermer">×</button>
            {state.status === "done" ? (
              <div className="modal-done">
                <span className="ball big-ball" aria-hidden />
                <h3 id="avis-title">Merci pour ton avis !</h3>
                <p>Il sera affiché sur Basketlog dès qu&apos;il aura été relu.</p>
                <button className="btn-solid" onClick={() => setOpen(false)}>Fermer</button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <h3 id="avis-title">Ton avis sur Basketlog</h3>
                <p className="modal-sub">Il sera publié avec ton prénom après relecture.</p>
                <div className="stars" role="radiogroup" aria-label="Note" onMouseLeave={() => setHover(0)}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} role="radio" aria-checked={note === n} aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
                      className={(hover || note) >= n ? "on" : ""} onMouseEnter={() => setHover(n)} onClick={() => setNote(n)}>★</button>
                  ))}
                </div>
                <label>Prénom<input name="prenom" required minLength={2} maxLength={40} placeholder="Ex : Karim" autoComplete="given-name" /></label>
                <label><span>Qui es-tu ? <small>(facultatif)</small></span><input name="profil" maxLength={60} placeholder="Ex : Fan des Celtics depuis 2008" /></label>
                <label>Ton avis<textarea name="texte" required minLength={15} maxLength={500} rows={4} placeholder="Qu'est-ce que Basketlog t'apporte ?" /></label>
                <input name="site" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
                {state.error && <p className="modal-err">{state.error}</p>}
                <button className="btn-solid" disabled={!note || state.status === "sending"}>{state.status === "sending" ? "Envoi…" : note ? "Envoyer mon avis" : "Choisis une note"}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
