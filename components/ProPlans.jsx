"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";
import { price, money, PRICES } from "../lib/pricing";
import { pctOf } from "../lib/i18n";
import { CODE_RE, cleanCode, discounted, withPromo } from "../lib/promo";
import SwitchWatch from "./SwitchWatch";
import { ProExitIntent } from "./ExitOffer";
import { openAuth } from "../lib/auth-client";

const Icon = ({ name }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "bolt") return <svg viewBox="0 0 24 24" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
  if (name === "crown") return <svg viewBox="0 0 24 24" {...p}><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" /></svg>;
  return <svg viewBox="0 0 24 24" {...p}><path d="M18.2 8.2c2.4 0 3.8 1.7 3.8 3.8s-1.4 3.8-3.8 3.8c-3.4 0-5-7.6-8.8-7.6C7 8.2 5.6 9.9 5.6 12s1.4 3.8 3.8 3.8c3.8 0 5.4-7.6 8.8-7.6z" transform="translate(-1.8 0)" /></svg>;
};

// Mêmes offres que Visifoot, ligne par ligne. Les questions personnelles à l'IA n'apparaissent que si l'IA est
// configurée : on n'affiche jamais une fonction qui ne marche pas.
// Prix dans la monnaie du visiteur (`cur` : EUR dans la zone euro, USD ailleurs), choisie côté serveur.
// `promo` : code promo de créateur appliqué sur la page ({ pct, mois } : remise en % et nombre de paiements remisés, 0 = tous) ;
// le prix plein s'affiche alors barré (`old`). Quand la remise ne couvre que les premiers paiements d'un abonnement, la carte
// l'annonce comme telle (« 11,19 € le 1er mois », puis « puis 13,99 €/mois ») : jamais un prix remisé présenté comme définitif.
const PLANS = (L, ai, cur, promo = null) => {
  const pct = promo?.pct || 0;
  const mois = promo?.mois ?? 0;
  const show = (id) => (pct ? money(discounted(PRICES[cur][id], pct), cur, L) : price(id, cur, L));
  const was = (id) => (pct ? price(id, cur, L) : null);
  const limited = pct > 0 && mois >= 1;
  const per = !limited ? L.t("/mois", "/month", "/mes")
    : mois === 1 ? L.t("le 1er mois", "first month", "el primer mes")
    : L.t(`/mois pendant ${mois} mois`, `/month for ${mois} months`, `/mes durante ${mois} meses`);
  const sep = limited && mois === 1 ? " " : ""; // « 11,19 € le 1er mois » mais « 11,19 €/mois »
  const then = (id) => (limited ? L.t(`puis ${price(id, cur, L)}/mois`, `then ${price(id, cur, L)}/month`, `luego ${price(id, cur, L)}/mes`) : null);
  return [
  {
    id: "starter", name: "Starter", icon: "bolt", price: show("starter"), old: was("starter"), per, then: then("starter"), sub: ai ? L.t("Pour découvrir l'IA", "To discover the AI", "Para descubrir la IA") : L.t("Pour découvrir les analyses", "To try the analyses", "Para descubrir los análisis"), cta: `${L.t("Débloquer", "Unlock", "Desbloquear")} - ${show("starter")}${sep}${per}`,
    items: [
      ["ok", L.t("1 analyse par jour", "1 analysis per day", "1 análisis al día")],
      ["ok", L.t("Analyse réduite", "Reduced analysis", "Análisis reducido")],
      ["ok", L.t("Stats clés", "Key stats", "Estadísticas clave")],
      ["ok", L.t("Probabilités exactes 1x/jour", "Exact probabilities 1x/day", "Probabilidades exactas 1x/día")],
      ai && ["no", L.t("Questions personnelles à l'IA", "Personal questions to the AI", "Preguntas personales a la IA")],
    ].filter(Boolean),
  },
  {
    id: "pro", name: "Pro", icon: "crown", price: show("pro"), old: was("pro"), per, then: then("pro"), sub: L.t("Pour les passionnés de basket", "For basketball fans", "Para los apasionados del baloncesto"), badge: L.t("Populaire", "Popular", "Popular"), cta: `${L.t("Débloquer", "Unlock", "Desbloquear")} - ${show("pro")}${sep}${per}`,
    items: [
      ["ok", L.t("Analyses illimitées", "Unlimited analyses", "Análisis ilimitados")],
      ["ok", L.t("Analyse complète détaillée", "Detailed full analysis", "Análisis completo detallado")],
      ["ok", L.t("Scénarios probables détaillés", "Detailed likely scenarios", "Escenarios probables detallados")],
      ["ok", L.t("Analyse basée sur les statistiques", "Stats-based analysis", "Análisis basado en las estadísticas")],
      ["ok", L.t("Actualités en temps réel", "Real-time news", "Noticias en tiempo real")],
      ai && ["ai", L.t("Questions personnelles à l'IA", "Personal questions to the AI", "Preguntas personales a la IA"), L.t("(1 question/jour)", "(1 question/day)", "(1 pregunta/día)")],
    ].filter(Boolean),
  },
  {
    id: "lifetime", name: "Lifetime", icon: "infinity", price: show("lifetime"), old: was("lifetime"), per: L.t("une seule fois", "one-time", "pago único"), sub: L.t(`Économise +${money(100, cur, L)}/an vs mensuel`, `Save ${money(100, cur, L)}+/year vs monthly`, `Ahorra +${money(100, cur, L)}/año frente al mensual`), badge: L.t("À vie", "Lifetime", "De por vida"), cta: L.t(`Débloquer - ${show("lifetime")}`, `Unlock - ${show("lifetime")}`, `Desbloquear - ${show("lifetime")}`),
    items: [
      ["ok", L.t("Analyses illimitées à vie", "Unlimited analyses for life", "Análisis ilimitados de por vida")],
      ["ok", L.t("Analyse complète détaillée", "Detailed full analysis", "Análisis completo detallado")],
      ["ok", L.t("Scénarios probables détaillés", "Detailed likely scenarios", "Escenarios probables detallados")],
      ["ok", L.t("Plus jamais de paiement mensuel", "No more monthly payments", "Se acabaron los pagos mensuales")],
      ["ok", L.t("Priorité nouvelles features", "Priority on new features", "Prioridad en nuevas funciones")],
      ai && ["ai", L.t("Questions personnelles à l'IA illimitées", "Unlimited personal questions to the AI", "Preguntas personales a la IA ilimitadas")],
    ].filter(Boolean),
  },
  ];
};

