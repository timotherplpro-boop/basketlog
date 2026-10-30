"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";

const Icon = ({ name }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "bolt") return <svg viewBox="0 0 24 24" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
  if (name === "crown") return <svg viewBox="0 0 24 24" {...p}><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" /></svg>;
  return <svg viewBox="0 0 24 24" {...p}><path d="M18.2 8.2c2.4 0 3.8 1.7 3.8 3.8s-1.4 3.8-3.8 3.8c-3.4 0-5-7.6-8.8-7.6C7 8.2 5.6 9.9 5.6 12s1.4 3.8 3.8 3.8c3.8 0 5.4-7.6 8.8-7.6z" transform="translate(-1.8 0)" /></svg>;
};

// Mêmes offres que Visifoot, ligne par ligne. Les questions personnelles à l'IA n'apparaissent que si l'IA est
// configurée : on n'affiche jamais une fonction qui ne marche pas.
const PLANS = (L, ai) => [
  {
    id: "starter", name: "Starter", icon: "bolt", price: L.t("10 €", "€10", "10 €"), per: L.t("/mois", "/month", "/mes"), sub: L.t("Pour découvrir l'IA", "To discover the AI", "Para descubrir la IA"), cta: L.t("Débloquer - 10 €/mois", "Unlock - €10/month", "Desbloquear - 10 €/mes"),
    items: [
      ["ok", L.t("1 analyse par jour", "1 analysis per day", "1 análisis al día")],
      ["ok", L.t("Analyse réduite", "Reduced analysis", "Análisis reducido")],
      ["ok", L.t("Stats clés", "Key stats", "Estadísticas clave")],
      ["ok", L.t("Probabilités exactes 1x/jour", "Exact probabilities 1x/day", "Probabilidades exactas 1x/día")],
      ai && ["no", L.t("Questions personnelles à l'IA", "Personal questions to the AI", "Preguntas personales a la IA")],
    ].filter(Boolean),
  },
  {
    id: "pro", name: "Pro", icon: "crown", price: L.t("19 €", "€19", "19 €"), per: L.t("/mois", "/month", "/mes"), sub: L.t("Pour les passionnés de basket", "For basketball fans", "Para los apasionados del baloncesto"), badge: L.t("Populaire", "Popular", "Popular"), cta: L.t("Débloquer - 19 €/mois", "Unlock - €19/month", "Desbloquear - 19 €/mes"),
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
    id: "lifetime", name: "Lifetime", icon: "infinity", price: L.t("99 €", "€99", "99 €"), per: L.t("une seule fois", "one-time", "pago único"), sub: L.t("Économise +100 €/an vs mensuel", "Save €100+/year vs monthly", "Ahorra +100 €/año frente al mensual"), badge: L.t("À vie", "Lifetime", "De por vida"), cta: L.t("Débloquer - 99 €", "Unlock - €99", "Desbloquear - 99 €"),
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
};

export default function ProPlans({ checkout, loginReady, notice, ai = false }) {
  const L = useL();
  const pro = useProStatus();
  const [agree, setAgree] = useState(false);
  const [nudge, setNudge] = useState(false);
  // Avant le paiement : acceptation des CGV et demande d'accès immédiat (renonciation à la rétractation, art. L221-28 13°).
  const buy = (id) => (e) => {
    if (!agree) { e.preventDefault(); setNudge(true); document.getElementById("pro-agree")?.focus(); return; }
    track("Clic abonnement", { formule: id });
  };
  useEffect(() => {
    if (!pro) return;
    track("Page Pro vue", { formule: pro.tier });
    if (notice === "ok") track("Abonnement activé", { formule: pro.tier });
    else if (notice) track("Connexion Whop", { etape: "erreur", raison: notice });
  }, [pro, notice]);
  const current = pro?.tier || "gratuit";
  const TIER_LABEL = L.t(
    { gratuit: "Gratuit", compte: "Compte gratuit", starter: "Starter", pro: "Pro", lifetime: "Lifetime" },
    { gratuit: "Free", compte: "Free account", starter: "Starter", pro: "Pro", lifetime: "Lifetime" },
    { gratuit: "Gratis", compte: "Cuenta gratis", starter: "Starter", pro: "Pro", lifetime: "Lifetime" }
  );
  const n = NOTICES[notice];

  return (
    <>
      {n && <div className={`pro-notice ${n[0]}`} role="status">{L.t(n[1], n[2], n[3])}</div>}
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
        {PLANS(L, ai).map((p, i) => {
          const url = checkout[p.id];
          return (
            <article key={p.id} className={`plan plan-${p.id} reveal-in`} style={{ animationDelay: `${i * 90}ms` }}>
              {p.badge && <span className="plan-badge">{p.id === "pro" ? "⭐⭐ " : "∞∞ "}{p.badge}</span>}
              <h3><span className="plan-ic"><Icon name={p.icon} /></span>{p.name}</h3>
              <div className="plan-price"><b>{p.price}</b><span>{p.per}</span></div>
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
                <a href={url} className={`plan-cta plan-buy ${agree ? "" : "plan-wait"}`} aria-disabled={!agree} onClick={buy(p.id)}>{p.cta}</a>
              ) : (
                <span className="plan-cta plan-soon">{L.t("Bientôt disponible", "Coming soon", "Próximamente")}</span>
              )}
            </article>
          );
        })}
      </div>
      <p className="pro-legal">
        {L.t(
          <>Starter et Pro sont sans engagement : tu arrêtes quand tu veux depuis ton compte Whop, et tu gardes l&apos;accès jusqu&apos;à la fin du mois payé. Une période commencée n&apos;est pas remboursée. Réservé aux 18 ans et plus. </>,
          <>Starter and Pro have no commitment: cancel anytime from your Whop account and keep access until the end of the paid month. A started period is not refunded. For adults 18 and over. </>,
          <>Starter y Pro no tienen permanencia: cancelas cuando quieras desde tu cuenta de Whop y mantienes el acceso hasta el final del mes pagado. Un periodo empezado no se reembolsa. Solo para mayores de 18 años. </>
        )}
        <Link href={L.href("/cgv")}>{L.t("Conditions générales de vente", "Terms of Sale", "Condiciones generales de venta")}</Link>
      </p>
      <p className="pro-free">{L.t("Sans abonnement, les probabilités de victoire de tous les matchs restent gratuites.", "Without a subscription, win probabilities for every game stay free.", "Sin suscripción, las probabilidades de victoria de todos los partidos siguen siendo gratis.")} <Link href={L.href("/app/matchs")}>{L.t("Voir les matchs du jour", "See today's games", "Ver los partidos de hoy")}</Link></p>
      <div className="pro-account">
        {pro?.connected ? (
          <p>
            {L.t("Connecté avec Whop", "Logged in with Whop", "Conectado con Whop")}{pro.name ? <> {L.t("en tant que", "as", "como")} <b>{pro.name}</b></> : ""} · {L.t("formule", "plan", "plan")} <b>{TIER_LABEL[current] || current}</b>
            {" · "}<a href="https://whop.com/@me/settings/orders/" target="_blank" rel="noopener">{L.t("Gérer mon abonnement", "Manage my subscription", "Gestionar mi suscripción")}</a>
            {" · "}<a href={`/api/pro/logout?next=${encodeURIComponent(L.href("/pro"))}`}>{L.t("Se déconnecter", "Log out", "Cerrar sesión")}</a>
          </p>
        ) : loginReady ? (
          <p>
            {L.t("Pas encore de compte ?", "No account yet?", "¿Todavía no tienes cuenta?")} <a href={`/api/whop/signup?next=${encodeURIComponent(L.href("/app/matchs"))}`} className="pro-login" onClick={() => track("Clic créer un compte", { source: "page_pro" })}>{L.t("Créer mon compte gratuit", "Create my free account", "Crear mi cuenta gratis")}</a>
            {" · "}{L.t("Déjà inscrit ?", "Already signed up?", "¿Ya estás registrado?")} <a href={`/api/whop/login?next=${encodeURIComponent(L.href("/pro"))}`} className="pro-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "page_pro" })}>{L.t("Me connecter", "Log in", "Iniciar sesión")}</a>
          </p>
        ) : null}
        <p className="pro-secure">{L.t("Tu peux arrêter ton abonnement à tout moment. Toutes nos analyses sont fournies à titre informatif uniquement.", "You can cancel your subscription anytime. All our analyses are provided for information only.", "Puedes cancelar tu suscripción en cualquier momento. Todos nuestros análisis se ofrecen solo a título informativo.")}</p>
        <p className="pro-secure">{L.t("Une question sur nos offres ?", "A question about our plans?", "¿Una pregunta sobre nuestros planes?")} <a href="mailto:contact@basketlog-app.com">contact@basketlog-app.com</a></p>
      </div>
    </>
  );
}
