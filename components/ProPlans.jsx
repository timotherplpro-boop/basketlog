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

const PLANS = (L) => [
  {
    id: "starter", name: "Starter", icon: "bolt", price: L.t("10 €", "€10"), per: L.t("/mois", "/month"), sub: L.t("Pour découvrir Basketlog", "To get started with Basketlog"), cta: L.t("Débloquer - 10 €/mois", "Unlock - €10/month"),
    perks: L.en ? ["5 full analyses per day", "Projected score and scenarios", "Key stats for both teams", "NBA and EuroLeague"] : ["5 analyses complètes par jour", "Score projeté et scénarios", "Stats clés des deux équipes", "NBA et EuroLeague"],
  },
  {
    id: "pro", name: "Pro", icon: "crown", price: L.t("19 €", "€19"), per: L.t("/mois", "/month"), sub: L.t("Pour les passionnés de basket", "For basketball enthusiasts"), badge: L.t("Populaire", "Popular"), cta: L.t("Débloquer - 19 €/mois", "Unlock - €19/month"),
    perks: L.en
      ? ["Unlimited analyses", "Detailed full analysis", "Detailed likely scenarios", "Stat comparison, players to watch and form", "Injuries and fatigue factored in"]
      : ["Analyses illimitées", "Analyse complète détaillée", "Scénarios probables détaillés", "Stats comparées, joueurs à suivre et forme", "Absences et fatigue prises en compte"],
  },
  {
    id: "lifetime", name: "Lifetime", icon: "infinity", price: L.t("99 €", "€99"), per: L.t("une seule fois", "one-time"), sub: L.t("Économise +100 €/an vs mensuel", "Save €100+/year vs monthly"), badge: L.t("À vie", "Lifetime"), cta: L.t("Débloquer - 99 €", "Unlock - €99"),
    perks: L.en
      ? ["Unlimited analyses for life", "Everything in Pro", "No more monthly payments", "Early access to new features"]
      : ["Analyses illimitées à vie", "Tout le contenu de Pro", "Plus jamais de paiement mensuel", "Priorité sur les nouvelles fonctionnalités"],
  },
];

const NOTICES = {
  ok: ["good", "Ton abonnement est actif. Bonnes analyses !", "Your subscription is active. Enjoy the analyses!"],
  compte: ["good", "Ton compte gratuit est actif : 1 analyse complète offerte chaque jour. Pour en avoir plus, choisis une formule ci-dessous.", "Your free account is active: 1 full analysis free every day. Want more? Pick a plan below."],
  abonnement: ["warn", "Connexion réussie, mais aucun abonnement Basketlog actif n'a été trouvé sur ce compte Whop. Utilise le même compte que pour ton paiement.", "You're logged in, but no active Basketlog subscription was found on this Whop account. Use the same account you paid with."],
  connexion: ["warn", "La connexion avec Whop n'a pas abouti. Réessaie dans un instant.", "Logging in with Whop didn't work. Please try again in a moment."],
  config: ["warn", "Le paiement n'est pas encore activé sur Basketlog. Reviens très bientôt.", "Payments aren't enabled on Basketlog yet. Please come back soon."],
};

