import { NextResponse } from "next/server";
import { COOKIE, currentSession } from "../../../../lib/pro";
import { accountIdOf, maskEmail } from "../../../../lib/auth-utils";
import { compteParEmail, getCompte } from "../../../../lib/comptes";
import { productPlans, settle, whopList } from "../../../../lib/whop-read";
import { listPromos } from "../../../../lib/whop-promo";
import { listPlans } from "../../../../lib/whop-account";
import { memberEmail } from "../../../../lib/whop-email";
import { mailReady, sendMail } from "../../../../lib/mail";
import { applyReward, createReward } from "../../../../lib/parrainage-whop";
import { SCAN_DAYS, parrainageReady, parseReward, proTarget, referrals, refUid, rewardCheck, rewardCode, rewardEmail, rewardState, rewardsOf, yearCount } from "../../../../lib/parrainage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Parrainage (lib/parrainage.js), lancé chaque jour par Vercel à 9 h 37 UTC : relit les paiements Whop des 45 derniers jours,
// repère les filleuls (paiements dont l'abonnement porte un code de parrainage) qui ont fait leur premier vrai paiement, et
// récompense leur parrain une seule fois : 30 jours ajoutés à son abonnement Pro, ou mois mis en attente s'il n'en a pas
// (ajouté ensuite tout seul par cette tâche dès qu'il prend Pro, ou par lui depuis « Mon compte »), avec un e-mail dans sa langue.
// ?dry=1 (ou PARRAINAGE_OFF=1 dans Vercel) : aperçu, rien n'est créé ni envoyé. Accès : tâche planifiée de Vercel ou compte admin ;
// l'admin y voit la liste des parrainages (identifiants masqués).
async function access(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return "cron";
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role === "admin") return "admin";
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return "cron";
  return null;
}

const short = (uid) => (uid ? `${String(uid).slice(0, 8)}…` : null);
const err = (e) => String(e?.message || e).slice(0, 160);

// Fiche du parrain : adresse, langue, prénom et compte Whop qui porte ses abonnements. null : compte supprimé ; lève une
// erreur si la base est injoignable (la tâche réessaiera le lendemain).
async function parrainInfo(uid) {
  const id = accountIdOf(uid);
  if (id) {
    const c = await getCompte(id);
    return c ? { email: c.email || null, lang: c.langue || "fr", name: c.nom || null, whop: c.whop_uid || null, kind: "compte" } : null;
  }
  let email = null;
  try { email = await memberEmail(uid); } catch {}
  let c = null;
  if (email) { try { c = await compteParEmail(email); } catch {} }
  return { email, lang: c?.langue || "fr", name: c?.nom || null, whop: uid, kind: "whop" };
}

