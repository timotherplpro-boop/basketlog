import { NextResponse } from "next/server";
import { SITE } from "../../../lib/site";
import { checkoutFor } from "../../../lib/pricing";
import { getCurrency } from "../../../lib/currency-server";
import { mk } from "../../../lib/i18n";
import { safeNext } from "../../../lib/pro";
import { sameOrigin, clientIp } from "../../../lib/auth-utils";
import { allowed } from "../../../lib/comptes";
import { PAY_COOKIE, PAY_NEXT_COOKIE, PAY_PLANS, createCheckout, newPayToken, payTag, planIdOf } from "../../../lib/whop-pay";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

// Début d'un paiement intégré (voir lib/whop-pay.js). POST { plan, lang } -> { ok, session } : identifiant de la
// configuration de paiement Whop à donner au formulaire de la page /paiement. Pose le cookie httpOnly du jeton, que
// /api/pay/retour compare à l'étiquette du paiement.
export async function POST(req) {
  let body = {};
  try { body = await req.json(); } catch {}
  const lang = ["en", "es", "pt"].includes(body?.lang) ? body.lang : "fr";
  const L = mk(lang);
  const no = (status, error) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
  if (!sameOrigin(req.headers)) return no(403, "refus");
  const plan = PAY_PLANS.includes(body?.plan) ? body.plan : null;
  if (!plan) return no(400, "formule");
  if (!(await allowed("paiement-ip", clientIp(req.headers), 30, 60))) return no(429, "trop");
  const cur = await getCurrency(L);
  const planId = planIdOf(checkoutFor(cur)[plan]);
  if (!planId) return no(503, "config");
  const token = newPayToken();
  let session;
  try {
    session = await createCheckout({ planId, tag: payTag(token), plan, redirectUrl: `${SITE}/api/pay/retour` });
  } catch (e) {
    console.warn(`[paiement] configuration Whop refusée : ${String(e?.message || e).slice(0, 240)}`);
    return no(e?.kind === "nokey" ? 503 : 502, e?.kind === "nokey" ? "config" : "whop");
  }
  const res = NextResponse.json({ ok: true, session: session.id, url: session.url, plan, cur }, { headers: { "Cache-Control": "no-store" } });
  const opts = { httpOnly: true, secure: true, sameSite: "lax", path: "/api/pay", maxAge: 6 * 3600 };
  res.cookies.set(PAY_COOKIE, token, opts);
  // Page où revenir une fois l'accès débloqué (la fiche match d'où vient le visiteur), sinon l'espace membre.
  const next = safeNext(body?.next);
  if (next) res.cookies.set(PAY_NEXT_COOKIE, next, opts);
  else res.cookies.delete({ name: PAY_NEXT_COOKIE, path: "/api/pay" });
  return res;
}
