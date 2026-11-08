"use client";
// « Mon compte » : choisir son nom affiché, gérer son abonnement (résilier en fin de période, reprendre, moyen de paiement
// et factures chez Whop) et supprimer son compte (membre ou créateur ; un admin ne se supprime pas ici). Tout passe par /api/compte,
// qui agit sur le compte connecté uniquement.
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useL } from "./LangProvider";
import { DELETE_WORDS, NAME_MAX, deleteConfirmed } from "../lib/account";
import { fmtDate } from "../lib/i18n";
import { patchProStatus } from "../lib/useProStatus";

// Page Whop où l'on retrouve ses commandes (repli quand le site ne peut pas lire ou modifier l'abonnement) et réglages du compte Whop.
const WHOP_ORDERS = "https://whop.com/@me/settings/orders/";
const WHOP_SETTINGS = "https://whop.com/@me/settings/";
const CONTACT = "contact@basketlog-app.com";

const TIER = { starter: "Starter", pro: "Pro", lifetime: "Lifetime" };

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
      return { good: res.ok && !!j?.ok, j };
    } catch {
      return { good: false, j: { error: T("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.") } };
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

  async function act(action, id) {
    setBusy(`plan:${id}`); setFail(null); setOk(null);
    const { good, j } = await post({ action, id });
    setBusy("");
    setConfirmId(null);
    if (!good) { setFail({ sec: "abo", msg: j?.error || generic }); await load(); return; }
    // Le nouvel état de l'abonnement (relu chez Whop par le serveur) s'affiche tout de suite, avant la relecture complète ci-dessous.
    if (j.plan) {
      const { id: planId, state, canCancel, canResume, periodEnd } = j.plan;
      setData((d) => (d ? { ...d, plans: d.plans.map((p) => (p.id === planId ? { ...p, state, canCancel, canResume, periodEnd, included: canCancel ? p.included : null, duplicate: canCancel ? p.duplicate : false } : p)) } : d));
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

  async function removeAccount() {
    setBusy("supprimer"); setFail(null); setOk(null);
    const { good, j } = await post({ action: "supprimer", confirm: word });
    setBusy("");
    if (!good) { setFail({ sec: "sup", msg: j?.error || generic }); await load(); return; }
    patchProStatus({ connected: false, uid: null, name: null, tier: "gratuit", role: null });
    setGone({ stopped: j.stopped || 0, creator: !!j.creator, codes: Array.isArray(j.codes) ? j.codes : [] });
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
          <p className="acc-help">{T("Ton compte Whop (e-mail, moyens de paiement, factures) est géré par Whop : tu peux le supprimer depuis ", "Your Whop account (email, payment methods, invoices) is managed by Whop: you can delete it from ", "Tu cuenta de Whop (correo, medios de pago, facturas) la gestiona Whop: puedes eliminarla desde ")}<a href={WHOP_SETTINGS} target="_blank" rel="noopener noreferrer">{T("tes réglages Whop", "your Whop settings", "tus ajustes de Whop")}</a>.</p>
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
          <a className="btn-solid acc-home" href={`/api/whop/login?next=${encodeURIComponent(L.href("/app/compte"))}`}>{T("Se connecter", "Log in", "Iniciar sesión")}</a>
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
            {data.name.whop
              ? T(`Revenir au nom de mon compte Whop (${data.name.whop})`, `Go back to my Whop account name (${data.name.whop})`, `Volver al nombre de mi cuenta de Whop (${data.name.whop})`)
              : T("Revenir au nom de mon compte Whop", "Go back to my Whop account name", "Volver al nombre de mi cuenta de Whop")}
          </button>
        )}
        {!can.rename && !preview && <p className="acc-note">{T("Le choix du nom sera disponible très bientôt.", "Choosing your name will be available very soon.", "Podrás elegir tu nombre muy pronto.")}</p>}
      </section>

      {/* ---------- Abonnement ---------- */}
      <section className="panel acc-sec" aria-labelledby="acc-abo">
        <h2 id="acc-abo">{T("Mon abonnement", "My subscription", "Mi suscripción")}</h2>
        {section("abo")}
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
                  {p.duplicate && <p className="acc-hint">{T(
                    `Tu as deux abonnements ${name} actifs. Tu peux en résilier un pour ne pas payer deux fois.`,
                    `You have two active ${name} subscriptions. You can cancel one so you don't pay twice.`,
                    `Tienes dos suscripciones ${name} activas. Puedes cancelar una para no pagar dos veces.`
                  )}</p>}

                  <div className="acc-actions">
                    {p.canCancel && !asking && (
                      <button type="button" className="acc-btn danger" disabled={!can.cancel || !!busy} onClick={() => { setFail(null); setOk(null); setConfirmId(p.id); }}>
                        {T("Résilier l'abonnement", "Cancel subscription", "Cancelar la suscripción")}
                      </button>
                    )}
                    {p.canResume && (
                      <button type="button" className="acc-btn primary" disabled={!can.cancel || !!busy} onClick={() => act("reprendre", p.id)}>
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
            {renewingCount > 0 && !hasLifetime && (
              <p className="acc-help">
                {T("Pour changer de formule : prends la nouvelle depuis la page des formules, puis résilie l'ancienne ici pour ne pas payer deux fois.", "To switch plans: get the new one from the plans page, then cancel the old one here so you don't pay twice.", "Para cambiar de plan: contrata el nuevo desde la página de planes y cancela aquí el anterior para no pagar dos veces.")}{" "}
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
          {hasLifetime && <li>{T("Ton accès Lifetime reste attaché à ton compte Whop : si tu te reconnectes un jour, tu le retrouveras.", "Your Lifetime access stays attached to your Whop account: if you ever log in again, it will still be there.", "Tu acceso Lifetime sigue vinculado a tu cuenta de Whop: si vuelves a iniciar sesión algún día, seguirá ahí.")}</li>}
          <li>{T("Ton compte Whop (e-mail, moyens de paiement, factures) est géré par Whop et n'est pas supprimé ici. Pour le supprimer aussi : ", "Your Whop account (email, payment methods, invoices) is managed by Whop and isn't deleted here. To delete it too: ", "Tu cuenta de Whop (correo, medios de pago, facturas) la gestiona Whop y no se elimina aquí. Para eliminarla también: ")}<a href={WHOP_SETTINGS} target="_blank" rel="noopener noreferrer">{T("tes réglages Whop", "your Whop settings", "tus ajustes de Whop")}</a>.</li>
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