export default function ProPlans({ checkout, loginReady, notice }) {
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
  const TIER_LABEL = L.en
    ? { gratuit: "Free", compte: "Free account", starter: "Starter", pro: "Pro", lifetime: "Lifetime" }
    : { gratuit: "Gratuit", compte: "Compte gratuit", starter: "Starter", pro: "Pro", lifetime: "Lifetime" };
  const n = NOTICES[notice];

  return (
    <>
      {n && <div className={`pro-notice ${n[0]}`} role="status">{L.en ? n[2] : n[1]}</div>}
      <label className={`pro-agree ${nudge && !agree ? "nudge" : ""}`}>
        <input id="pro-agree" type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setNudge(false); }} />
        {L.en
          ? <span>I accept the <Link href={L.href("/cgv")} target="_blank">Terms of Sale</Link> and <Link href={L.href("/cgu")} target="_blank">Terms of Use</Link>, and I request immediate access to my analyses: I acknowledge that I lose my 14-day right of withdrawal.</span>
          : <span>J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et les <Link href="/cgu" target="_blank">CGU</Link>, et je demande l&apos;accès immédiat à mes analyses : je reconnais perdre mon droit de rétractation de 14 jours.</span>}
      </label>
      {nudge && !agree && <p className="pro-agree-hint" role="alert">{L.t("Coche la case ci-dessus pour continuer vers le paiement.", "Tick the box above to continue to checkout.")}</p>}
      <div className="plans">
        {PLANS(L).map((p, i) => {
          const url = checkout[p.id];
          return (
            <article key={p.id} className={`plan plan-${p.id} reveal-in`} style={{ animationDelay: `${i * 90}ms` }}>
              {p.badge && <span className="plan-badge">{p.id === "pro" ? "★★ " : "∞ "}{p.badge}</span>}
              <h3><span className="plan-ic"><Icon name={p.icon} /></span>{p.name}</h3>
              <div className="plan-price"><b>{p.price}</b><span>{p.per}</span></div>
              <div className="plan-sub">{p.sub}</div>
              <ul>{p.perks.map((k) => <li key={k}>{k}</li>)}</ul>
              {pro?.connected && current === p.id ? (
                <span className="plan-cta plan-current">{L.t("Ta formule actuelle", "Your current plan")}</span>
              ) : url ? (
                <a href={url} className={`plan-cta plan-buy ${agree ? "" : "plan-wait"}`} aria-disabled={!agree} onClick={buy(p.id)}>{p.cta}</a>
              ) : (
                <span className="plan-cta plan-soon">{L.t("Bientôt disponible", "Coming soon")}</span>
              )}
            </article>
          );
        })}
      </div>
      <p className="pro-legal">
        {L.en
          ? <>Starter and Pro have no commitment: cancel anytime from your Whop account and keep access until the end of the paid month. A started period is not refunded. For adults 18 and over. </>
          : <>Starter et Pro sont sans engagement : tu arrêtes quand tu veux depuis ton compte Whop, et tu gardes l&apos;accès jusqu&apos;à la fin du mois payé. Une période commencée n&apos;est pas remboursée. Réservé aux 18 ans et plus. </>}
        <Link href={L.href("/cgv")}>{L.t("Conditions générales de vente", "Terms of Sale")}</Link>
      </p>
      <p className="pro-free">{L.t("Sans abonnement, les probabilités de victoire de tous les matchs restent gratuites.", "Without a subscription, win probabilities for every game stay free.")} <Link href={L.href("/app/matchs")}>{L.t("Voir les matchs du jour", "See today's games")}</Link></p>
      <div className="pro-account">
        {pro?.connected ? (
          <p>
            {L.t("Connecté avec Whop", "Logged in with Whop")}{pro.name ? <> {L.t("en tant que", "as")} <b>{pro.name}</b></> : ""} · {L.t("formule", "plan")} <b>{TIER_LABEL[current] || current}</b>
            {" · "}<a href="https://whop.com/@me/settings/orders/" target="_blank" rel="noopener">{L.t("Gérer mon abonnement", "Manage my subscription")}</a>
            {" · "}<a href="/api/pro/logout">{L.t("Se déconnecter", "Log out")}</a>
          </p>
        ) : loginReady ? (
          <p>
            {L.t("Pas encore de compte ?", "No account yet?")} <a href={`/api/whop/signup?next=${encodeURIComponent(L.href("/app/matchs"))}`} className="pro-login" onClick={() => track("Clic créer un compte", { source: "page_pro" })}>{L.t("Créer mon compte gratuit", "Create my free account")}</a> {L.t("(1 analyse offerte par jour)", "(1 free analysis per day)")}
            {" · "}{L.t("Déjà inscrit ?", "Already signed up?")} <a href={`/api/whop/login?next=${encodeURIComponent(L.href("/pro"))}`} className="pro-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "page_pro" })}>{L.t("Me connecter", "Log in")}</a>
          </p>
        ) : null}
        <p className="pro-secure">{L.t("Tu peux arrêter ton abonnement à tout moment. Paiement sécurisé par Whop. Toutes nos analyses sont fournies à titre informatif.", "You can cancel anytime. Secure payment by Whop. All analyses are provided for information only.")}</p>
      </div>
    </>
  );
}
