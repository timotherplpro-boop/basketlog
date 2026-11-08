// Abonnements d'un membre chez Whop (API v1) : lecture, résiliation en fin de période, reprise.
// Aucune dépendance à Next. Utilisé par /api/compte (page « Mon compte »).
//
// Permissions de la clé API du site (whop.com/dashboard/developer, « Account API Keys »), déjà couvertes par une clé
// aux droits de propriétaire : member:basic:read (lister), membership:cancel ou member:manage (résilier), member:manage (reprendre).
//
// Règles de sécurité de ce fichier :
//  - une action n'est jamais lancée sur un abonnement qui n'appartient pas au compte connecté : la fiche est relue chez Whop
//    et l'acheteur comparé à l'identifiant de la session (le filtre « user_id » de Whop ne sert pas de preuve) ;
//  - on ne résilie QU'EN FIN DE PÉRIODE (cancel_at_period_end: true), comme le promettent les CGV : l'accès payé n'est jamais coupé ;
//  - chaque écriture est suivie d'une relecture : le résultat annoncé au membre est celui que Whop a réellement enregistré.
import { buildPlans, normalizeMembership, planOf } from "./account";

const API = "https://api.whop.com/api/v1";
const company = () => process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";

export const whopAccountReady = () => !!process.env.WHOP_API_KEY;
export const productIds = () => ({
  lifetime: process.env.WHOP_PRODUCT_LIFETIME,
  pro: process.env.WHOP_PRODUCT_PRO,
  starter: process.env.WHOP_PRODUCT_STARTER,
});

// kind : nokey (pas de clé), scope (clé sans la permission), notfound, conflict, invalid (Whop refuse l'action),
// network (Whop injoignable ou en erreur), forbidden (l'abonnement n'est pas celui du compte connecté),
// inactive (rien à faire sur cet abonnement), unconfirmed (Whop n'a pas enregistré le changement demandé).
export class WhopAccountError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = "WhopAccountError";
    this.kind = kind;
    Object.assign(this, extra);
  }
}

async function call(method, path, { query, body } = {}) {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new WhopAccountError("nokey", "WHOP_API_KEY absente");
  const url = new URL(`${API}${path}`);
  for (const [k, v] of Object.entries(query || {})) for (const x of [].concat(v)) url.searchParams.append(k, String(x));
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${key}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(9000),
    });
  } catch (e) {
    throw new WhopAccountError("network", `${method} ${path} : ${e?.name === "TimeoutError" ? "délai dépassé" : "Whop injoignable"}`);
  }
  const json = await res.json().catch(() => null);
  if (res.ok) return json;
  const detail = String(json?.error?.message || json?.message || "").replace(/\s+/g, " ").slice(0, 200);
  const kind = res.status === 401 || res.status === 403 ? "scope"
    : res.status === 404 ? "notfound"
    : res.status === 409 ? "conflict"
    : res.status === 400 || res.status === 422 ? "invalid"
    : "network";
  throw new WhopAccountError(kind, `${method} ${path} : Whop ${res.status}${detail ? ` (${detail})` : ""}`, { status: res.status, detail });
}

// Tous les abonnements du compte chez Basketlog (anciens compris), normalisés. Seules les fiches dont l'acheteur est
// bien ce compte sont gardées. Lève WhopAccountError si Whop ne répond pas.
export async function listMemberships(uid) {
  if (!uid) throw new WhopAccountError("forbidden", "compte inconnu");
  const ids = productIds();
  const out = [];
  let after = null;
  for (let page = 0; page < 5; page++) {
    const j = await call("GET", "/memberships", { query: { user_id: uid, account_id: company(), first: 100, ...(after ? { after } : {}) } });
    for (const raw of Array.isArray(j?.data) ? j.data : []) {
      const m = normalizeMembership(raw, ids);
      if (m && m.uid === uid) out.push(m);
    }
    if (!j?.page_info?.has_next_page || !j.page_info.end_cursor) break;
    after = j.page_info.end_cursor;
  }
  return out;
}

// Abonnements à afficher dans « Mon compte » (voir buildPlans).
export async function listPlans(uid) {
  return buildPlans(await listMemberships(uid));
}

// Un abonnement relu chez Whop, à condition qu'il soit bien à ce compte et que ce soit une formule Basketlog.
async function ownedMembership(uid, id) {
  if (!uid || typeof id !== "string" || !/^[A-Za-z0-9_]{3,80}$/.test(id)) throw new WhopAccountError("forbidden", "identifiant d'abonnement invalide");
  const m = normalizeMembership(await call("GET", `/memberships/${encodeURIComponent(id)}`), productIds());
  if (!m || m.id !== id || m.uid !== uid || !m.tier) throw new WhopAccountError("forbidden", "abonnement d'un autre compte ou d'un autre produit");
  return m;
}

// Relecture après une écriture. Whop peut mettre un instant à refléter le changement : si la première lecture ne montre pas
// encore l'état demandé (wanted), une seconde est faite après une courte pause ; la dernière lecture fait foi.
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
async function reread(uid, id, wanted) {
  const first = await ownedMembership(uid, id);
  if (wanted(first)) return first;
  await pause(REREAD_DELAY_MS);
  return ownedMembership(uid, id);
}
export const REREAD_DELAY_MS = 800;

// Résilie en fin de période : l'abonnement reste actif jusqu'à la fin de la période déjà payée, puis ne se renouvelle plus.
// Renvoie { plan, already } : plan = ce que Whop a enregistré après l'action ; already = c'était déjà résilié.
export async function cancelMembership(uid, id) {
  const before = await ownedMembership(uid, id);
  const plan = planOf(before);
  if (!plan) throw new WhopAccountError("inactive", "cet abonnement n'est plus en cours");
  if (plan.state === "ends") return { plan, already: true };
  if (!plan.canCancel) throw new WhopAccountError("inactive", "cet abonnement ne se résilie pas (paiement unique)");
  await call("POST", `/memberships/${encodeURIComponent(id)}/cancel`, { body: { cancel_at_period_end: true } });
  const stopsAtEnd = (m) => m.cancelAtPeriodEnd && planOf(m)?.state === "ends";
  const after = await reread(uid, id, stopsAtEnd);
  const now = planOf(after);
  // Whop doit avoir enregistré « arrêt à la fin de la période » ; un arrêt immédiat ou aucun arrêt n'est pas ce qui était demandé.
  if (!stopsAtEnd(after)) {
    throw new WhopAccountError("unconfirmed", `après la résiliation, Whop indique : statut ${after.status}, arrêt en fin de période : ${after.cancelAtPeriodEnd}`);
  }
  return { plan: now, already: false };
}

// Annule la résiliation : l'abonnement se renouvelle de nouveau à la prochaine échéance.
export async function resumeMembership(uid, id) {
  const before = await ownedMembership(uid, id);
  const plan = planOf(before);
  if (plan && (plan.state === "renews" || plan.state === "past_due")) return { plan, already: true };
  if (!plan?.canResume) throw new WhopAccountError("inactive", "cet abonnement ne peut plus être repris");
  await call("POST", `/memberships/${encodeURIComponent(id)}/uncancel`);
  const renewsAgain = (m) => !m.cancelAtPeriodEnd && !!planOf(m)?.canCancel;
  const after = await reread(uid, id, renewsAgain);
  const now = planOf(after);
  if (!renewsAgain(after)) {
    throw new WhopAccountError("unconfirmed", `après la reprise, Whop indique : statut ${after.status}, arrêt en fin de période : ${after.cancelAtPeriodEnd}`);
  }
  return { plan: now, already: false };
}
