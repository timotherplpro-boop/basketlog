// Libellés des facteurs, scénarios et niveaux de confiance dans la langue de la page.
import { fmt } from "./model";

export function factorText(f, a, L) {
  if (L.fr) return { label: f.label, detail: f.detail };
  const h = a.home, aw = a.away;
  if (L.es) {
    switch (f.key) {
      case "level": return { label: "Nivel de los equipos (diferencia de puntos ajustada)", detail: `${h.team.abbr} ${fmt(h.diff)} / ${aw.team.abbr} ${fmt(aw.diff)} por partido` };
      case "home": return { label: "Ventaja de jugar en casa", detail: f.el ? `${h.team.short} en casa (muy fuerte en Europa)` : `${h.team.short} en casa` };
      case "b2b": return { label: "Back-to-back", detail: [h.b2b && `${h.team.short} jugó ayer`, aw.b2b && `${aw.team.short} jugó ayer`].filter(Boolean).join(", ") };
      case "inj": return { label: "Bajas", detail: `${h.team.abbr}: ${h.inj.out.length} baja${h.inj.out.length === 1 ? "" : "s"}, ${h.inj.doubtful.length} en duda · ${aw.team.abbr}: ${aw.inj.out.length} baja${aw.inj.out.length === 1 ? "" : "s"}, ${aw.inj.doubtful.length} en duda` };
      default: return { label: f.label, detail: f.detail };
    }
  }
  switch (f.key) {
    case "level": return { label: "Team strength (adjusted point differential)", detail: `${h.team.abbr} ${fmt(h.diff)} / ${aw.team.abbr} ${fmt(aw.diff)} per game` };
    case "home": return { label: "Home-court advantage", detail: f.el ? `${h.team.short} at home (very strong in Europe)` : `${h.team.short} at home` };
    case "b2b": return { label: "Back-to-back", detail: [h.b2b && `${h.team.short} played yesterday`, aw.b2b && `${aw.team.short} played yesterday`].filter(Boolean).join(", ") };
    case "inj": return { label: "Injuries", detail: `${h.team.abbr}: ${h.inj.out.length} out, ${h.inj.doubtful.length} questionable · ${aw.team.abbr}: ${aw.inj.out.length} out, ${aw.inj.doubtful.length} questionable` };
    default: return { label: f.label, detail: f.detail };
  }
}

export function scenarioText(s, a, L) {
  if (L.fr) return s.label;
  if (L.es) {
    if (s.key === "home10") return `${a.home.team.short} gana por 10+`;
    if (s.key === "away10") return `${a.away.team.short} gana por 10+`;
    if (s.key === "close") return "Partido igualado (diferencia ≤ 5)";
    return s.label;
  }
  if (s.key === "home10") return `${a.home.team.short} win by 10+`;
  if (s.key === "away10") return `${a.away.team.short} win by 10+`;
  if (s.key === "close") return "Close game (margin ≤ 5)";
  return s.label;
}

export function confText(c, L) {
  if (L.fr) return c;
  if (L.es) return { "Élevée": "Alta", "Moyenne": "Media", "Faible": "Baja" }[c] || c;
  return { "Élevée": "High", "Moyenne": "Medium", "Faible": "Low" }[c] || c;
}
