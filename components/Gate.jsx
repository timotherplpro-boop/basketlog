"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const FREE_PER_DAY = 3;

function todayKey() {
  return "hs_views_" + new Date().toISOString().slice(0, 10);
}

// Freemium : 3 analyses complètes gratuites par jour, ensuite le détail est flouté.
export default function Gate({ matchId, children }) {
  const [state, setState] = useState({ locked: false, used: 0, ready: false });

  useEffect(() => {
    let views = [];
    let pro = false;
    try {
      pro = localStorage.getItem("hs_pro") === "1";
      views = JSON.parse(localStorage.getItem(todayKey()) || "[]");
    } catch {}
    if (pro) return setState({ locked: false, used: 0, ready: true, pro: true });
    if (!views.includes(matchId)) {
      if (views.length >= FREE_PER_DAY) return setState({ locked: true, used: views.length, ready: true });
      views.push(matchId);
      try { localStorage.setItem(todayKey(), JSON.stringify(views)); } catch {}
    }
    setState({ locked: false, used: views.length, ready: true });
  }, [matchId]);

  return (
    <>
      {state.ready && !state.pro && !state.locked && (
        <div className="counter">
          Analyse gratuite <b>{state.used}/{FREE_PER_DAY}</b> aujourd&apos;hui
        </div>
      )}
      <div className={`gated ${state.locked ? "locked" : ""}`}>
        <div className="gate-content">{children}</div>
        {state.locked && (
          <div className="gate-overlay">
            <div className="gate-box">
              <h3>Tes 3 analyses gratuites du jour sont utilisées</h3>
              <p>Passe à HoopSight Pro pour débloquer toutes les analyses, chaque soir, sans limite.</p>
              <Link href="/#tarifs" className="btn btn-primary">Débloquer Pro</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
