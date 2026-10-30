"use client";
// Analyse « en cours » façon Visifoot : anneau de progression, étapes et barre, pendant que le serveur
// vérifie la limite du jour et enregistre l'analyse. Les étapes décrivent ce que le modèle prend vraiment en compte.
import { useCallback, useEffect, useRef, useState } from "react";
import { useL } from "./LangProvider";

const DURATION = 5500;

export function useAnalysisRun(duration = DURATION) {
  const [p, setP] = useState(null); // null = pas lancée
  const timer = useRef(0);
  useEffect(() => () => clearInterval(timer.current), []);
  const start = useCallback((task, onDone) => {
    const t0 = Date.now();
    let settled = false, result = null;
    Promise.resolve().then(task).then((r) => { result = r; }, () => { result = { error: true }; }).finally(() => { settled = true; });
    // Minuterie plutôt que requestAnimationFrame : l'analyse avance aussi si l'onglet passe en arrière-plan.
    const tick = () => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      let v = (1 - Math.pow(1 - k, 1.6)) * 100;
      if (!settled) v = Math.min(v, 96);
      if (k >= 1 && settled) {
        clearInterval(timer.current);
        setP(100);
        setTimeout(() => onDone(result), 450);
        return;
      }
      setP(v);
    };
    clearInterval(timer.current);
    setP(0);
    timer.current = setInterval(tick, 50);
  }, [duration]);
  return { p, running: p != null, start };
}

export const pctLabel = (p, L) => `${Math.round(p)}${L.en ? "%" : " %"}`;

export default function AnalysisProgress({ p, league = "NBA" }) {
  const L = useL();
  const steps = league === "EL"
    ? [
      L.t("Récupération des derniers résultats", "Fetching the latest results", "Recopilando los últimos resultados"),
      L.t("Comparaison du niveau des deux équipes", "Comparing both teams' strength", "Comparando el nivel de los dos equipos"),
      L.t("Prise en compte de l'avantage du terrain", "Factoring in home-court advantage", "Teniendo en cuenta la ventaja de jugar en casa"),
      L.t("Simulation des scénarios du match", "Simulating game scenarios", "Simulando los escenarios del partido"),
      L.t("Rédaction de l'analyse", "Writing the analysis", "Redactando el análisis"),
    ]
    : [
      L.t("Récupération des derniers résultats", "Fetching the latest results", "Recopilando los últimos resultados"),
      L.t("Comparaison du niveau des deux équipes", "Comparing both teams' strength", "Comparando el nivel de los dos equipos"),
      L.t("Prise en compte des absences", "Factoring in injuries", "Teniendo en cuenta las bajas"),
      L.t("Fatigue et avantage du terrain", "Fatigue and home-court advantage", "Cansancio y ventaja de jugar en casa"),
      L.t("Simulation des scénarios du match", "Simulating game scenarios", "Simulando los escenarios del partido"),
      L.t("Rédaction de l'analyse", "Writing the analysis", "Redactando el análisis"),
    ];
  const v = Math.max(0, Math.min(100, p || 0));
  const done = v >= 100;
  const step = steps[Math.min(steps.length - 1, Math.floor((v / 100) * steps.length))];
  const R = 52, C = 2 * Math.PI * R;
  return (
    <div className="an-run" role="status" aria-live="polite">
      <div className="an-ring">
        <svg viewBox="0 0 120 120" aria-hidden>
          <circle className="bg" cx="60" cy="60" r={R} />
          <circle className="fg" cx="60" cy="60" r={R} strokeDasharray={C} strokeDashoffset={C * (1 - v / 100)} />
        </svg>
        <b>{pctLabel(v, L)}</b>
      </div>
      <div className="an-title">{done ? L.t("Analyse prête", "Analysis ready", "Análisis listo") : L.t("Analyse en cours…", "Analysis in progress…", "Análisis en curso…")}</div>
      <div className="an-step"><span className="an-dot" aria-hidden />{done ? L.t("Ouverture de l'analyse", "Opening the analysis", "Abriendo el análisis") : step}…</div>
      <div className="an-bar"><i style={{ width: `${v}%` }} /></div>
    </div>
  );
}
