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

// Conversion des prix en euros (24/11/2026) : jamais « 9,99 $ » ; paiement en euros.
import { price, trialTexts, fxNote, shown } from "../lib/pricing.js";
import { cleanRate, eurUsd } from "../lib/fx.js";
import { mk } from "../lib/i18n.js";

export async function fxTests({ ok, ko, eq }) {
  console.log("Conversion euros -> dollars");
  const EN = mk("en"), FR = mk("fr");
  const fx = { cur: "USD", rate: 1.16 };
  eq("Pro converti au taux du jour", price("pro", fx, EN), "$11.59");
  eq("Lifetime converti", price("lifetime", fx, EN), "$115.99");
  eq("Essai à 1 € converti", shown(1, fx, EN), "$1.16");
  eq("Zone euro : euros", price("pro", { cur: "EUR" }, FR).replace(/\s/g, " "), "9,99 €");
  eq("Sans taux : euros", price("pro", { cur: "USD" }, EN), "€9.99");
  const t = trialTexts(EN, fx);
  if (t.cta === "Start 3-day trial for $1.16" && t.line.includes("then $11.59/mo") && t.line.includes("Billed in euros: €1 then €9.99/mo.")) ok("Texte d'essai converti + paiement en euros"); else ko("Texte d'essai", t.cta + " | " + t.line);
  if (!/\$9\.99|9,99 \$/.test(t.line + t.cta + fxNote(EN, fx) + fxNote(FR, fx))) ok("Jamais « $9.99 »"); else ko("$9.99", "présent");
  eq("Pas de note en zone euro", fxNote(FR, { cur: "EUR" }), "");
  eq("Taux aberrant refusé", cleanRate(12), null);
  eq("Taux correct gardé", cleanRate("1.1612"), 1.1612);
  eq("Lecture de la réponse BCE", await eurUsd(async () => ({ ok: true, json: async () => ({ base: "EUR", rates: { USD: 1.158 } }) })), 1.158);
  eq("Panne du service : null", await eurUsd(async () => { throw new Error("down"); }), null);
}
