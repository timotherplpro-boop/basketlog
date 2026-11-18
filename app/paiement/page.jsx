import { redirect } from "next/navigation";
import PayCheckout from "../../components/PayCheckout";
import { getL } from "../../lib/lang-server";
import { getCurrency } from "../../lib/currency-server";
import { price } from "../../lib/pricing";
import { cleanCode, CODE_RE } from "../../lib/promo";
import { PAY_PLANS } from "../../lib/whop-pay";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const L = await getL();
  return { title: L.t("Paiement · Basketlog", "Checkout · Basketlog", "Pago · Basketlog", "Pagamento · Basketlog"), robots: { index: false, follow: false } };
}

// Paiement intégré (voir lib/whop-pay.js) : /paiement?plan=pro&code=NOM20. Le visiteur arrive ici depuis /pro, après avoir
// accepté les CGV ; il paie dans le formulaire Whop affiché dans la page, sans compte Whop à créer.
export default async function PaiementPage({ searchParams }) {
  const L = await getL();
  const sp = await searchParams;
  const plan = PAY_PLANS.includes(sp?.plan) ? sp.plan : null;
  if (!plan) redirect(L.href("/pro"));
  const raw = cleanCode(sp?.code || "");
  const code = CODE_RE.test(raw) ? raw : "";
  const cur = await getCurrency(L);
  const name = { starter: "Starter", pro: "Pro", lifetime: "Lifetime" }[plan];
  const per = plan === "lifetime" ? L.t("une seule fois", "one-time", "pago único", "pagamento único") : L.t("/mois", "/month", "/mes", "/mês");
  return (
    <main className="pay-page">
      <section className="pay-hero">
        <div className="pill-tag">Basketlog {name}</div>
        <h1>{L.t("Débloque l'analyse complète", "Unlock the full analysis", "Desbloquea el análisis completo", "Desbloqueie a análise completa")}</h1>
      </section>
      <PayCheckout plan={plan} planName={name} priceText={price(plan, cur, L)} perText={per} code={code} />
    </main>
  );
}
