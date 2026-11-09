// Statistiques de l'espace admin (page /app/admin/stats), réservées à l'admin :
// - abonnés, paiements et codes promo des créateurs : Whop, lu en direct avec la clé API du site ;
// - parcours des visiteurs vers l'abonnement : compteurs anonymes de la base (lib/funnel.js, /api/stats) ;
// - utilisation de l'appli : analyses complètes ouvertes (base).
// - comptes Basketlog (e-mail ou Google, supabase/comptes.sql) : nombre, accords pour les e-mails et liste pour l'export.
// Aucune adresse e-mail de Whop n'est lue ; les adresses des comptes Basketlog ne servent qu'à la liste de l'admin.
import { dbRpc, adminData } from "./roles";
import { creatorNames } from "./accounts";
import { usageDay } from "./usage";
import { PRICES } from "./pricing";
import { STEPS } from "./funnel-steps";

const API = "https://api.whop.com/api/v1";
const COMPANY = process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";
const LIVE = new Set(["trialing", "active", "past_due", "completed"]); // abonnement qui donne accès
const COMMISSION = 0.2; // part reversée au créateur sur les paiements faits avec son code
// Raison de résiliation choisie chez Whop
const REASONS = {
  too_expensive: "trop cher", switching: "passe à un autre service", missing_features: "il manque des fonctions",
  technical_issues: "problème technique", bad_experience: "mauvaise expérience", unused: "ne s'en sert pas", other: "autre", testing: "test",
};

class WhopError extends Error {
  constructor(path, status) {
    super(`${path} : Whop ${status}`);
    this.status = status;
  }
}

