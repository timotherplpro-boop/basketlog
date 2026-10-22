"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

function when(iso) {
  try {
    const d = new Date(iso);
    const day = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", day: "2-digit", month: "2-digit" }).format(d);
    const hm = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d);
    return [day, hm];
  } catch {
    return ["", ""];
  }
}

// Écran "Analyse de match" animé : la 2e équipe s'écrit toute seule, puis le bouton s'active.
export default function PhoneHero({ team, rivals, rows }) {
  const [ri, setRi] = useState(0);
  const [typed, setTyped] = useState("");
  const [done, setDone] = useState(false);
  const [press, setPress] = useState(false);
  const rival = rivals[ri % Math.max(1, rivals.length)];

  useEffect(() => {
    if (!rival) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(rival.name); setDone(true); return;
    }
    let i = 0, t;
    setTyped(""); setDone(false); setPress(false);
    const type = () => {
      i++;
      setTyped(rival.name.slice(0, i));
      if (i < rival.name.length) t = setTimeout(type, 70 + Math.random() * 60);
      else {
        setDone(true);
        t = setTimeout(() => { setPress(true); t = setTimeout(() => setRi((r) => r + 1), 2600); }, 700);
      }
    };
    t = setTimeout(type, ri === 0 ? 2600 : 900);
    return () => clearTimeout(t);
  }, [ri, rival]);

  return (
    <Link href="/app" className="phone" aria-label="Ouvrir l'analyse de match">
      <div className="screen">
        <div className="notch" />
        <div className="app-top" style={{ paddingTop: 54 }}>
          <span className="logo"><span className="ball" /> Basketlog</span>
          <span className="app-burger" aria-hidden><i /><i /><i /></span>
        </div>
        <div className="screen-body">
          <div className="sc-title">Analyse de match</div>
          <div className="sc-sub">Entre les équipes que tu veux analyser</div>
          <div className="sc-note">Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.</div>
          <div className="sc-card">
            <div className="sc-label">MATCH À ANALYSER</div>
            <div className="sc-logo">
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={team.logo} alt="" />
                {done && rival && (<>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.5)" }}>vs</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img key={rival.id} src={rival.logo} alt="" />
                </>)}
              </div>
            </div>
            <div className="sc-input">{team.name}</div>
            <div className="sc-vs">vs</div>
            <div className={`sc-input ${typed ? "" : "empty"}`}>
              {done && rival && (/* eslint-disable-next-line @next/next/no-img-element */ <img src={rival.logo} alt="" />)}
              {typed || "Cherche une équipe (ex : Celtics, Knicks…)"}
              {!done && <span className="caret" />}
            </div>
            <div className={`sc-btn ${press ? "go" : ""}`}>Analyser le match</div>
          </div>
          <div className="sc-list">
            <h5>Prochains matchs</h5>
            {rows.slice(0, 4).map((g) => {
              const [d, h] = when(g.date);
              return (
                <div className="sc-row" key={g.id}>
                  <div className="when">{d}<br />{h}</div>
                  <div className="m">
                    <b className={g.home.id === team.id ? "me" : ""}>{g.home.name}</b>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.home.logo} alt="" />
                    <span>vs</span>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.away.logo} alt="" />
                    <b className={g.away.id === team.id ? "me" : ""}>{g.away.name}</b>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Link>
  );
}