export async function GET(req) {
  const who = await access(req);
  if (!who) return NextResponse.json({ ok: false, error: "accès refusé" }, { status: 401 });
  if (!parrainageReady()) return NextResponse.json({ ok: false, error: "clé de signature absente" }, { status: 503 });
  const dry = new URL(req.url).searchParams.get("dry") === "1" || String(process.env.PARRAINAGE_OFF || "").trim() === "1";
  const now = Date.now();
  const since = new Date(now - SCAN_DAYS * 864e5).toISOString();
  const [pRes, mRes, cRes] = await Promise.all([
    settle(whopList("payments", { created_after: since }, { pages: 20, first: 100 })),
    settle(whopList("memberships", { created_after: since }, { pages: 10, first: 100 })),
    settle(listPromos()),
  ]);
  if (!pRes.ok || !cRes.ok) {
    console.warn(`[parrainage] lecture Whop impossible : ${err((pRes.ok ? cRes : pRes).error)}`);
    return NextResponse.json({ ok: false, error: "whop" }, { status: 502 });
  }
  const promos = cRes.value;
  const list = referrals(pRes.value.items, productPlans(), mRes.ok ? mRes.value.items : []);
  const infos = new Map();
  const info = async (uid) => {
    if (!infos.has(uid)) infos.set(uid, await parrainInfo(uid).catch(() => undefined)); // undefined : base injoignable
    return infos.get(uid);
  };
  const plansOf = async (whop) => (whop ? proTarget(await listPlans(whop).catch(() => [])) : null);
  const mail = async (p, data) => {
    if (dry || !p?.email || !mailReady()) return false;
    try { await sendMail({ to: p.email, ...rewardEmail({ lang: p.lang, name: p.name, to: p.email, ...data }) }); return true; }
    catch (e) { console.warn(`[parrainage] e-mail non envoyé : ${err(e)}`); return false; }
  };

  const rows = [];
  let created = 0, added = 0, sent = 0;
  for (const r of list) {
    const uid = refUid(r.paid?.ref || r.ref);
    const row = { filleul: short(r.filleul), formule: r.paid?.plan || r.plan || null, paye: !!r.paid, parrain: null, decision: "" };
    rows.push(row);
    if (!uid) { row.decision = "code de parrainage invalide"; continue; }
    const p = await info(uid);
    row.parrain = p ? `${p.kind === "compte" ? "compte Basketlog" : "compte Whop"} ${maskEmail(p.email || "") || short(uid)}` : short(uid);
    if (p === undefined) { row.decision = "base injoignable : réessai demain"; continue; }
    if (!p) { row.decision = "compte du parrain supprimé"; continue; }
    if (!r.paid) { row.decision = "en essai : attente du premier vrai paiement"; continue; }
    const code = rewardCode(uid, r.filleul);
    const existing = promos.find((c) => String(c?.code || "").toUpperCase() === code);

    if (existing) {
      // Récompense déjà créée : seul un mois en attente peut encore être ajouté (le parrain a pris Pro depuis).
      if (rewardState(existing) !== "attente") { row.decision = "déjà récompensé"; continue; }
      const target = await plansOf(p.whop);
      if (!target) { row.decision = "mois en attente : le parrain n'a pas d'abonnement Pro"; continue; }
      if (dry) { row.decision = "mois en attente, à ajouter à son abonnement Pro"; continue; }
      try {
        const { until } = await applyReward(existing.id, target.id);
        existing.status = "inactive";
        added++;
        if (await mail(p, { added: true, until })) sent++;
        row.decision = "30 jours ajoutés (mois qui était en attente)";
      } catch (e) {
        row.decision = `ajout refusé par Whop : ${err(e)}`;
      }
      continue;
    }

    let filleulEmail = r.email;
    if (!filleulEmail && p.email) { try { filleulEmail = await memberEmail(r.filleul); } catch {} }
    const check = rewardCheck({ promos, parrainUid: uid, parrainWhop: p.whop, parrainEmail: p.email, filleulUid: r.filleul, filleulEmail, now });
    if (!check.ok) { row.decision = { "soi-meme": "refusé : son propre compte ou sa propre adresse", deja: "refusé : ce filleul a déjà rapporté un mois", plafond: "refusé : 12 mois offerts déjà gagnés cette année", inconnu: "refusé : identifiant manquant" }[check.reason] || `refusé : ${check.reason}`; continue; }
    const target = await plansOf(p.whop);
    if (dry) { row.decision = target ? "à récompenser : 30 jours ajoutés à son abonnement Pro" : "à récompenser : mois mis en attente"; continue; }
    let promo;
    try {
      promo = await createReward(check.code);
    } catch (e) {
      row.decision = e?.kind === "conflict" ? "déjà récompensé (code existant)" : `création refusée par Whop : ${err(e)}`;
      continue;
    }
    created++;
    promos.push({ ...promo, code: check.code, status: promo?.status || "active", created_at: promo?.created_at || new Date(now).toISOString() });
    let until = null, ok = false;
    if (target && promo?.id) {
      try { ({ until } = await applyReward(promo.id, target.id)); ok = true; added++; } catch (e) { console.warn(`[parrainage] ajout refusé : ${err(e)}`); }
    }
    if (ok) promos[promos.length - 1].status = "inactive";
    if (await mail(p, { added: ok, until })) sent++;
    row.decision = ok ? "récompensé : 30 jours ajoutés à son abonnement Pro" : "récompensé : mois mis en attente";
    console.log(`[parrainage] récompense créée (${ok ? "30 jours ajoutés" : "en attente"}), ${yearCount(rewardsOf(promos, uid), now)} sur 12 cette année`);
  }
  console.log(`[parrainage] ${rows.length} filleul(s), ${created} récompense(s) créée(s), ${added} ajout(s), ${sent} e-mail(s)${dry ? " (aperçu)" : ""}`);
  const totals = { filleuls: rows.length, payes: rows.filter((x) => x.paye).length, recompenses_creees: created, mois_ajoutes: added, emails: sent };
  // Registre complet (toutes dates) : codes PARRAIN… chez Whop, par état.
  const registre = { total: 0, attente: 0, ajoute: 0, utilise: 0, annule: 0 };
  for (const c of promos) if (parseReward(c?.code)) { registre.total++; registre[rewardState(c)]++; }
  return NextResponse.json({ ok: true, dry, ...totals, registre, ...(who === "admin" ? { lignes: rows } : {}) }, { headers: { "Cache-Control": "no-store" } });
}
