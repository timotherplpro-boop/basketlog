"use client";
// « Mon compte » : choisir son nom affiché, gérer son abonnement (passer à une formule supérieure en un clic, résilier en fin de
// période, reprendre, moyen de paiement et factures chez Whop) et supprimer son compte (membre ou créateur ; un admin ne se supprime
// pas ici). Tout passe par /api/compte, qui agit sur le compte connecté uniquement.
// Changement de formule : le bouton envoie payer la nouvelle formule chez Whop ; au retour, la page vérifie le paiement et le serveur
// arrête l'ancien abonnement EN FIN DE PÉRIODE, seulement une fois la nouvelle formule confirmée (voir app/api/compte/route.js).
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useL } from "./LangProvider";
import { DELETE_WORDS, NAME_MAX, deleteConfirmed } from "../lib/account";
import { fmtDate } from "../lib/i18n";
import { patchProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { switchDoneText } from "../lib/switch-text";
import { openAuth } from "../lib/auth-client";

// Page Whop où l'on retrouve ses commandes (repli quand le site ne peut pas lire ou modifier l'abonnement) et réglages du compte Whop.
const WHOP_ORDERS = "https://whop.com/@me/settings/orders/";
const WHOP_SETTINGS = "https://whop.com/@me/settings/";
const CONTACT = "contact@basketlog-app.com";

const TIER = { starter: "Starter", pro: "Pro", lifetime: "Lifetime" };
const WHOP_URL = /^https:\/\/([a-z0-9-]+\.)*whop\.com\//i; // on ne quitte le site que vers Whop
const CHECK_TRIES = 6; // vérifications automatiques du paiement (une toutes les 4 s), puis le membre relance lui-même
const CHECK_EVERY_MS = 4000;

export default function AccountPanel() {
  const L = useL();
  const T = L.t;
  const router = useRouter();
  const [data, setData] = useState(null); // réponse de GET /api/compte
  const [loadErr, setLoadErr] = useState(""); // "login" : session expirée ; sinon message
  const [busy, setBusy] = useState(""); // action en cours : nom | plan:<id> | supprimer
  const [fail, setFail] = useState(null); // { sec: "nom" | "abo" | "sup", msg }
  const [ok, setOk] = useState(null); // { sec, msg }
  const [nameIn, setNameIn] = useState("");
  const [confirmId, setConfirmId] = useState(null); // abonnement dont la résiliation attend sa confirmation
  const [delOpen, setDelOpen] = useState(false);
  const [word, setWord] = useState("");
  const [gone, setGone] = useState(null); // compte supprimé : { stopped, creator, codes }
  const touched = useRef(false); // le membre a commencé à écrire son nom : on ne l'écrase plus au rechargement
  const [sw, setSw] = useState(null); // vérification d'un changement de formule : { phase: "checking" | "pending" | "error", msg }
  const tries = useRef(0); // vérifications automatiques déjà faites
  const timer = useRef(null);
  const checking = useRef(false);
  const autoStarted = useRef(false);
  const [agree, setAgree] = useState(false); // CGV et CGU acceptées, accès immédiat demandé (nouvel achat)
  const [nudge, setNudge] = useState(false); // rappel : la case n'est pas cochée
  // Compte e-mail ou Google : mot de passe (actuel, nouveau) et accord pour les e-mails.
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwShow, setPwShow] = useState(false);

  const money = (p) => {
    if (!p) return "";
    try { return new Intl.NumberFormat(L.locale, { style: "currency", currency: (p.currency || "eur").toUpperCase() }).format(p.amount); } catch { return String(p.amount); }
  };
  const per = (d) => (!d ? "" : d >= 28 && d <= 31 ? T("par mois", "per month", "al mes") : d >= 360 && d <= 366 ? T("par an", "per year", "al año") : d === 7 ? T("par semaine", "per week", "por semana") : "");
  const day = (iso) => (iso ? fmtDate(L, iso, { day: "numeric", month: "long", year: "numeric" }) : "");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/compte?lang=${L.lang}`, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      if (res.status === 401) { setLoadErr("login"); return; }
      if (!res.ok || !j?.ok) { setLoadErr(j?.error || T("Impossible de charger ton compte pour le moment.", "Your account couldn't be loaded right now.", "No se ha podido cargar tu cuenta por ahora.")); return; }
      setLoadErr("");
      setData(j);
      if (!touched.current) setNameIn(j.name?.custom || j.name?.current || "");
    } catch {
      setLoadErr(T("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo."));
    }
  }, [L.lang]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  async function post(payload) {
    try {
      const res = await fetch("/api/compte", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, lang: L.lang }), cache: "no-store" });
      const j = await res.json().catch(() => null);
      return { good: res.ok && !!j?.ok, j, status: res.status };
    } catch {
      return { good: false, status: 0, j: { error: T("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") } };
    }
  }
  const generic = T("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.");

  async function saveName(value) {
    setBusy("nom"); setFail(null); setOk(null);
    const { good, j } = await post({ action: "nom", nom: value });
    setBusy("");
    if (!good) { setFail({ sec: "nom", msg: j?.error || generic }); return; }
    touched.current = false;
    setNameIn(j.name.custom || j.name.current || "");
    patchProStatus({ name: j.name.current }); // la barre latérale affiche le nouveau nom tout de suite
    router.refresh();
    setData((d) => (d ? { ...d, name: j.name } : d));
    setOk({ sec: "nom", msg: value ? T(`Nom enregistré : ${j.name.current}.`, `Name saved: ${j.name.current}.`, `Nombre guardado: ${j.name.current}.`) : T("Nom d'origine rétabli.", "Original name restored.", "Nombre original restablecido.") });
  }

  async function savePassword() {
    setBusy("mdp"); setFail(null); setOk(null);
    const { good, j } = await post({ action: "mdp", actuel: pwOld, nouveau: pwNew });
    setBusy("");
    if (!good) { setFail({ sec: "cpt", msg: j?.error || generic }); return; }
    const first = !data?.compte?.mdp;
    setPwOld(""); setPwNew(""); setPwShow(false);
    setData((d) => (d?.compte ? { ...d, compte: { ...d.compte, mdp: true } } : d));
    setOk({ sec: "cpt", msg: first
      ? T("Mot de passe enregistré : tu peux maintenant te connecter avec ton e-mail et ce mot de passe.", "Password saved: you can now log in with your email and this password.", "Contraseña guardada: ya puedes iniciar sesión con tu correo y esta contraseña.")
      : T("Nouveau mot de passe enregistré. Tes autres appareils sont déconnectés.", "New password saved. Your other devices are logged out.", "Nueva contraseña guardada. Tus otros dispositivos han cerrado sesión.") });
    track("Mot de passe changé", { premier: first });
  }

  async function saveMarketing(on) {
    // La case suit tout de suite le clic ; elle revient en arrière si l'enregistrement échoue.
    setBusy("marketing"); setFail(null); setOk(null);
    setData((d) => (d?.compte ? { ...d, compte: { ...d.compte, marketing: on } } : d));
    const { good, j } = await post({ action: "marketing", ok: on });
    setBusy("");
    if (!good) {
      setData((d) => (d?.compte ? { ...d, compte: { ...d.compte, marketing: !on } } : d));
      setFail({ sec: "cpt", msg: j?.error || generic });
      return;
    }
    setData((d) => (d?.compte ? { ...d, compte: { ...d.compte, marketing: !!j.marketing } } : d));
    setOk({ sec: "cpt", msg: j.marketing
      ? T("C'est noté : tu recevras nos e-mails (analyses et offres). Tu peux arrêter quand tu veux.", "Got it: you'll receive our emails (analyses and offers). You can stop anytime.", "Anotado: recibirás nuestros correos (análisis y ofertas). Puedes dejarlo cuando quieras.")
      : T("C'est noté : tu ne recevras plus nos e-mails d'analyses et d'offres.", "Got it: you won't receive our analysis and offer emails anymore.", "Anotado: ya no recibirás nuestros correos de análisis y ofertas.") });
    track("E-mails Basketlog", { accord: !!j.marketing });
  }

  async function act(action, id) {
    setBusy(`plan:${id}`); setFail(null); setOk(null);
    const { good, j } = await post({ action, id });
    setBusy("");
    setConfirmId(null);
    if (!good) { setFail({ sec: "abo", msg: j?.error || generic }); await load(); return; }
    // Le nouvel état de l'abonnement (relu chez Whop par le serveur) s'affiche tout de suite, avant la relecture complète ci-dessous.
    if (j.plan) {
      const { id: planId, state, canCancel, canResume, periodEnd } = j.plan;
      setData((d) => (d ? { ...d, plans: d.plans.map((p) => (p.id === planId ? { ...p, state, canCancel, canResume, periodEnd, included: canCancel ? (p.included || p.covered || null) : null, covered: canCancel ? null : (p.included || p.covered || null), duplicate: canCancel ? p.duplicate : false } : p)) } : d));
    }
    const tier = TIER[j.plan?.tier] || "";
    if (action === "resilier") {
      const until = day(j.plan?.periodEnd);
      setOk({ sec: "abo", msg: T(
        `Résiliation enregistrée. Ton abonnement ${tier} reste actif ${until ? `jusqu'au ${until}` : "jusqu'à la fin de la période déjà payée"}, puis il s'arrête : aucun autre prélèvement. Tu peux le reprendre quand tu veux d'ici là.`,
        `Cancellation recorded. Your ${tier} subscription stays active ${until ? `until ${until}` : "until the end of the period you've already paid for"}, then stops: no further charges. You can resume it any time before then.`,
        `Cancelación registrada. Tu suscripción ${tier} sigue activa ${until ? `hasta el ${until}` : "hasta el final del periodo ya pagado"} y después se detiene: sin más cobros. Puedes reanudarla cuando quieras antes de esa fecha.`
      ) });
    } else {
      setOk({ sec: "abo", msg: T(
        `Abonnement ${tier} repris : il se renouvelle de nouveau à la prochaine échéance.`,
        `${tier} subscription resumed: it renews again at the next billing date.`,
        `Suscripción ${tier} reanudada: se vuelve a renovar en el próximo vencimiento.`
      ) });
    }
    await load();
  }

  // ---------- Changement de formule en un clic ----------
  const pend = data?.switch?.pending || null; // changement demandé, pas encore terminé : { from, fromTier, tier, url, ready }

  const doneMsg = (j) => switchDoneText(T, j, day(j.from?.periodEnd)); // message de fin (lib/switch-text.js)

  // Clic sur « Passer à … » : le serveur prépare le paiement chez Whop (lien choisi côté serveur) et retient le changement ;
  // on part payer. Rien n'est arrêté à ce stade.
  async function startSwitch(p, o) {
    if (!agree) { setNudge(true); document.getElementById(`acc-agree-${p.id}`)?.focus(); return; }
    setBusy(`sw:${p.id}:${o.tier}`); setFail(null); setOk(null);
    const { good, j } = await post({ action: "changer", id: p.id, cible: o.tier, accept: true });
    if (!good || typeof j?.url !== "string" || !WHOP_URL.test(j.url)) {
      setBusy(""); setFail({ sec: "abo", msg: j?.error || generic }); await load(); return;
    }
    track("Changement de formule", { etape: "paiement", de: p.tier, vers: o.tier });
    window.location.assign(j.url);
    setTimeout(() => setBusy(""), 10000); // la page de paiement ne s'est pas ouverte : on rend la main
  }

  // Vérifie le paiement chez Whop. Paiement confirmé : l'ancien abonnement est arrêté en fin de période (fait par le serveur).
  // Pas encore confirmé : on réessaie quelques fois toutes seules, puis le membre relance avec « Vérifier mon paiement ».
  async function finish({ manual = false } = {}) {
    if (checking.current) return;
    checking.current = true;
    clearTimeout(timer.current);
    if (manual) tries.current = 0;
    setSw({ phase: "checking" });
    const { good, j, status } = await post({ action: "finaliser" });
    checking.current = false;
    if (!good) {
      if (status === 401) { await load(); return; }
      setSw({ phase: "error", msg: j?.error || generic });
      return;
    }
    if (j.state === "pending") {
      tries.current += 1;
      setSw({ phase: "pending" });
      if (tries.current < CHECK_TRIES) timer.current = setTimeout(() => finish(), CHECK_EVERY_MS);
      return;
    }
    tries.current = 0;
    setSw(null);
    if (j.state === "done") {
      patchProStatus({ tier: j.tier, perDay: j.perDay }); // la barre latérale et les accès suivent tout de suite
      router.refresh();
      setOk({ sec: "abo", msg: doneMsg(j) });
      track("Changement de formule", { etape: "terminé", de: j.from?.tier, vers: j.to?.tier });
    }
    await load();
  }

  async function abandon() {
    clearTimeout(timer.current);
    setBusy("sw-abandon"); setFail(null); setOk(null);
    const { good, j } = await post({ action: "abandonner" });
    setBusy("");
    if (!good) { setFail({ sec: "abo", msg: j?.error || generic }); return; }
    tries.current = 0;
    setSw(null);
    setOk({ sec: "abo", msg: T("Changement annulé : rien n'a été arrêté, ton abonnement continue normalement.", "Switch cancelled: nothing was stopped, your subscription carries on as usual.", "Cambio cancelado: no se ha detenido nada, tu suscripción continúa con normalidad.") });
    await load();
  }

  // Un changement est en cours (on revient de la page de paiement) : vérification tout de suite, sans attendre un clic.
  useEffect(() => {
    if (!pend) { autoStarted.current = false; return; }
    if (autoStarted.current) return;
    autoStarted.current = true;
    finish();
  }, [pend?.from, pend?.tier]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clearTimeout(timer.current), []);
  // Bouton « Précédent » depuis la page de paiement : le navigateur peut rendre la page telle qu'on l'a quittée (bouton bloqué).
  useEffect(() => {
    const onShow = (e) => { if (e.persisted) { setBusy(""); load(); } };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [load]);

  async function removeAccount() {
    setBusy("supprimer"); setFail(null); setOk(null);
    const { good, j } = await post({ action: "supprimer", confirm: word });
    setBusy("");
    if (!good) { setFail({ sec: "sup", msg: j?.error || generic }); await load(); return; }
    patchProStatus({ connected: false, uid: null, name: null, tier: "gratuit", role: null });
    setGone({ stopped: j.stopped || 0, creator: !!j.creator, codes: Array.isArray(j.codes) ? j.codes : [], acct: !!data?.compte, whop: !!data?.compte?.whop });
  }

  const orders = <a href={WHOP_ORDERS} target="_blank" rel="noopener noreferrer">{T("ta page de commandes Whop", "your Whop orders page", "tu página de pedidos de Whop")}</a>;

  // ---------- États d'ensemble ----------
  if (gone) {
    return (
      <div className="acc">
        <section className="panel acc-sec acc-gone" aria-live="polite">
          <h2>{T("Ton compte a été supprimé", "Your account has been deleted", "Tu cuenta ha sido eliminada")}</h2>
          <p>{gone.creator
            ? T(
              "Tes données Basketlog (historique d'analyses, questions, avis, nom affiché) sont effacées, ton accès créateur est retiré et tu es déconnecté.",
              "Your Basketlog data (analysis history, questions, review, display name) has been erased, your creator access is removed and you are logged out.",
              "Tus datos de Basketlog (historial de análisis, preguntas, opinión, nombre mostrado) se han borrado, tu acceso de creador se ha retirado y has cerrado sesión."
            )
            : T(
              "Tes données Basketlog (historique d'analyses, questions, avis, nom affiché) sont effacées et tu es déconnecté.",
              "Your Basketlog data (analysis history, questions, review, display name) has been erased and you are logged out.",
              "Tus datos de Basketlog (historial de análisis, preguntas, opinión, nombre mostrado) se han borrado y has cerrado sesión."
            )}</p>
          {gone.codes?.length > 0 && <p>{gone.codes.length > 1
            ? T(`Tes codes promo ${gone.codes.join(", ")} sont désactivés : ils ne fonctionnent plus.`, `Your promo codes ${gone.codes.join(", ")} are deactivated: they no longer work.`, `Tus códigos promocionales ${gone.codes.join(", ")} están desactivados: ya no funcionan.`)
            : T(`Ton code promo ${gone.codes[0]} est désactivé : il ne fonctionne plus.`, `Your promo code ${gone.codes[0]} is deactivated: it no longer works.`, `Tu código promocional ${gone.codes[0]} está desactivado: ya no funciona.`)}</p>}
          {gone.stopped > 0 && <p>{gone.stopped > 1
            ? T(`${gone.stopped} abonnements sont arrêtés : plus aucun prélèvement, accès conservé jusqu'à la fin de la période déjà payée.`, `${gone.stopped} subscriptions are stopped: no further charges, access kept until the end of the period already paid.`, `${gone.stopped} suscripciones detenidas: sin más cobros, acceso conservado hasta el final del periodo ya pagado.`)
            : T("Ton abonnement est arrêté : plus aucun prélèvement, accès conservé jusqu'à la fin de la période déjà payée.", "Your subscription is stopped: no further charges, access kept until the end of the period already paid.", "Tu suscripción está detenida: sin más cobros, acceso conservado hasta el final del periodo ya pagado.")}</p>}
          {gone.acct && <p>{T("Ton compte Basketlog (adresse e-mail, mot de passe, connexion Google) est supprimé.", "Your Basketlog account (email address, password, Google sign-in) is deleted.", "Tu cuenta de Basketlog (correo, contraseña, inicio de sesión con Google) está eliminada.")}</p>}
          {(!gone.acct || gone.whop) && <p className="acc-help">{T("Ton compte Whop (e-mail, moyens de paiement, factures) est géré par Whop : tu peux le supprimer depuis ", "Your Whop account (email, payment methods, invoices) is managed by Whop: you can delete it from ", "Tu cuenta de Whop (correo, medios de pago, facturas) la gestiona Whop: puedes eliminarla desde ")}<a href={WHOP_SETTINGS} target="_blank" rel="noopener noreferrer">{T("tes réglages Whop", "your Whop settings", "tus ajustes de Whop")}</a>.</p>}
          <a className="btn-solid acc-home" href={L.href("/")}>{T("Retour à l'accueil", "Back to the home page", "Volver al inicio")}</a>
        </section>
      </div>
    );
  }
  if (loadErr === "login") {
    return (
      <div className="acc">
        <section className="panel acc-sec">
          <h2>{T("Reconnecte-toi", "Please log in again", "Vuelve a iniciar sesión")}</h2>
          <p>{T("Ta session a expiré. Reconnecte-toi pour gérer ton compte.", "Your session has expired. Log in again to manage your account.", "Tu sesión ha caducado. Vuelve a iniciar sesión para gestionar tu cuenta.")}</p>
          <button type="button" className="btn-solid acc-home" onClick={() => openAuth({ mode: "connexion", source: "mon_compte", next: L.href("/app/compte") })}>{T("Se connecter", "Log in", "Iniciar sesión")}</button>
        </section>
      </div>
    );
  }
  if (loadErr && !data) {
    return (
      <div className="acc">
        <section className="panel acc-sec">
          <div className="adm-err" role="alert">{loadErr}</div>
          <div className="acc-actions"><button type="button" className="acc-btn" onClick={() => { setLoadErr(""); load(); }}>{T("Réessayer", "Try again", "Reintentar")}</button></div>
        </section>
      </div>
    );
  }
  if (!data) {
    return <div className="acc"><section className="panel acc-sec"><p className="acc-help" role="status">{T("Chargement de ton compte…", "Loading your account…", "Cargando tu cuenta…")}</p></section></div>;
  }

  const { plans, can, role, preview } = data;
  const isCreator = role === "createur";
  const codes = Array.isArray(data.creator?.codes) ? data.creator.codes : []; // codes promo du créateur, désactivés chez Whop à la suppression
  const codeText = (c) => `${c.code} (${T(`-${c.pct} %`, `-${c.pct}%`, `-${c.pct} %`)})`;
  const renewingCount = plans.filter((p) => p.canCancel).length;
  const hasLifetime = plans.some((p) => p.state === "lifetime");
  const typedName = nameIn.trim();
  const unchanged = typedName === (data.name.custom || "") || (!data.name.custom && typedName === (data.name.current || ""));

  const section = (sec) => (
    <>
      {fail?.sec === sec && <div className="adm-err" role="alert">{fail.msg}{sec === "abo" && <> {T("Tu peux aussi le faire depuis", "You can also do it from", "También puedes hacerlo desde")} {orders}.</>}</div>}
      {ok?.sec === sec && <div className="adm-notice ok" role="status">{ok.msg}</div>}
    </>
  );

  return (
    <div className="acc">
      {preview && <div className="adm-notice" role="status">{T("Tu regardes le site en mode aperçu : quitte l'aperçu (bandeau en haut de page) pour modifier ton compte.", "You're viewing the site in preview mode: leave the preview (banner at the top of the page) to change your account.", "Estás viendo el sitio en modo vista previa: sal de la vista previa (banner en la parte superior) para modificar tu cuenta.")}</div>}

      {/* ---------- Nom affiché ---------- */}
      <section className="panel acc-sec" aria-labelledby="acc-nom">
        <h2 id="acc-nom">{T("Mon nom", "My name", "Mi nombre")}</h2>
        <p className="acc-help">{T("C'est le nom affiché dans ton menu, à gauche.", "This is the name shown in your menu, on the left.", "Es el nombre que aparece en tu menú, a la izquierda.")}</p>
        {section("nom")}
        <form className="acc-form" onSubmit={(e) => { e.preventDefault(); saveName(typedName); }}>
          <label htmlFor="acc-nom-in">{T("Nom affiché", "Display name", "Nombre mostrado")}</label>
          <div className="acc-row">
            <input
              id="acc-nom-in"
              value={nameIn}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              disabled={!can.rename || busy === "nom"}
              placeholder={data.name.whop || T("Ton prénom", "Your first name", "Tu nombre")}
              onChange={(e) => { touched.current = true; setNameIn(e.target.value); }}
            />
            <button type="submit" className="acc-btn primary" disabled={!can.rename || busy === "nom" || !typedName || unchanged}>
              {busy === "nom" ? T("Enregistrement…", "Saving…", "Guardando…") : T("Enregistrer", "Save", "Guardar")}
            </button>
          </div>
          <small className="acc-help">{T(`2 à ${NAME_MAX} caractères.`, `2 to ${NAME_MAX} characters.`, `De 2 a ${NAME_MAX} caracteres.`)}</small>
        </form>
        {data.name.custom && can.rename && (
          <button type="button" className="acc-link" disabled={busy === "nom"} onClick={() => saveName("")}>
            {data.compte
              ? T(`Revenir au nom par défaut (${data.name.whop || "Membre"})`, `Go back to the default name (${data.name.whop || "Member"})`, `Volver al nombre por defecto (${data.name.whop || "Miembro"})`)
              : data.name.whop
                ? T(`Revenir au nom de mon compte Whop (${data.name.whop})`, `Go back to my Whop account name (${data.name.whop})`, `Volver al nombre de mi cuenta de Whop (${data.name.whop})`)
                : T("Revenir au nom de mon compte Whop", "Go back to my Whop account name", "Volver al nombre de mi cuenta de Whop")}
          </button>
        )}
        {!can.rename && !preview && <p className="acc-note">{T("Le choix du nom sera disponible très bientôt.", "Choosing your name will be available very soon.", "Podrás elegir tu nombre muy pronto.")}</p>}
      </section>

      {/* ---------- Compte e-mail ou Google : adresse, mot de passe, e-mails, compte Whop relié ---------- */}
      {data.compte && !data.compte.unreachable && (
        <section className="panel acc-sec" aria-labelledby="acc-cpt">
          <h2 id="acc-cpt">{T("Mon compte Basketlog", "My Basketlog account", "Mi cuenta de Basketlog")}</h2>
          {section("cpt")}
          <dl className="acc-facts">
            <div><dt>{T("Adresse e-mail", "Email address", "Correo electrónico")}</dt><dd>{data.compte.email}</dd></div>
            <div><dt>{T("Connexion", "Sign-in", "Inicio de sesión")}</dt><dd>{[
              data.compte.google && T("Google", "Google", "Google"),
              data.compte.mdp && T("e-mail et mot de passe", "email and password", "correo y contraseña"),
            ].filter(Boolean).join(T(" ou ", " or ", " o ")) || "–"}</dd></div>
            <div><dt>{T("Abonnement Whop", "Whop subscription", "Suscripción de Whop")}</dt><dd>{data.compte.whop
              ? T("compte Whop relié", "Whop account linked", "cuenta de Whop vinculada")
              : T("aucun compte Whop relié", "no Whop account linked", "ninguna cuenta de Whop vinculada")}</dd></div>
          </dl>
          {!preview && (
            <p className="acc-help">
              {data.compte.whop
                ? T("Tu as payé avec un autre compte Whop ? ", "Paid with another Whop account? ", "¿Has pagado con otra cuenta de Whop? ")
                : T("Tu as payé une formule chez Whop ? ", "Paid for a plan on Whop? ", "¿Has pagado un plan en Whop? ")}
              <a href={`/api/whop/login?next=${encodeURIComponent(L.href("/app/compte"))}`} className="acc-link strong" onClick={() => track("Connexion Whop", { etape: "actualiser", source: "mon_compte" })}>{T("Activer mon abonnement", "Activate my subscription", "Activar mi suscripción")}</a>
              {T(" : connecte-toi à Whop avec le compte utilisé pour payer, il sera relié à ton compte Basketlog.", ": log in to Whop with the account you paid with, and it will be linked to your Basketlog account.", ": inicia sesión en Whop con la cuenta con la que pagaste y quedará vinculada a tu cuenta de Basketlog.")}
            </p>
          )}

          <form className="acc-form" onSubmit={(e) => { e.preventDefault(); if (!busy) savePassword(); }}>
            <p className="acc-sub">{data.compte.mdp ? T("Changer mon mot de passe", "Change my password", "Cambiar mi contraseña") : T("Choisir un mot de passe", "Set a password", "Elegir una contraseña")}</p>
            {!data.compte.mdp && <small className="acc-help">{T("Tu te connectes avec Google. Un mot de passe te permet aussi de te connecter avec ton e-mail.", "You log in with Google. A password also lets you log in with your email.", "Inicias sesión con Google. Una contraseña te permite también iniciar sesión con tu correo.")}</small>}
            {data.compte.mdp && (
              <>
                <label htmlFor="acc-pw-old">{T("Mot de passe actuel", "Current password", "Contraseña actual")}</label>
                <input id="acc-pw-old" type={pwShow ? "text" : "password"} autoComplete="current-password" value={pwOld} maxLength={200} disabled={!!busy || preview} onChange={(e) => setPwOld(e.target.value)} />
              </>
            )}
            <label htmlFor="acc-pw-new">{T("Nouveau mot de passe (6 caractères minimum)", "New password (at least 6 characters)", "Nueva contraseña (mínimo 6 caracteres)")}</label>
            <div className="acc-row">
              <input id="acc-pw-new" type={pwShow ? "text" : "password"} autoComplete="new-password" value={pwNew} minLength={6} maxLength={200} disabled={!!busy || preview} onChange={(e) => setPwNew(e.target.value)} />
              <button type="submit" className="acc-btn primary" disabled={!!busy || preview || pwNew.length < 6 || (data.compte.mdp && !pwOld)}>
                {busy === "mdp" ? T("Enregistrement…", "Saving…", "Guardando…") : T("Enregistrer", "Save", "Guardar")}
              </button>
            </div>
            <label className="acc-check"><input type="checkbox" checked={pwShow} onChange={(e) => setPwShow(e.target.checked)} /> {T("Afficher les mots de passe", "Show passwords", "Mostrar las contraseñas")}</label>
          </form>

          <label className="acc-check acc-mkt">
            <input type="checkbox" checked={!!data.compte.marketing} disabled={!!busy || preview} onChange={(e) => saveMarketing(e.target.checked)} />
            <span>{T(
              "Recevoir par e-mail les analyses et les offres de Basketlog. Tu peux arrêter à tout moment, ici.",
              "Receive Basketlog's analyses and offers by email. You can stop at any time, right here.",
              "Recibir por correo los análisis y las ofertas de Basketlog. Puedes dejarlo en cualquier momento, aquí."
            )}</span>
          </label>
        </section>
      )}

      {/* ---------- Abonnement ---------- */}
      <section className="panel acc-sec" aria-labelledby="acc-abo">
        <h2 id="acc-abo">{T("Mon abonnement", "My subscription", "Mi suscripción")}</h2>
        {section("abo")}
        {pend && (
          <div className="acc-pending" role="status" aria-live="polite">
            <p><b>{T(`Changement vers ${TIER[pend.tier]} en cours`, `Switch to ${TIER[pend.tier]} in progress`, `Cambio a ${TIER[pend.tier]} en curso`)}</b></p>
            <p>
              {sw?.phase === "checking"
                ? T("Vérification de ton paiement auprès de Whop…", "Checking your payment with Whop…", "Comprobando tu pago con Whop…")
                : sw?.phase === "error"
                  ? sw.msg
                  : pend.ready
                    ? T(
                      `Ton paiement est confirmé. Il reste à arrêter ton ancien abonnement ${TIER[pend.fromTier]} à la fin de sa période.`,
                      `Your payment is confirmed. Your previous ${TIER[pend.fromTier]} subscription still has to be stopped at the end of its period.`,
                      `Tu pago está confirmado. Falta detener tu anterior suscripción ${TIER[pend.fromTier]} al final de su periodo.`
                    )
                    : T(
                      `On attend la confirmation de ton paiement ${TIER[pend.tier]} par Whop. Dès qu'elle arrive, ton abonnement ${TIER[pend.fromTier]} est arrêté à la fin de sa période : rien n'est arrêté avant. Tu viens de payer ? La confirmation peut prendre quelques instants.`,
                      `We're waiting for Whop to confirm your ${TIER[pend.tier]} payment. As soon as it arrives, your ${TIER[pend.fromTier]} subscription is stopped at the end of its period: nothing is stopped before then. Just paid? Confirmation can take a few moments.`,
                      `Esperamos que Whop confirme tu pago ${TIER[pend.tier]}. En cuanto llegue, tu suscripción ${TIER[pend.fromTier]} se detiene al final de su periodo: no se detiene nada antes. ¿Acabas de pagar? La confirmación puede tardar unos instantes.`
                    )}
            </p>
            <div className="acc-actions">
              <button type="button" className="acc-btn primary" disabled={sw?.phase === "checking" || !!busy} onClick={() => finish({ manual: true })}>
                {sw?.phase === "checking" ? "…" : pend.ready ? T("Terminer le changement", "Finish the switch", "Terminar el cambio") : T("Vérifier mon paiement", "Check my payment", "Comprobar mi pago")}
              </button>
              {!pend.ready && pend.url && WHOP_URL.test(pend.url) && (
                <a className="acc-link" href={pend.url}>{T("Reprendre le paiement", "Resume the payment", "Reanudar el pago")} ↗</a>
              )}
              <button type="button" className="acc-link" disabled={!!busy || sw?.phase === "checking"} onClick={abandon}>
                {busy === "sw-abandon" ? "…" : T("Annuler ce changement", "Cancel this switch", "Cancelar este cambio")}
              </button>
            </div>
          </div>
        )}
        {!data.whop ? (
          <>
            <p>{T("Ton abonnement ne peut pas être lu pour le moment.", "Your subscription can't be read right now.", "Tu suscripción no se puede leer por ahora.")}</p>
            <p className="acc-help">{T("Réessaie dans un instant, ou gère-le directement depuis ", "Try again in a moment, or manage it directly from ", "Inténtalo de nuevo en un instante, o gestiónala directamente desde ")}{orders}.</p>
            <div className="acc-actions"><button type="button" className="acc-btn" onClick={() => { setData(null); load(); }}>{T("Réessayer", "Try again", "Reintentar")}</button></div>
          </>
        ) : plans.length === 0 ? (
          role ? (
            <p>{T(`Ton accès complet est lié à ton compte ${role === "admin" ? "admin" : "créateur"} : tu n'as aucun abonnement à gérer.`, `Your full access comes with your ${role === "admin" ? "admin" : "creator"} account: you have no subscription to manage.`, `Tu acceso completo viene de tu cuenta de ${role === "admin" ? "administrador" : "creador"}: no tienes ninguna suscripción que gestionar.`)}</p>
          ) : (
            <>
              <p>{T("Tu es sur le compte gratuit : aucun abonnement à gérer.", "You're on the free account: no subscription to manage.", "Estás en la cuenta gratuita: no hay ninguna suscripción que gestionar.")}</p>
              <Link href={L.href("/pro")} className="btn-solid acc-home">{T("Voir les formules", "See the plans", "Ver los planes")}</Link>
              {data.compte && !preview && (
                <p className="acc-help">{T("Tu viens de payer chez Whop ? ", "Just paid on Whop? ", "¿Acabas de pagar en Whop? ")}<a href={`/api/whop/login?next=${encodeURIComponent(L.href("/app/compte"))}`} className="acc-link strong">{T("Activer mon abonnement", "Activate my subscription", "Activar mi suscripción")}</a></p>
              )}
            </>
          )
        ) : (
          <div className="acc-plans">
            {plans.map((p) => {
              const name = TIER[p.tier] || p.tier;
              const until = day(p.periodEnd);
              const price = p.price ? `${money(p.price)}${per(p.periodDays) ? ` ${per(p.periodDays)}` : ""}` : "";
              const working = busy === `plan:${p.id}`;
              const asking = confirmId === p.id;
              return (
                <article key={p.id} className="acc-plan" data-state={p.state}>
                  <div className="acc-plan-top">
                    <h3>{name}</h3>
                    <span className={`adm-tag ${p.state === "ends" || p.state === "past_due" ? "wait" : "ok"}`}>
                      {{
                        lifetime: T("À vie", "Lifetime", "De por vida"),
                        paid: T("Payé", "Paid", "Pagado"),
                        renews: T("Actif", "Active", "Activa"),
                        past_due: T("Paiement à régler", "Payment due", "Pago pendiente"),
                        ends: T("Résilié", "Cancelled", "Cancelada"),
                      }[p.state]}
                    </span>
                    {price && <span className="acc-price">{price}</span>}
                  </div>
                  <p className="acc-plan-line">
                    {p.state === "lifetime" && T("Accès à vie, paiement unique : il n'y a rien à résilier.", "Lifetime access, one-time payment: there's nothing to cancel.", "Acceso de por vida, pago único: no hay nada que cancelar.")}
                    {p.state === "paid" && T("Paiement unique effectué.", "One-time payment made.", "Pago único realizado.")}
                    {p.state === "renews" && (until
                      ? T(`Se renouvelle automatiquement. Prochain paiement le ${until}.`, `Renews automatically. Next payment on ${until}.`, `Se renueva automáticamente. Próximo pago el ${until}.`)
                      : T("Se renouvelle automatiquement.", "Renews automatically.", "Se renueva automáticamente."))}
                    {p.state === "past_due" && T("Le dernier paiement a échoué. Mets à jour ton moyen de paiement pour garder ton accès.", "The last payment failed. Update your payment method to keep your access.", "El último pago ha fallado. Actualiza tu medio de pago para conservar tu acceso.")}
                    {p.state === "ends" && (until
                      ? T(`Résilié : tu gardes ton accès jusqu'au ${until}, puis plus aucun prélèvement.`, `Cancelled: you keep your access until ${until}, then no more charges.`, `Cancelada: conservas tu acceso hasta el ${until} y después no habrá más cobros.`)
                      : T("Résilié : plus aucun prélèvement.", "Cancelled: no more charges.", "Cancelada: no habrá más cobros."))}
                  </p>
                  {p.included && <p className="acc-hint">{T(
                    `Ton accès ${TIER[p.included]} comprend déjà tout ce que contient ${name}. Tu peux résilier celui-ci pour ne pas payer deux fois.`,
                    `Your ${TIER[p.included]} access already includes everything in ${name}. You can cancel this one so you don't pay twice.`,
                    `Tu acceso ${TIER[p.included]} ya incluye todo lo que contiene ${name}. Puedes cancelar esta suscripción para no pagar dos veces.`
                  )}</p>}
                  {p.covered && p.canResume && <p className="acc-hint">{T(
                    `Ton accès ${TIER[p.covered]} comprend déjà tout ce que contient ${name} : inutile de reprendre cet abonnement, tu paierais deux fois.`,
                    `Your ${TIER[p.covered]} access already includes everything in ${name}: there is no need to resume this subscription, you would pay twice.`,
                    `Tu acceso ${TIER[p.covered]} ya incluye todo lo que contiene ${name}: no hace falta reanudar esta suscripción, pagarías dos veces.`
                  )}</p>}
                  {p.duplicate && <p className="acc-hint">{T(
                    `Tu as deux abonnements ${name} actifs. Tu peux en résilier un pour ne pas payer deux fois.`,
                    `You have two active ${name} subscriptions. You can cancel one so you don't pay twice.`,
                    `Tienes dos suscripciones ${name} activas. Puedes cancelar una para no pagar dos veces.`
                  )}</p>}

                  {can.switch && !pend && p.up?.length > 0 && (
                    <div className="acc-switch">
                      <p className="acc-switch-title">{T("Changer de formule en un clic", "Switch plan in one click", "Cambiar de plan con un clic")}</p>
                      <p className="acc-help">{T(
                        `Tu paies la nouvelle formule sur la page sécurisée de Whop. Dès que ton paiement est confirmé, ton abonnement ${name} s'arrête automatiquement ${until ? `le ${until}` : "à la fin de sa période"} (tu le gardes jusque-là), puis plus aucun prélèvement pour lui. La période ${name} déjà payée n'est pas remboursée. Tant que ton paiement n'est pas confirmé, rien n'est arrêté.`,
                        `You pay for the new plan on Whop's secure payment page. As soon as your payment is confirmed, your ${name} subscription stops automatically ${until ? `on ${until}` : "at the end of its period"} (you keep it until then), with no further charges for it. The ${name} period you've already paid for isn't refunded. Until your payment is confirmed, nothing is stopped.`,
                        `Pagas el nuevo plan en la página de pago segura de Whop. En cuanto se confirme tu pago, tu suscripción ${name} se detiene automáticamente ${until ? `el ${until}` : "al final de su periodo"} (la conservas hasta entonces) y no habrá más cobros por ella. El periodo ${name} ya pagado no se reembolsa. Mientras tu pago no esté confirmado, no se detiene nada.`
                      )}</p>
                      <label className={`acc-agree ${nudge && !agree ? "nudge" : ""}`}>
                        <input id={`acc-agree-${p.id}`} type="checkbox" checked={agree} disabled={!!busy} onChange={(e) => { setAgree(e.target.checked); setNudge(false); }} />
                        {T(
                          <span>J&apos;accepte les <Link href={L.href("/cgv")} target="_blank">CGV</Link> et les <Link href={L.href("/cgu")} target="_blank">CGU</Link>, et je demande l&apos;accès immédiat à mes analyses : je reconnais perdre mon droit de rétractation de 14 jours.</span>,
                          <span>I accept the <Link href={L.href("/cgv")} target="_blank">Terms of Sale</Link> and <Link href={L.href("/cgu")} target="_blank">Terms of Use</Link>, and I request immediate access to my analyses: I acknowledge that I lose my 14-day right of withdrawal.</span>,
                          <span>Acepto las <Link href={L.href("/cgv")} target="_blank">Condiciones de venta</Link> y las <Link href={L.href("/cgu")} target="_blank">Condiciones de uso</Link>, y pido el acceso inmediato a mis análisis: reconozco que pierdo mi derecho de desistimiento de 14 días.</span>
                        )}
                      </label>
                      {nudge && !agree && <p className="acc-agree-hint" role="alert">{T("Coche la case ci-dessus pour continuer vers le paiement.", "Tick the box above to continue to checkout.", "Marca la casilla de arriba para continuar con el pago.")}</p>}
                      <div className="acc-actions">
                        {p.up.map((o) => {
                          const cost = `${money({ amount: o.amount, currency: o.currency })}${o.tier === "lifetime" ? ` ${T("une seule fois", "one-time", "pago único")}` : ` ${T("par mois", "per month", "al mes")}`}`;
                          const going = busy === `sw:${p.id}:${o.tier}`;
                          return (
                            <button key={o.tier} type="button" className={`acc-btn primary ${agree ? "" : "wait"}`} disabled={!!busy} aria-disabled={!agree} onClick={() => startSwitch(p, o)}>
                              {going
                                ? T("Ouverture du paiement…", "Opening checkout…", "Abriendo el pago…")
                                : T(`Passer à ${TIER[o.tier]} · ${cost}`, `Switch to ${TIER[o.tier]} · ${cost}`, `Pasar a ${TIER[o.tier]} · ${cost}`)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="acc-actions">
                    {p.canCancel && !asking && (
                      <button type="button" className="acc-btn danger" disabled={!can.cancel || !!busy} onClick={() => { setFail(null); setOk(null); setConfirmId(p.id); }}>
                        {T("Résilier l'abonnement", "Cancel subscription", "Cancelar la suscripción")}
                      </button>
                    )}
                    {p.canResume && (
                      <button type="button" className={`acc-btn ${p.covered ? "" : "primary"}`} disabled={!can.cancel || !!busy} onClick={() => act("reprendre", p.id)}>
                        {working ? "…" : T("Reprendre l'abonnement", "Resume subscription", "Reanudar la suscripción")}
                      </button>
                    )}
                    {p.manageUrl && (
                      <a className={`acc-link ${p.state === "past_due" ? "strong" : ""}`} href={p.manageUrl} target="_blank" rel="noopener noreferrer">
                        {p.state === "past_due"
                          ? T("Mettre à jour mon moyen de paiement", "Update my payment method", "Actualizar mi medio de pago")
                          : T("Moyen de paiement et factures", "Payment method and invoices", "Medio de pago y facturas")} ↗
                      </a>
                    )}
                  </div>

                  {asking && (
                    <div className="acc-confirm" role="group" aria-label={T("Confirmer la résiliation", "Confirm cancellation", "Confirmar la cancelación")}>
                      <p><b>{T(`Résilier ton abonnement ${name} ?`, `Cancel your ${name} subscription?`, `¿Cancelar tu suscripción ${name}?`)}</b></p>
                      <p>{until
                        ? T(`Tu gardes ton accès jusqu'au ${until}. Après cette date, plus aucun prélèvement et ton compte repasse en gratuit. Tu peux changer d'avis jusque-là.`, `You keep your access until ${until}. After that date there are no more charges and your account goes back to free. You can change your mind until then.`, `Conservas tu acceso hasta el ${until}. Después de esa fecha no habrá más cobros y tu cuenta pasará a gratuita. Puedes cambiar de opinión hasta entonces.`)
                        : T("Tu gardes ton accès jusqu'à la fin de la période déjà payée. Ensuite, plus aucun prélèvement et ton compte repasse en gratuit. Tu peux changer d'avis jusque-là.", "You keep your access until the end of the period you've already paid for. After that there are no more charges and your account goes back to free. You can change your mind until then.", "Conservas tu acceso hasta el final del periodo ya pagado. Después no habrá más cobros y tu cuenta pasará a gratuita. Puedes cambiar de opinión hasta entonces.")}</p>
                      <div className="acc-actions">
                        <button type="button" className="acc-btn danger armed" disabled={!!busy} onClick={() => act("resilier", p.id)}>
                          {working ? T("Résiliation…", "Cancelling…", "Cancelando…") : T("Confirmer la résiliation", "Confirm cancellation", "Confirmar la cancelación")}
                        </button>
                        <button type="button" className="acc-btn" disabled={!!busy} onClick={() => setConfirmId(null)}>{T("Garder mon abonnement", "Keep my subscription", "Mantener mi suscripción")}</button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
            {plans.some((p) => p.tier === "pro" && p.canCancel) && !hasLifetime && (
              <p className="acc-help">
                {T("Passer à une formule moins chère (Starter) : résilie ton abonnement Pro ci-dessus, tu gardes ton accès jusqu'à la fin de la période déjà payée, puis tu choisis Starter depuis la page des formules à cette date.", "Switching to a cheaper plan (Starter): cancel your Pro subscription above, you keep your access until the end of the period already paid, then pick Starter from the plans page at that date.", "Pasar a un plan más barato (Starter): cancela tu suscripción Pro de arriba, conservas el acceso hasta el final del periodo ya pagado y después eliges Starter desde la página de planes en esa fecha.")}{" "}
                <Link href={L.href("/pro")}>{T("Voir les formules", "See the plans", "Ver los planes")}</Link>
              </p>
            )}
          </div>
        )}
      </section>

      {/* ---------- Suppression ---------- */}
      <section className="panel acc-sec acc-danger" aria-labelledby="acc-sup">
        <h2 id="acc-sup">{T("Supprimer mon compte", "Delete my account", "Eliminar mi cuenta")}</h2>
        {section("sup")}
        <p>{T("Cette action est définitive. Voici ce qui se passe :", "This can't be undone. Here is what happens:", "Esta acción es definitiva. Esto es lo que ocurre:")}</p>
        <ul className="acc-list">
          <li>{T("Tes données Basketlog sont effacées : historique d'analyses, questions posées, avis publié et nom affiché.", "Your Basketlog data is erased: analysis history, questions asked, published review and display name.", "Tus datos de Basketlog se borran: historial de análisis, preguntas, opinión publicada y nombre mostrado.")}</li>
          {data.compte && <li>{T("Ton compte Basketlog est supprimé : adresse e-mail, mot de passe et connexion Google.", "Your Basketlog account is deleted: email address, password and Google sign-in.", "Tu cuenta de Basketlog se elimina: correo, contraseña e inicio de sesión con Google.")}</li>}
          {isCreator && <li>{T("Ton accès créateur (accès complet à Basketlog) est retiré et ton lien d'invitation ne fonctionne plus.", "Your creator access (full access to Basketlog) is removed and your invitation link stops working.", "Tu acceso de creador (acceso completo a Basketlog) se retira y tu enlace de invitación deja de funcionar.")}</li>}
          {isCreator && codes.length > 0 && <li>
            {codes.length > 1 ? T("Tes codes promo ", "Your promo codes ", "Tus códigos promocionales ") : T("Ton code promo ", "Your promo code ", "Tu código promocional ")}
            <b>{codes.map(codeText).join(", ")}</b>
            {codes.length > 1
              ? T(" sont désactivés chez Whop : ils ne fonctionneront plus pour personne.", " are deactivated at Whop: they will no longer work for anyone.", " se desactivan en Whop: ya no funcionarán para nadie.")
              : T(" est désactivé chez Whop : il ne fonctionnera plus pour personne.", " is deactivated at Whop: it will no longer work for anyone.", " se desactiva en Whop: ya no funcionará para nadie.")}
          </li>}
          {isCreator && <li>{T(`Des commissions te sont encore dues ? Demande-les à ${CONTACT} avant de supprimer : ton code ne sera plus rattaché à ton nom dans nos statistiques.`, `Are you still owed any commissions? Ask for them at ${CONTACT} before deleting: your code will no longer be linked to your name in our statistics.`, `¿Te deben todavía alguna comisión? Pídela en ${CONTACT} antes de eliminar: tu código ya no estará vinculado a tu nombre en nuestras estadísticas.`)}</li>}
          {renewingCount > 0 && <li>{renewingCount > 1
            ? T("Tes abonnements en cours sont arrêtés : plus aucun prélèvement, et ton accès est conservé jusqu'à la fin de la période déjà payée.", "Your active subscriptions are stopped: no further charges, and you keep your access until the end of the period already paid.", "Tus suscripciones activas se detienen: sin más cobros, y conservas el acceso hasta el final del periodo ya pagado.")
            : T("Ton abonnement en cours est arrêté : plus aucun prélèvement, et ton accès est conservé jusqu'à la fin de la période déjà payée.", "Your active subscription is stopped: no further charges, and you keep your access until the end of the period already paid.", "Tu suscripción activa se detiene: sin más cobros, y conservas el acceso hasta el final del periodo ya pagado.")}</li>}
          {hasLifetime && <li>{data.compte
            ? T("Ton accès Lifetime reste attaché à ton compte Whop : si tu recrées un compte Basketlog un jour, relie-le à ce compte Whop pour le retrouver.", "Your Lifetime access stays attached to your Whop account: if you create a Basketlog account again someday, link it to that Whop account to get it back.", "Tu acceso Lifetime sigue vinculado a tu cuenta de Whop: si algún día vuelves a crear una cuenta de Basketlog, vincúlala a esa cuenta de Whop para recuperarlo.")
            : T("Ton accès Lifetime reste attaché à ton compte Whop : si tu te reconnectes un jour, tu le retrouveras.", "Your Lifetime access stays attached to your Whop account: if you ever log in again, it will still be there.", "Tu acceso Lifetime sigue vinculado a tu cuenta de Whop: si vuelves a iniciar sesión algún día, seguirá ahí.")}</li>}
          {(!data.compte || data.compte.whop) && <li>{T("Ton compte Whop (e-mail, moyens de paiement, factures) est géré par Whop et n'est pas supprimé ici. Pour le supprimer aussi : ", "Your Whop account (email, payment methods, invoices) is managed by Whop and isn't deleted here. To delete it too: ", "Tu cuenta de Whop (correo, medios de pago, facturas) la gestiona Whop y no se elimina aquí. Para eliminarla también: ")}<a href={WHOP_SETTINGS} target="_blank" rel="noopener noreferrer">{T("tes réglages Whop", "your Whop settings", "tus ajustes de Whop")}</a>.</li>}
        </ul>

        {role === "admin" ? (
          <p className="acc-note">{T(`Ton compte a un accès admin : il ne se supprime pas d'ici. Écris-nous à ${CONTACT}, ou demande à un autre admin de te retirer l'accès depuis l'espace admin, puis reviens ici.`, `Your account has admin access: it can't be deleted from here. Write to us at ${CONTACT}, or ask another admin to remove your access from the admin area, then come back here.`, `Tu cuenta tiene acceso de administrador: no se elimina desde aquí. Escríbenos a ${CONTACT}, o pide a otro administrador que te retire el acceso desde el espacio de administración y vuelve aquí.`)}</p>
        ) : !can.delete ? (
          preview ? null : <p className="acc-note">{T(`La suppression en ligne sera disponible très bientôt. En attendant, écris-nous à ${CONTACT} et on s'en occupe.`, `Online deletion will be available very soon. Until then, write to us at ${CONTACT} and we'll take care of it.`, `La eliminación en línea estará disponible muy pronto. Mientras tanto, escríbenos a ${CONTACT} y nos ocupamos.`)}</p>
        ) : !delOpen ? (
          <button type="button" className="acc-btn danger" disabled={!!busy} onClick={() => { setFail(null); setOk(null); setDelOpen(true); }}>
            {T("Supprimer mon compte…", "Delete my account…", "Eliminar mi cuenta…")}
          </button>
        ) : (
          <form className="acc-form" onSubmit={(e) => { e.preventDefault(); if (deleteConfirmed(word) && !busy) removeAccount(); }}>
            <label htmlFor="acc-sup-in">{T(`Pour confirmer, recopie le mot ${DELETE_WORDS.fr}`, `To confirm, type the word ${DELETE_WORDS.en}`, `Para confirmar, escribe la palabra ${DELETE_WORDS.es}`)}</label>
            <div className="acc-row">
              <input id="acc-sup-in" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} disabled={!!busy} placeholder={T(DELETE_WORDS.fr, DELETE_WORDS.en, DELETE_WORDS.es)} />
              <button type="submit" className="acc-btn danger armed" disabled={!deleteConfirmed(word) || !!busy}>
                {busy === "supprimer" ? T("Suppression…", "Deleting…", "Eliminando…") : T("Supprimer définitivement", "Delete permanently", "Eliminar definitivamente")}
              </button>
              <button type="button" className="acc-btn" disabled={!!busy} onClick={() => { setDelOpen(false); setWord(""); }}>{T("Annuler", "Cancel", "Cancelar")}</button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
