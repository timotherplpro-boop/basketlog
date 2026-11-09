"use client";
// Invitation à la newsletter du dimanche, en haut de l'espace membre : une carte, une seule fois par navigateur.
// Rien n'est envoyé ni enregistré avant le clic sur « Je m'inscris » (consentement explicite : voir Consent dans NewsletterBits).
// « Non merci » et « Plus tard » ne sont retenus que dans ce navigateur (localStorage) : refuser n'a besoin d'aucune donnée côté serveur.
// Tant que la newsletter est fermée, le serveur répond { available: false } et la carte n'apparaît pas.
import { useEffect, useState } from "react";
import { useL } from "./LangProvider";
import { useNewsletter } from "../lib/useNewsletter";
import { Consent, useNewsletterError } from "./NewsletterBits";

const LATER_DAYS = 7; // « Plus tard » : la carte revient au bout d'une semaine
const keyOf = (uid) => `bl_nl:${uid}`;
const OFF_TAB = "bl_nl_off"; // newsletter fermée : inutile de redemander à chaque page dans cet onglet

function readChoice(uid) {
  try {
    const raw = localStorage.getItem(keyOf(uid));
    if (!raw) return null;
    const { v, t } = JSON.parse(raw);
    if (v === "later" && Date.now() - t > LATER_DAYS * 86400e3) return null;
    return v === "on" || v === "no" || v === "later" ? v : null;
  } catch {
    return null;
  }
}
function saveChoice(uid, v) {
  try { localStorage.setItem(keyOf(uid), JSON.stringify({ v, t: Date.now() })); } catch {}
}
const closedInTab = () => { try { return sessionStorage.getItem(OFF_TAB) === "1"; } catch { return false; } };

export default function NewsletterInvite({ uid, hidden = false }) {
  const L = useL();
  const T = L.t;
  const [ask, setAsk] = useState(false); // le membre n'a pas encore répondu dans ce navigateur : on peut interroger le serveur
  const [gone, setGone] = useState(false); // carte fermée (refus, plus tard ou fermeture de la confirmation)
  const [thanks, setThanks] = useState(false); // inscription faite : la carte devient une confirmation
  const [joining, setJoining] = useState(false); // inscription en cours : la carte reste affichée jusqu'à la confirmation
  const nl = useNewsletter(L.lang, ask);
  const error = useNewsletterError(nl.error);
  const s = nl.state;

  useEffect(() => {
    setAsk(!!uid && !hidden && readChoice(uid) === null && !closedInTab());
  }, [uid, hidden]);

  // Réponse du serveur : fermée pour ce compte → on le retient pour l'onglet ; déjà inscrit → on le retient dans ce navigateur.
  useEffect(() => {
    if (!s || thanks) return;
    if (s.available === false) { try { sessionStorage.setItem(OFF_TAB, "1"); } catch {} }
    else if (s.subscribed === true && uid) saveChoice(uid, "on");
  }, [s, uid, thanks]);

  if (!uid || hidden || gone || !s || s.available === false) return null;
  if (!thanks && !joining && !error && (s.subscribed !== false || s.blocked)) return null; // déjà inscrit, adresse bloquée ou lecture impossible : on ne dit rien

  const lead = T("Je m'inscris", "Sign me up", "Quiero suscribirme");
  const close = (choice) => { if (choice && uid) saveChoice(uid, choice); setGone(true); };

  async function join() {
    setJoining(true);
    const good = await nl.subscribe();
    if (good && uid) saveChoice(uid, "on");
    setThanks(good);
    setJoining(false);
  }

  if (thanks) {
    return (
      <div className="nl-invite">
        <section className="nl-card done" role="status" aria-label={T("Newsletter du dimanche", "Sunday newsletter", "Newsletter del domingo")}>
          <p>{T(
            `C'est noté : tu recevras la newsletter chaque dimanche à 18 h, à l'adresse ${s.email || "de ton compte Whop"}. Pour te désinscrire : le lien au bas de chaque e-mail, ou « Mon compte ».`,
            `You're signed up: you'll get the newsletter every Sunday at 6 pm, at ${s.email || "your Whop account's address"}. To unsubscribe: the link at the bottom of every email, or “My account”.`,
            `Hecho: recibirás la newsletter cada domingo a las 18:00, en ${s.email || "la dirección de tu cuenta de Whop"}. Para darte de baja: el enlace al final de cada correo, o «Mi cuenta».`
          )}</p>
          <div className="nl-actions"><button type="button" className="acc-btn" onClick={() => close(null)}>{T("Fermer", "Close", "Cerrar")}</button></div>
        </section>
      </div>
    );
  }

  return (
    <div className="nl-invite">
      <section className="nl-card" aria-labelledby="nl-title">
        <h2 id="nl-title">{T("La newsletter du dimanche", "The Sunday newsletter", "La newsletter del domingo")}</h2>
        <p>{T(
          "Chaque dimanche à 18 h (heure de Paris), par e-mail : le bilan des 7 derniers jours et les matchs à confiance très élevée de la semaine. Gratuite, désinscription en un clic.",
          "Every Sunday at 6 pm (Paris time), by email: the record of the last 7 days and the week's very-high-confidence games. Free, unsubscribe in one click.",
          "Cada domingo a las 18:00 (hora de París), por correo: el balance de los últimos 7 días y los partidos de confianza muy alta de la semana. Gratis, con baja en un clic."
        )}</p>
        <Consent email={s.email} lead={lead} />
        {error && <p className="nl-err" role="alert">{error}</p>}
        <div className="nl-actions">
          <button type="button" className="acc-btn primary" disabled={nl.busy} onClick={join}>{nl.busy ? T("Inscription…", "Signing up…", "Suscribiendo…") : lead}</button>
          <button type="button" className="acc-link" disabled={nl.busy} onClick={() => close("later")}>{T("Plus tard", "Later", "Más tarde")}</button>
          <button type="button" className="acc-link" disabled={nl.busy} onClick={() => close("no")}>{T("Non merci", "No thanks", "No, gracias")}</button>
        </div>
      </section>
    </div>
  );
}
