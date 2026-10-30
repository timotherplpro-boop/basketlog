"use client";
// Fenêtre « Tu veux voir l'analyse complète ? », comme Visifoot : elle s'ouvre dès qu'une analyse s'affiche
// sans l'analyse complète (visiteur sans compte, ou limite du jour atteinte). Chiffres réels uniquement :
// réussite du modèle tirée du bilan, membres Whop (à partir de +100) ou matchs analysés, vrai compte à rebours.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useL } from "./LangProvider";

const Svg = ({ children, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
const Trend = () => <Svg><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></Svg>;
const Users = () => <Svg size={17}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.6 14.6A6.5 6.5 0 0 1 21.5 20" /></Svg>;
const Bars = () => <Svg size={17}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></Svg>;
const Lock = () => <Svg size={12}><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>;
const Clock = () => <Svg size={22}><circle cx="12" cy="12" r="9" /><path d="M12 7.5V12l3 2" /></Svg>;
const Cross = () => <Svg size={20}><path d="M6 6l12 12M18 6L6 18" /></Svg>;

// « 100j 2h » / « 5h 12min » / « 42 min », comme Visifoot.
function left(ms, L) {
  const m = Math.max(1, Math.floor(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mn = m % 60;
  if (d > 0) return L.t(`${d}j ${h}h`, `${d}d ${h}h`, `${d}d ${h}h`);
  if (h > 0) return L.t(`${h}h ${mn}min`, `${h}h ${mn}m`, `${h}h ${mn}min`);
  return `${mn} min`;
}

export default function UnlockModal({ state, tier, href, proof, match, league = "NBA", onClose, onCta }) {
  const L = useL();
  const boxRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const prevFocus = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    const t = setTimeout(() => boxRef.current?.focus({ preventScroll: true }), 60); // focus dans la fenêtre, sans halo sur le bouton
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  if (!mounted) return null;

  const num = (n) => n.toLocaleString(L.locale).replace(/ /g, " ");
  const h = proof?.hits;
  const badge = !h ? null : h.span === "day"
    ? h.ok === h.n
      ? L.t(`L'IA a correctement anticipé les ${h.n} matchs d'hier`, `The AI called all ${h.n} of yesterday's games`, `La IA acertó los ${h.n} partidos de ayer`)
      : L.t(`L'IA a correctement anticipé ${h.ok} matchs sur ${h.n} hier`, `The AI correctly called ${h.ok} of ${h.n} games yesterday`, `La IA acertó ${h.ok} de ${h.n} partidos ayer`)
    : L.t(`L'IA a correctement anticipé ${h.ok} matchs sur ${h.n} ces 7 derniers jours`, `The AI correctly called ${h.ok} of ${h.n} games in the last 7 days`, `La IA acertó ${h.ok} de ${h.n} partidos en los últimos 7 días`);
  const crowd = proof?.members
    ? { icon: <Users />, txt: L.t(`+${num(proof.members)} membres inscrits`, `+${num(proof.members)} registered members`, `+${num(proof.members)} miembros registrados`) }
    : proof?.analysed
      ? { icon: <Bars />, txt: L.t(`+${num(proof.analysed)} matchs NBA analysés par le modèle`, `+${num(proof.analysed)} NBA games analyzed by the model`, `+${num(proof.analysed)} partidos NBA analizados por el modelo`) }
      : null;

  // Ce que contient vraiment l'analyse complète de Basketlog.
  const items = [
    ["🎯", L.t("Score projeté", "Projected score", "Marcador proyectado")],
    ["📊", L.t("Probabilités détaillées", "Detailed probabilities", "Probabilidades detalladas")],
    ["🔮", L.t("Tous les scénarios du match", "Every game scenario", "Todos los escenarios del partido")],
    ["📝", L.t("L'argumentation complète du modèle", "The model's full reasoning", "La argumentación completa del modelo")],
    ["💡", league === "NBA"
      ? L.t("Stats comparées, joueurs et infirmerie", "Stat comparison, players and injury report", "Estadísticas comparadas, jugadores y parte médico")
      : L.t("Facteurs clés et stats comparées", "Key factors and stat comparison", "Factores clave y estadísticas comparadas")],
  ];

  // Compte à rebours jusqu'au coup d'envoi (pas pour un match hypothétique ou déjà terminé).
  const start = match?.date ? new Date(match.date).getTime() : null;
  const live = match?.state === "in" || (match?.state === "pre" && start && start <= now);
  const clock = !match || match.hypothetical || !start || match.state === "post" ? null : live
    ? { lead: `${match.home} vs ${match.away}`, big: L.t("Match en cours", "Game in progress", "Partido en curso") }
    : { lead: L.t(`${match.home} vs ${match.away} commence dans`, `${match.home} vs ${match.away} starts in`, `${match.home} vs ${match.away} empieza en`), big: left(start - now, L) };

  const foot = state === "visitor"
    ? L.t("Accès instantané après inscription", "Instant access after sign-up", "Acceso inmediato tras registrarte")
    : tier === "starter"
      ? L.t("Accès instantané avec Pro, analyses illimitées", "Instant access with Pro, unlimited analyses", "Acceso inmediato con Pro, análisis ilimitados")
      : L.t("Accès instantané avec Starter ou Pro", "Instant access with Starter or Pro", "Acceso inmediato con Starter o Pro");

  return createPortal(
    <div className="modal ulk" role="dialog" aria-modal="true" aria-labelledby="ulk-title" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box ulk-box" ref={boxRef} tabIndex={-1}>
        <button type="button" className="ulk-x" onClick={onClose} aria-label={L.t("Fermer", "Close", "Cerrar")}><Cross /></button>
        {badge && <div className="ulk-badge"><Trend /><span>{badge} 🔥</span></div>}
        <h3 id="ulk-title">{L.t("Tu veux voir l'analyse complète ?", "Want to see the full analysis?", "¿Quieres ver el análisis completo?")}</h3>
        {crowd && <p className="ulk-sub">{crowd.icon}{crowd.txt}</p>}

        <div className="ulk-list">
          <div className="ulk-lbl">{L.t("Ce que tu vas débloquer", "What you'll unlock", "Lo que vas a desbloquear")}</div>
          {items.map(([e, t]) => (
            <div className="ulk-item" key={t}><span className="ulk-lock"><Lock /></span><span><span aria-hidden>{e}</span> {t}</span></div>
          ))}
        </div>

        {clock && (
          <div className="ulk-clock">
            <span className="ulk-ci"><Clock /></span>
            <div><b>{clock.lead}</b><strong>{clock.big}</strong></div>
          </div>
        )}

        <a href={href} className="btn-solid ulk-cta" onClick={onCta}>{L.t("Débloquer l'analyse complète", "Unlock the full analysis", "Desbloquear el análisis completo")}</a>
        <small className="ulk-foot">{foot}</small>
      </div>
    </div>,
    document.body
  );
}
