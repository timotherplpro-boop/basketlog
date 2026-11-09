"use client";
// Réglage de la newsletter du dimanche dans « Mon compte » : s'inscrire ou se désinscrire en un clic.
// La section n'existe pas tant que la newsletter est fermée (pas de clé Resend, interrupteur éteint, langue pas encore ouverte,
// ou compte regardé en mode aperçu) : le serveur répond alors { available: false } (voir app/api/compte/newsletter/route.js).
import { useState } from "react";
import { useL } from "./LangProvider";
import { useNewsletter } from "../lib/useNewsletter";
import { Consent, blockedText, problemText, useNewsletterError } from "./NewsletterBits";

export default function NewsletterSettings() {
  const L = useL();
  const T = L.t;
  const nl = useNewsletter(L.lang, true);
  const [done, setDone] = useState(""); // "on" | "off" : dernière action réussie
  const error = useNewsletterError(nl.error);
  const s = nl.state;
  if (!s || s.available === false) return null;

  async function go(on) {
    setDone("");
    const good = await (on ? nl.subscribe() : nl.unsubscribe());
    if (good) setDone(on ? "on" : "off");
  }

  const lead = T("Recevoir la newsletter", "Receive the newsletter", "Recibir la newsletter");
  return (
    <section className="panel acc-sec" aria-labelledby="acc-nl">
      <h2 id="acc-nl">{T("Newsletter du dimanche", "Sunday newsletter", "Newsletter del domingo")}</h2>
      <p className="acc-help">{T(
        "Chaque dimanche à 18 h (heure de Paris), par e-mail : le bilan des 7 derniers jours et les matchs à confiance très élevée de la semaine.",
        "Every Sunday at 6 pm (Paris time), by email: the record of the last 7 days and the week's very-high-confidence games.",
        "Cada domingo a las 18:00 (hora de París), por correo: el balance de los últimos 7 días y los partidos de confianza muy alta de la semana."
      )}</p>
      {error && <div className="adm-err" role="alert">{error}</div>}
      {done === "on" && !error && <div className="adm-notice ok" role="status">{T("Inscription enregistrée : tu recevras la newsletter chaque dimanche à 18 h.", "You're signed up: you'll get the newsletter every Sunday at 6 pm.", "Suscripción registrada: recibirás la newsletter cada domingo a las 18:00.")}</div>}
      {done === "off" && !error && <div className="adm-notice ok" role="status">{T("Désinscription enregistrée : tu ne recevras plus la newsletter.", "You're unsubscribed: you won't receive the newsletter any more.", "Baja registrada: ya no recibirás la newsletter.")}</div>}

      {s.subscribed === null ? (
        <>
          <p className="acc-note" role="status">{problemText(T, s.problem)}</p>
          {s.problem !== "email" && s.problem !== "verify" && <div className="acc-actions"><button type="button" className="acc-btn" onClick={() => nl.reload()}>{T("Réessayer", "Try again", "Reintentar")}</button></div>}
        </>
      ) : s.blocked ? (
        <p className="acc-note">{blockedText(T)}</p>
      ) : s.subscribed ? (
        <>
          <p>
            <span className="adm-tag ok">{T("Inscription active", "Signed up", "Suscripción activa")}</span>{" "}
            {T(`La newsletter arrive à l'adresse de ton compte${s.email ? ` (${s.email})` : ""}.`, `The newsletter goes to your account's email address${s.email ? ` (${s.email})` : ""}.`, `La newsletter llega a la dirección de tu cuenta${s.email ? ` (${s.email})` : ""}.`)}
          </p>
          <div className="acc-actions">
            <button type="button" className="acc-btn" disabled={nl.busy} onClick={() => go(false)}>
              {nl.busy ? "…" : T("Ne plus recevoir la newsletter", "Stop receiving the newsletter", "Dejar de recibir la newsletter")}
            </button>
          </div>
        </>
      ) : (
        <>
          <p>{T("Tu ne reçois pas la newsletter.", "You're not receiving the newsletter.", "No recibes la newsletter.")}</p>
          <Consent email={s.email} lead={lead} />
          <div className="acc-actions">
            <button type="button" className="acc-btn primary" disabled={nl.busy} onClick={() => go(true)}>
              {nl.busy ? T("Inscription…", "Signing up…", "Suscribiendo…") : lead}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
