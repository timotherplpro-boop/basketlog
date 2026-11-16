// Statistiques de l'espace admin (page /app/admin/stats), réservées à l'admin :
// - abonnés, paiements et codes promo des créateurs : Whop, lu en direct avec la clé API du site ;
// - parcours des visiteurs vers l'abonnement : compteurs anonymes de la base (lib/funnel.js, /api/stats) ;
// - utilisation de l'appli : analyses complètes ouvertes (base).
// - comptes Basketlog (e-mail ou Google, supabase/comptes.sql) : nombre et liste pour l'export.
// Aucune adresse e-mail de Whop n'est lue ; les adresses des comptes Basketlog ne servent qu'à la liste de l'admin.
import { dbRpc, adminData } from "./roles";
import { creatorNames } from "./accounts";
import { usageDay } from "./usage";
import { PRICES } from "./pricing";
import { STEPS } from "./funnel-steps";
import { commissionOf } from "./commission"; // part reversée au créateur (40 % du montant hors TVA) : la même que dans sa rubrique « Mes gains »
import { LIVE, addMoney, membershipPromos, promoOf } from "./creator-report";
import { amount, lower, productPlans, settle, whopList } from "./whop-read";

// Raison de résiliation choisie chez Whop
const REASONS = {
  too_expensive: "trop cher", switching: "passe à un autre service", missing_features: "il manque des fonctions",
  technical_issues: "problème technique", bad_experience: "mauvaise expérience", unused: "ne s'en sert pas", other: "autre", testing: "test",
};

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
      promo: p.promo_code?.id || p.promo_code_id || null,
    };
  }).filter((p) => p.at) : [];
  // Code promo de chaque abonnement et paiement : même règle que la rubrique « Mes gains » des créateurs (lib/creator-report.js),
  // pour que le créateur et l'admin voient les mêmes chiffres.
  const byMem = membershipPromos(paid, payments);
  const promoFor = (p) => promoOf(p, byMem);
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
      code: byMem.get(m.id) ? codes[byMem.get(m.id)]?.code || "code" : null, reason: m.reason,
      analyses: u?.analyses || 0, days: u?.jours || 0, last: u?.derniere || null,
    };
  });

  // ---------- codes créateurs ----------
  const byCode = {};
  const thisMonth = monthKey(monthStart), lastMonth = monthKey(prevMonthStart);
  const bag = (id) => (byCode[id] ||= { id, code: codes[id]?.code || "code", off: codes[id]?.off || "", affiliate: codes[id]?.affiliate || null, uses: codes[id]?.uses || 0, subs: 0, period: {}, month: {}, prev: {} });
  for (const m of active) if (byMem.get(m.id)) bag(byMem.get(m.id)).subs++;
  for (const p of cashed) {
    const pid = promoFor(p);
    if (!pid) continue;
    const net = p.total - p.refunded;
    const b = bag(pid);
    if (p.at >= sinceMs) addMoney(b.period, p.currency, net);
    const k = monthKey(p.at);
    if (k === thisMonth) addMoney(b.month, p.currency, net);
    else if (k === lastMonth) addMoney(b.prev, p.currency, net);
  }
  for (const c of Object.values(codes)) if (c.status === "active") bag(c.id);
  const share = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, commissionOf(v)])); // montant payé -> 40 % du montant hors TVA
  const creatorCodes = Object.values(byCode).map((b) => ({ ...b, monthCommission: share(b.month), prevCommission: share(b.prev) }))
    .sort((a, b) => b.subs - a.subs || b.uses - a.uses || a.code.localeCompare(b.code));

  // ---------- derniers paiements ----------
  const recent = [...payments].sort((a, b) => b.at - a.at).slice(0, 15).map((p) => ({
    id: p.id, at: p.at, name: creators[p.uid] || names[p.uid] || "Membre", plan: p.plan, total: p.total, refunded: p.refunded, currency: p.currency,
    state: p.status === "paid" ? (p.refunded >= p.total && p.total > 0 ? "Remboursé" : p.refunded > 0 ? "Remboursé en partie" : "Payé") : p.substatus === "failed" || p.status === "uncollectible" ? "Échoué" : p.status === "open" || p.status === "pending" ? "En attente" : p.status,
    code: promoFor(p) ? codes[promoFor(p)]?.code || "code" : null,
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
      total: Number(a.total) || 0, google: Number(a.google) || 0, relies: Number(a.abonnes_relies) || 0,
      periode: list.filter((c) => Date.parse(c.cree_le) >= sinceMs).length,
      semaine: list.filter((c) => Date.parse(c.cree_le) >= now - 7 * 864e5).length,
      jours,
      list: list.map((c) => ({ email: String(c.email || ""), nom: c.nom || null, langue: c.langue || null, google: !!c.google, relie: !!c.abonne_relie, cree: Date.parse(c.cree_le) || null, vu: Date.parse(c.vu_le) || null })),
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
