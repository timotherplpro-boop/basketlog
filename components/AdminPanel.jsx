"use client";
import { useEffect, useState } from "react";
import { money, price } from "../lib/pricing";
import { LANGS, LANG_NAMES, fmtDate, mk } from "../lib/i18n";
import { useL } from "./LangProvider";

const day = (L, iso) => fmtDate(L, iso, { day: "numeric", month: "long", year: "numeric" });
const stamp = (L, iso) => fmtDate(L, iso, { day: "numeric", month: "short", hour: L.en ? "numeric" : "2-digit", minute: "2-digit" });
// Lien d'invitation dans la langue du créateur : /invitation/…, /en/invitation/… ou /es/invitation/…
const inviteUrl = (code, lang) => `${typeof location !== "undefined" ? location.origin : "https://basketlog-app.com"}${mk(lang).href(`/invitation/${code}`)}`;

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

// Ce que contient chaque formule : mêmes lignes que la page des formules (components/ProPlans.jsx) et les CGU.
// À mettre à jour en même temps qu'elles si une offre change.
function formules(L) {
  const t = L.t;
  const outside = t("hors zone euro", "outside the euro area", "fuera de la zona euro");
  const monthly = t("par mois", "per month", "al mes");
  const once = t("une seule fois", "one time only", "en un solo pago");
  const noCommit = t("Sans engagement, résiliable depuis Whop", "No commitment, cancel anytime from Whop", "Sin permanencia, se puede cancelar desde Whop");
  const both = (plan, tail) => `${price(plan, "EUR", L)} ${tail} · ${price(plan, "USD", L)} ${outside}`;
  return [
    { id: null, name: t("Visiteur", "Visitor", "Visitante"), price: t("Gratuit, sans compte", "Free, no account", "Gratis, sin cuenta"), lines: [
      t("Probabilités de victoire et chiffres clés de chaque match", "Win probabilities and key figures for every game", "Probabilidades de victoria y cifras clave de cada partido"),
      t("Aperçu de chaque analyse : forme récente, résumé rapide, scénario n°1, confiance du modèle", "Preview of each analysis: recent form, quick summary, scenario #1, model confidence", "Avance de cada análisis: forma reciente, resumen rápido, escenario n.º 1, confianza del modelo"),
      t("Classements, fiches équipes et bilan du modèle", "Standings, team pages and the model's track record", "Clasificaciones, fichas de equipos y balance del modelo"),
    ] },
    { id: "compte", name: t("Compte gratuit", "Free account", "Cuenta gratuita"), price: money(0, "EUR", L), lines: [
      t("Tout ce que voit un visiteur", "Everything a visitor sees", "Todo lo que ve un visitante"),
      t("Aucune analyse complète (0 par jour), comme Visifoot", "No full analysis (0 per day), like Visifoot", "Ningún análisis completo (0 al día), como Visifoot"),
      t("Compte Whop : e-mail, Google ou Apple", "Whop account: email, Google or Apple", "Cuenta de Whop: correo, Google o Apple"),
    ] },
    { id: "starter", name: "Starter", price: both("starter", monthly), lines: [
      t("1 analyse par jour", "1 analysis per day", "1 análisis al día"),
      t("Analyse réduite : probabilités exactes et stats clés", "Reduced analysis: exact probabilities and key stats", "Análisis reducido: probabilidades exactas y estadísticas clave"),
      noCommit,
    ] },
    { id: "pro", name: "Pro", price: both("pro", monthly), lines: [
      t("Analyses complètes illimitées", "Unlimited full analyses", "Análisis completos ilimitados"),
      t("Scénarios probables détaillés et analyse statistique", "Detailed likely scenarios and statistical analysis", "Escenarios probables detallados y análisis estadístico"),
      t("Actualités en temps réel", "Real-time news", "Noticias en tiempo real"),
      noCommit,
    ] },
    { id: "lifetime", name: "Lifetime", price: both("lifetime", once), lines: [
      t("Tout ce qu'offre Pro, à vie", "Everything Pro offers, for life", "Todo lo que ofrece Pro, de por vida"),
      t("Plus aucun paiement mensuel", "No more monthly payments", "Sin más pagos mensuales"),
      t("Priorité sur les nouveautés", "Priority on new features", "Prioridad en las novedades"),
    ] },
  ];
}

const Check = ({ ok, children }) => (
  <li className={ok ? "ok" : "ko"}><span aria-hidden>{ok ? "✓" : "✕"}</span>{children}</li>
);

