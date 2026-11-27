import { NextResponse } from "next/server";
import { SITE } from "../../../lib/site";
import { COOKIE, cookieOptions, currentSession, decodeSession } from "../../../lib/pro";
import { sameOrigin, whopUidOf } from "../../../lib/auth-utils";
import { allowed } from "../../../lib/comptes";
import { listPromos } from "../../../lib/whop-promo";
import { listPlans } from "../../../lib/whop-account";
import { applyReward } from "../../../lib/parrainage-whop";
import { MAX_PER_YEAR, REF_COOKIE, REF_DAYS, REWARD_DAYS, proTarget, refCode, refLink, refUid, rewardsOf, yearCount } from "../../../lib/parrainage";

export const dynamic = "force-dynamic";
export const maxDuration = 25;

// Parrainage (voir lib/parrainage.js).
// GET ?lang=xx : lien personnel du compte connecté et ses mois offerts, pour « Mon compte » (le nom des codes Whop n'est jamais renvoyé).
// POST { action: "arrivee", code } : un visiteur arrive par un lien ; le code est vérifié puis gardé 30 jours dans un cookie
//   httpOnly, repris au paiement (app/api/pay). Son propre lien ne compte pas.
// POST { action: "ajouter" } : ajoute un mois en attente (30 jours) à l'abonnement Pro du compte connecté.
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const no = (status, error) => json({ ok: false, error }, status);
const langOf = (l) => (["en", "es", "pt"].includes(l) ? l : "fr");

export async function GET(req) {
  const lang = langOf(new URL(req.url).searchParams.get("lang"));
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) return no(401, "login");
  if (session.preview) return no(403, "apercu");
  // Créateurs partenaires : ils ont leur code promo (commission), le parrainage ne s'y mélange pas.
  if (session.role === "createur") return json({ ok: true, off: "createur" });
  const code = refCode(session.uid);
  if (!code) return no(503, "config");
  const out = { ok: true, link: refLink(SITE, code, lang), days: REWARD_DAYS, max: MAX_PER_YEAR, rewards: null, year: 0, canAdd: false };
  try {
    const rewards = rewardsOf(await listPromos(), session.uid);
    out.rewards = rewards.map(({ created, state }) => ({ created, state }));
    out.year = yearCount(rewards);
    const whop = whopUidOf(session);
    if (whop && rewards.some((r) => r.state === "attente")) {
      try { out.canAdd = !!proTarget(await listPlans(whop)); } catch { /* Whop injoignable : bouton masqué */ }
    }
  } catch (e) {
    console.warn(`[parrainage] lecture des récompenses : ${String(e?.message || e).slice(0, 200)}`);
  }
  const res = json(out);
  if (refreshed) res.cookies.set(COOKIE, refreshed, cookieOptions);
  return res;
}

export async function POST(req) {
  if (!sameOrigin(req.headers)) return no(403, "refus");
  let body = {};
  try { body = await req.json(); } catch {}

  if (body?.action === "arrivee") {
    const code = String(body.code || "").slice(0, 100);
    const uid = refUid(code);
    if (!uid) return no(400, "code");
    const s = decodeSession(req.cookies.get(COOKIE)?.value);
    if (s?.uid && (s.uid === uid || s.whop === uid)) return json({ ok: true, self: true });
    const res = json({ ok: true });
    res.cookies.set(REF_COOKIE, code, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: REF_DAYS * 86400 });
    return res;
  }

  if (body?.action === "ajouter") {
    const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
    if (!session?.uid) return no(401, "login");
    if (session.preview) return no(403, "apercu");
    if (!(await allowed("parrainage-ajout", session.uid, 10, 60))) return no(429, "trop");
    const whop = whopUidOf(session);
    if (!whop) return no(409, "sans_pro");
    let pending, target;
    try {
      pending = rewardsOf(await listPromos(), session.uid).filter((r) => r.state === "attente").pop(); // la plus ancienne d'abord
      if (!pending) return no(409, "rien");
      target = proTarget(await listPlans(whop));
    } catch (e) {
      console.warn(`[parrainage] ajout, lecture Whop : ${String(e?.message || e).slice(0, 200)}`);
      return no(502, "whop");
    }
    if (!target) return no(409, "sans_pro");
    try {
      const { until } = await applyReward(pending.id, target.id);
      console.log("[parrainage] mois offert ajouté depuis Mon compte");
      return json({ ok: true, until });
    } catch (e) {
      console.warn(`[parrainage] ajout refusé par Whop : ${String(e?.message || e).slice(0, 200)}`);
      return no(502, e?.kind === "scope" ? "scope" : "whop");
    }
  }

  return no(400, "action");
}
