// Monnaie du visiteur (24/11/2026) : euros en zone euro, dollars ailleurs (lib/currency-shared.js).
import { currencyFor } from "../lib/currency-shared.js";

export async function currencyTests({ eq }) {
  console.log("Monnaie selon le pays");
  eq("France : euros", currencyFor({ country: "FR" }), "EUR");
  eq("Espagne : euros", currencyFor({ country: "es" }), "EUR");
  eq("États-Unis : dollars", currencyFor({ country: "US" }), "USD");
  eq("Royaume-Uni : dollars", currencyFor({ country: "GB" }), "USD");
  eq("Mexique : dollars", currencyFor({ country: "MX" }), "USD");
  eq("Pays inconnu, page française : euros", currencyFor({ country: "" }), "EUR");
  eq("Pays inconnu, page anglaise : dollars", currencyFor({ country: "", en: true }), "USD");
  eq("Robot Google depuis les États-Unis, page française : euros", currencyFor({ country: "US", ua: "Mozilla/5.0 (compatible; Googlebot/2.1)" }), "EUR");
}
