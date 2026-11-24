// Monnaie du visiteur, côté serveur : euros dans la zone euro, dollars américains partout ailleurs (lib/currency-shared.js).
// 23/11/2026 : euros pour tout le monde ; 24/11/2026 : retour aux dollars hors zone euro (décision de Tim).
// Le pays vient de Vercel (en-tête x-vercel-ip-country).
import { headers } from "next/headers";
import { currencyFor } from "./currency-shared";

export async function getCurrency(L) {
  const h = await headers();
  return currencyFor({ country: h.get("x-vercel-ip-country"), ua: h.get("user-agent"), en: !!L?.en });
}
