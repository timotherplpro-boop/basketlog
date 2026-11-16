// Lecture de l'API Whop (v1) avec la clé du site : listes paginées, montants, formules. Aucune dépendance à Next.
// Partagé par l'espace admin (lib/admin-stats.js) et la rubrique « Mes gains » des créateurs (lib/creator-stats.js).
export const API = "https://api.whop.com/api/v1";
export const COMPANY = process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";

export class WhopError extends Error {
  constructor(path, status) {
    super(`${path} : Whop ${status}`);
    this.status = status;
  }
}

// { items, complete } : complete est faux quand la limite de pages est atteinte avant la fin de la liste.
export async function whopList(path, params = {}, { pages = 40, first = 50 } = {}) {
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
export const amount = (x) => (x == null ? 0 : typeof x === "object" ? Number(x.amount) || 0 : Number(x) || 0);
export const lower = (x) => (typeof x === "string" ? x.toLowerCase() : "");

// Identifiant de produit Whop -> formule (réglages WHOP_PRODUCT_STARTER / PRO / LIFETIME).
export function productPlans() {
  const m = {};
  for (const [plan, env] of [["starter", "WHOP_PRODUCT_STARTER"], ["pro", "WHOP_PRODUCT_PRO"], ["lifetime", "WHOP_PRODUCT_LIFETIME"]]) {
    if (process.env[env]) m[process.env[env]] = plan;
  }
  return m;
}

// { ok, value } ou { ok: false, error } : une lecture qui échoue n'empêche pas les autres.
export const settle = async (p) => {
  try { return { ok: true, value: await p }; } catch (e) { return { ok: false, error: e }; }
};