async function whopList(path, params = {}, { pages = 40, first = 50 } = {}) {
  if (!process.env.WHOP_API_KEY) throw new WhopError(path, "sans clé");
  const items = [];
  let after = null;
  for (let i = 0; i < pages; i++) {
    const u = new URL(`${API}/${path}`);
    u.searchParams.set("account_id", COMPANY);
    u.searchParams.set("first", String(first));
    for (const [k, v] of Object.entries(params)) for (const x of [].concat(v)) u.searchParams.append(k, x);
    if (after) u.searchParams.set("after", after);
    const res = await fetch(u, { headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` }, cache: "no-store", signal: AbortSignal.timeout(9000) });
    if (!res.ok) throw new WhopError(path, res.status);
    const j = await res.json();
    items.push(...(j.data || []));
    if (!j.page_info?.has_next_page || !j.page_info.end_cursor) return { items, complete: true };
    after = j.page_info.end_cursor;
  }
  return { items, complete: false };
}

// Montant Whop : objet { amount: "12.00", currency } (API récente) ou nombre (versions plus anciennes).
const amount = (x) => (x == null ? 0 : typeof x === "object" ? Number(x.amount) || 0 : Number(x) || 0);
const lower = (x) => (typeof x === "string" ? x.toLowerCase() : "");

function productPlans() {
  const m = {};
  for (const [plan, env] of [["starter", "WHOP_PRODUCT_STARTER"], ["pro", "WHOP_PRODUCT_PRO"], ["lifetime", "WHOP_PRODUCT_LIFETIME"]]) {
    if (process.env[env]) m[process.env[env]] = plan;
  }
  return m;
}

// Minuit à Paris d'un jour « AAAA-MM-JJ » (en millisecondes).
function parisMidnight(day) {
  const guess = Date.parse(`${day}T00:00:00Z`);
  const off = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Paris", timeZoneName: "shortOffset" })
    .formatToParts(new Date(guess)).find((p) => p.type === "timeZoneName")?.value || "GMT+1";
  const m = off.match(/GMT([+-])(\d+)(?::(\d+))?/);
  const mins = m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0)) : 60;
  return guess - mins * 60e3;
}

const monthKey = (ms) => usageDay(new Date(ms)).slice(0, 7);

function addMoney(bag, cur, value) {
  if (!value) return;
  const c = (cur || "eur").toUpperCase();
  bag[c] = Math.round(((bag[c] || 0) + value) * 100) / 100;
}

const settle = async (p) => {
  try { return { ok: true, value: await p }; } catch (e) { return { ok: false, error: e }; }
};
const whopFail = (r) => (r.ok ? null : { status: r.error?.status ?? null, message: r.error?.message || "erreur" });

export async function adminStats(days = 30) {
  const now = Date.now();
  const today = usageDay(new Date(now));
  const sinceDay = usageDay(new Date(now - (days - 1) * 864e5));
  const sinceMs = parisMidnight(sinceDay);
  const monthStart = parisMidnight(`${today.slice(0, 7)}-01`);
  const prevMonthStart = parisMidnight(`${usageDay(new Date(monthStart - 15 * 864e5)).slice(0, 7)}-01`);
  const payFrom = Math.min(sinceMs, prevMonthStart);
  const products = productPlans();

  const [mRes, pRes, cRes, uRes, fRes, rRes, aRes] = await Promise.all([
    settle(whopList("memberships")),
    settle(whopList("payments", { created_after: new Date(payFrom).toISOString() }, { pages: 20, first: 100 })),
    settle(whopList("promo_codes", {}, { pages: 5 })),
    settle(whopList("members", {}, { pages: 40 })),
    settle(dbRpc("basketlog_stats_list", { p_depuis: usageDay(new Date(now - 120 * 864e5)) }, 6000)),
    settle(adminData()),
    settle(dbRpc("basketlog_admin_comptes", { p_limite: 2000 }, 8000)),
  ]);

  // Noms affichés : nom d'utilisateur Whop (jamais l'e-mail).
  const names = {};
  const setName = (uid, username, name) => { if (uid && !names[uid] && (username || name)) names[uid] = username ? `@${username}` : name; };
  const members = uRes.ok ? uRes.value.items.map((m) => {
    const uid = m.user?.id || m.user_id || null;
    setName(uid, m.user?.username, m.name || m.display_name || m.user?.name);
    return { uid, access: m.access_level, status: m.status, joined: Date.parse(m.joined_at || m.created_at || "") || null, action: m.most_recent_action || null, lastSeen: m.last_accessed_at || null };
  }).filter((m) => m.access !== "admin") : [];

  const memberships = mRes.ok ? mRes.value.items.map((m) => {
    const productId = m.product?.id || m.product_id || null;
    const uid = m.user?.id || m.user_id || null;
    setName(uid, m.user?.username, m.user?.name);
    return {
      id: m.id, uid, plan: products[productId] || null, status: lower(m.status),
      created: Date.parse(m.created_at || "") || null,
      canceledAt: Date.parse(m.canceled_at || "") || null,
      cancelAtEnd: !!m.cancel_at_period_end,
      periodEnd: Date.parse(m.current_period_end || m.renewal_period_end || m.expires_at || "") || null,
      promo: m.promo_code?.id || m.promo_code_id || null,
      price: amount(m.renewal_price) || amount(m.initial_price) || null,
      currency: lower(m.renewal_price?.currency || m.initial_price?.currency || m.currency) || null,
      reason: REASONS[m.cancel_option] || m.cancellation_reason || (m.cancel_option ? String(m.cancel_option) : null),
    };
  }) : [];
  const paid = memberships.filter((m) => m.plan && m.status !== "drafted");
  const memPromo = Object.fromEntries(paid.filter((m) => m.promo).map((m) => [m.id, m.promo]));
  const memPlan = Object.fromEntries(paid.map((m) => [m.id, m.plan]));

  const payments = pRes.ok ? pRes.value.items.map((p) => {
    const uid = p.user?.id || p.user_id || null;
    setName(uid, p.user?.username, p.user?.name);
    const membership = p.membership?.id || p.membership_id || null;
    return {
      id: p.id, uid, membership,
      plan: products[p.product?.id || p.product_id] || memPlan[membership] || null,
      status: lower(p.status), substatus: lower(p.substatus), reason: lower(p.billing_reason),
      currency: lower(p.currency || p.total?.currency) || "eur",
      total: amount(p.total), refunded: amount(p.refunded_amount),
      at: Date.parse(p.paid_at || p.created_at || "") || null,
      promo: p.promo_code?.id || p.promo_code_id || memPromo[membership] || null,
    };
  }).filter((p) => p.at) : [];
  const cashed = payments.filter((p) => p.status === "paid" && p.total > 0);

  const codes = cRes.ok ? Object.fromEntries(cRes.value.items.map((c) => [c.id, {
    id: c.id, code: c.code || c.id, status: lower(c.status), uses: Number(c.uses) || 0,
    off: c.promo_type === "percentage" ? `-${Math.round((Number(c.amount_off) <= 1 ? Number(c.amount_off) * 100 : Number(c.amount_off)))} %` : c.amount_off ? `-${c.amount_off} ${String(c.currency || "").toUpperCase()}` : "",
    affiliate: c.affiliate?.user?.username ? `@${c.affiliate.user.username}` : null,
  }])) : {};

  // ---------- en bref ----------
  const active = paid.filter((m) => LIVE.has(m.status));
  const byPlan = { starter: 0, pro: 0, lifetime: 0 };
  for (const m of active) byPlan[m.plan]++;
  const revenue = {};
  for (const p of cashed) if (p.at >= sinceMs) addMoney(revenue, p.currency, p.total - p.refunded);
  const mrr = {};
  for (const m of active) {
    if (m.plan === "lifetime" || m.cancelAtEnd) continue;
    const cur = (m.currency || "eur").toUpperCase();
    addMoney(mrr, cur, m.price || PRICES[cur]?.[m.plan] || PRICES.EUR[m.plan]);
  }
  const newSubs = paid.filter((m) => m.created && m.created >= sinceMs);
  const cancels = paid.filter((m) => m.canceledAt && m.canceledAt >= sinceMs);
  const scheduled = active.filter((m) => m.cancelAtEnd);
  const newMembers = members.filter((m) => m.joined && m.joined >= sinceMs).length;

  // ---------- usage de l'appli ----------
  const uids = [...new Set(paid.map((m) => m.uid).filter(Boolean))].slice(0, 500);
  const usage = await settle(dbRpc("basketlog_usage_stats", { p_uids: uids, p_depuis: sinceDay }, 6000));
  const perAccount = usage.ok ? usage.value?.comptes || {} : {};
  const perDay = usage.ok ? usage.value?.jours || [] : [];

  // ---------- rôles (toi, créateurs) ----------
  const roles = rRes.ok ? Object.fromEntries((rRes.value.roles || []).map((r) => [r.uid, r.role])) : {};
  // Un créateur est désigné par le nom saisi à son invitation (« Gonzopicks »), pas par son nom d'utilisateur Whop (« @matheosds »), gardé à côté.
  const creators = rRes.ok ? creatorNames(rRes.value.roles || []) : {};

  // ---------- liste des abonnés ----------
  const subs = [...paid].sort((a, b) => (b.created || 0) - (a.created || 0)).slice(0, 200).map((m) => {
    const u = perAccount[m.uid] || null;
    let state = "Actif";
    if (!LIVE.has(m.status)) state = m.status === "canceled" || m.status === "expired" ? "Résilié" : m.status === "unresolved" ? "Paiement en échec" : m.status;
    else if (m.status === "past_due") state = "Paiement en retard";
    else if (m.cancelAtEnd) state = "Résiliation prévue";
    return {
      id: m.id, uid: m.uid, name: creators[m.uid] || names[m.uid] || (m.uid ? `Membre …${m.uid.slice(-5)}` : "Membre"), handle: creators[m.uid] ? names[m.uid] || null : null, role: roles[m.uid] || null,
      plan: m.plan, state, live: LIVE.has(m.status) && !m.cancelAtEnd, created: m.created, until: m.cancelAtEnd || !LIVE.has(m.status) ? m.periodEnd || m.canceledAt : null,
      code: m.promo ? codes[m.promo]?.code || "code" : null, reason: m.reason,
      analyses: u?.analyses || 0, days: u?.jours || 0, last: u?.derniere || null,
    };
  });

  // ---------- codes créateurs ----------
  const byCode = {};
  const thisMonth = monthKey(monthStart), lastMonth = monthKey(prevMonthStart);
  const bag = (id) => (byCode[id] ||= { id, code: codes[id]?.code || "code", off: codes[id]?.off || "", affiliate: codes[id]?.affiliate || null, uses: codes[id]?.uses || 0, subs: 0, period: {}, month: {}, prev: {} });
  for (const m of active) if (m.promo) bag(m.promo).subs++;
  for (const p of cashed) {
    if (!p.promo) continue;
    const net = p.total - p.refunded;
    const b = bag(p.promo);
    if (p.at >= sinceMs) addMoney(b.period, p.currency, net);
    const k = monthKey(p.at);
    if (k === thisMonth) addMoney(b.month, p.currency, net);
    else if (k === lastMonth) addMoney(b.prev, p.currency, net);
  }
  for (const c of Object.values(codes)) if (c.status === "active") bag(c.id);
  const scale = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(v * f * 100) / 100]));
  const creatorCodes = Object.values(byCode).map((b) => ({ ...b, monthCommission: scale(b.month, COMMISSION), prevCommission: scale(b.prev, COMMISSION) }))
    .sort((a, b) => b.subs - a.subs || b.uses - a.uses || a.code.localeCompare(b.code));

  // ---------- derniers paiements ----------
  const recent = [...payments].sort((a, b) => b.at - a.at).slice(0, 15).map((p) => ({
    id: p.id, at: p.at, name: creators[p.uid] || names[p.uid] || "Membre", plan: p.plan, total: p.total, refunded: p.refunded, currency: p.currency,
    state: p.status === "paid" ? (p.refunded >= p.total && p.total > 0 ? "Remboursé" : p.refunded > 0 ? "Remboursé en partie" : "Payé") : p.substatus === "failed" || p.status === "uncollectible" ? "Échoué" : p.status === "open" || p.status === "pending" ? "En attente" : p.status,
    code: p.promo ? codes[p.promo]?.code || "code" : null,
    first: p.reason === "subscription_create" || p.reason === "one_time",
  }));

  // ---------- parcours vers l'abonnement ----------
  let funnel = null;
  if (fRes.ok && Array.isArray(fRes.value)) {
    const rows = fRes.value.map((r) => ({ ...r, jour: String(r.jour).slice(0, 10), n: Number(r.n) || 0 }));
    const startDay = rows.length ? rows.reduce((a, r) => (r.jour < a ? r.jour : a), rows[0].jour) : today;
    const from = startDay > sinceDay ? startDay : sinceDay;
    const inP = rows.filter((r) => r.jour >= sinceDay);
    const tot = {}, bySource = {}, byDevice = {}, byLang = {}, byDay = {};
    const add = (o, k, step, n) => { const x = (o[k] ||= {}); x[step] = (x[step] || 0) + n; };
    for (const r of inP) {
      tot[r.etape] = (tot[r.etape] || 0) + r.n;
      add(bySource, r.source, r.etape, r.n);
      add(byDevice, r.appareil, r.etape, r.n);
      add(byLang, r.langue, r.etape, r.n);
      add(byDay, r.jour, r.etape, r.n);
    }
    const fromMs = parisMidnight(from);
    const paidSteps = paid.filter((m) => m.created && m.created >= fromMs).length;
    const steps = [...STEPS.map((s) => ({ ...s, n: tot[s.id] || 0 })), { id: "paye", label: "Abonnement payé", hint: "nouveaux abonnés chez Whop", n: paidSteps }];
    // Plus grosse perte entre deux étapes (sur assez de monde pour être parlante).
    let worst = null;
    for (let i = 0; i < steps.length - 1; i++) {
      const a = steps[i].n, b = steps[i + 1].n;
      if (a < 10) continue;
      const lost = 1 - Math.min(b, a) / a;
      if (!worst || lost > worst.lost) worst = { from: steps[i], to: steps[i + 1], lost };
    }
    const sort = (o) => Object.entries(o).map(([k, v]) => ({ key: k, ...v })).sort((x, y) => (y.visite || 0) - (x.visite || 0));
    const daysList = [];
    for (let d = sinceDay, i = 0; d <= today && i < 120; d = usageDay(new Date(parisMidnight(d) + 36 * 3600e3)), i++) {
      daysList.push({ day: d, visite: byDay[d]?.visite || 0, clic: byDay[d]?.clic || 0, fenetre: byDay[d]?.fenetre || 0 });
    }
    funnel = { startDay, from, steps, worst, sources: sort(bySource), devices: sort(byDevice), langs: sort(byLang), days: daysList, side: { compte: tot.compte || 0, retour: tot.retour || 0 } };
  }

  // Comptes Basketlog : null tant que supabase/comptes.sql n'est pas lancé (ou base injoignable).
  let comptes = null;
  if (aRes.ok && aRes.value && typeof aRes.value === "object") {
    const a = aRes.value;
    const list = Array.isArray(a.comptes) ? a.comptes : [];
    const jours = Array.isArray(a.jours) ? a.jours.map((x) => ({ jour: String(x.jour), n: Number(x.n) || 0 })) : [];
    comptes = {
      total: Number(a.total) || 0, marketing: Number(a.marketing) || 0, google: Number(a.google) || 0, relies: Number(a.abonnes_relies) || 0,
      periode: list.filter((c) => Date.parse(c.cree_le) >= sinceMs).length,
      jours,
      list: list.map((c) => ({ email: String(c.email || ""), nom: c.nom || null, langue: c.langue || null, marketing: !!c.marketing, google: !!c.google, relie: !!c.abonne_relie, cree: Date.parse(c.cree_le) || null, vu: Date.parse(c.vu_le) || null })),
    };
  }

  return {
    days, sinceDay, today, generatedAt: now, comptes,
    whop: {
      memberships: whopFail(mRes), payments: whopFail(pRes), codes: whopFail(cRes), members: whopFail(uRes),
      partial: [mRes, pRes, uRes].some((r) => r.ok && !r.value.complete),
    },
    db: { funnel: fRes.ok ? null : fRes.error?.message || "erreur", usage: usage.ok ? null : usage.error?.message || "erreur" },
    kpi: {
      active: active.length, byPlan, revenue, mrr, newSubs: newSubs.length, cancels: cancels.length, scheduled: scheduled.length, newMembers,
      analyses: perDay.reduce((s, d) => s + (Number(d.analyses) || 0), 0), activeDays: perDay.length,
    },
    funnel, subs, creatorCodes, recent, monthLabels: { thisMonth, lastMonth },
  };
}
