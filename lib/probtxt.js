// Probabilité lisible : « 82 % », « < 1 % », « > 99 % », « – » pour zéro.
export function probTxt(p, L) {
  const sp = L?.en ? "" : " ";
  if (p == null || isNaN(p)) return "–";
  if (p <= 0) return "–";
  if (p < 0.005) return `< 1${sp}%`;
  if (p > 0.995) return `> 99${sp}%`;
  if (p < 0.095) return `${(p * 100).toFixed(1).replace(".", L?.en ? "." : ",")}${sp}%`;
  return `${Math.round(p * 100)}${sp}%`;
}
