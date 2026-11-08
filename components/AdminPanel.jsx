"use client";
import { useEffect, useRef, useState } from "react";
import { money, price } from "../lib/pricing";
import { LANGS, LANG_NAMES, fmtDate, mk, pctOf } from "../lib/i18n";
import { accountLabel, noEndDate } from "../lib/accounts";
import { CODE_RE, PROMO_DEFAULT, PROMO_MAX, PROMO_MIN, cleanCode, cleanPct, suggestCode } from "../lib/promo";
import { useL } from "./LangProvider";

// Tableau de bord Whop de Basketlog et sa page des codes promo (où les codes des créateurs sont créés par le site, ou à la main),
// et la page des clés API de Whop (permissions de la clé que le site utilise pour créer les codes).
const WHOP_DASH = "https://whop.com/dashboard/biz_pE2L6siofBGnW6/";
const WHOP_PROMO = `${WHOP_DASH}promo/`;
const WHOP_KEYS = "https://whop.com/dashboard/developer";

const day = (L, iso) => fmtDate(L, iso, { day: "numeric", month: "long", year: "numeric" });
const stamp = (L, iso) => fmtDate(L, iso, { day: "numeric", month: "short", hour: L.en ? "numeric" : "2-digit", minute: "2-digit" });
// Lien d'invitation dans la langue du créateur : /invitation/…, /en/invitation/… ou /es/invitation/…
const siteUrl = (lang, path) => `${typeof location !== "undefined" ? location.origin : "https://basketlog-app.com"}${mk(lang).href(path)}`;
const inviteUrl = (code, lang) => siteUrl(lang, `/invitation/${code}`);
// Lien d'un code promo à donner au créateur pour son public : la page Pro (dans la langue choisie) avec le code déjà appliqué.
const promoUrl = (code, lang) => `${siteUrl(lang, "/pro")}?code=${code}`;

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

