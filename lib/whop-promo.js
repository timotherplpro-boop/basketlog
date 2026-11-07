// Codes promo des créateurs chez Whop (API v1) : création, vérification et désactivation. Aucune dépendance à Next.
// Le client saisit son code sur /pro (qui le transmet dans le lien de paiement) ou sur la page de paiement Whop : le
// code doit donc exister chez Whop. Basketlog le crée lui-même, relit ce que Whop a réellement enregistré et ne le
// déclare prêt que si tout correspond (remise, type, durée, état). Au moindre écart, le code est désactivé aussitôt.
//
// Permissions de la clé API du site (whop.com/dashboard/developer, « Account API Keys ») :
//   promo_code:create (créer), promo_code:update (activer, désactiver), promo_code:basic:read (lister).

const API = "https://api.whop.com/api/v1";
const company = () => process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";

export const whopPromoReady = () => !!process.env.WHOP_API_KEY;

// Durée de la remise, en paiements : 0 = à chaque paiement tant que l'abonnement dure (valeur par défaut),
// 1 = premier paiement seulement, N = N premiers paiements. Réglable avec la variable WHOP_PROMO_MONTHS.
export function promoMonths() {
  const raw = process.env.WHOP_PROMO_MONTHS;
  const n = raw == null || raw === "" ? 0 : Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 36 ? n : 0;
}

// kind : nokey (pas de clé), scope (clé sans la permission), conflict (409 : le code existe déjà), invalid (valeurs
// refusées), notfound, network (Whop injoignable ou en erreur), mismatch (Whop a enregistré autre chose : code désactivé),
// differs (le code existe déjà chez Whop avec d'autres réglages).
export class WhopPromoError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = "WhopPromoError";
    this.kind = kind;
    Object.assign(this, extra);
  }
}

async function call(method, path, { query, body } = {}) {
  const key = process.env.WHOP_API_KEY;
  if (!key) throw new WhopPromoError("nokey", "WHOP_API_KEY absente");
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
    throw new WhopPromoError("network", `${method} ${path} : ${e?.name === "TimeoutError" ? "délai dépassé" : "Whop injoignable"}`);
  }
  const json = await res.json().catch(() => null);
  if (res.ok) return json;
  const detail = String(json?.error?.message || json?.message || "").replace(/\s+/g, " ").slice(0, 200);
  const kind = res.status === 401 || res.status === 403 ? "scope"
    : res.status === 404 ? "notfound"
    : res.status === 409 ? "conflict"
    : res.status === 400 || res.status === 422 ? "invalid"
    : "network";
  throw new WhopPromoError(kind, `${method} ${path} : Whop ${res.status}${detail ? ` (${detail})` : ""}`, { status: res.status, detail });
}

// Remise d'un code Whop en %, ou null. Whop renvoie les pourcentages en fraction décimale (0.25 pour 25 %).
export function asPct(p) {
  const x = Number(p?.amount_off);
  return p?.promo_type === "percentage" && p?.amount_off != null && Number.isFinite(x) ? Math.round(x * 10000) / 100 : null;
}

// Écarts entre ce que Whop a enregistré et ce qu'on voulait (liste vide : tout correspond). Chaque écart est un objet
// { k, got, want } (k : vide, code, type, remise, etat, duree, paiements, nouveaux, expire, stock), à mettre en phrase
// avec describeProblem.
export function checkPromo(p, { code, pct, months = promoMonths() }) {
  if (!p || typeof p !== "object") return [{ k: "vide" }];
  const bad = [];
  if (String(p.code || "").toUpperCase() !== String(code).toUpperCase()) bad.push({ k: "code", got: p.code ?? null, want: code });
  if (p.promo_type !== "percentage") bad.push({ k: "type", got: p.promo_type ?? null, want: "percentage" });
  const got = asPct(p);
  if (got == null || Math.abs(got - pct) > 1e-6) bad.push({ k: "remise", got, want: pct });
  if (p.status !== "active") bad.push({ k: "etat", got: p.status ?? null, want: "active" });
  const want = months === 0 ? "forever" : months === 1 ? "once" : "repeating";
  if (p.duration !== want) bad.push({ k: "duree", got: p.duration ?? null, want });
  else if (want === "repeating" && Number(p.promo_duration_months) !== months) bad.push({ k: "paiements", got: p.promo_duration_months ?? null, want: months });
  if (p.new_users_only === true) bad.push({ k: "nouveaux" });
  if (p.expires_at) bad.push({ k: "expire", got: p.expires_at });
  if (p.unlimited_stock === false) bad.push({ k: "stock", got: p.stock ?? null });
  return bad;
}

