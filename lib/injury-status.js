// Statut d'un rapport de blessure ESPN (Out, Doubtful, Questionable, Day-To-Day, Probable) traduit.
export function injuryStatus(s, L) {
  const x = String(s || "").toLowerCase();
  if (/out/.test(x)) return { k: "out", t: L.t("Absent", "Out", "Baja", "Fora") };
  if (/doubt/.test(x)) return { k: "doubt", t: L.t("Très incertain", "Doubtful", "Duda seria", "Dúvida séria") };
  if (/question|day-to-day|game time/.test(x)) return { k: "q", t: L.t("Incertain", "Questionable", "En duda", "Em dúvida") };
  if (/probable/.test(x)) return { k: "prob", t: L.t("Probable", "Probable", "Probable", "Provável") };
  return { k: "other", t: s || "–" };
}
