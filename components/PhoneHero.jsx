"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useL } from "./LangProvider";
import { fmtDate, fmtTime } from "../lib/i18n";

const when = (iso, L) => [fmtDate(L, iso, { day: "2-digit", month: "2-digit" }), fmtTime(L, iso)];

// Écran "Analyse de match" animé : la 2e équipe s'écrit toute seule, puis le bouton s'active.
export default function PhoneHero({ team, rivals, rows }) {
  const L = useL();
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
    <Link href={L.href("/app")} className="phone" aria-label={L.t("Ouvrir l'analyse de match", "Open the game analysis")}>
      <div className="screen">
        <div className="notch" />
        <div className="app-top" style={{ paddingTop: 54 }}>
          <span className="logo"><span className="ball" /> Basketlog</span>
          <span className="app-burger" aria-hidden><i /><i /><i /></span>
        </div>
        <div className="screen-body">
          <div className="sc-title">{L.t("Analyse de match", "Game analysis")}</div>
          <div className="sc-sub">{L.t("Entre les équipes que tu veux analyser", "Between the teams you want to analyze")}</div>
          <div className="sc-note">{L.t("Notre modèle croise niveau, forme, absences et fatigue pour chaque pronostic.", "Our model combines strength, form, injuries and fatigue for every prediction.")}</div>
          <div className="sc-card">
            <div className="sc-label">{L.t("MATCH À ANALYSER", "GAME TO ANALYZE")}</div>
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
              {typed || L.t("Cherche une équipe (ex : Celtics, Knicks…)", "Search a team (e.g. Celtics, Knicks…)")}
              {!done && <span className="caret" />}
            </div>
            <div className={`sc-btn ${press ? "go" : ""}`}>{L.t("Analyser le match", "Analyze the game")}</div>
          </div>
          <div className="sc-list">
            <h5>{L.t("Prochains matchs", "Upcoming games")}</h5>
            {rows.slice(0, 4).map((g) => {
              const [d, h] = when(g.date, L);
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