// Un écart en phrase courte, dans la langue de `t` (t(fr, en, es)) ; sans `t`, en français.
export function describeProblem(p, t = (fr) => fr) {
  const dur = (d) => ({
    forever: t("à chaque paiement", "every payment", "cada pago"),
    once: t("premier paiement seulement", "first payment only", "solo el primer pago"),
    repeating: t("plusieurs paiements", "several payments", "varios pagos"),
  })[d] || String(d ?? "?");
  const n = (x) => String(x ?? "?");
  switch (p?.k) {
    case "vide": return t("réponse vide de Whop", "empty response from Whop", "respuesta vacía de Whop");
    case "code": return t(`nom du code : « ${n(p.got)} »`, `code name: “${n(p.got)}”`, `nombre del código: «${n(p.got)}»`);
    case "type": return t(`type de remise : ${n(p.got)} au lieu d'un pourcentage`, `discount type: ${n(p.got)} instead of a percentage`, `tipo de descuento: ${n(p.got)} en lugar de un porcentaje`);
    case "remise": return t(`remise de ${n(p.got)} % au lieu de ${n(p.want)} %`, `discount of ${n(p.got)}% instead of ${n(p.want)}%`, `descuento del ${n(p.got)} % en lugar del ${n(p.want)} %`);
    case "etat": return t(`statut « ${n(p.got)} »`, `status “${n(p.got)}”`, `estado «${n(p.got)}»`);
    case "duree": return t(`durée : ${dur(p.got)} au lieu de ${dur(p.want)}`, `duration: ${dur(p.got)} instead of ${dur(p.want)}`, `duración: ${dur(p.got)} en lugar de ${dur(p.want)}`);
    case "paiements": return t(`${n(p.got)} paiements au lieu de ${n(p.want)}`, `${n(p.got)} payments instead of ${n(p.want)}`, `${n(p.got)} pagos en lugar de ${n(p.want)}`);
    case "nouveaux": return t("réservé aux nouveaux clients", "limited to new customers", "reservado a clientes nuevos");
    case "expire": return t(`expire le ${n(p.got)}`, `expires on ${n(p.got)}`, `caduca el ${n(p.got)}`);
    case "stock": return t(`utilisations limitées à ${n(p.got)}`, `uses limited to ${n(p.got)}`, `usos limitados a ${n(p.got)}`);
    default: return String(p?.k ?? "?");
  }
}
export const describeProblems = (list, t = (fr) => fr) => [].concat(list || []).map((p) => describeProblem(p, t)).join(t(" ; ", "; ", "; "));

const summary = (p) => ({ id: p.id, code: String(p.code || "").toUpperCase(), pct: asPct(p), status: p.status });

// Tous les codes du compte Whop (actifs, désactivés, archivés), 100 par page.
export async function listPromos() {
  const all = [];
  let after = null;
  for (let page = 0; page < 20; page++) {
    const j = await call("GET", "/promo_codes", { query: { account_id: company(), first: 100, ...(after ? { after } : {}) } });
    all.push(...(Array.isArray(j?.data) ? j.data : []));
    if (!j?.page_info?.has_next_page || !j.page_info.end_cursor) break;
    after = j.page_info.end_cursor;
  }
  return all;
}

