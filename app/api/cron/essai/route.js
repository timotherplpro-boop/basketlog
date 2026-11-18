import { NextResponse } from "next/server";
import { COOKIE, currentSession } from "../../../../lib/pro";
import { whopList } from "../../../../lib/whop-read";
import { memberEmail } from "../../../../lib/whop-email";
import { adminComptes } from "../../../../lib/comptes";
import { mailReady, sendMail } from "../../../../lib/mail";
import { lifecycleOn, trialEndEmail, trialsEndingSoon } from "../../../../lib/lifecycle-mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Rappel « Ton essai Basketlog Pro se termine demain » (lib/lifecycle-mail.js), lancé chaque jour par Vercel à 14 h 25 UTC
// (9 h 25 à New York) : chaque essai Pro dont la fin tombe dans les 24 h suivantes reçoit un seul e-mail, dans la langue
// de son compte Basketlog (anglais par défaut). Tant que LIFECYCLE_EMAILS ne vaut pas 1, rien n'est envoyé : la réponse
// montre seulement le nombre d'e-mails prévus. ?dry=1 force l'aperçu. Accès : tâche planifiée de Vercel ou compte admin.
async function access(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return "cron";
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role === "admin") return "admin";
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return "cron";
  return null;
}

// Plans Pro en euros (le reste est en dollars) : identifiants tirés des liens de paiement.
const planId = (u) => (/\/(plan_[A-Za-z0-9]+)/.exec(u || "") || [])[1] || null;
const EUR_PLANS = [planId(process.env.NEXT_PUBLIC_WHOP_CHECKOUT_PRO || "https://whop.com/checkout/plan_9LcgVO0AP56pI/")].filter(Boolean);

export async function GET(req) {
  const who = await access(req);
  if (!who) return NextResponse.json({ ok: false, error: "accès refusé" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1" || !lifecycleOn() || !mailReady();
  let list;
  try {
    list = trialsEndingSoon((await whopList("memberships", { statuses: "trialing" }, { pages: 10, first: 100 })).items, { eurPlans: EUR_PLANS });
  } catch (e) {
    console.warn(`[essai] lecture Whop impossible : ${String(e?.message || e).slice(0, 200)}`);
    return NextResponse.json({ ok: false, error: "whop" }, { status: 502 });
  }
  if (!list.length) return NextResponse.json({ ok: true, dry, prevus: 0 });
  // Langue et prénom : compte Basketlog qui a la même adresse (sinon anglais, sans prénom).
  let comptes = [];
  try { comptes = (await adminComptes(2000))?.comptes || []; } catch {}
  const byEmail = new Map(comptes.map((c) => [String(c.email || "").toLowerCase(), c]));
  let sent = 0, failed = 0, noEmail = 0;
  for (const t of list) {
    let to = null;
    try { to = await memberEmail(t.uid); } catch { noEmail++; continue; }
    const c = byEmail.get(String(to).toLowerCase());
    const mail = trialEndEmail({ lang: c?.langue || "en", name: c?.nom || null, endsAt: t.endsAt, cur: t.cur });
    if (dry) continue;
    try { await sendMail({ to, ...mail }); sent++; } catch (e) { failed++; console.warn(`[essai] envoi impossible : ${String(e?.message || e).slice(0, 120)}`); }
  }
  console.log(`[essai] rappels : ${list.length} prévus, ${sent} envoyés, ${failed} en échec, ${noEmail} sans adresse${dry ? " (aperçu)" : ""}`);
  return NextResponse.json({ ok: true, dry, prevus: list.length, envoyes: sent, echecs: failed, sans_adresse: noEmail });
}
