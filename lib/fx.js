// Taux de change euro -> dollar du jour (Banque centrale européenne, via Frankfurter, gratuit et sans clé), gardé 6 h en
// cache Vercel : un appel au plus toutes les 6 h. 24/11/2026, demande de Tim : le prix reste 9,99 € ; hors zone euro, le site
// affiche ce prix converti en dollars au taux du jour (jamais « 9,99 $ »). Le paiement reste en euros, la banque convertit.
// En cas de panne ou de valeur aberrante : null, et le site affiche simplement les euros.
export function cleanRate(v) {
  const r = Number(v);
  return Number.isFinite(r) && r > 0.5 && r < 2.5 ? r : null;
}

export async function eurUsd(fetchImpl = fetch) {
  try {
    const res = await fetchImpl("https://api.frankfurter.dev/v1/latest?symbols=USD", {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(1500),
    });
    if (!res.ok) return null;
    const d = await res.json();
    return cleanRate(d?.rates?.USD);
  } catch {
    return null;
  }
}
