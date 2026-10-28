"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";

function todayKey() {
  return "hs_views_" + new Date().toISOString().slice(0, 10);
}

// Analyses complètes par jour : 3 en gratuit, 10 en Mensuel, illimitées en Annuel.
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
        track("Limite d'analyses atteinte", { formule: pro.tier, limite: limit, ligue: league });
        return;
      }
      views.push(matchId);
      try { localStorage.setItem(todayKey(), JSON.stringify(views)); } catch {}
    }
    setState({ locked: false, used: views.length, limit, ready: true });
    track("Analyse consultée", { match_id: String(matchId), ligue: league, formule: pro.tier });
  }, [matchId, pro, league]);

  const isPaid = pro && pro.tier !== "gratuit";
  return (
    <>
      {state.ready && !state.unlimited && !state.locked && (
        <div className="counter">
          {isPaid ? "Analyses Pro" : "Analyse gratuite"} <b>{state.used}/{state.limit}</b> aujourd&apos;hui
          {!isPaid && <> · <Link href="/pro" onClick={() => track("Clic Passer Pro", { source: "compteur" })}>Passer Pro</Link></>}
        </div>
      )}
      <div className={`gated ${state.locked ? "locked" : ""}`}>
        <div className="gate-content">{children}</div>
        {state.locked && (
          <div className="gate-overlay">
            <div className="gate-box">
              <h3>Tes {state.limit} analyses du jour sont utilisées</h3>
              {isPaid ? (
                <p>La formule Mensuel inclut 10 analyses complètes par jour. Passe à l&apos;Annuel pour des analyses illimitées, ou reviens demain.</p>
              ) : (
                <p>Reviens demain pour 3 nouvelles analyses complètes, ou passe Pro pour en débloquer plus. Les probabilités de tous les matchs restent gratuites.</p>
              )}
              <Link href="/pro" className="btn-solid" onClick={() => track("Clic Passer Pro", { source: "limite" })}>
                {isPaid ? "Passer à l'Annuel" : "Voir les formules Pro"}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
