"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";

const Icon = ({ name }) => {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "bolt") return <svg viewBox="0 0 24 24" {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" /></svg>;
  if (name === "crown") return <svg viewBox="0 0 24 24" {...p}><path d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7z" /></svg>;
  return <svg viewBox="0 0 24 24" {...p}><path d="M18.2 8.2c2.4 0 3.8 1.7 3.8 3.8s-1.4 3.8-3.8 3.8c-3.4 0-5-7.6-8.8-7.6C7 8.2 5.6 9.9 5.6 12s1.4 3.8 3.8 3.8c3.8 0 5.4-7.6 8.8-7.6z" transform="translate(-1.8 0)" /></svg>;
};

const PLANS = [
  {
    id: "starter", name: "Starter", icon: "bolt", price: "10 €", per: "/mois", sub: "Pour découvrir Basketlog", cta: "Débloquer - 10 €/mois",
    perks: ["5 analyses complètes par jour", "Score projeté et scénarios", "Stats clés des deux équipes", "NBA et EuroLeague"],
  },
  {
    id: "pro", name: "Pro", icon: "crown", price: "19 €", per: "/mois", sub: "Pour les passionnés de basket", badge: "Populaire", cta: "Débloquer - 19 €/mois",
    perks: ["Analyses illimitées", "Analyse complète détaillée", "Scénarios probables détaillés", "Stats comparées, joueurs à suivre et forme", "Absences et fatigue prises en compte"],
  },
  {
    id: "lifetime", name: "Lifetime", icon: "infinity", price: "99 €", per: "une seule fois", sub: "Économise +100 €/an vs mensuel", badge: "À vie", cta: "Débloquer - 99 €",
    perks: ["Analyses illimitées à vie", "Tout le contenu de Pro", "Plus jamais de paiement mensuel", "Priorité sur les nouvelles fonctionnalités"],
  },
];

const NOTICES = {
  ok: ["good", "Ton abonnement est actif. Bonnes analyses !"],
  compte: ["good", "Ton compte gratuit est actif : 1 analyse complète offerte chaque jour. Pour en avoir plus, choisis une formule ci-dessous."],
  abonnement: ["warn", "Connexion réussie, mais aucun abonnement Basketlog actif n'a été trouvé sur ce compte Whop. Utilise le même compte que pour ton paiement."],
  connexion: ["warn", "La connexion avec Whop n'a pas abouti. Réessaie dans un instant."],
  config: ["warn", "Le paiement n'est pas encore activé sur Basketlog. Reviens très bientôt."],
};

export default function ProPlans({ checkout, loginReady, notice }) {
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
  const TIER_LABEL = { gratuit: "Gratuit", compte: "Compte gratuit", starter: "Starter", pro: "Pro", lifetime: "Lifetime" };
  const n = NOTICES[notice];

  return (
    <>
      {n && <div className={`pro-notice ${n[0]}`} role="status">{n[1]}</div>}
      <label className={`pro-agree ${nudge && !agree ? "nudge" : ""}`}>
        <input id="pro-agree" type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setNudge(false); }} />
        <span>J&apos;accepte les <Link href="/cgv" target="_blank">CGV</Link> et les <Link href="/cgu" target="_blank">CGU</Link>, et je demande l&apos;accès immédiat à mes analyses : je reconnais perdre mon droit de rétractation de 14 jours.</span>
      </label>
      {nudge && !agree && <p className="pro-agree-hint" role="alert">Coche la case ci-dessus pour continuer vers le paiement.</p>}
      <div className="plans">
        {PLANS.map((p, i) => {
          const url = checkout[p.id];
          return (
            <article key={p.id} className={`plan plan-${p.id} reveal-in`} style={{ animationDelay: `${i * 90}ms` }}>
              {p.badge && <span className="plan-badge">{p.id === "pro" ? "★★ " : "∞ "}{p.badge}</span>}
              <h3><span className="plan-ic"><Icon name={p.icon} /></span>{p.name}</h3>
              <div className="plan-price"><b>{p.price}</b><span>{p.per}</span></div>
              <div className="plan-sub">{p.sub}</div>
              <ul>{p.perks.map((k) => <li key={k}>{k}</li>)}</ul>
              {pro?.connected && current === p.id ? (
                <span className="plan-cta plan-current">Ta formule actuelle</span>
              ) : url ? (
                <a href={url} className={`plan-cta plan-buy ${agree ? "" : "plan-wait"}`} aria-disabled={!agree} onClick={buy(p.id)}>{p.cta}</a>
              ) : (
                <span className="plan-cta plan-soon">Bientôt disponible</span>
              )}
            </article>
          );
        })}
      </div>
      <p className="pro-legal">
        Starter et Pro sont sans engagement : tu arrêtes quand tu veux depuis ton compte Whop, et tu gardes l&apos;accès jusqu&apos;à la fin du mois payé. Une période commencée n&apos;est pas remboursée. Réservé aux 18 ans et plus. <Link href="/cgv">Conditions générales de vente</Link>
      </p>
      <p className="pro-free">Sans abonnement, les probabilités de victoire de tous les matchs restent gratuites. <Link href="/app/matchs">Voir les matchs du jour</Link></p>
      <div className="pro-account">
        {pro?.connected ? (
          <p>
            Connecté avec Whop{pro.name ? <> en tant que <b>{pro.name}</b></> : ""} · formule <b>{TIER_LABEL[current] || current}</b>
            {" · "}<a href="https://whop.com/@me/settings/orders/" target="_blank" rel="noopener">Gérer mon abonnement</a>
            {" · "}<a href="/api/pro/logout">Se déconnecter</a>
          </p>
        ) : loginReady ? (
          <p>
            Pas encore de compte ? <a href="/api/whop/signup?next=/app/matchs" className="pro-login" onClick={() => track("Clic créer un compte", { source: "page_pro" })}>Créer mon compte gratuit</a> (1 analyse offerte par jour)
            {" · "}Déjà inscrit ? <a href="/api/whop/login" className="pro-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "page_pro" })}>Me connecter</a>
          </p>
        ) : null}
        <p className="pro-secure">Tu peux arrêter ton abonnement à tout moment. Paiement sécurisé par Whop. Toutes nos analyses sont fournies à titre informatif.</p>
      </div>
    </>
  );
}