const ItemIcon = ({ kind }) => {
  const p = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (kind === "no") return <svg {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>;
  if (kind === "ai") return <svg {...p} strokeWidth={2}><path d="M20 11.5a7.5 7.5 0 0 1-11.1 6.6L4 19.5l1.4-4.6A7.5 7.5 0 1 1 20 11.5z" /></svg>;
  return <svg {...p}><path d="M4.5 12.5l5 5L19.5 7" /></svg>;
};

const NOTICES = {
  ok: ["good", "Ton abonnement est actif. Bonnes analyses !", "Your subscription is active. Enjoy the analyses!", "Tu suscripción está activa. ¡Buenos análisis!"],
  compte: ["good", "Ton compte gratuit est actif. Pour débloquer les analyses complètes, choisis une formule ci-dessous.", "Your free account is active. To unlock full analyses, pick a plan below.", "Tu cuenta gratis está activa. Para desbloquear los análisis completos, elige un plan aquí abajo."],
  abonnement: ["warn", "Connexion réussie, mais aucun abonnement Basketlog actif n'a été trouvé sur ce compte Whop. Utilise le même compte que pour ton paiement.", "You're logged in, but no active Basketlog subscription was found on this Whop account. Use the same account you paid with.", "Has iniciado sesión, pero no hemos encontrado ninguna suscripción activa de Basketlog en esta cuenta de Whop. Usa la misma cuenta con la que pagaste."],
  connexion: ["warn", "La connexion avec Whop n'a pas abouti. Réessaie dans un instant.", "Logging in with Whop didn't work. Please try again in a moment.", "No se ha podido iniciar sesión con Whop. Vuelve a intentarlo en un momento."],
  config: ["warn", "Le paiement n'est pas encore activé sur Basketlog. Reviens très bientôt.", "Payments aren't enabled on Basketlog yet. Please come back soon.", "El pago todavía no está activado en Basketlog. Vuelve muy pronto."],
  whop_autre: ["warn", "Ce compte Whop est déjà relié à un autre compte Basketlog. Connecte-toi à Basketlog avec l'adresse e-mail de cet autre compte, ou écris-nous à contact@basketlog-app.com.", "This Whop account is already linked to another Basketlog account. Log in to Basketlog with that other account's email, or write to us at contact@basketlog-app.com.", "Esta cuenta de Whop ya está vinculada a otra cuenta de Basketlog. Inicia sesión en Basketlog con el correo de esa otra cuenta o escríbenos a contact@basketlog-app.com."],
  lien: ["warn", "Impossible de relier ton compte Whop pour le moment. Réessaie dans un instant.", "We couldn't link your Whop account right now. Please try again in a moment.", "No hemos podido vincular tu cuenta de Whop por ahora. Inténtalo de nuevo en un instante."],
};

export default function ProPlans({ checkout, loginReady, notice, ai = false, cur = "EUR", switching = false }) {
  const L = useL();
  const pro = useProStatus();
  const [agree, setAgree] = useState(false);
  const [nudge, setNudge] = useState(false);
  // Code promo d'un créateur : saisi ici, ou pré-rempli par le lien du créateur (/pro?code=NOM20). Vérifié par /api/promo
  // (seuls les codes déjà créés chez Whop passent), puis ajouté aux liens de paiement Whop (paramètre promoCode) ;
  // les prix affichés tiennent compte de la remise.
  const [promo, setPromo] = useState(null); // { code, pct } une fois le code vérifié
  const [promoOpen, setPromoOpen] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoState, setPromoState] = useState("idle"); // idle | checking | invalid | down
  const applyPromo = useCallback(async (raw) => {
    const code = cleanCode(raw);
    if (!CODE_RE.test(code)) { setPromo(null); setPromoState("invalid"); return; }
    setPromoState("checking");
    try {
      const res = await fetch(`/api/promo?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (j.ok && CODE_RE.test(j.code) && Number.isInteger(j.pct) && j.pct > 0 && j.pct < 100) {
        // mois : paiements remisés (1 : le premier seulement, 0 : tous). Inconnu : on annonce la remise la plus courte.
        const mois = Number.isInteger(j.mois) && j.mois >= 0 && j.mois <= 36 ? j.mois : 1;
        setPromo({ code: j.code, pct: j.pct, mois });
        setPromoInput(j.code);
        setPromoState("idle");
        track("Code promo", { etape: "appliqué", code: j.code, remise: j.pct });
      } else {
        setPromo(null);
        setPromoState(res.status >= 500 ? "down" : "invalid");
      }
    } catch {
      setPromo(null);
      setPromoState("down");
    }
  }, []);
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const c = q.get("code") || q.get("promo");
      if (c) { setPromoOpen(true); setPromoInput(cleanCode(c)); applyPromo(c); }
    } catch { /* adresse illisible : pas de code pré-rempli */ }
  }, [applyPromo]);
  // Avant le paiement : acceptation des CGV et demande d'accès immédiat (renonciation à la rétractation, art. L221-28 13°).
  // Comme Visifoot, le compte vient avant le paiement : un visiteur sans compte crée d'abord son compte gratuit (fenêtre
  // « Créer un compte »), puis part payer ; après le paiement, « Activer mon abonnement » relie son compte Whop.
  const buy = (id, url) => (e) => {
    if (!agree) { e.preventDefault(); setNudge(true); document.getElementById("pro-agree")?.focus(); return; }
    if (pro && !pro.connected) {
      e.preventDefault();
      openAuth({ mode: "inscription", source: "paiement", then: "paiement", checkout: url, plan: id });
      return;
    }
    try { localStorage.setItem("bl_paiement", JSON.stringify({ plan: id, at: Date.now() })); } catch {}
    track("Clic abonnement", { formule: id, devise: cur, ...(promo ? { code_promo: promo.code } : {}) });
  };
  useEffect(() => {
    if (!pro) return;
    track("Page Pro vue", { formule: pro.tier });
    if (notice === "ok") track("Abonnement activé", { formule: pro.tier });
    else if (notice) track("Connexion Whop", { etape: "erreur", raison: notice });
  }, [pro, notice]);
  // Retour de « Continuer avec Google » après un clic sur une formule (?payer=pro) : le compte est prêt, on montre la formule
  // choisie ; le visiteur coche la case des CGV et part payer.
  const [payer, setPayer] = useState(null);
  useEffect(() => {
    try {
      const u = new URL(window.location.href);
      const p = u.searchParams.get("payer");
      if (!p) return;
      u.searchParams.delete("payer");
      history.replaceState(null, "", u.pathname + (u.search || "") + u.hash);
      if (["starter", "pro", "lifetime"].includes(p)) {
        setPayer(p);
        setTimeout(() => document.querySelector(`.plan-${p}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
      }
    } catch { /* adresse illisible */ }
  }, []);
  const current = pro?.tier || "gratuit";
  const TIER_LABEL = L.t(
    { gratuit: "Gratuit", compte: "Compte gratuit", starter: "Starter", pro: "Pro", lifetime: "Lifetime" },
    { gratuit: "Free", compte: "Free account", starter: "Starter", pro: "Pro", lifetime: "Lifetime" },
    { gratuit: "Gratis", compte: "Cuenta gratis", starter: "Starter", pro: "Pro", lifetime: "Lifetime" }
  );
  const n = NOTICES[notice];

  return (
    <>
      {n && !payer && <div className={`pro-notice ${n[0]}`} role="status">{L.t(n[1], n[2], n[3])}</div>}
      {payer && pro?.connected && (
        <div className="pro-notice good" role="status">{L.t(
          "Ton compte est prêt ! Coche la case ci-dessous, puis clique sur « Débloquer » pour payer ta formule.",
          "Your account is ready! Tick the box below, then click “Unlock” to pay for your plan.",
          "¡Tu cuenta está lista! Marca la casilla de abajo y haz clic en «Desbloquear» para pagar tu plan."
        )}</div>
      )}
      {switching && <SwitchWatch />}
      {/* Offre de dernière chance (éteinte par défaut, voir lib/exit-offer.js) : ordinateur, sortie de la souris par le haut
          de la fenêtre ; jamais à quelqu'un qui paie déjà ni par-dessus un code de créateur déjà appliqué. */}
      <ProExitIntent enabled={!!pro && !switching && !promo && (current === "gratuit" || current === "compte")} onApply={applyPromo} />
      <div className="pro-promo">
        {promo ? (
          <div className="pro-promo-ok" role="status">
            <span className="pro-promo-tick" aria-hidden>✓</span>
            <span>
              {L.t(
                `Code ${promo.code} appliqué : −${pctOf(promo.pct / 100, L)} ${promo.mois === 0 ? "sur ta formule" : promo.mois === 1 ? "sur ton premier paiement" : `sur tes ${promo.mois} premiers paiements`}.`,
                `Code ${promo.code} applied: ${pctOf(promo.pct / 100, L)} off ${promo.mois === 0 ? "your plan" : promo.mois === 1 ? "your first payment" : `your first ${promo.mois} payments`}.`,
                `Código ${promo.code} aplicado: −${pctOf(promo.pct / 100, L)} en ${promo.mois === 0 ? "tu plan" : promo.mois === 1 ? "tu primer pago" : `tus ${promo.mois} primeros pagos`}.`
              )}
              <small>{L.t("Les prix ci-dessous sont indicatifs : le montant exact s'affiche sur la page de paiement.", "Prices below are indicative: the exact amount is shown on the checkout page.", "Los precios de abajo son orientativos: el importe exacto se muestra en la página de pago.")}</small>
            </span>
            <button type="button" className="pro-promo-x" onClick={() => { setPromo(null); setPromoInput(""); setPromoOpen(false); setPromoState("idle"); }}>{L.t("Retirer", "Remove", "Quitar")}</button>
          </div>
        ) : !promoOpen ? (
          <button type="button" className="pro-promo-toggle" aria-expanded="false" onClick={() => { setPromoOpen(true); setTimeout(() => document.getElementById("pro-promo-input")?.focus(), 0); }}>
            {L.t("J'ai un code promo", "I have a promo code", "Tengo un código promocional")}
          </button>
        ) : (
          <>
            <form className="pro-promo-form" onSubmit={(e) => { e.preventDefault(); applyPromo(promoInput); }}>
              <label className="vh" htmlFor="pro-promo-input">{L.t("Code promo", "Promo code", "Código promocional")}</label>
              <input
                id="pro-promo-input"
                value={promoInput}
                onChange={(e) => { setPromoInput(cleanCode(e.target.value)); if (promoState !== "checking") setPromoState("idle"); }}
                placeholder={L.t("CODE PROMO", "PROMO CODE", "CÓDIGO")}
                maxLength={24}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={promoState === "invalid"}
              />
              <button type="submit" disabled={promoState === "checking" || !promoInput}>{promoState === "checking" ? "…" : L.t("Appliquer", "Apply", "Aplicar")}</button>
            </form>
            {promoState === "invalid" && <p className="pro-promo-msg" role="alert">{L.t("Ce code n'est pas valide ou n'est plus actif.", "This code isn't valid or is no longer active.", "Este código no es válido o ya no está activo.")}</p>}
            {promoState === "down" && <p className="pro-promo-msg" role="alert">{L.t("Vérification impossible pour le moment, réessaie dans un instant.", "Couldn't check the code right now, please try again in a moment.", "No se ha podido comprobar el código por ahora, inténtalo de nuevo en un instante.")}</p>}
          </>
        )}
      </div>
      <label className={`pro-agree ${nudge && !agree ? "nudge" : ""}`}>
        <input id="pro-agree" type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setNudge(false); }} />
        {L.t(
          <span>J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et les <Link href="/cgu" target="_blank">CGU</Link>, et je demande l&apos;accès immédiat à mes analyses : je reconnais perdre mon droit de rétractation de 14 jours.</span>,
          <span>I accept the <Link href={L.href("/cgv")} target="_blank">Terms of Sale</Link> and <Link href={L.href("/cgu")} target="_blank">Terms of Use</Link>, and I request immediate access to my analyses: I acknowledge that I lose my 14-day right of withdrawal.</span>,
          <span>Acepto las <Link href={L.href("/cgv")} target="_blank">Condiciones de venta</Link> y las <Link href={L.href("/cgu")} target="_blank">Condiciones de uso</Link>, y pido el acceso inmediato a mis análisis: reconozco que pierdo mi derecho de desistimiento de 14 días.</span>
        )}
      </label>
      {nudge && !agree && <p className="pro-agree-hint" role="alert">{L.t("Coche la case ci-dessus pour continuer vers le paiement.", "Tick the box above to continue to checkout.", "Marca la casilla de arriba para continuar con el pago.")}</p>}
      <div className="plans">
        {PLANS(L, ai, cur, promo).map((p, i) => {
          const url = withPromo(checkout[p.id], promo?.code);
          return (
            <article key={p.id} className={`plan plan-${p.id} reveal-in${payer === p.id ? " plan-picked" : ""}`} style={{ animationDelay: `${i * 90}ms` }}>
              {p.badge && <span className="plan-badge">{p.id === "pro" ? "⭐⭐ " : "∞∞ "}{p.badge}</span>}
              <h3><span className="plan-ic"><Icon name={p.icon} /></span>{p.name}</h3>
              <div className="plan-price">
                {p.old && <s className="plan-old"><span className="vh">{L.t("Prix sans le code : ", "Price without the code: ", "Precio sin el código: ")}</span>{p.old}</s>}
                <b>{p.price}</b><span>{p.per}</span>
              </div>
              {p.then && <div className="plan-then">{p.then}</div>}
              <div className="plan-sub">{p.sub}</div>
              <ul>{p.items.map(([kind, text, extra]) => (
                <li key={text} className={`pi pi-${kind}`}>
                  <span className="pi-ic"><ItemIcon kind={kind} /></span>
                  <span>{kind === "no" && <span className="vh">{L.t("Non inclus : ", "Not included: ", "No incluido: ")}</span>}{kind === "ai" ? <b>{text}</b> : text}{extra ? <> {extra}</> : null}</span>
                </li>
              ))}</ul>
              {pro?.connected && current === p.id ? (
                <span className="plan-cta plan-current">{L.t("Ta formule actuelle", "Your current plan", "Tu plan actual")}</span>
              ) : url ? (
                <a href={url} className={`plan-cta plan-buy ${agree ? "" : "plan-wait"}`} aria-disabled={!agree} onClick={buy(p.id, url)}>{p.cta}</a>
              ) : (
                <span className="plan-cta plan-soon">{L.t("Bientôt disponible", "Coming soon", "Próximamente")}</span>
              )}
            </article>
          );
        })}
      </div>
      <p className="pro-legal">
        {L.t(
          <>Starter et Pro sont sans engagement : tu arrêtes quand tu veux depuis la page Mon compte de ce site, et tu gardes l&apos;accès jusqu&apos;à la fin du mois payé. Une période commencée n&apos;est pas remboursée. Réservé aux 18 ans et plus. </>,
          <>Starter and Pro have no commitment: cancel anytime from the My account page on this site and keep access until the end of the paid month. A started period is not refunded. For adults 18 and over. </>,
          <>Starter y Pro no tienen permanencia: cancelas cuando quieras desde la página Mi cuenta de este sitio y mantienes el acceso hasta el final del mes pagado. Un periodo empezado no se reembolsa. Solo para mayores de 18 años. </>
        )}
        <Link href={L.href("/cgv")}>{L.t("Conditions générales de vente", "Terms of Sale", "Condiciones generales de venta")}</Link>
      </p>
      <p className="pro-free">{L.t("Sans abonnement, les probabilités de victoire de tous les matchs restent gratuites.", "Without a subscription, win probabilities for every game stay free.", "Sin suscripción, las probabilidades de victoria de todos los partidos siguen siendo gratis.")} <Link href={L.href("/app/matchs")}>{L.t("Voir les matchs du jour", "See today's games", "Ver los partidos de hoy")}</Link></p>
      <div className="pro-account">
        {pro?.connected ? (
          <p>
            {pro.acct ? L.t("Connecté", "Logged in", "Conectado") : L.t("Connecté avec Whop", "Logged in with Whop", "Conectado con Whop")}{pro.name ? <> {L.t("en tant que", "as", "como")} <b>{pro.name}</b></> : ""} · {L.t("formule", "plan", "plan")} <b>{TIER_LABEL[current] || current}</b>
            {(current === "compte" || current === "starter") && <>{" · "}<a href={`/api/whop/login?next=${encodeURIComponent(L.href("/pro"))}`} className="pro-login" onClick={() => track("Connexion Whop", { etape: "actualiser", source: "page_pro" })}>{pro.acct ? L.t("Tu viens de payer ? Activer mon abonnement", "Just paid? Activate my subscription", "¿Acabas de pagar? Activar mi suscripción") : L.t("Tu viens de t'abonner ? Actualiser mon accès", "Just subscribed? Refresh my access", "¿Te acabas de suscribir? Actualizar mi acceso")}</a></>}
            {" · "}<Link href={L.href("/app/compte")}>{L.t("Gérer mon abonnement", "Manage my subscription", "Gestionar mi suscripción")}</Link>
            {" · "}<a href={`/api/pro/logout?next=${encodeURIComponent(L.href("/pro"))}`}>{L.t("Se déconnecter", "Log out", "Cerrar sesión")}</a>
          </p>
        ) : (
          <p>
            {L.t("Pas encore de compte ?", "No account yet?", "¿Todavía no tienes cuenta?")} <button type="button" className="pro-login" onClick={() => openAuth({ mode: "inscription", source: "page_pro" })}>{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratis")}</button>
            {" · "}{L.t("Déjà inscrit ?", "Already signed up?", "¿Ya estás registrado?")} <button type="button" className="pro-login" onClick={() => openAuth({ mode: "connexion", source: "page_pro" })}>{L.t("Me connecter", "Log in", "Iniciar sesión")}</button>
          </p>
        )}
        {pro?.connected && pro.acct && (current === "compte" || current === "starter") && (
          <p className="pro-secure">{L.t(
            "Le paiement se fait sur la page sécurisée de Whop. Ensuite, reviens ici et clique sur « Activer mon abonnement » : tu te connectes à Whop avec le compte utilisé pour payer, et ta formule se débloque sur ton compte Basketlog.",
            "Payment happens on Whop's secure page. Then come back here and click “Activate my subscription”: log in to Whop with the account you paid with, and your plan unlocks on your Basketlog account.",
            "El pago se hace en la página segura de Whop. Después, vuelve aquí y haz clic en «Activar mi suscripción»: inicia sesión en Whop con la cuenta con la que pagaste y tu plan se desbloquea en tu cuenta de Basketlog."
          )}</p>
        )}
        <p className="pro-secure">{L.t("Tu peux arrêter ton abonnement à tout moment. Toutes nos analyses sont fournies à titre informatif uniquement.", "You can cancel your subscription anytime. All our analyses are provided for information only.", "Puedes cancelar tu suscripción en cualquier momento. Todos nuestros análisis se ofrecen solo a título informativo.")}</p>
        {pro?.connected && (current === "starter" || current === "pro") && (
          <p className="pro-secure">{L.t("Déjà abonné ? Passe à une formule supérieure en un clic depuis", "Already subscribed? Switch to a higher plan in one click from", "¿Ya estás suscrito? Pasa a un plan superior con un clic desde")} <Link href={L.href("/app/compte")}>{L.t("Mon compte", "My account", "Mi cuenta")}</Link>{L.t(" : ton abonnement actuel s'arrête tout seul à la fin de sa période.", ": your current subscription stops by itself at the end of its period.", ": tu suscripción actual se detiene sola al final de su periodo.")}</p>
        )}
        <p className="pro-secure">{L.t("Une question sur nos offres ?", "A question about our plans?", "¿Una pregunta sobre nuestros planes?")} <a href="mailto:contact@basketlog-app.com">contact@basketlog-app.com</a></p>
      </div>
    </>
  );
}
