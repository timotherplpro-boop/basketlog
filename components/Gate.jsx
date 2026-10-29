"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";

function todayKey() {
  return "hs_views_" + new Date().toISOString().slice(0, 10);
}

// Analyse complète : comme Visifoot, il faut un compte gratuit pour la débloquer.
// Compte gratuit = 1 analyse par jour, Starter = 5, Pro et Lifetime = illimitées.
// Sans compte, seules les probabilités et les chiffres clés en haut de la fiche sont visibles.
export default function Gate({ matchId, league = "NBA", children }) {
  const pro = useProStatus();
  const [state, setState] = useState({ locked: false, used: 0, ready: false });
  const [here, setHere] = useState("");
  useEffect(() => { setHere(encodeURIComponent(location.pathname + location.search)); }, []);

  useEffect(() => {
    if (!pro) return;
    const limit = pro.perDay; // null = illimité
    if (limit == null) {
      setState({ locked: false, used: 0, ready: true, unlimited: true });
      track("Analyse consultée", { match_id: String(matchId), ligue: league, formule: pro.tier });
      return;
    }
    let views = [];
    try { views = JSON.parse(localStorage.getItem(todayKey()) || "[]"); } catch {}
    if (!views.includes(matchId)) {
      if (views.length >= limit) {
        setState({ locked: true, used: views.length, limit, ready: true });
        track(limit === 0 ? "Analyse bloquée" : "Limite d'analyses atteinte", { formule: pro.tier, limite: limit, ligue: league });
        return;
      }
      views.push(matchId);
      try { localStorage.setItem(todayKey(), JSON.stringify(views)); } catch {}
    }
    setState({ locked: false, used: views.length, limit, ready: true });
    track("Analyse consultée", { match_id: String(matchId), ligue: league, formule: pro.tier });
  }, [matchId, pro, league]);

  const visitor = !pro || !pro.connected; // pas encore de compte
  const tier = pro?.tier;
  const label = tier === "starter" ? "Starter" : "gratuite";

  return (
    <>
      {state.ready && !state.unlimited && !state.locked && state.limit > 0 && (
        <div className="counter">
          Analyse {label} <b>{state.used}/{state.limit}</b> aujourd&apos;hui · <Link href="/pro" onClick={() => track("Clic Passer Pro", { source: "compteur" })}>{tier === "starter" ? "Passer Pro" : "Débloquer plus d'analyses"}</Link>
        </div>
      )}
      <div className={`gated ${state.locked ? "locked" : ""}`}>
        <div className="gate-content">{children}</div>
        {state.locked && (
          <div className="gate-overlay">
            <div className="gate-box">
              {visitor ? (
                <>
                  <h3>Crée ton compte gratuit pour débloquer l&apos;analyse complète</h3>
                  <p>Score projeté détaillé, facteurs, scénarios, stats comparées, joueurs à suivre et forme récente. Avec un compte gratuit, tu as 1 analyse complète offerte chaque jour.</p>
                  <a href={`/api/whop/signup?next=${here}`} className="btn-solid" onClick={() => track("Clic créer un compte", { source: "analyse_bloquee", ligue: league })}>Créer mon compte gratuit</a>
                  <a href={`/api/whop/login?next=${here}`} className="gate-login" onClick={() => track("Connexion Whop", { etape: "clic", source: "analyse_bloquee" })}>Déjà un compte ? Se connecter</a>
                </>
              ) : tier === "starter" ? (
                <>
                  <h3>Tes 5 analyses Starter du jour sont utilisées</h3>
                  <p>Passe à Pro pour des analyses illimitées, ou reviens demain.</p>
                  <Link href="/pro" className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite" })}>Passer à Pro</Link>
                </>
              ) : (
                <>
                  <h3>Ton analyse gratuite du jour est utilisée</h3>
                  <p>Starter t&apos;offre 5 analyses complètes par jour, Pro les rend illimitées. Sinon, reviens demain pour ta prochaine analyse offerte.</p>
                  <Link href="/pro" className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite_compte" })}>Voir les formules dès 10 €/mois</Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
