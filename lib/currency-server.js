import { headers } from "next/headers";
import { currencyFor } from "./currency-shared";
import { eurUsd } from "./fx";

// Monnaie d'affichage du visiteur : { cur: "EUR" } dans la zone euro ; ailleurs { cur: "USD", rate } (dollars pour 1 €),
// soit les prix en euros convertis au taux du jour. Sans taux disponible : euros. Le paiement est toujours en euros.
export async function getCurrency(L) {
  const h = await headers();
  const zone = currencyFor({ country: h.get("x-vercel-ip-country"), ua: h.get("user-agent"), en: !!L?.en });
  if (zone !== "USD") return { cur: "EUR" };
  const rate = await eurUsd();
  return rate ? { cur: "USD", rate } : { cur: "EUR" };
}
