// Relance des paiements refusés : qui reçoit quoi, et quand (lib/lifecycle-mail.js).
import { paymentsToRemind, paymentFailedEmail, paymentMailsOn } from "../lib/lifecycle-mail.js";
import { onlyPastDue } from "../lib/account.js";

export async function relanceTests({ ok, ko, eq }) {
  console.log("Relance des paiements refusés");
  const now = Date.parse("2026-11-24T10:43:00Z");
  const pay = (over) => ({ id: "pay_1", status: "open", substatus: "failed", membership: { id: "mem_1" }, user: { id: "user_1", email: "fan@example.com" }, created_at: "2026-11-24T02:00:00Z", ...over });
  eq("Échec de la nuit, abonnement en retard : premier e-mail", paymentsToRemind([pay()], ["mem_1"], { now }).map((x) => x.step), [1]);
  eq("Paiement « pending » (affiché « En attente » chez Whop) : premier e-mail aussi", paymentsToRemind([pay({ status: "pending", substatus: null })], ["mem_1"], { now }).map((x) => x.step), [1]);
  eq("3 jours après, toujours en retard : rappel", paymentsToRemind([pay({ created_at: "2026-11-21T02:00:00Z" })], ["mem_1"], { now }).map((x) => x.step), [2]);
  eq("Entre les deux (38 h) : rien", paymentsToRemind([pay({ created_at: "2026-11-22T20:00:00Z" })], ["mem_1"], { now }), []);
  eq("Abonnement réglé depuis (plus en retard) : rien", paymentsToRemind([pay()], [], { now }), []);
  eq("Paiement payé : rien", paymentsToRemind([pay({ status: "paid", paid_at: "2026-11-24T03:00:00Z" })], ["mem_1"], { now }), []);
  eq("Paiement réussi à 0 (début d'essai) : rien", paymentsToRemind([pay({ status: "paid", substatus: "succeeded" })], ["mem_1"], { now }), []);
  const en = paymentFailedEmail({ lang: "en", name: "mavuto", step: 1, to: "fan@example.com" });
  eq("Sujet anglais", en.subject, "Your Basketlog payment didn't go through");
  eq("Lien Whop « gérer » repris quand il existe", paymentsToRemind([pay()], [{ id: "mem_1", manage_url: "https://whop.com/billing/manage/abc" }], { now })[0].manage, "https://whop.com/billing/manage/abc");
  eq("Lien étranger ignoré", paymentsToRemind([pay()], [{ id: "mem_1", manage_url: "https://evil.example/x" }], { now })[0].manage, null);
  if (en.text.includes("/en/app/compte") && en.text.includes("Hi Mavuto,") && !/\$|€/.test(en.text)) ok("Texte anglais : lien du compte, prénom, aucun montant"); else ko("Texte anglais", en.text.slice(0, 200));
  eq("Rappel français", paymentFailedEmail({ lang: "fr", step: 2 }).subject, "Rappel : ton paiement Basketlog n'est toujours pas passé");
  if (!/\bAI\b|\bIA\b/.test(en.text + paymentFailedEmail({ lang: "fr" }).text + paymentFailedEmail({ lang: "es" }).text)) ok("Jamais « AI » ni « IA »"); else ko("AI/IA", "présent");
  eq("Coupé par défaut (PAYMENT_EMAILS absent)", paymentMailsOn({}), false);
  const m = (status, product = "prod_pro") => ({ status, product: { id: product } });
  eq("Accès : Pro en retard seul => coupé", onlyPastDue([m("past_due")], "prod_pro"), true);
  eq("Accès : Pro actif => gardé", onlyPastDue([m("active")], "prod_pro"), false);
  eq("Accès : essai en cours => gardé", onlyPastDue([m("trialing")], "prod_pro"), false);
  eq("Accès : Pro en retard + Pass 24 h payé (même produit) => gardé", onlyPastDue([m("past_due"), m("completed")], "prod_pro"), false);
  eq("Accès : retard sur un autre produit => sans effet", onlyPastDue([m("past_due", "prod_st")], "prod_pro"), false);
}
