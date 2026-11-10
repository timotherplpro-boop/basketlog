"use client";
// Page « Confirme ton inscription », ouverte depuis le lien de l'e-mail de confirmation (…/newsletter/confirmer#<jeton>).
// Le jeton est lu dans le fragment de l'adresse puis aussitôt retiré de la barre d'adresse (il ne part ni dans les statistiques ni dans
// l'historique) ; il n'est envoyé qu'au serveur, dans le corps des requêtes. Ouvrir la page ne change rien : seul le clic sur
// « Je confirme mon inscription » inscrit (un antivirus ou un aperçu de messagerie qui suit le lien n'inscrit donc personne).
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useL } from "./LangProvider";
import { Consent, blockedText } from "./NewsletterBits";

const TOKEN_RE = /^[A-Za-z0-9_-]{20,500}\.[A-Za-z0-9_-]{30,60}$/; // simple tri avant d'appeler le serveur, qui vérifie la signature

async function call(action, jeton, lang) {
  const res = await fetch("/api/newsletter/confirmer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, jeton, lang }), cache: "no-store" });
  return { status: res.status, j: await res.json().catch(() => null) };
}

export default function NewsletterConfirm() {
  const L = useL();
  const T = L.t;
  const token = useRef("");
  const [state, setState] = useState("check"); // check | ok | invalid | down | blocked | done
  const [email, setEmail] = useState(""); // adresse masquée, renvoyée par le serveur
  const [message, setMessage] = useState(""); // message déjà traduit par le serveur
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = (location.hash || "").replace(/^#/, "");
    if (location.hash) history.replaceState(null, "", location.pathname);
    if (!TOKEN_RE.test(t)) { setState("invalid"); return; }
    token.current = t;
    call("verifier", t, L.lang)
      .then(({ j }) => {
        if (j?.ok && j.valide) { setEmail(j.email || ""); setState("ok"); }
        else if (j?.ok) setState("invalid");
        else { setMessage(j?.error || ""); setState("down"); }
      })
      .catch(() => setState("down"));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { status, j } = await call("confirmer", token.current, L.lang);
      if (j?.ok && j.subscribed) { setEmail(j.email || email); setState("done"); }
      else if (status === 409) setState("blocked");
      else if (status === 400) setState("invalid");
      else setError(j?.error || T("Réessaie dans un instant.", "Please try again in a moment.", "Inténtalo de nuevo en un instante."));
    } catch {
      setError(T("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo."));
    }
    setBusy(false);
  }

  const lead = T("Je confirme mon inscription", "Confirm my signup", "Confirmo mi suscripción");
  return (
    <section className="auth-box auth-page">
      <h1>{T("Newsletter du dimanche", "Sunday newsletter", "Newsletter del domingo")}</h1>
      {state === "check" && <p className="auth-sub" role="status">{T("Vérification du lien…", "Checking the link…", "Comprobando el enlace…")}</p>}
      {state === "down" && <p className="auth-sub" role="alert">{message || T("Le service ne répond pas pour le moment. Recharge la page dans un instant.", "The service isn't responding right now. Reload the page in a moment.", "El servicio no responde por ahora. Recarga la página en un instante.")}</p>}
      {state === "invalid" && (
        <>
          <p className="auth-sub" role="alert">{T("Ce lien n'est plus valable : il a expiré (il marche 48 heures) ou ne correspond plus à ton compte.", "This link is no longer valid: it has expired (it works for 48 hours) or no longer matches your account.", "Este enlace ya no es válido: ha caducado (funciona durante 48 horas) o ya no corresponde a tu cuenta.")}</p>
          <p className="auth-sub">{T("Pour recevoir un nouveau lien, connecte-toi, ouvre « Mon compte » et demande la newsletter.", "To get a new link, log in, open “My account” and ask for the newsletter.", "Para recibir un enlace nuevo, inicia sesión, abre «Mi cuenta» y pide la newsletter.")}</p>
          <Link className="auth-submit" href={L.href("/app/compte")}>{T("Ouvrir Mon compte", "Open My account", "Abrir Mi cuenta")}</Link>
        </>
      )}
      {state === "blocked" && (
        <p className="auth-sub" role="alert">{blockedText(T)}</p>
      )}
      {state === "ok" && (
        <>
          <p className="auth-sub">{T("Une dernière étape : confirme ton inscription pour recevoir la newsletter chaque dimanche à 18 h (heure de Paris).", "One last step: confirm your signup to receive the newsletter every Sunday at 6 pm (Paris time).", "Un último paso: confirma tu suscripción para recibir la newsletter cada domingo a las 18:00 (hora de París).")}</p>
          <Consent email={email} lead={lead} />
          {error && <p className="auth-err" role="alert">{error}</p>}
          <button type="button" className="auth-submit" onClick={confirm} disabled={busy} aria-busy={busy}>{busy ? <span className="auth-spin" aria-hidden /> : null}{lead}</button>
        </>
      )}
      {state === "done" && (
        <>
          <p className="auth-sub" role="status">{T(
            `C'est confirmé ! Tu recevras la newsletter chaque dimanche à 18 h, à l'adresse ${email || "de ton compte"}. Pour te désinscrire : le lien au bas de chaque e-mail, ou « Mon compte ».`,
            `You're confirmed! You'll get the newsletter every Sunday at 6 pm, at ${email || "your account's address"}. To unsubscribe: the link at the bottom of every email, or “My account”.`,
            `¡Confirmado! Recibirás la newsletter cada domingo a las 18:00, en ${email || "la dirección de tu cuenta"}. Para darte de baja: el enlace al final de cada correo, o «Mi cuenta».`
          )}</p>
          <Link className="auth-submit" href={L.href("/app")}>{T("Ouvrir Basketlog", "Open Basketlog", "Abrir Basketlog")}</Link>
        </>
      )}
    </section>
  );
}
