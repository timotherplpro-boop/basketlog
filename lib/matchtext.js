// Libellés des facteurs, scénarios et niveaux de confiance dans la langue de la page.
import { fmt } from "./model";

// Absences d'une équipe : « 3 out, including Ja Morant (24.8 ppg), 1 questionable ».
function injuryDetail(s, es) {
  const o = s.inj.out, d = s.inj.doubtful;
  if (!o.length && !d.length) return `${s.team.abbr}: ${es ? "sin bajas" : "no injuries"}`;
  const num = (x) => (es ? x.toFixed(1).replace(".", ",") : x.toFixed(1));
  const stars = o.filter((i) => i.ppg != null && i.ppg >= 8).slice(0, 2).map((i) => `${i.player} (${num(i.ppg)} ${es ? "pts" : "ppg"})`);
  const parts = [];
  if (o.length) parts.push(es
    ? `${o.length} baja${o.length > 1 ? "s" : ""}${stars.length ? `, entre ellas ${stars.join(" y ")}` : ""}`
    : `${o.length} out${stars.length ? `, including ${stars.join(" and ")}` : ""}`);
  if (d.length) parts.push(es ? `${d.length} en duda` : `${d.length} questionable`);
  return `${s.team.abbr}: ${parts.join(", ")}`;
}

export function factorText(f, a, L) {
  if (L.fr) return { label: f.label, detail: f.detail };
  const h = a.home, aw = a.away;
  if (L.es) {
    switch (f.key) {
      case "level": return { label: "Nivel de los equipos (diferencia de puntos ajustada)", detail: `${h.team.abbr} ${fmt(h.diff).replace(".", ",")} / ${aw.team.abbr} ${fmt(aw.diff).replace(".", ",")} por partido` };
      case "home": return { label: "Ventaja de jugar en casa", detail: f.el ? `${h.team.short} en casa (muy fuerte en Europa)` : `${h.team.short} en casa` };
      case "b2b": return { label: "Back-to-back", detail: [h.b2b && `${f.el ? h.team.short : `los ${h.team.short}`} ${f.el ? "jugó" : "jugaron"} ayer`, aw.b2b && `${f.el ? aw.team.short : `los ${aw.team.short}`} ${f.el ? "jugó" : "jugaron"} ayer`].filter(Boolean).join(", ").replace(/^l/, "L") };
      case "inj": return { label: "Bajas", detail: `${injuryDetail(h, true)} · ${injuryDetail(aw, true)}` };
      default: return { label: f.label, detail: f.detail };
    }
  }
  switch (f.key) {
    case "level": return { label: "Team strength (adjusted point differential)", detail: `${h.team.abbr} ${fmt(h.diff)} / ${aw.team.abbr} ${fmt(aw.diff)} per game` };
    case "home": return { label: "Home-court advantage", detail: f.el ? `${h.team.short} at home (very strong in Europe)` : `${h.team.short} at home` };
    case "b2b": return { label: "Back-to-back", detail: [h.b2b && `${h.team.short} played yesterday`, aw.b2b && `${aw.team.short} played yesterday`].filter(Boolean).join(", ") };
    case "inj": return { label: "Injuries", detail: `${injuryDetail(h, false)} · ${injuryDetail(aw, false)}` };
    default: return { label: f.label, detail: f.detail };
  }
}

export function scenarioText(s, a, L) {
  if (L.fr) return s.label;
  if (L.es) {
    const los = a.league === "EL" ? "" : "los ";
    if (s.key === "home10") return `Victoria de ${los}${a.home.team.short} por 10+`;
    if (s.key === "away10") return `Victoria de ${los}${a.away.team.short} por 10+`;
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
