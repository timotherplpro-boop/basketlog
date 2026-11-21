// Mois d'une saison NBA (octobre à juin) pour les bilans mensuels (/app/bilan/2026-11). Sans dépendance (testable).
export const monthOk = (m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(m || ""));
// Saison ESPN = année de fin : octobre 2026 → 2027, mars 2027 → 2027.
export const seasonOfMonth = (m) => { const [y, mo] = m.split("-").map(Number); return mo >= 8 ? y + 1 : y; };

// Mois déjà commencés de la saison, du plus ancien au plus récent, jusqu'au mois en cours.
export function monthsOf(season, today) {
  const cur = `${today.slice(0, 4)}-${today.slice(4, 6)}`;
  const out = [];
  const s = season;
  for (const [y, mo] of [[s - 1, 10], [s - 1, 11], [s - 1, 12], [s, 1], [s, 2], [s, 3], [s, 4], [s, 5], [s, 6]]) {
    const m = `${y}-${String(mo).padStart(2, "0")}`;
    if (m <= cur) out.push(m);
  }
  return out;
}
