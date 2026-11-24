// Calibration des pronostics : quand le modèle donne X % au favori, celui-ci gagne-t-il vraiment X % du temps ?
// list : pronostics joués { pHome, ok } (ok = le favori a gagné). Tranches de 10 points sur la probabilité du favori.
export const CAL_BINS = [[0.5, 0.6], [0.6, 0.7], [0.7, 0.8], [0.8, 0.9], [0.9, 1.0001]];

export function calibration(list) {
  return CAL_BINS.map(([lo, hi]) => {
    const g = (list || []).filter((p) => p && p.pHome != null).map((p) => ({ f: Math.max(p.pHome, 1 - p.pHome), ok: !!p.ok })).filter((x) => x.f >= lo && x.f < hi);
    const n = g.length;
    return { lo, hi: Math.min(hi, 1), n, ok: g.filter((x) => x.ok).length, announced: n ? g.reduce((s, x) => s + x.f, 0) / n : null, actual: n ? g.filter((x) => x.ok).length / n : null };
  });
}
