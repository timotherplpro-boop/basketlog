// Paiement intégré (lib/whop-pay.js) : vérification d'un paiement relu chez Whop et appels simulés à l'API.
import { PAY_ID_RE, checkPayment, createCheckout, getPayment, newPayToken, payTag, paymentIdFrom, planIdOf } from "../lib/whop-pay.js";

export async function payTests({ eq }) {
  console.log("Paiement intégré");
  eq("Plan d'un lien de paiement Whop", planIdOf("https://whop.com/checkout/plan_qpRxDjCSA3Qy6/"), "plan_qpRxDjCSA3Qy6");
  eq("Lien sans plan", planIdOf("https://whop.com/basketlog/"), null);
  const t1 = newPayToken(), t2 = newPayToken();
  eq("Jetons différents à chaque paiement", t1 !== t2 && t1.length >= 30, true);
  eq("Étiquette stable pour un même jeton", payTag(t1) === payTag(t1) && payTag(t1) !== payTag(t2), true);
  eq("Identifiant de paiement accepté", PAY_ID_RE.test("pay_AbC123xyz"), true);
  eq("Identifiant de paiement refusé (autre forme)", PAY_ID_RE.test("pay_../memberships"), false);

  eq("Retour : identifiant sous payment_id", paymentIdFrom(new URLSearchParams("payment_id=pay_abc123&status=success")), "pay_abc123");
  eq("Retour : identifiant sous receipt_id", paymentIdFrom(new URLSearchParams("receipt_id=pay_xyz789")), "pay_xyz789");
  eq("Retour : rien d'exploitable", paymentIdFrom(new URLSearchParams("payment=abc")), null);
  const products = { starter: "prod_S", pro: "prod_P", lifetime: "prod_L" };
  const tag = payTag(t1);
  const base = { id: "pay_ok1234", status: "paid", substatus: "succeeded", metadata: { bl: tag }, product: { id: "prod_P" }, user: { id: "user_abc123", email: "Fan@Example.com" }, membership: { id: "mem_x1" } };
  eq("Paiement valide : accès ouvert", checkPayment(base, { tag, products }), { ok: true, uid: "user_abc123", email: "fan@example.com", plan: "pro", membership: "mem_x1" });
  eq("Paiement d'un autre visiteur (étiquette différente) : refusé", checkPayment(base, { tag: payTag(t2), products }).reason, "etiquette");
  eq("Paiement sans étiquette : refusé", checkPayment({ ...base, metadata: {} }, { tag, products }).reason, "etiquette");
  eq("Autre produit que Basketlog : refusé", checkPayment({ ...base, product: { id: "prod_Z" } }, { tag, products }).reason, "produit");
  eq("Pas encore payé : en attente", checkPayment({ ...base, status: "open", substatus: "pending", paid_at: null }, { tag, products }).reason, "attente");
  eq("Acheteur pas encore rattaché : en attente", checkPayment({ ...base, user: null }, { tag, products }).reason, "attente");
  eq("Produit donné en simple identifiant", checkPayment({ ...base, product: "prod_L" }, { tag, products }).plan, "lifetime");
  eq("Réponse illisible : refusée", checkPayment(null, { tag, products }).reason, "invalide");

  // Appels simulés : la configuration de paiement porte l'étiquette ; une erreur Whop est classée.
  const saved = process.env.WHOP_API_KEY;
  process.env.WHOP_API_KEY = "test-key";
  let sent = null;
  const fake = async (url, init) => { sent = { url, init }; return new Response(JSON.stringify({ id: "ch_TEST123" }), { status: 200 }); };
  eq("Configuration de paiement créée", await createCheckout({ planId: "plan_qpRxDjCSA3Qy6", tag, plan: "pro", redirectUrl: "https://basketlog-app.com/api/pay/retour" }, fake), { id: "ch_TEST123", url: "https://whop.com/checkout/ch_TEST123/" });
  const body = JSON.parse(sent.init.body);
  eq("Configuration : plan, étiquette et retour", [sent.url, body.variant_id, body.metadata.bl, body.metadata.formule, body.redirect_url], ["https://api.whop.com/api/v1/checkout_configurations", "plan_qpRxDjCSA3Qy6", tag, "pro", "https://basketlog-app.com/api/pay/retour"]);
  let kind = null;
  try { await getPayment("pay_x1234", async () => new Response(JSON.stringify({ error: { message: "nope" } }), { status: 403 })); } catch (e) { kind = e.kind; }
  eq("Clé sans la permission de lire les paiements : erreur « scope »", kind, "scope");
  delete process.env.WHOP_API_KEY;
  kind = null;
  try { await getPayment("pay_x1234", fake); } catch (e) { kind = e.kind; }
  eq("Sans clé Whop : erreur « nokey »", kind, "nokey");
  if (saved) process.env.WHOP_API_KEY = saved;
}
