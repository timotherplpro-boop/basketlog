// Libellés des facteurs, scénarios et niveaux de confiance dans la langue de la page.
import { fmt } from "./model";

export function factorText(f, a, L) {
  if (!L.en) return { label: f.label, detail: f.detail };
  const h = a.home, aw = a.away;
  switch (f.key) {
    case "level": return { label: "Team strength (adjusted point differential)", detail: `${h.team.abbr} ${fmt(h.diff)} / ${aw.team.abbr} ${fmt(aw.diff)} per game` };
    case "home": return { label: "Home-court advantage", detail: f.el ? `${h.team.short} at home (very strong in Europe)` : `${h.team.short} at home` };
    case "b2b": return { label: "Back-to-back", detail: [h.b2b && `${h.team.short} played yesterday`, aw.b2b && `${aw.team.short} played yesterday`].filter(Boolean).join(", ") };
    case "inj": return { label: "Injuries", detail: `${h.team.abbr}: ${h.inj.out.length} out, ${h.inj.doubtful.length} questionable · ${aw.team.abbr}: ${aw.inj.out.length} out, ${aw.inj.doubtful.length} questionable` };
    default: return { label: f.label, detail: f.detail };
  }
}

export function scenarioText(s, a, L) {
  if (!L.en) return s.label;
  if (s.key === "home10") return `${a.home.team.short} win by 10+`;
  if (s.key === "away10") return `${a.away.team.short} win by 10+`;
  if (s.key === "close") return "Close game (margin ≤ 5)";
  return s.label;
}

export function confText(c, L) {
  if (!L.en) return c;
  return { "Élevée": "High", "Moyenne": "Medium", "Faible": "Low" }[c] || c;
}
