import { NextResponse } from "next/server";
import { COOKIE, currentSession } from "../../../../lib/pro";
import { whopList } from "../../../../lib/whop-read";
import { memberEmail } from "../../../../lib/whop-email";
import { adminComptes } from "../../../../lib/comptes";
import { mailReady, sendMail } from "../../../../lib/mail";
import { paymentFailedEmail, paymentMailsOn, paymentsToRemind } from "../../../../lib/lifecycle-mail";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Relance des paiements refusés (lib/lifecycle-mail.js), lancée chaque jour par Vercel à 10 h 43 UTC : premier e-mail dans
// les 24 h qui suivent l'échec, rappel 3 jours après, seulement si l'abonnement est toujours « en retard » chez Whop.
// Langue et prénom : compte Basketlog de la même adresse (sinon anglais). Tant que PAYMENT_EMAILS ne vaut pas 1, rien n'est
// envoyé : la réponse montre ce qui partirait. ?dry=1 force l'aperçu. Accès : tâche planifiée de Vercel ou compte admin.
async function access(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return "cron";
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role === "admin") return "admin";
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return "cron";
  return null;
}

export async function GET(req) {
  const who = await access(req);
  if (!who) return NextResponse.json({ ok: false, error: "accès refusé" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1" || !paymentMailsOn() || !mailReady();
  let list;
  try {
    const [mem, pay] = await Promise.all([
      whopList("memberships", { statuses: "past_due" }, { pages: 10, first: 100 }),
      whopList("payments", {}, { pages: 4, first: 100 }),
    ]);
    list = paymentsToRemind(pay.items, mem.items);
  } catch (e) {
    console.warn(`[relance] lecture Whop impossible : ${String(e?.message || e).slice(0, 200)}`);
    return NextResponse.json({ ok: false, error: "whop" }, { status: 502 });
  }
  if (!list.length) return NextResponse.json({ ok: true, dry, prevus: 0 });
  let comptes = [];
  try { comptes = (await adminComptes(2000))?.comptes || []; } catch {}
  const byEmail = new Map(comptes.map((c) => [String(c.email || "").toLowerCase(), c]));
  let sent = 0, failed = 0, noEmail = 0;
  const apercu = [];
  for (const t of list) {
    let to = t.email;
    if (!to && t.uid) { try { to = await memberEmail(t.uid); } catch {} }
    if (!to) { noEmail++; continue; }
    const c = byEmail.get(String(to).toLowerCase());
    const mail = paymentFailedEmail({ lang: c?.langue || "en", name: c?.nom || null, step: t.step, to, manage: t.manage });
    apercu.push({ paiement: t.id, etape: t.step, sujet: mail.subject });
    if (dry) continue;
    try { await sendMail({ to, ...mail }); sent++; } catch (e) { failed++; console.warn(`[relance] envoi impossible : ${String(e?.message || e).slice(0, 120)}`); }
  }
  console.log(`[relance] ${list.length} prévus, ${sent} envoyés, ${failed} en échec, ${noEmail} sans adresse${dry ? " (aperçu)" : ""}`);
  return NextResponse.json({ ok: true, dry, prevus: list.length, envoyes: sent, echecs: failed, sans_adresse: noEmail, apercu });
}
