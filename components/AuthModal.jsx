"use client";
// Fenêtre « Créer un compte », comme celle de Visifoot : « Continuer avec Google », ou e-mail + mot de passe
// (6 caractères minimum), « S'inscrire », « Déjà un compte ? Se connecter », « Fermer ». Aussi : connexion,
// « Mot de passe oublié ? » et, pour les abonnés d'avant les comptes Basketlog, la connexion avec Whop.
// Les comptes sont gardés dans la base de Basketlog (app/api/auth/route.js) ; le mot de passe n'y est jamais en clair.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useL } from "./LangProvider";
import { useFocusTrap } from "./useFocusTrap";
import { track } from "../lib/analytics";
import { getConsent } from "../lib/consent";

const IN_APP = /Instagram|FBAN|FBAV|FB_IAB|Messenger|musical_ly|BytedanceWebview|TikTok|Snapchat|Line\/|LinkedInApp|Pinterest|; wv\)/i;
const appName = (ua) =>
  /Instagram/i.test(ua) ? "Instagram" : /musical_ly|BytedanceWebview|TikTok/i.test(ua) ? "TikTok" : /FBAN|FBAV|FB_IAB|Messenger/i.test(ua) ? "Facebook" : /Snapchat/i.test(ua) ? "Snapchat" : null;

// Bouton d'où vient l'inscription, gardé pour la page d'arrivée (statistiques), seulement avec l'accord pour la mesure d'audience.
const keepSource = (source) => {
  try { if (getConsent()?.analytics) sessionStorage.setItem("bl_auth_src", source); } catch {}
};

const GoogleG = () => (
  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden>
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
  </svg>
);
const Mail = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
  </svg>
);
const Eye = ({ off }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />
    {off && <path d="M4 4l16 16" />}
  </svg>
);