// Code promo d'un créateur : code, remise, état chez Whop, et création ou modification sur place.
// target : { uid } pour un compte, { inv } pour une invitation pas encore activée ; name : nom du créateur (propose le code).
// auto : le site crée lui-même les codes chez Whop (clé API présente) ; sinon l'admin les crée à la main et les marque.
function PromoLine({ L, target, name, promo, auto, terms, linkLang, busy, confirm, twoStep, copied, onCopy, onSave, onSync, onWhop, onRemove }) {
  const t = L.t;
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(String(PROMO_DEFAULT));
  const [code, setCode] = useState("");
  const [problem, setProblem] = useState("");

  function edit() {
    const p = promo?.pct ?? PROMO_DEFAULT;
    setPct(String(p));
    setCode(promo?.code || suggestCode(name, p));
    setProblem("");
    setOpen(true);
  }
  // Tant que le code suit la remise (NOM20), il suit aussi ses changements (NOM15) ; un code retouché à la main reste tel quel.
  function changePct(v) {
    const follows = code === suggestCode(name, pct);
    setPct(v);
    const n = cleanPct(v);
    if (follows && n) { const s = suggestCode(name, n); if (s) setCode(s); }
  }
  async function submit(e) {
    e.preventDefault();
    setProblem("");
    const j = await onSave({ ...target, nom: name, code, pct: cleanPct(pct) });
    if (j?.ok) setOpen(false);
    else if (j?.error) setProblem(j.error);
  }

  if (open) {
    const changed = !!promo && (code !== promo.code || cleanPct(pct) !== promo.pct);
    return (
      <div className="adm-promo">
        <form className="adm-promo-form" onSubmit={submit}>
          <label><span>{t("Code (celui que le client saisit)", "Code (what the customer types)", "Código (el que escribe el cliente)")}</span>
            <input value={code} onChange={(e) => setCode(cleanCode(e.target.value))} maxLength={24} autoComplete="off" autoCapitalize="characters" spellCheck={false} required />
          </label>
          <label><span>{t("Remise pour le client", "Customer discount", "Descuento para el cliente")}</span>
            <span className="adm-pct">
              <input type="number" inputMode="numeric" min={PROMO_MIN} max={PROMO_MAX} step="1" value={pct} onChange={(e) => changePct(e.target.value)} required />
              <b aria-hidden>%</b>
            </span>
          </label>
          <button type="submit" className="adm-btn primary" disabled={!!busy || !CODE_RE.test(code) || cleanPct(pct) == null}>{t("Enregistrer", "Save", "Guardar")}</button>
          <button type="button" className="adm-btn" onClick={() => setOpen(false)}>{t("Fermer", "Close", "Cerrar")}</button>
        </form>
        {changed && promo.whop_ok && (
          <p className="adm-help">
            {auto
              ? t("Whop ne permet pas de modifier un code : l'ancien sera désactivé chez Whop et le nouveau créé. Si seule la remise change, Whop peut refuser de réutiliser le même nom : choisis alors un autre nom de code.", "Whop doesn't allow editing a code: the old one will be deactivated in Whop and the new one created. If only the discount changes, Whop may refuse to reuse the same name: pick another code name then.", "Whop no permite modificar un código: el anterior se desactivará en Whop y se creará el nuevo. Si solo cambia el descuento, Whop puede negarse a reutilizar el mismo nombre: elige entonces otro nombre de código.")
              : t("Le code actuel existe chez Whop : un nouveau code ou une autre remise est à refaire là-bas, et l'ancien code à désactiver.", "The current code exists in Whop: a new code or a different discount has to be redone there, and the old code deactivated.", "El código actual existe en Whop: un código nuevo o un descuento distinto hay que rehacerlo allí, y desactivar el código anterior.")}
          </p>
        )}
        {problem && <p className="adm-err" role="alert">{problem}</p>}
      </div>
    );
  }

  if (!promo) {
    return (
      <div className="adm-promo">
        <span className="adm-promo-main">{t("Aucun code promo", "No promo code", "Sin código promocional")}</span>
        <button type="button" className="adm-btn" disabled={!!busy} onClick={edit}>{t("Ajouter un code promo", "Add a promo code", "Añadir un código promocional")}</button>
      </div>
    );
  }

  const delKey = `pd-${promo.id}`;
  return (
    <div className="adm-promo">
      <span className="adm-promo-main">
        <span>{t("Code promo", "Promo code", "Código promocional")}</span>
        <code className="adm-code">{promo.code}</code>
        <b>−{pctOf(promo.pct / 100, L)}</b>
        <span className={`adm-tag ${promo.whop_ok ? "ok" : "wait"}`}>
          {auto
            ? (promo.whop_ok ? t("Actif chez Whop", "Active in Whop", "Activo en Whop") : t("Pas encore chez Whop", "Not in Whop yet", "Aún no está en Whop"))
            : (promo.whop_ok ? t("Créé chez Whop", "Created in Whop", "Creado en Whop") : t("À créer chez Whop", "To create in Whop", "Por crear en Whop"))}
        </span>
      </span>
      <span className="adm-actions">
        <button type="button" className="adm-btn" onClick={() => onCopy(promo.code, `pc-${promo.id}`)}>{copied === `pc-${promo.id}` ? t("Copié", "Copied", "Copiado") : t("Copier le code", "Copy code", "Copiar el código")}</button>
        {promo.whop_ok && (
          <button type="button" className="adm-btn" onClick={() => onCopy(promoUrl(promo.code, linkLang), `pl-${promo.id}`)}>
            {copied === `pl-${promo.id}` ? t("Copié", "Copied", "Copiado") : `${t("Copier le lien promo", "Copy promo link", "Copiar enlace promo")} (${linkLang.toUpperCase()})`}
          </button>
        )}
        <button type="button" className="adm-btn" disabled={!!busy} onClick={edit}>{t("Modifier", "Edit", "Editar")}</button>
        {auto ? (
          <button type="button" className={`adm-btn ${promo.whop_ok ? "" : "primary"}`} disabled={!!busy} onClick={() => onSync(promo.id)}>
            {busy === `ps-${promo.id}` ? t("Vérification…", "Checking…", "Comprobando…") : promo.whop_ok ? t("Vérifier chez Whop", "Check in Whop", "Comprobar en Whop") : t("Créer chez Whop", "Create in Whop", "Crear en Whop")}
          </button>
        ) : (
          <button type="button" className="adm-btn" disabled={!!busy} onClick={() => onWhop(promo.id, !promo.whop_ok)}>
            {promo.whop_ok ? t("Marquer comme non créé", "Mark as not created", "Marcar como no creado") : t("Marquer comme créé chez Whop", "Mark as created in Whop", "Marcar como creado en Whop")}
          </button>
        )}
        <button type="button" className={`adm-btn danger ${confirm === delKey ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(delKey, () => onRemove(target))}>
          {confirm === delKey ? t("Confirmer la suppression", "Confirm deletion", "Confirmar la eliminación") : t("Supprimer le code", "Delete code", "Eliminar el código")}
        </button>
      </span>
      {terms && promo.whop_ok && <p className="adm-help" data-promo-terms>{terms}</p>}
    </div>
  );
}

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
  const [linkPromo, setLinkPromo] = useState(null); // code promo créé avec le dernier lien
  const [linkWhop, setLinkWhop] = useState(null); // son résultat chez Whop (state : created, error…), absent sans liaison automatique
  const [notice, setNotice] = useState(null); // rappel après une action sur un code promo
  const [inviteNote, setInviteNote] = useState("");
  const [inviteRole, setInviteRole] = useState("createur");
  const [invitePct, setInvitePct] = useState(String(PROMO_DEFAULT)); // remise du code promo du prochain créateur invité
  const [inviteCode, setInviteCode] = useState(null); // nom du code : null tant qu'il suit la proposition (nom + remise), sinon ce que l'admin a saisi
  const [inviteProblem, setInviteProblem] = useState(""); // refus du formulaire d'invitation (code déjà pris…), affiché sous le formulaire
  const noticeRef = useRef(null);
  const promosOn = !!data?.promosOk; // faux tant que supabase/codes-promo.sql n'a pas été lancé
  const auto = promosOn && !!data?.whopAuto; // vrai : le site crée lui-même les codes chez Whop (clé API présente)
  // Durée de la remise annoncée sur la page Pro (1 : premier paiement seulement, par défaut ; 0 : à chaque paiement), à choisir telle quelle chez Whop en mode manuel.
  const durationText = data?.whopMonths === 0 ? t("à chaque paiement", "every payment", "cada pago")
    : data?.whopMonths > 1 ? t(`les ${data.whopMonths} premiers paiements`, `the first ${data.whopMonths} payments`, `los primeros ${data.whopMonths} pagos`)
    : t("premier paiement seulement", "first payment only", "solo el primer pago");
  // Phrase sous chaque code créé chez Whop : le code n'a pas de date de fin (c'est vérifié chez Whop), seule la remise est limitée, client par client.
  const promoTerms = !auto ? null
    : data.whopMonths === 0 ? t("Le code n'a pas de date de fin : il reste utilisable tant que tu ne le supprimes pas. La remise s'applique à chaque paiement du client.", "The code has no end date: it stays usable until you delete it. The discount applies to each of the customer's payments.", "El código no tiene fecha de fin: sigue siendo válido hasta que lo elimines. El descuento se aplica a cada pago del cliente.")
    : data.whopMonths > 1 ? t(`Le code n'a pas de date de fin : il reste utilisable tant que tu ne le supprimes pas. La remise s'applique aux ${data.whopMonths} premiers paiements du client.`, `The code has no end date: it stays usable until you delete it. The discount applies to the customer's first ${data.whopMonths} payments.`, `El código no tiene fecha de fin: sigue siendo válido hasta que lo elimines. El descuento se aplica a los primeros ${data.whopMonths} pagos del cliente.`)
    : t("Le code n'a pas de date de fin : il reste utilisable tant que tu ne le supprimes pas. Chaque client n'a la remise que sur son premier paiement.", "The code has no end date: it stays usable until you delete it. Each customer only gets the discount on their first payment.", "El código no tiene fecha de fin: sigue siendo válido hasta que lo elimines. Cada cliente solo recibe el descuento en su primer pago.");
  const suggestedCode = cleanPct(invitePct) ? suggestCode(inviteNote, invitePct) : ""; // « @lanuitnba » + 20 -> LANUITNBA20 (vide sans remise valide, ou si le nom est trop court)
  const shownCode = inviteCode ?? suggestedCode;

  useEffect(() => {
    if (!confirm) return;
    const timer = setTimeout(() => setConfirm(""), 4000); // une suppression se confirme dans les 4 secondes
    return () => clearTimeout(timer);
  }, [confirm]);

  useEffect(() => {
    if (notice) noticeRef.current?.scrollIntoView?.({ block: "nearest" }); // le rappel s'affiche près des listes : on le garde à l'écran
  }, [notice]);

  const generic = () => t("Une erreur est survenue.", "Something went wrong.", "Se ha producido un error.");
  const offline = () => t("Connexion impossible, réessaie.", "Couldn't connect, please try again.", "No se ha podido conectar, inténtalo de nuevo.");

  // inline : l'erreur est rendue à l'appelant (formulaire d'un code promo) au lieu de s'afficher en haut de page.
  async function act(action, payload = {}, key = action, inline = false) {
    setBusy(key);
    setError("");
    setNotice(null);
    try {
      const res = await fetch("/api/admin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, lang: L.lang, ...payload }) });
      const j = await res.json().catch(() => ({}));
      if (!j.ok) {
        const message = j.error || generic();
        if (inline) return { ok: false, error: message };
        setError(message);
        return null;
      }
      setData(j.data);
      return j;
    } catch {
      if (inline) return { ok: false, error: offline() };
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
    const forCreator = promosOn && inviteRole === "createur";
    const withPct = forCreator && invitePct.trim() !== "";
    if (forCreator && !withPct && inviteCode) { // un nom de code saisi sans remise : pas de lien créé en silence sans son code
      setInviteProblem(t("Indique la remise (en %) pour créer ce code, ou efface le nom du code.", "Enter the discount (in %) to create this code, or clear the code name.", "Indica el descuento (en %) para crear este código, o borra el nombre del código."));
      return;
    }
    const code = withPct ? shownCode : ""; // vide : le serveur propose un code d'après le nom du créateur
    setInviteProblem("");
    setLink(""); // l'ancien lien disparaît : s'il y a un refus (code pris…), on ne le prend pas pour celui du créateur refusé
    setLinkPromo(null);
    setLinkWhop(null);
    setCopied("");
    const j = await act("inviter", { note: inviteNote, role: inviteRole, ...(withPct ? { pct: invitePct } : {}), ...(code ? { code } : {}) }, "inviter", true);
    if (j?.ok === false) { setInviteProblem(j.error); return; }
    if (j?.code) {
      const url = inviteUrl(j.code, linkLang);
      setLink(url);
      setLinkPromo(j.promo || null);
      setLinkWhop(j.whop || null);
      if (j.promoError) setNotice({ kind: "text", text: j.promoError });
      else if (j.whop?.state === "error") setNotice(whopNotice(j.whop, j.promo?.code, j.promo?.pct)); // le code est enregistré ici mais pas chez Whop : on dit pourquoi
      setInviteNote("");
      setInviteCode(null);
      if (await copyText(url)) setCopied("new");
    }
  }

  // Rappel à l'écran quand un code disparaît ici (supprimé ou remplacé) : désactivé chez Whop par le site, ou à désactiver à la main.
  const remind = (kind, codes) => { if (codes?.length) setNotice({ kind, codes }); };

  // Phrase après une action qui a touché Whop (créer, vérifier, réactiver). Une erreur arrive déjà rédigée par le serveur ;
  // on y ajoute le lien utile (clés API si la permission manque, codes promo de Whop si le nom pose problème).
  function whopNotice(w, code, pct) {
    if (!w) return null;
    if (w.state === "error") {
      return { kind: "text", tone: "warn", text: w.message, link: w.kind === "scope" ? "keys" : ["differs", "conflict", "mismatch"].includes(w.kind) ? "promos" : null };
    }
    const off = `−${pctOf(pct / 100, L)}`;
    const text = {
      created: t(`Code ${code} (${off}) créé chez Whop : il est prêt, tes clients peuvent le saisir sur la page Pro.`, `Code ${code} (${off}) created in Whop: it's ready, your customers can enter it on the Pro page.`, `Código ${code} (${off}) creado en Whop: está listo, tus clientes pueden introducirlo en la página Pro.`),
      exists: t(`Code ${code} : il existe déjà chez Whop avec la bonne remise, tout est en ordre.`, `Code ${code}: it already exists in Whop with the right discount, all good.`, `Código ${code}: ya existe en Whop con el descuento correcto, todo en orden.`),
      reactivated: t(`Code ${code} : il existait chez Whop (désactivé), il est de nouveau actif.`, `Code ${code}: it existed in Whop (deactivated), it's active again.`, `Código ${code}: existía en Whop (desactivado), vuelve a estar activo.`),
    }[w.state];
    return text ? { kind: "text", tone: "ok", text } : null;
  }

  async function cancelInvite(code) {
    const j = await act("annuler_invitation", { code }, `a-${code}`);
    remind("removed", j?.supprimes);
  }
  async function removeAccess(uid) {
    const j = await act("retirer_acces", { uid }, `x-${uid}`);
    remind("removed", j?.supprimes);
  }
  // Crée ou modifie le code d'un créateur ; renvoie { ok, error } au formulaire.
  async function savePromo(args) {
    const j = await act("promo_definir", args, "promo", true);
    if (!j?.ok) return j;
    if (!j.whop) {
      if (j.ancien?.whop_ok) remind("replaced", [j.ancien]); // sans liaison automatique : l'ancien code est à désactiver à la main
      return j;
    }
    const first = whopNotice(j.whop, args.code, args.pct);
    const old = j.ancien;
    const parts = [first?.text];
    let warn = first?.tone === "warn";
    let link = first?.link || null;
    if (old?.whop?.state === "disabled") {
      parts.push(t(`L'ancien code ${old.code} a été désactivé chez Whop.`, `The old code ${old.code} was deactivated in Whop.`, `El código anterior ${old.code} se ha desactivado en Whop.`));
    } else if (old?.whop?.state === "error") {
      if (!warn) parts.push(old.whop.message);
      parts.push(t(`L'ancien code ${old.code} n'a pas pu être désactivé : désactive-le toi-même chez Whop.`, `The old code ${old.code} couldn't be deactivated: deactivate it yourself in Whop.`, `El código anterior ${old.code} no se ha podido desactivar: desactívalo tú mismo en Whop.`));
      warn = true;
      link = link || (old.whop.kind === "scope" ? "keys" : "promos");
    }
    setNotice({ kind: "text", tone: warn ? "warn" : "ok", text: parts.filter(Boolean).join(" "), link });
    return j;
  }
  // « Créer chez Whop » / « Vérifier chez Whop » : crée le code chez Whop, ou vérifie qu'il y existe avec la bonne remise.
  async function syncPromo(id) {
    const j = await act("promo_sync", { id }, `ps-${id}`);
    if (j?.ok) setNotice(whopNotice(j.whop, j.promo?.code, j.promo?.pct));
  }
  async function markWhop(id, ok) {
    await act("promo_whop", { id, ok }, `pw-${id}`);
  }
  async function removePromo(target) {
    const j = await act("promo_supprimer", target, "promo");
    remind("removed", j?.supprimes);
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
  const promoProps = { L, auto, terms: promoTerms, linkLang, busy, confirm, twoStep, copied, onCopy: copy, onSave: savePromo, onSync: syncPromo, onWhop: markWhop, onRemove: removePromo };
  const codeList = (codes) => codes.map((c) => `${c.code} (−${pctOf(c.pct / 100, L)})`).join(", ");
  const whopLink = <a className="adm-link-out" href={WHOP_PROMO} target="_blank" rel="noopener noreferrer">{t("Codes promo Whop", "Whop promo codes", "Códigos promocionales de Whop")} ↗</a>;
  const keysLink = <a className="adm-link-out" href={WHOP_KEYS} target="_blank" rel="noopener noreferrer">{t("Clés API Whop", "Whop API keys", "Claves API de Whop")} ↗</a>;

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
            "Crée un lien et envoie-le à ton créateur. Il se connecte (ou crée son compte gratuit), puis active son accès : il voit toute l'application, comme un abonné Lifetime, sans payer. Un créateur ne peut ni relire les avis ni en laisser. Chaque lien ne sert qu'une fois et n'a pas de date de fin : il reste valable tant que le créateur ne l'a pas utilisé (tu peux l'annuler quand tu veux).",
            "Create a link and send it to your creator. They log in (or create their free account), then activate their access: they see the whole app, like a Lifetime subscriber, without paying. A creator can neither moderate reviews nor leave any. Each link works only once and has no end date: it stays valid until the creator uses it (you can cancel it any time).",
            "Crea un enlace y envíaselo a tu creador. Inicia sesión (o crea su cuenta gratuita) y luego activa su acceso: ve toda la aplicación, como un suscriptor Lifetime, sin pagar. Un creador no puede revisar opiniones ni dejar ninguna. Cada enlace solo sirve una vez y no tiene fecha de fin: sigue siendo válido hasta que el creador lo use (puedes cancelarlo cuando quieras)."
          )}
        </p>
        <form className={`adm-invite ${promosOn ? "with-pct" : ""}`} onSubmit={invite}>
          <label><span>{t("Nom du créateur", "Creator name", "Nombre del creador")}</span><input name="note" value={inviteNote} onChange={(e) => { setInviteNote(e.target.value); setInviteProblem(""); }} maxLength={80} placeholder={t("Ex : @tipoff_off", "E.g. @tipoff_off", "Ej.: @tipoff_off")} autoComplete="off" /></label>
          <label><span>{t("Accès", "Access", "Acceso")}</span>
            <select name="role" value={inviteRole} onChange={(e) => { setInviteRole(e.target.value); setInviteProblem(""); }}>
              <option value="createur">{t("Créateur : toute l'application", "Creator: the whole app", "Creador: toda la aplicación")}</option>
              <option value="admin">{t("Admin : application, avis et invitations", "Admin: app, reviews and invitations", "Administrador: aplicación, opiniones e invitaciones")}</option>
            </select>
          </label>
          <label><span>{t("Langue du lien", "Link language", "Idioma del enlace")}</span>
            <select value={linkLang} onChange={(e) => setLinkLang(e.target.value)}>
              {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
            </select>
          </label>
          {promosOn && (
            <>
              <label><span>{t("Nom du code promo", "Promo code name", "Nombre del código promocional")}</span>
                <input
                  name="code"
                  className="adm-code-input"
                  value={inviteRole === "createur" ? shownCode : ""}
                  onChange={(e) => { setInviteCode(cleanCode(e.target.value)); setInviteProblem(""); }}
                  onBlur={() => { if (inviteCode === "") setInviteCode(null); }} // champ vidé : il reprend la proposition
                  disabled={inviteRole !== "createur"}
                  placeholder={inviteRole === "createur" ? (suggestedCode || t("Ex : LANUITNBA20", "E.g. LANUITNBA20", "Ej.: LANUITNBA20")) : "–"}
                  maxLength={24}
                  pattern="[A-Z0-9]{3,24}"
                  title={t("3 à 24 lettres ou chiffres, sans espace ni accent.", "3 to 24 letters or digits, no spaces or accents.", "De 3 a 24 letras o cifras, sin espacios ni acentos.")}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
              </label>
              <label><span>{t("Remise du code promo", "Promo code discount", "Descuento del código")}</span>
                <span className="adm-pct">
                  <input name="pct" type="number" inputMode="numeric" min={PROMO_MIN} max={PROMO_MAX} step="1" value={inviteRole === "createur" ? invitePct : ""} onChange={(e) => { setInvitePct(e.target.value); setInviteProblem(""); }} disabled={inviteRole !== "createur"} placeholder={inviteRole === "createur" ? String(PROMO_DEFAULT) : "–"} />
                  <b aria-hidden>%</b>
                </span>
              </label>
            </>
          )}
          <button type="submit" className="adm-btn primary" disabled={!!busy}>{busy === "inviter" ? t("Création…", "Creating…", "Creando…") : t("Créer le lien", "Create link", "Crear el enlace")}</button>
        </form>
        {inviteProblem && <p className="adm-err" role="alert">{inviteProblem}</p>}
        <p className="adm-help">{t("La page d'invitation s'ouvre dans la langue choisie : prends celle de ton créateur (français, anglais ou espagnol).", "The invitation page opens in the chosen language: pick your creator's (French, English or Spanish).", "La página de invitación se abre en el idioma elegido: elige el de tu creador (francés, inglés o español).")}</p>
        {promosOn ? (
          <p className="adm-help">
            {t(
              "Chaque créateur a aussi un code promo : tu choisis son nom (3 à 24 lettres ou chiffres) et la remise (en %) que ses clients obtiennent en le saisissant au paiement. Le nom est proposé d'après celui du créateur et la remise : change-le comme tu veux, il reste modifiable dans la liste ci-dessous ; laisse la remise vide pour ne pas créer de code.",
              "Every creator also gets a promo code: you choose its name (3 to 24 letters or digits) and the discount (in %) their customers get by entering it at checkout. The name is suggested from the creator's name and the discount: change it however you like, it can still be edited in the list below; leave the discount empty to skip the code.",
              "Cada creador tiene además un código promocional: tú eliges su nombre (de 3 a 24 letras o cifras) y el descuento (en %) que obtienen sus clientes al introducirlo en el pago. El nombre se propone a partir del nombre del creador y del descuento: cámbialo como quieras, se puede modificar en la lista de abajo; deja el descuento vacío para no crear ningún código."
            )}{" "}
            {auto
              ? t("Basketlog crée aussi le code chez Whop pour toi.", "Basketlog also creates the code in Whop for you.", "Basketlog también crea el código en Whop por ti.")
              : t("Pour fonctionner à l'achat, il doit aussi exister chez Whop.", "To work at purchase, it must also exist in Whop.", "Para que funcione al comprar, también tiene que existir en Whop.")}
          </p>
        ) : (
          <p className="adm-notice">
            {t(
              "Codes promo indisponibles pour l'instant : le script supabase/codes-promo.sql n'a pas encore été lancé dans Supabase (ou la base ne répond pas). Les créateurs et les liens fonctionnent normalement en attendant.",
              "Promo codes aren't available right now: the supabase/codes-promo.sql script hasn't been run in Supabase yet (or the database isn't responding). Creators and links work normally in the meantime.",
              "Los códigos promocionales no están disponibles por ahora: el script supabase/codes-promo.sql aún no se ha ejecutado en Supabase (o la base de datos no responde). Mientras tanto, los creadores y los enlaces funcionan con normalidad."
            )}{" "}
            <a className="adm-link-out" href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">Supabase ↗</a>
          </p>
        )}
        {link && (
          <div className="adm-link">
            <code>{link}</code>
            <button type="button" className="adm-btn" onClick={() => copy(link, "new")}>{copied === "new" ? t("Copié", "Copied", "Copiado") : t("Copier", "Copy", "Copiar")}</button>
          </div>
        )}
        {link && linkPromo && (
          <p className="adm-help">
            {t("Code promo créé", "Promo code created", "Código promocional creado")}{colon}<code className="adm-code">{linkPromo.code}</code> (−{pctOf(linkPromo.pct / 100, L)}){" "}
            {linkWhop?.state === "error"
              ? t("— pas encore chez Whop (voir le message ci-dessous).", "— not in Whop yet (see the message below).", "— aún no está en Whop (mira el mensaje de abajo).")
              : linkWhop && linkWhop.state !== "manual"
                ? t("— créé chez Whop : prêt à l'emploi.", "— created in Whop: ready to use.", "— creado en Whop: listo para usar.")
                : t("— à créer aussi chez Whop (guide ci-dessous).", "— also create it in Whop (guide below).", "— créalo también en Whop (guía de abajo).")}
          </p>
        )}

        {notice && (
          <p className={`adm-notice ${notice.tone === "ok" ? "ok" : ""}`} role="status" ref={noticeRef}>
            {notice.kind === "text" && (
              <>
                {notice.text}
                {notice.link === "keys" && <>{" "}{keysLink}</>}
                {notice.link === "promos" && <>{" "}{whopLink}</>}
              </>
            )}
            {notice.kind === "replaced" && (
              <>
                {t("L'ancien code", "The old code", "El código anterior")} <b>{codeList(notice.codes)}</b>{" "}
                {t("existe chez Whop : désactive-le là-bas et crée le nouveau code.", "exists in Whop: deactivate it there and create the new code.", "existe en Whop: desactívalo allí y crea el nuevo código.")}{" "}{whopLink}
              </>
            )}
            {notice.kind === "removed" && (
              <>
                {notice.codes.length > 1 ? t("Codes promo supprimés", "Promo codes deleted", "Códigos promocionales eliminados") : t("Code promo supprimé", "Promo code deleted", "Código promocional eliminado")}{colon}<b>{codeList(notice.codes)}</b>.
                {notice.codes.some((c) => c.whop) ? (
                  <>
                    {notice.codes.some((c) => c.whop?.state === "disabled") && (
                      <>{" "}{t("Désactivé chez Whop.", "Deactivated in Whop.", "Desactivado en Whop.")}</>
                    )}
                    {notice.codes.some((c) => c.whop?.state === "error") && (
                      <>
                        {" "}{notice.codes.find((c) => c.whop?.state === "error").whop.message}{" "}
                        {t("Désactive-le toi-même chez Whop :", "Deactivate it yourself in Whop:", "Desactívalo tú mismo en Whop:")}{" "}
                        {notice.codes.find((c) => c.whop?.state === "error").whop.kind === "scope" ? keysLink : whopLink}
                      </>
                    )}
                  </>
                ) : notice.codes.some((c) => c.whop_ok) && (
                  <>
                    {" "}
                    {notice.codes.length > 1
                      ? t("Ils existent encore chez Whop : désactive-les aussi là-bas.", "They still exist in Whop: deactivate them there too.", "Siguen existiendo en Whop: desactívalos también allí.")
                      : t("Il existe encore chez Whop : désactive-le aussi là-bas.", "It still exists in Whop: deactivate it there too.", "Sigue existiendo en Whop: desactívalo también allí.")}{" "}{whopLink}
                  </>
                )}
              </>
            )}
          </p>
        )}

        {auto && (
          <details className="adm-guide">
            <summary>{t("Comment les codes marchent avec Whop", "How the codes work with Whop", "Cómo funcionan los códigos con Whop")}</summary>
            <ol>
              <li>{t("Quand tu crées ou modifies un code ici, Basketlog le crée tout seul chez Whop : remise en %, pour tous les clients, une fois par client, sur toutes les formules, sans date limite. Il relit ensuite ce que Whop a enregistré et ne l'annonce « actif » que si tout correspond.", "When you create or edit a code here, Basketlog creates it in Whop by itself: discount in %, for all customers, once per customer, on every plan, no end date. It then reads back what Whop saved and only reports it “active” if everything matches.", "Cuando creas o modificas un código aquí, Basketlog lo crea solo en Whop: descuento en %, para todos los clientes, una vez por cliente, en todos los planes, sin fecha límite. Después vuelve a leer lo que Whop ha guardado y solo lo da por «activo» si todo coincide.")}</li>
              <li>
                {data.whopMonths === 0 && t("La remise s'applique à chaque paiement tant que l'abonnement dure (pour Lifetime, au paiement unique).", "The discount applies to every payment for as long as the subscription lasts (for Lifetime, the one-time payment).", "El descuento se aplica a cada pago mientras dure la suscripción (en Lifetime, al pago único).")}
                {data.whopMonths === 1 && t("La remise s'applique au premier paiement seulement.", "The discount applies to the first payment only.", "El descuento se aplica solo al primer pago.")}
                {data.whopMonths > 1 && t(`La remise s'applique aux ${data.whopMonths} premiers paiements.`, `The discount applies to the first ${data.whopMonths} payments.`, `El descuento se aplica a los primeros ${data.whopMonths} pagos.`)}
              </li>
              <li>{t("Le client saisit le code sur la page Pro (« J'ai un code promo »), ou ouvre le lien du créateur (bouton « Copier le lien promo », de la forme basketlog-app.com/pro?code=NOM20, avec /en ou /es devant pour un public anglophone ou hispanophone) : le prix réduit s'affiche et le lien de paiement Whop applique le code.", "The customer enters the code on the Pro page (“I have a promo code”), or opens the creator's link (“Copy promo link” button, like basketlog-app.com/pro?code=NAME20, with /en or /es in front for an English- or Spanish-speaking audience): the reduced price shows and the Whop checkout link applies the code.", "El cliente introduce el código en la página Pro («Tengo un código promocional») o abre el enlace del creador (botón «Copiar enlace promo», del tipo basketlog-app.com/pro?code=NOMBRE20, con /en o /es delante para un público angloparlante o hispanohablante): se muestra el precio reducido y el enlace de pago de Whop aplica el código.")}</li>
              <li>{t("Whop ne permet pas de modifier un code : changer le nom ou la remise désactive l'ancien code chez Whop et en crée un nouveau. Supprimer un code ici le désactive chez Whop.", "Whop doesn't allow editing a code: changing the name or the discount deactivates the old code in Whop and creates a new one. Deleting a code here deactivates it in Whop.", "Whop no permite modificar un código: cambiar el nombre o el descuento desactiva el código anterior en Whop y crea uno nuevo. Eliminar un código aquí lo desactiva en Whop.")}</li>
              <li>{t("Si Whop refuse quelque chose, un message t'explique quoi faire, et le bouton « Créer chez Whop » réessaie. Pour tout contrôler à la main :", "If Whop refuses something, a message explains what to do, and the “Create in Whop” button tries again. To check everything by hand:", "Si Whop rechaza algo, un mensaje te explica qué hacer y el botón «Crear en Whop» lo vuelve a intentar. Para comprobarlo todo a mano:")} {whopLink}</li>
            </ol>
          </details>
        )}

        {promosOn && !auto && (
          <details className="adm-guide">
            <summary>{t("Comment créer le code chez Whop", "How to create the code in Whop", "Cómo crear el código en Whop")}</summary>
            <ol>
              <li>{t("Ouvre la page des codes promo de Whop", "Open the Whop promo codes page", "Abre la página de códigos promocionales de Whop")} {whopLink}{t(", puis clique sur « Créer un code promo ».", ", then click “Create promo code”.", ", y pulsa «Crear código promocional».")}</li>
              <li>{t("Saisis exactement le même code que dans la liste (bouton « Copier le code ») et la même remise en %.", "Enter exactly the same code as in the list (“Copy code” button) and the same discount in %.", "Escribe exactamente el mismo código que en la lista (botón «Copiar el código») y el mismo descuento en %.")}</li>
              <li>{t(`Durée de la réduction : ${durationText}, c'est ce que la page Pro annonce aux clients. Laisse tous les utilisateurs éligibles et décochées la date d'expiration et la limite d'utilisations, sauf si tu veux en fixer une.`, `Discount duration: ${durationText}, which is what the Pro page tells customers. Leave all users eligible and the expiry date and maximum uses boxes unticked unless you want to set one.`, `Duración del descuento: ${durationText}, que es lo que la página Pro anuncia a los clientes. Deja elegibles a todos los usuarios y sin marcar la fecha de caducidad y el límite de usos, salvo que quieras fijar uno.`)}</li>
              <li>{t("Facultatif : le champ « Affilié » rattache le code à un affilié Whop.", "Optional: the “Affiliate” field links the code to a Whop affiliate.", "Opcional: el campo «Afiliado» vincula el código a un afiliado de Whop.")}</li>
              <li>{t("Reviens ici et clique sur « Marquer comme créé chez Whop » pour t'en souvenir.", "Come back here and click “Mark as created in Whop” so you remember it's done.", "Vuelve aquí y pulsa «Marcar como creado en Whop» para recordar que está hecho.")}</li>
            </ol>
            <p>{t("Changer le code ou la remise ici ne change rien chez Whop : crée le nouveau code là-bas et désactive l'ancien.", "Changing the code or the discount here changes nothing in Whop: create the new code there and deactivate the old one.", "Cambiar el código o el descuento aquí no cambia nada en Whop: crea allí el código nuevo y desactiva el anterior.")}</p>
          </details>
        )}

        {data.invitations.length > 0 && (
          <>
            <h3>{t("Liens pas encore utilisés", "Links not used yet", "Enlaces aún sin usar")}</h3>
            <ul className="adm-rows">
              {data.invitations.map((i) => (
                <li key={i.code}>
                  <span><b>{i.note || t("Sans nom", "No name", "Sin nombre")}</b> · {roleName(i.role)} · {noEndDate(i.expire_le) ? t("sans date de fin", "no end date", "sin fecha de fin") : `${t("expire le", "expires on", "caduca el")} ${day(L, i.expire_le)}`}</span>
                  <span className="adm-actions">
                    <button type="button" className="adm-btn" onClick={() => copy(inviteUrl(i.code, linkLang), i.code)}>{copied === i.code ? t("Copié", "Copied", "Copiado") : `${t("Copier le lien", "Copy link", "Copiar el enlace")} (${linkLang.toUpperCase()})`}</button>
                    <button type="button" className="adm-btn danger" disabled={!!busy} onClick={() => cancelInvite(i.code)}>{t("Annuler", "Cancel", "Cancelar")}</button>
                  </span>
                  {promosOn && i.role === "createur" && <PromoLine {...promoProps} target={{ inv: i.code }} name={i.note || ""} promo={i.promo} />}
                </li>
              ))}
            </ul>
          </>
        )}

        <h3>{t("Comptes avec accès", "Accounts with access", "Cuentas con acceso")}</h3>
        <ul className="adm-rows">
          {data.roles.map((r) => {
            // Créateur : le nom saisi à l'invitation (« Gonzopicks ») d'abord, le nom du compte Whop (« matheosds ») à côté.
            const who = accountLabel(r);
            return (
              <li key={r.uid}>
                <span><b>{who.main}</b>{who.sub ? ` · ${who.whop ? `${t("compte Whop", "Whop account", "cuenta de Whop")} ` : ""}${who.sub}` : ""} · {roleName(r.role)} · {t("depuis le", "since", "desde el")} {day(L, r.ajoute_le)}</span>
                {r.uid === me ? (
                  <span className="adm-tag ok">{t("Toi", "You", "Tú")}</span>
                ) : (
                  <button type="button" className={`adm-btn danger ${confirm === `x-${r.uid}` ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(`x-${r.uid}`, () => removeAccess(r.uid))}>
                    {confirm === `x-${r.uid}` ? t("Confirmer", "Confirm", "Confirmar") : t("Retirer l'accès", "Remove access", "Retirar el acceso")}
                  </button>
                )}
                {promosOn && r.role === "createur" && <PromoLine {...promoProps} target={{ uid: r.uid }} name={r.note || r.nom || ""} promo={r.promo} />}
              </li>
            );
          })}
        </ul>

        {promosOn && data.orphelins?.length > 0 && (
          <>
            <h3>{t("Codes promo sans créateur", "Promo codes without a creator", "Códigos promocionales sin creador")}</h3>
            <p className="adm-help">{t("Ces codes ne sont plus reliés à un créateur (lien expiré, par exemple). Supprime-les ici, et désactive-les chez Whop s'ils y existent.", "These codes are no longer linked to a creator (an expired link, for example). Delete them here, and deactivate them in Whop if they exist there.", "Estos códigos ya no están vinculados a ningún creador (un enlace caducado, por ejemplo). Elimínalos aquí y desactívalos en Whop si existen allí.")}</p>
            <ul className="adm-rows">
              {data.orphelins.map((o) => {
                const key = `po-${o.id}`;
                return (
                  <li key={o.id}>
                    <span className="adm-promo-main">
                      <code className="adm-code">{o.code}</code>
                      <b>−{pctOf(o.pct / 100, L)}</b>
                      {o.nom && <span>{o.nom}</span>}
                      <span className={`adm-tag ${o.whop_ok ? "ok" : "wait"}`}>{o.whop_ok ? t("Créé chez Whop", "Created in Whop", "Creado en Whop") : t("À créer chez Whop", "To create in Whop", "Por crear en Whop")}</span>
                    </span>
                    <button type="button" className={`adm-btn danger ${confirm === key ? "armed" : ""}`} disabled={!!busy} onClick={() => twoStep(key, () => removePromo(o.inv_code ? { inv: o.inv_code } : { uid: o.uid }))}>
                      {confirm === key ? t("Confirmer la suppression", "Confirm deletion", "Confirmar la eliminación") : t("Supprimer le code", "Delete code", "Eliminar el código")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
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
            <Check ok={promosOn}>{t("Codes promo des créateurs activés dans la base de données", "Creator promo codes enabled in the database", "Códigos promocionales de los creadores activados en la base de datos")}</Check>
            <li className="na"><span aria-hidden>–</span>{t("IA", "AI", "IA")}{colon}{health.ai ?t("branchée", "connected", "conectada") : t("désactivée volontairement, jusqu'aux premiers revenus", "deliberately disabled until the first revenue", "desactivada a propósito hasta los primeros ingresos")}</li>
          </ul>
          <p className="adm-help">
            {t("Clients, paiements et virements", "Customers, payments and payouts", "Clientes, pagos y transferencias")}{colon}<a className="adm-link-out" href={WHOP_DASH} target="_blank" rel="noopener noreferrer">{t("tableau de bord Whop", "Whop dashboard", "panel de Whop")} ↗</a>
          </p>
        </section>
      )}
    </>
  );
}
