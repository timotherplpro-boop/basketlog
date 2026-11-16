import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { COOKIE, SESSION_V, cookieOptions, decodeSession, displayName, encodeSession, resolveAccess, safeNext } from "../../../../lib/pro";
import { accountIdOf, isAccountSession, normEmail } from "../../../../lib/auth-utils";
import { compteParEmail, lierWhop } from "../../../../lib/comptes";
import { productIds } from "../../../../lib/whop-account";
import { PAY_COOKIE, PAY_ID_RE, PAY_NEXT_COOKIE, checkPayment, findTaggedPayment, getPayment, payTag, paymentIdFrom } from "../../../../lib/whop-pay";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

// Retour du formulaire de paiement intégré (page /paiement) : ?payment=pay_…&status=succeeded (voir lib/whop-pay.js).
// Le paiement est relu chez Whop et vérifié (payé, étiquette du jeton de ce visiteur, formule Basketlog), puis l'accès
// est ouvert tout de suite, sans compte Whop à créer ni connexion :
//  - visiteur connecté avec son compte Basketlog (e-mail ou Google) : le paiement est relié à ce compte ;
//  - sinon : session de l'acheteur (comme une connexion Whop, mais sans qu'il ait rien à faire) ; si un compte Basketlog
//    existe déjà avec la même adresse e-mail et n'a pas encore d'abonnement relié, le paiement y est relié aussi, pour
//    qu'il le retrouve en se connectant sur un autre appareil.
export async function GET(req) {
  const u = new URL(req.url);
  let payment = paymentIdFrom(u.searchParams) || "";
  const status = u.searchParams.get("status") || "";
  const token = req.cookies.get(PAY_COOKIE)?.value || "";
  const next = safeNext(req.cookies.get(PAY_NEXT_COOKIE)?.value);
  // Langue : paramètre l, sinon celle de la page d'où vient le visiteur.
  const l = u.searchParams.get("l") || (next || "").match(/^\/(en|es)(?=\/|$|\?)/)?.[1];
  const pre = l === "en" || l === "es" ? `/${l}` : "";
  const go = (path, clear = false) => {
    const r = NextResponse.redirect(`${SITE}${path}`);
    if (clear) {
      r.cookies.delete({ name: PAY_COOKIE, path: "/api/pay" });
      r.cookies.delete({ name: PAY_NEXT_COOKIE, path: "/api/pay" });
    }
    return r;
  };
  if (status === "failed" || status === "canceled") return go(`${pre}/pro?erreur=paiement_annule`);
  if (!token) return go(`${pre}/pro?erreur=paiement_inconnu`);
  const tag = payTag(token);
  // Retour de la page Whop sans identifiant de paiement : on le retrouve grâce à l'étiquette.
  if (!payment) {
    for (let i = 0; i < 3 && !payment; i++) {
      try { payment = (await findTaggedPayment(tag))?.id || ""; } catch (e) { console.warn(`[paiement] recherche du paiement : ${String(e?.message || e).slice(0, 200)}`); }
      if (!payment) await pause(1500);
    }
  }
  if (!PAY_ID_RE.test(payment)) return go(`${pre}/pro?erreur=paiement_attente`);

  // Whop peut mettre quelques secondes à rattacher l'acheteur et l'abonnement au paiement : jusqu'à 4 lectures.
  const products = productIds();
  let verdict = { ok: false, reason: "attente" };
  for (let i = 0; i < 4; i++) {
    try {
      verdict = checkPayment(await getPayment(payment), { tag, products });
    } catch (e) {
      console.warn(`[paiement] lecture du paiement : ${String(e?.message || e).slice(0, 200)}`);
      verdict = { ok: false, reason: e?.kind === "notfound" ? "inconnu" : "attente" };
    }
    if (verdict.ok || verdict.reason !== "attente") break;
    await pause(1500);
  }
  if (!verdict.ok) {
    console.warn(`[paiement] paiement refusé au retour : ${verdict.reason}`);
    if (verdict.reason === "attente") return go(`${pre}/pro?erreur=paiement_attente&payment=${encodeURIComponent(payment)}`);
    return go(`${pre}/pro?erreur=paiement_inconnu`, true);
  }
  const { uid } = verdict;
  console.log(`[paiement] paiement intégré confirmé (${verdict.plan})`);

  const current = decodeSession(req.cookies.get(COOKIE)?.value);
  let session = null;
  if (isAccountSession(current) && !current.preview) {
    // Compte Basketlog connecté : le paiement lui est relié.
    try {
      const r = await lierWhop(accountIdOf(current.uid), uid);
      if (r?.ok) {
        let a = null;
        try { a = await resolveAccess(current.uid, current); } catch {}
        session = a
          ? { ...current, whop: uid, email: a.email || current.email, wname: a.wname || current.wname, tier: a.tier, paid: a.paid, role: a.role, sv: a.sv ?? current.sv, v: SESSION_V, checked: Date.now() }
          : { ...current, whop: uid, checked: 0 };
        if (a) session.name = displayName(a, session);
      } else {
        console.warn(`[paiement] liaison au compte connecté impossible : ${r?.reason || "?"}`);
      }
    } catch (e) {
      console.warn(`[paiement] liaison au compte connecté : ${String(e?.message || e).slice(0, 200)}`);
    }
  }
  if (!session) {
    // Session de l'acheteur, ouverte directement.
    let a = null;
    try { a = await resolveAccess(uid); } catch {}
    const email = normEmail(verdict.email) || null;
    const wname = verdict.email ? verdict.email.split("@")[0] : "";
    session = a
      ? { uid, name: a.nom || wname, wname, tier: a.tier, paid: a.paid, role: a.role, email, v: a.v, checked: Date.now() }
      : { uid, name: wname, wname, tier: verdict.plan, paid: verdict.plan, role: null, email, v: SESSION_V, checked: 0 };
    // Compte Basketlog existant avec la même adresse, sans abonnement relié : on y relie ce paiement.
    if (email) {
      try {
        const c = await compteParEmail(email);
        if (c?.id && !c.whop_uid) {
          const r = await lierWhop(c.id, uid);
          if (r?.ok) console.log("[paiement] paiement relié au compte Basketlog de la même adresse");
        }
      } catch { /* base injoignable : l'accès est ouvert quand même, la liaison pourra se faire plus tard */ }
    }
  }
  const value = encodeSession(session);
  if (!value) return go(`${pre}/pro?erreur=config`);
  const dest = new URL(next || `${pre}/app`, SITE);
  dest.searchParams.set("bienvenue", "abonne");
  dest.searchParams.set("paye", verdict.plan);
  const r = go(dest.pathname + dest.search, true);
  r.cookies.set(COOKIE, value, cookieOptions);
  return r;
}