// googleOn : « Continuer avec Google » est activé sur le site (GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET réglés).
export default function AuthModal({ initial, googleOn = false, onClose }) {
  const L = useL();
  const boxRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState(initial?.mode === "connexion" || initial?.mode === "oubli" ? initial.mode : "inscription");
  const [email, setEmail] = useState("");
  const [mdp, setMdp] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(null); // null | « form » | « google »
  const [error, setError] = useState(initial?.error ? { text: initial.error, google: true } : null); // { text, field?, google? }
  const [sent, setSent] = useState(null);
  const [inApp, setInApp] = useState(null);
  const done = useRef(false);
  const source = initial?.source || "site";

  const close = useCallback(() => {
    if (!done.current) track("Fenêtre inscription fermée", { source, mode });
    onClose?.();
  }, [onClose, source, mode]);

  useEffect(() => { setMounted(true); }, []);
  useFocusTrap(boxRef, mounted, close);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  // Retour arrière depuis la page Google : le navigateur peut réafficher la fenêtre telle qu'on l'a quittée (bouton bloqué).
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) setBusy(null); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);
  useEffect(() => {
    const ua = navigator.userAgent || "";
    setInApp(IN_APP.test(ua) ? appName(ua) || "app" : "");
    track("Fenêtre inscription affichée", { source, mode: initial?.mode || "inscription" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Après la connexion : on recharge la page (ou la page demandée) avec le message de bienvenue, ou on part payer.
  // Les statistiques « Compte créé » / « Connexion » partent de la page d'arrivée (components/WelcomeToast.jsx), sauf
  // quand on part payer chez Whop.
  const finish = useCallback((kind, method) => {
    done.current = true;
    const created = kind === "nouveau";
    keepSource(source);
    if (initial?.then === "paiement" && typeof initial.checkout === "string" && /^https:\/\/([a-z0-9-]+\.)*whop\.com\//i.test(initial.checkout)) {
      try { localStorage.setItem("bl_paiement", JSON.stringify({ plan: initial.plan || null, at: Date.now() })); } catch {}
      track(created ? "Compte créé" : "Connexion", { methode: method, source });
      track("Clic abonnement", { formule: initial.plan || "?", apres: created ? "inscription" : "connexion" });
      setTimeout(() => window.location.assign(initial.checkout), 400); // laisse partir les statistiques
      return;
    }
    let dest;
    try {
      dest = new URL(initial?.next || `${location.pathname}${location.search}${location.hash}`, location.origin);
      if (dest.origin !== location.origin) throw new Error("ailleurs");
    } catch {
      dest = new URL(location.href);
    }
    dest.searchParams.set("bienvenue", `${created ? "nouveau" : "retour"}-${method}`);
    setTimeout(() => window.location.assign(dest.pathname + dest.search + dest.hash), 150);
  }, [initial, source]);

  const call = useCallback(async (payload) => {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, lang: L.lang }),
    });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok && j.ok, ...j, status: res.status };
  }, [L.lang]);

  // Google : redirection vers la page Google « Choisis un compte » (app/api/auth/google), puis retour sur la page
  // d'origine, connecté. Après un clic sur une formule, on revient sur la page des formules pour payer.
  const googleHref = () => {
    let next = initial?.next || `${location.pathname}${location.search}${location.hash}`;
    if (initial?.then === "paiement") next = `${L.href("/pro")}?payer=${encodeURIComponent(initial.plan || "")}`;
    return `/api/auth/google?next=${encodeURIComponent(next)}&lang=${L.lang}`;
  };
  const onGoogle = (e) => {
    if (busy) { e.preventDefault(); return; }
    setError(null);
    setBusy("google");
    done.current = true;
    keepSource(source);
    track("Clic Google", { source, mode });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    const site = e.currentTarget.elements?.site?.value || "";
    if (mode === "oubli") {
      setBusy("form");
      const r = await call({ action: "oubli", email }).catch(() => ({ ok: false }));
      setBusy(null);
      if (r.ok) { setSent(r.message || ""); track("Mot de passe oublié", { etape: "demandé" }); }
      else setError({ text: r.error || L.t("Réessaie dans un instant.", "Please try again in a moment.", "Inténtalo de nuevo en un instante."), field: r.field });
      return;
    }
    if (mode === "inscription" && mdp.length < 6) {
      setError({ text: L.t("Ton mot de passe doit faire au moins 6 caractères.", "Your password must be at least 6 characters.", "Tu contraseña debe tener al menos 6 caracteres."), field: "mdp" });
      return;
    }
    setBusy("form");
    const r = await call({ action: mode, email, mdp, site }).catch(() => ({ ok: false }));
    if (r.ok) { finish(mode === "inscription" ? "nouveau" : "retour", "email"); return; }
    setBusy(null);
    setError({ text: r.error || L.t("Le service ne répond pas, réessaie dans un instant.", "The service isn't responding, please try again in a moment.", "El servicio no responde, inténtalo de nuevo en un instante."), field: r.field, existe: r.existe });
    if (mode === "inscription" && r.existe) track("Inscription refusée", { raison: r.google ? "compte_google" : "deja_inscrit" });
  };

  const switchTo = (m) => { setMode(m); setError(null); setSent(null); setMdp(""); setShow(false); };

  if (!mounted) return null;

  const fromMatch = source === "analyse" || source === "formulaire";
  const toPay = initial?.then === "paiement";
  const title = mode === "inscription" ? L.t("Créer un compte", "Create an account", "Crear una cuenta")
    : mode === "connexion" ? L.t("Se connecter", "Log in", "Iniciar sesión")
      : L.t("Mot de passe oublié", "Forgot password", "¿Has olvidado tu contraseña?");
  const sub = mode === "inscription"
    ? toPay ? L.t("Crée ton compte gratuit, puis règle ta formule : elle sera reliée à ce compte.", "Create your free account, then pay for your plan: it will be linked to this account.", "Crea tu cuenta gratis y luego paga tu plan: quedará vinculado a esta cuenta.")
      : fromMatch ? L.t("Inscris-toi gratuitement pour voir l'analyse du match", "Sign up for free to see the game analysis", "Regístrate gratis para ver el análisis del partido")
        : L.t("Inscris-toi gratuitement pour accéder aux analyses", "Sign up for free to access the analyses", "Regístrate gratis para acceder a los análisis")
    : mode === "connexion" ? L.t("Connecte-toi pour retrouver tes analyses", "Log in to get back to your analyses", "Inicia sesión para volver a tus análisis")
      : L.t("Entre ton adresse e-mail : on t'envoie un lien pour choisir un nouveau mot de passe.", "Enter your email: we'll send you a link to choose a new password.", "Introduce tu correo: te enviaremos un enlace para elegir una nueva contraseña.");
  const errFor = (f) => (error && error.field === f ? error.text : null);
  const whopHref = `/api/whop/login?next=${encodeURIComponent(initial?.next || (typeof location !== "undefined" ? location.pathname + location.search : "/app"))}`;

  return createPortal(
    <div className="auth-modal" role="presentation">
      <div className="auth-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="auth-title" tabIndex={-1}>
        <h2 id="auth-title">{title}</h2>
        <p className="auth-sub">{sub}</p>

        {mode !== "oubli" && googleOn && (
          <>
            <a className="auth-google" href={googleHref()} onClick={onGoogle} aria-disabled={!!busy} aria-busy={busy === "google"}>
              <GoogleG /> {busy === "google" ? L.t("Ouverture de Google…", "Opening Google…", "Abriendo Google…") : L.t("Continuer avec Google", "Continue with Google", "Continuar con Google")}
            </a>
            {inApp && (
              <p className="auth-hint">{L.t(
                `Dans l'appli ${inApp === "app" ? "que tu utilises" : inApp}, Google peut refuser la connexion : inscris-toi plutôt avec ton e-mail ci-dessous.`,
                `Inside the ${inApp === "app" ? "app you're using" : `${inApp} app`}, Google may refuse to sign you in: use your email below instead.`,
                `Dentro de la app ${inApp === "app" ? "que usas" : `de ${inApp}`}, Google puede rechazar el inicio de sesión: usa mejor tu correo aquí abajo.`
              )}</p>
            )}
            {error?.google && <p className="auth-err" role="alert">{error.text}</p>}
            <div className="auth-or"><span>{L.t("ou", "or", "o")}</span></div>
          </>
        )}

        {sent !== null ? (
          <div className="auth-sent" role="status">
            <p>{sent}</p>
            <button type="button" className="auth-link" onClick={() => switchTo("connexion")}>{L.t("Retour à la connexion", "Back to log in", "Volver a iniciar sesión")}</button>
          </div>
        ) : (
          <form className="auth-form" onSubmit={onSubmit} noValidate>
            <label className="vh" htmlFor="auth-email">{L.t("Adresse e-mail", "Email address", "Correo electrónico")}</label>
            <input
              id="auth-email" name="email" type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false}
              placeholder={L.t("E-mail", "Email", "Correo electrónico")} value={email} onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!errFor("email")} required maxLength={254}
            />
            {errFor("email") && <p className="auth-err" role="alert">{errFor("email")}</p>}
            {mode !== "oubli" && (
              <>
                <label className="vh" htmlFor="auth-mdp">{L.t("Mot de passe", "Password", "Contraseña")}</label>
                <div className="auth-pw">
                  <input
                    id="auth-mdp" name="password" type={show ? "text" : "password"} autoComplete={mode === "inscription" ? "new-password" : "current-password"}
                    placeholder={mode === "inscription" ? L.t("Mot de passe (min. 6 caractères)", "Password (min. 6 characters)", "Contraseña (mín. 6 caracteres)") : L.t("Mot de passe", "Password", "Contraseña")}
                    value={mdp} onChange={(e) => setMdp(e.target.value)} aria-invalid={!!errFor("mdp")} required minLength={mode === "inscription" ? 6 : undefined} maxLength={200}
                  />
                  <button type="button" className="auth-eye" onClick={() => setShow(!show)} aria-label={show ? L.t("Masquer le mot de passe", "Hide password", "Ocultar la contraseña") : L.t("Afficher le mot de passe", "Show password", "Mostrar la contraseña")} aria-pressed={show}><Eye off={show} /></button>
                </div>
                {errFor("mdp") && <p className="auth-err" role="alert">{errFor("mdp")}</p>}
              </>
            )}
            <input className="auth-hp" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" defaultValue="" />
            {error && !error.google && !error.field && <p className="auth-err" role="alert">{error.text}</p>}
            {error?.existe && mode === "inscription" && (
              <button type="button" className="auth-link" onClick={() => switchTo("connexion")}>{L.t("Me connecter avec cette adresse", "Log in with this email", "Iniciar sesión con este correo")}</button>
            )}
            <button type="submit" className="auth-submit" disabled={!!busy} aria-busy={busy === "form"}>
              {busy === "form" ? <span className="auth-spin" aria-hidden /> : mode === "inscription" ? <Mail /> : null}
              {mode === "inscription" ? L.t("S'inscrire", "Sign up", "Registrarse")
                : mode === "connexion" ? L.t("Se connecter", "Log in", "Iniciar sesión")
                  : L.t("Recevoir le lien", "Send me the link", "Recibir el enlace")}
            </button>
          </form>
        )}

        <div className="auth-links">
          {mode === "inscription" && (
            <button type="button" className="auth-link" onClick={() => switchTo("connexion")}>{L.t("Déjà un compte ? Se connecter", "Already have an account? Log in", "¿Ya tienes cuenta? Inicia sesión")}</button>
          )}
          {mode === "connexion" && (
            <>
              <button type="button" className="auth-link auth-link-quiet" onClick={() => switchTo("oubli")}>{L.t("Mot de passe oublié ?", "Forgot password?", "¿Has olvidado tu contraseña?")}</button>
              <button type="button" className="auth-link" onClick={() => switchTo("inscription")}>{L.t("Pas encore de compte ? S'inscrire", "No account yet? Sign up", "¿Aún no tienes cuenta? Regístrate")}</button>
              <a className="auth-link auth-link-quiet" href={whopHref} onClick={() => { done.current = true; track("Connexion Whop", { etape: "clic", source: `fenetre_${source}` }); }}>{L.t("Abonné avec Whop ? Se connecter avec Whop", "Subscribed through Whop? Log in with Whop", "¿Suscrito con Whop? Inicia sesión con Whop")}</a>
            </>
          )}
          {mode === "oubli" && sent === null && (
            <button type="button" className="auth-link" onClick={() => switchTo("connexion")}>{L.t("Retour à la connexion", "Back to log in", "Volver a iniciar sesión")}</button>
          )}
        </div>

        {mode === "inscription" && (
          <p className="auth-legal">{L.t(
            <>En t&apos;inscrivant, tu acceptes les <Link href="/cgu" target="_blank">CGU</Link> et la <Link href="/confidentialite" target="_blank">politique de confidentialité</Link>.</>,
            <>By signing up, you accept the <Link href={L.href("/cgu")} target="_blank">Terms of Use</Link> and the <Link href={L.href("/confidentialite")} target="_blank">Privacy Policy</Link>.</>,
            <>Al registrarte, aceptas las <Link href={L.href("/cgu")} target="_blank">Condiciones de uso</Link> y la <Link href={L.href("/confidentialite")} target="_blank">Política de privacidad</Link>.</>
          )}</p>
        )}

        <button type="button" className="auth-close" onClick={close}>{L.t("Fermer", "Close", "Cerrar")}</button>
      </div>
    </div>,
    document.body
  );
}