// Le code chez Whop (sans tenir compte de la casse) : l'actif d'abord, sinon le désactivé, sinon l'archivé. null s'il n'existe pas.
export async function findPromo(code) {
  const want = String(code).toUpperCase();
  const rank = { active: 0, inactive: 1, archived: 2 };
  const hits = (await listPromos()).filter((p) => String(p.code || "").toUpperCase() === want);
  hits.sort((a, b) => (rank[a.status] ?? 3) - (rank[b.status] ?? 3));
  return hits[0] || null;
}

async function deactivate(id) {
  return call("POST", `/promo_codes/${encodeURIComponent(id)}/deactivate`);
}

// Crée le code chez Whop : remise en %, tous les clients (même ceux qui ont déjà un compte gratuit), une seule fois par client,
// sans limite d'utilisations ni date d'expiration, sur toutes les formules. Relit le résultat : si Whop a enregistré autre chose
// que demandé (remise, durée…), le code est désactivé tout de suite et une erreur « mismatch » est levée.
export async function createPromo({ code, pct }) {
  const months = promoMonths();
  const p = await call("POST", "/promo_codes", {
    body: {
      account_id: company(),
      code,
      amount_off: pct,
      base_currency: "eur",
      promo_type: "percentage",
      promo_duration_months: months,
      new_users_only: false,
      one_per_customer: true,
      unlimited_stock: true,
    },
  });
  const bad = checkPromo(p, { code, pct, months });
  if (bad.length) {
    let off = !!p && p.status !== "active";
    if (p?.id && p.status === "active") {
      try { await deactivate(p.id); off = true; } catch { /* signalé par `deactivated: false` */ }
    }
    throw new WhopPromoError("mismatch", `Whop a enregistré autre chose que demandé : ${describeProblems(bad)}`, { problems: bad, id: p?.id || null, deactivated: off });
  }
  return summary(p);
}

// Fait en sorte que le code existe, actif, avec la bonne remise. Renvoie { state, promo } :
//   created : créé à l'instant ; exists : déjà chez Whop avec les bons réglages ; reactivated : était désactivé, réactivé.
// Si le code existe déjà avec d'autres réglages (remise différente, archivé…), lève « differs » : Whop ne permet pas de les modifier.
export async function ensurePromo({ code, pct }) {
  try {
    return { state: "created", promo: await createPromo({ code, pct }) };
  } catch (e) {
    if (!(e instanceof WhopPromoError) || e.kind !== "conflict") throw e;
  }
  const found = await findPromo(code);
  if (!found) throw new WhopPromoError("conflict", `Whop refuse de créer ${code} (409) sans qu'un code de ce nom soit listé`);
  const bad = checkPromo(found, { code, pct });
  if (!bad.length) return { state: "exists", promo: summary(found) };
  if (found.status === "inactive" && bad.length === 1 && bad[0].k === "etat") {
    const back = await call("POST", `/promo_codes/${encodeURIComponent(found.id)}/activate`);
    const still = checkPromo(back, { code, pct });
    if (!still.length) return { state: "reactivated", promo: summary(back) };
    throw new WhopPromoError("differs", `Le code existe chez Whop mais n'a pas pu être réactivé : ${describeProblems(still)}`, { problems: still, found: summary(found) });
  }
  throw new WhopPromoError("differs", `Le code existe déjà chez Whop avec d'autres réglages : ${describeProblems(bad)}`, { problems: bad, found: summary(found) });
}

// Désactive le code chez Whop (il ne peut plus servir). state : disabled, already (déjà désactivé ou archivé) ou absent.
export async function disablePromo(code) {
  const found = await findPromo(code);
  if (!found) return { state: "absent" };
  if (found.status !== "active") return { state: "already", status: found.status };
  await deactivate(found.id);
  return { state: "disabled" };
}