// Espace admin : avis à relire (publier, retirer, supprimer), formules et aperçu client, comptes créateurs et admins,
// liens d'invitation (dans la langue du créateur), état du back-office. Disponible en français, anglais et espagnol.
export default function AdminPanel({ initial, me, preview = null, health = null }) {
  const L = useL();
  const t = L.t;
  const colon = L.fr ? " : " : ": "; // l'espace avant les deux-points est propre au français
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState(initial ? "" : t("Impossible de charger les données. Réessaie.", "Couldn't load the data. Please try again.", "No se han podido cargar los datos. Inténtalo de nuevo."));
  const [confirm, setConfirm] = useState("");
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState("");
  const [linkLang, setLinkLang] = useState(L.lang); // langue des liens d'invitation (celle du créateur)

  useEffect(() => {
    if (!confirm) return;
    const timer = setTimeout(() => setConfirm(""), 4000); // une suppression se confirme dans les 4 secondes
    return () => clearTimeout(timer);
  }, [confirm]);

  const generic = () => t("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.");
  const offline = () => t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.");

  async function act(action, payload = {}, key = action) {
    setBusy(key);
    setError("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lang: L.lang, ...payload }) });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) { setError(j.error || generic()); return null; }
      setData(j.data);
      return j;
    } catch {
      setError(offline());
      return null;
    } finally {
      setBusy("");
      setConfirm("");
    }
  }

  const twoStep = (key, run) => (confirm === key ? run() : setConfirm(key));

  async function invite(e) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const j = await act("inviter", { note: f.get("note"), role: f.get("role") }, "inviter");
    if (j?.code) {
      const url = inviteUrl(j.code, linkLang);
      setLink(url);
      e.target.reset?.();
      if (await copyText(url)) setCopied("new");
    }
  }

  async function copy(text, key) {
    if (await copyText(text)) { setCopied(key); setTimeout(() => setCopied(""), 2500); }
  }

  // Voir le site comme un client de cette formule (null : redevenir admin).
  async function view(tier) {
    setBusy(`v-${tier}`);
    setError("");
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "apercu", tier, lang: L.lang }) });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) { setError(j.error || t("Aperçu impossible pour le moment.", "Preview isn't possible right now.", "La vista previa no es posible por ahora.")); setBusy(""); return; }
      try { sessionStorage.removeItem("bl_tier_reload"); } catch {}
      window.location.href = L.href(tier ? "/app/matchs" : "/app/admin");
    } catch {
      setError(offline());
      setBusy("");
    }
  }

  if (!data) {
    return (
      <section className="panel adm">
        <p className="adm-err">{error}</p>
        <button type="button" className="adm-btn primary" onClick={() => act("lister")} disabled={!!busy}>{t("Réessayer", "Try again", "Reintentar")}</button>
      </section>
    );
  }

  const plans = formules(L);
  const pending = data.avis.filter((a) => !a.approuve).length;
  const roleName = (r) => (r === "admin" ? t("Admin", "Admin", "Administrador") : t("Créateur", "Creator", "Creador"));
  const accountTag = (a) => (a.compte
    ? ({
      compte: t("Compte gratuit", "Free account", "Cuenta gratuita"),
      starter: t("Abonné Starter", "Starter subscriber", "Suscriptor Starter"),
      pro: t("Abonné Pro", "Pro subscriber", "Suscriptor Pro"),
      lifetime: t("Abonné Lifetime", "Lifetime subscriber", "Suscriptor Lifetime"),
    }[a.formule] || t("Compte vérifié", "Verified account", "Cuenta verificada"))
    : t("Sans compte", "No account", "Sin cuenta"));

  return (
    <>
      {error && <p className="adm-err" role="alert">{error}</p>}

      <section className="panel adm" aria-labelledby="adm-avis">
        <div className="adm-head">
          <h2 id="adm-avis">{t("Avis", "Reviews", "Opiniones")}</h2>
          <span className={`adm-count ${pending ? "on" : ""}`}>{pending ? t(`${pending} en attente`, `${pending} pending`, `${pending} pendiente${pending > 1 ? "s" : ""}`) : t("Rien à relire", "Nothing to review", "Nada que revisar")}</span>
        </div>
        <p className="adm-help">
          {t(
            "Un avis n'apparaît sur le site qu'une fois publié. Seuls les abonnés Starter, Pro et Lifetime peuvent en déposer, un par compte.",
            "A review only shows on the site once it's published. Only Starter, Pro and Lifetime subscribers can submit one, one per account.",
            "Una opinión solo aparece en el sitio una vez publicada. Solo los suscriptores Starter, Pro y Lifetime pueden enviarla, una por cuenta."
          )}{" "}
          {t(
            "Sur le site, chaque avis est traduit automatiquement dans la langue du visiteur (l'original reste consultable).",
            "On the site, each review is automatically translated into the visitor's language (the original stays available).",
            "En el sitio, cada opinión se traduce automáticamente al idioma del visitante (el original sigue disponible)."
          )}
        </p>
        {!data.avis.length ? (
          <p className="adm-empty">{t("Aucun avis pour l'instant.", "No reviews yet.", "Todavía no hay opiniones.")}</p>
        ) : (
          <ul className="adm-list">
            {data.avis.map((a) => (
              <li key={a.id} className={`adm-avis ${a.approuve ? "pub" : "wait"}`}>
                <div className="adm-meta">
                  <b>{a.prenom}</b>
                  {a.profil && <span>{a.profil}</span>}
                  <span className="adm-stars" aria-label={t(`${a.note} étoile${a.note > 1 ? "s" : ""} sur 5`, `${a.note} star${a.note > 1 ? "s" : ""} out of 5`, `${a.note} estrella${a.note > 1 ? "s" : ""} de 5`)}>{"★".repeat(a.note)}<i>{"★".repeat(5 - a.note)}</i></span>
                </div>
                <p className="adm-text">{a.texte}</p>
                <div className="adm-foot">
                  <span className={`adm-tag ${a.approuve ? "ok" : "wait"}`}>{a.approuve ? t("Publié", "Published", "Publicada") : t("En attente", "Pending", "Pendiente")}</span>
                  <span className={`adm-tag ${a.compte ? "ok" : ""}`}>{accountTag(a)}</span>
                  <span className="adm-date">{stamp(L, a.created_at)}</span>
                  <span className="adm-actions">
                    {a.approuve ? (
                      <button type="button" className="adm-btn" disabled={!!busy} onClick={() => act("avis_retirer", { id: a.id }, `r-${a.id}`)}>{t("Retirer du site", "Remove from site", "Retirar del sitio")}</button>
                    ) : (
                      <button type="button" className="adm-btn primary" disabled={!!busy} onClick={() => act("avis_publier", { id: a.id }, `p-${a.id}`)}>{t("Publier", "Publish", "Publicar")}</button>
                    )}
                    <button type="button" className={`adm-btn danger ${confirm === `d-${a.id}` ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(`d-${a.id}`, () => act("avis_supprimer", { id: a.id }, `d-${a.id}`))}>
                      {confirm === `d-${a.id}` ? t("Confirmer la suppression", "Confirm deletion", "Confirmar la eliminación") : t("Supprimer", "Delete", "Eliminar")}
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel adm" id="formules" aria-labelledby="adm-formules">
        <div className="adm-head">
          <h2 id="adm-formules">{t("Formules et accès", "Plans and access", "Planes y accesos")}</h2>
          {preview && <span className="adm-count on">{t("Aperçu en cours", "Preview in progress", "Vista previa en curso")}{colon}{plans.find((f) => f.id === preview)?.name || preview}</span>}
        </div>
        <p className="adm-help">
          {t(
            "Ce que chaque client obtient réellement. « Voir comme ce client » ouvre le site avec exactement ses droits ; une barre en bas de l'écran te permet de revenir en admin. Les analyses lancées pendant un aperçu sont comptées à part, sans toucher à ton compte.",
            "What each customer actually gets. “View as this customer” opens the site with exactly their rights; a bar at the bottom of the screen lets you switch back to admin. Analyses run during a preview are counted separately and don't touch your account.",
            "Lo que obtiene realmente cada cliente. «Ver como este cliente» abre el sitio con exactamente sus derechos; una barra en la parte inferior de la pantalla te permite volver al panel de administración. Los análisis lanzados durante una vista previa se cuentan aparte, sin afectar a tu cuenta."
          )}
        </p>
        <div className="adm-plans">
          {plans.map((f) => (
            <article key={f.name} className={`adm-plan ${preview && preview === f.id ? "on" : ""}`}>
              <div className="adm-plan-top"><b>{f.name}</b><span>{f.price}</span></div>
              <ul>{f.lines.map((l) => <li key={l}>{l}</li>)}</ul>
              <div className="adm-plan-foot">
                {f.id ? (
                  <button type="button" className="adm-btn primary" disabled={!!busy} onClick={() => view(f.id)}>{busy === `v-${f.id}` ? t("Ouverture…", "Opening…", "Abriendo…") : t("Voir comme ce client", "View as this customer", "Ver como este cliente")}</button>
                ) : (
                  <span className="adm-note">{t("Pour la vue visiteur : ouvre le site dans une fenêtre de navigation privée.", "For the visitor view: open the site in a private browsing window.", "Para la vista de visitante: abre el sitio en una ventana de navegación privada.")}</span>
                )}
                {health?.checkout?.[f.id] && <a className="adm-link-out" href={health.checkout[f.id]} target="_blank" rel="noopener noreferrer">{f.id === "compte" ? t("Page d'inscription Whop", "Whop sign-up page", "Página de registro de Whop") : t("Page de paiement Whop (euros)", "Whop checkout page (euros)", "Página de pago de Whop (euros)")} ↗</a>}
                {health?.checkoutUsd?.[f.id] && <a className="adm-link-out" href={health.checkoutUsd[f.id]} target="_blank" rel="noopener noreferrer">{t("Page de paiement Whop (dollars)", "Whop checkout page (dollars)", "Página de pago de Whop (dólares)")} ↗</a>}
              </div>
            </article>
          ))}
        </div>
        {preview && <button type="button" className="adm-btn" disabled={!!busy} onClick={() => view(null)}>{t("Quitter l'aperçu", "Exit preview", "Salir de la vista previa")}</button>}
        {!health?.ai && <p className="adm-help">{t("Les questions à l'IA (Pro : 1 par jour, Lifetime : illimitées) restent cachées partout tant que l'IA n'est pas branchée.", "AI questions (Pro: 1 per day, Lifetime: unlimited) stay hidden everywhere until the AI is connected.", "Las preguntas a la IA (Pro: 1 al día, Lifetime: ilimitadas) siguen ocultas en todas partes mientras la IA no esté conectada.")}</p>}
      </section>

      <section className="panel adm" aria-labelledby="adm-acces">
        <div className="adm-head"><h2 id="adm-acces">{t("Créateurs et admins", "Creators and admins", "Creadores y administradores")}</h2></div>
        <p className="adm-help">
          {t(
            "Crée un lien et envoie-le à ton créateur. Il se connecte (ou crée son compte gratuit), puis active son accès : il voit toute l'application, comme un abonné Lifetime, sans payer. Un créateur ne peut ni relire les avis ni en laisser. Chaque lien ne sert qu'une fois et expire après 30 jours.",
            "Create a link and send it to your creator. They log in (or create their free account), then activate their access: they see the whole app, like a Lifetime subscriber, without paying. A creator can neither moderate reviews nor leave any. Each link works only once and expires after 30 days.",
            "Crea un enlace y envíaselo a tu creador. Inicia sesión (o crea su cuenta gratuita) y luego activa su acceso: ve toda la aplicación, como un suscriptor Lifetime, sin pagar. Un creador no puede revisar opiniones ni dejar ninguna. Cada enlace solo sirve una vez y caduca a los 30 días."
          )}
        </p>
        <form className="adm-invite" onSubmit={invite}>
          <label><span>{t("Nom du créateur", "Creator name", "Nombre del creador")}</span><input name="note" maxLength={80} placeholder={t("Ex : @tipoff_off", "E.g. @tipoff_off", "Ej.: @tipoff_off")} autoComplete="off" /></label>
          <label><span>{t("Accès", "Access", "Acceso")}</span>
            <select name="role" defaultValue="createur">
              <option value="createur">{t("Créateur : toute l'application", "Creator: the whole app", "Creador: toda la aplicación")}</option>
              <option value="admin">{t("Admin : application, avis et invitations", "Admin: app, reviews and invitations", "Administrador: aplicación, opiniones e invitaciones")}</option>
            </select>
          </label>
          <label><span>{t("Langue du lien", "Link language", "Idioma del enlace")}</span>
            <select value={linkLang} onChange={(e) => setLinkLang(e.target.value)}>
              {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
            </select>
          </label>
          <button type="submit" className="adm-btn primary" disabled={!!busy}>{busy === "inviter" ? t("Création…", "Creating…", "Creando…") : t("Créer le lien", "Create link", "Crear el enlace")}</button>
        </form>
        <p className="adm-help">{t("La page d'invitation s'ouvre dans la langue choisie : prends celle de ton créateur (français, anglais ou espagnol).", "The invitation page opens in the chosen language: pick your creator's (French, English or Spanish).", "La página de invitación se abre en el idioma elegido: elige el de tu creador (francés, inglés o español).")}</p>
        {link && (
          <div className="adm-link">
            <code>{link}</code>
            <button type="button" className="adm-btn" onClick={() => copy(link, "new")}>{copied === "new" ? t("Copié", "Copied", "Copiado") : t("Copier", "Copy", "Copiar")}</button>
          </div>
        )}

        {data.invitations.length > 0 && (
          <>
            <h3>{t("Liens pas encore utilisés", "Links not used yet", "Enlaces aún sin usar")}</h3>
            <ul className="adm-rows">
              {data.invitations.map((i) => (
                <li key={i.code}>
                  <span><b>{i.note || t("Sans nom", "No name", "Sin nombre")}</b> · {roleName(i.role)} · {t("expire le", "expires on", "caduca el")} {day(L, i.expire_le)}</span>
                  <span className="adm-actions">
                    <button type="button" className="adm-btn" onClick={() => copy(inviteUrl(i.code, linkLang), i.code)}>{copied === i.code ? t("Copié", "Copied", "Copiado") : `${t("Copier le lien", "Copy link", "Copiar el enlace")} (${linkLang.toUpperCase()})`}</button>
                    <button type="button" className="adm-btn danger" disabled={!!busy} onClick={() => act("annuler_invitation", { code: i.code }, `a-${i.code}`)}>{t("Annuler", "Cancel", "Cancelar")}</button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>{t("Comptes avec accès", "Accounts with access", "Cuentas con acceso")}</h3>
        <ul className="adm-rows">
          {data.roles.map((r) => (
            <li key={r.uid}>
              <span><b>{r.nom || r.uid}</b>{r.note ? ` · ${r.note}` : ""} · {roleName(r.role)} · {t("depuis le", "since", "desde el")} {day(L, r.ajoute_le)}</span>
              {r.uid === me ? (
                <span className="adm-tag ok">{t("Toi", "You", "Tú")}</span>
              ) : (
                <button type="button" className={`adm-btn danger ${confirm === `x-${r.uid}` ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(`x-${r.uid}`, () => act("retirer_acces", { uid: r.uid }, `x-${r.uid}`))}>
                  {confirm === `x-${r.uid}` ? t("Confirmer", "Confirm", "Confirmar") : t("Retirer l'accès", "Remove access", "Retirar el acceso")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {health && (
        <section className="panel adm" aria-labelledby="adm-etat">
          <div className="adm-head"><h2 id="adm-etat">{t("État du back-office", "Back-office status", "Estado del back-office")}</h2></div>
          <ul className="adm-checks">
            <Check ok={health.login}>{t("Connexion « Se connecter avec Whop » configurée", "“Log in with Whop” sign-in configured", "Inicio de sesión «Iniciar sesión con Whop» configurado")}</Check>
            <Check ok={health.products.starter && health.products.pro && health.products.lifetime}>{t("Produits Starter, Pro et Lifetime reliés au site", "Starter, Pro and Lifetime products linked to the site", "Productos Starter, Pro y Lifetime vinculados al sitio")}</Check>
            <Check ok={!!health.seen && health.seen !== "erreur"}>
              {health.seen && health.seen !== "erreur"
                ? <>{t("Vérification d'abonnement chez Whop : ton compte est vu en", "Subscription check with Whop: your account is seen as", "Comprobación de suscripción en Whop: tu cuenta se ve como")} <b>{plans.find((f) => f.id === health.seen)?.name || health.seen}</b></>
                : t("Vérification d'abonnement chez Whop : pas de réponse", "Subscription check with Whop: no response", "Comprobación de suscripción en Whop: sin respuesta")}
            </Check>
            <Check ok={health.db}>{t("Base de données (avis, analyses, accès) joignable", "Database (reviews, analyses, access) reachable", "Base de datos (opiniones, análisis, accesos) accesible")}</Check>
            <li className="na"><span aria-hidden>–</span>{t("IA", "AI", "IA")}{colon}{health.ai ?t("branchée", "connected", "conectada") : t("désactivée volontairement, jusqu'aux premiers revenus", "deliberately disabled until the first revenue", "desactivada a propósito hasta los primeros ingresos")}</li>
          </ul>
          <p className="adm-help">
            {t("Clients, paiements et virements", "Customers, payments and payouts", "Clientes, pagos y transferencias")}{colon}<a className="adm-link-out" href="https://whop.com/dashboard/biz_pE2L6siofBGnW6/" target="_blank" rel="noopener noreferrer">{t("tableau de bord Whop", "Whop dashboard", "panel de Whop")} ↗</a>
          </p>
        </section>
      )}
    </>
  );
}
