"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";

function todayKey() {
  return "hs_views_" + new Date().toISOString().slice(0, 10);
}

// Analyse complète : réservée aux abonnés. Starter = 1 par jour, Pro et Lifetime = illimitées.
// Sans abonnement, seules les probabilités et les chiffres clés en haut de la fiche sont visibles.
export default function Gate({ matchId, league = "NBA", children }) {
  const pro = useProStatus();
  const [state, setState] = useState({ locked: false, used: 0, ready: false });

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

  const free = !pro || pro.tier === "gratuit";
  return (
    <>
      {state.ready && !state.unlimited && !state.locked && state.limit > 0 && (
        <div className="counter">
          Analyse Starter <b>{state.used}/{state.limit}</b> aujourd&apos;hui · <Link href="/pro" onClick={() => track("Clic Passer Pro", { source: "compteur" })}>Passer Pro</Link>
        </div>
      )}
      <div className={`gated ${state.locked ? "locked" : ""}`}>
        <div className="gate-content">{children}</div>
        {state.locked && (
          <div className="gate-overlay">
            <div className="gate-box">
              {free ? (
                <>
                  <h3>Débloque l&apos;analyse complète</h3>
                  <p>Score projeté détaillé, facteurs, scénarios, stats comparées, joueurs à suivre et forme récente : tout est réservé aux abonnés. Les probabilités de victoire restent gratuites.</p>
                </>
              ) : (
                <>
                  <h3>Ton analyse Starter du jour est utilisée</h3>
                  <p>La formule Starter inclut 1 analyse complète par jour. Passe à Pro pour des analyses illimitées, ou reviens demain.</p>
                </>
              )}
              <Link href="/pro" className="btn-solid" onClick={() => track("Clic Passer Pro", { source: free ? "analyse_bloquee" : "limite" })}>
                {free ? "Débloquer dès 10 €/mois" : "Passer à Pro"}
              </Link>
              {free && <a href="/api/whop/login" className="gate-login">Déjà abonné ? Se connecter</a>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
