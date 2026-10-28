"use client";
import { useEffect } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";

const PLANS = [
  {
    id: "gratuit", name: "Gratuit", price: "0 €", per: "", sub: "Pour découvrir",
    perks: ["3 analyses complètes par jour", "Probabilités de tous les matchs", "Classements NBA et EuroLeague", "Bilan public du modèle"],
  },
  {
    id: "mensuel", name: "Mensuel", price: "22,90 €", per: "/mois", sub: "Sans engagement",
    perks: ["10 analyses complètes par jour", "Stats comparées et joueurs à suivre", "Forme récente et confrontations", "Deuxième avis ESPN", "NBA et EuroLeague"],
  },
  {
    id: "annuel", name: "Annuel", price: "118,99 €", per: "/an", sub: "Soit 9,92 € par mois", badge: "-57 %",
    perks: ["Analyses illimitées, sans compteur", "Tout le contenu du Mensuel", "NBA et EuroLeague toute la saison", "Le meilleur prix par mois"],
  },
];

const NOTICES = {
  ok: ["good", "Ton abonnement est actif. Bonnes analyses !"],
  abonnement: ["warn", "Connexion réussie, mais aucun abonnement Basketlog Pro actif n'a été trouvé sur ce compte Whop. Utilise le même compte que pour ton paiement."],
  connexion: ["warn", "La connexion avec Whop n'a pas abouti. Réessaie dans un instant."],
  config: ["warn", "Le paiement n'est pas encore activé sur Basketlog. Reviens très bientôt."],
};

export default function ProPlans({ checkout, loginReady, notice }) {
  const pro = useProStatus();
  useEffect(() => {
    if (!pro) return;
    track("Page Pro vue", { formule: pro.tier });
    if (notice === "ok") track("Abonnement activé", { formule: pro.tier });
    else if (notice) track("Connexion Whop", { etape: "erreur", raison: notice });
  }, [pro, notice]);
  const current = pro?.tier || "gratuit";
  const n = NOTICES[notice];

  return (
    <>
      {n && <div className={`pro-notice ${n[0]}`} role="status">{n[1]}</div>}
      <div className="plans">
        {PLANS.map((p, i) => {
          const isCurrent = !!pro?.connected && current === p.id;
          const url = checkout[p.id];
          return (
            <article key={p.id} className={`plan ${p.id === "annuel" ? "best" : ""} reveal-in`} style={{ animationDelay: `${i * 90}ms` }}>
              {p.badge && <span className="plan-badge">{p.badge}</span>}
              <h3>{p.name}</h3>
              <div className="plan-price"><b>{p.price}</b>{p.per && <span>{p.per}</span>}</div>
              <div className="plan-sub">{p.sub}</div>
              <ul>{p.perks.map((k) => <li key={k}>{k}</li>)}</ul>
              {p.id === "gratuit" ? (
                <Link href="/app/matchs" className="btn-white plan-cta">{current === "gratuit" ? "Formule actuelle" : "Voir les matchs"}</Link>
              ) : isCurrent ? (
                <span className="plan-cta plan-current">Ta formule actuelle</span>
              ) : url ? (
                <a href={url} className="btn-solid plan-cta" onClick={() => track("Clic abonnement", { formule: p.id })}>
                  Choisir {p.name}
                </a>
              ) : (
                <span className="plan-cta plan-soon">Bientôt disponible</span>
              )}
            </article>
          );
        })}
      </div>
      <div className="pro-account">
        {pro?.connected ? (
          <p>
            Connecté avec Whop{pro.name ? <> en tant que <b>{pro.name}</b></> : ""} · formule <b>{current}</b>
            {" · "}<a href="https://whop.com/@me/settings/orders/" target="_blank" rel="noopener">Gérer mon abonnement</a>
            {" · "}<a href="/api/pro/logout">Se déconnecter</a>
          </p>
        ) : loginReady ? (
          <p>Déjà abonné ? <a href="/api/whop/login" className="pro-login" onClick={() => track("Connexion Whop", { etape: "clic" })}>J&apos;ai déjà un abonnement, me connecter avec Whop</a></p>
        ) : null}
        <p className="pro-secure">Paiement sécurisé par Whop · Annulable à tout moment</p>
      </div>
    </>
  );
}
