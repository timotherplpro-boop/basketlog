// Adresse e-mail du compte Whop d'un membre connecté, lue côté serveur, uniquement quand il demande la newsletter.
// Basketlog ne garde jamais les adresses : elles restent chez Whop ; celle-ci part chez Resend (prestataire d'envoi)
// avec l'accord explicite du membre, et n'est jamais renvoyée à la page en entier (voir maskEmail dans lib/resend.js).
// Aucune dépendance à Next. Permission de la clé API du site : member:basic:read, plus member:email:read si Whop ne
// renvoie pas l'adresse (whop.com/dashboard/developer, « Account API Keys »).
const API = "https://api.whop.com/api/v1";
const company = () => process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";

// kind : nokey (pas de clé API), scope (clé sans le droit de lire les adresses), network (Whop injoignable ou en erreur),
// noemail (Whop répond mais ne donne pas d'adresse pour ce compte).
export class WhopEmailError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = "WhopEmailError";
    this.kind = kind;
  }
}

const EMAIL = /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]{2,}$/;

// Adresse du compte connecté (uid vient de la session signée). Whop filtre par compte ; chaque fiche est quand même
// comparée à l'identifiant de la session : une fiche d'un autre compte n'est jamais prise en compte.
export async function memberEmail(uid, { fetch: f = globalThis.fetch, key = process.env.WHOP_API_KEY } = {}) {
  if (!key) throw new WhopEmailError("nokey", "WHOP_API_KEY absente");
  if (typeof uid !== "string" || !/^[A-Za-z0-9_]{3,80}$/.test(uid)) throw new WhopEmailError("noemail", "compte invalide");
  const url = new URL(`${API}/memberships`);
  url.searchParams.set("user_id", uid);
  url.searchParams.set("account_id", company());
  url.searchParams.set("first", "50");
  let res;
  try {
    res = await f(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
  } catch (e) {
    throw new WhopEmailError("network", `Whop ${e?.name === "TimeoutError" ? "délai dépassé" : "injoignable"}`);
  }
  if (res.status === 401 || res.status === 403) throw new WhopEmailError("scope", `Whop ${res.status}`);
  if (!res.ok) throw new WhopEmailError("network", `Whop ${res.status}`);
  const json = await res.json().catch(() => null);
  for (const m of Array.isArray(json?.data) ? json.data : []) {
    const u = m?.user;
    if (u?.id !== uid || typeof u.email !== "string") continue;
    const mail = u.email.trim().toLowerCase();
    if (EMAIL.test(mail) && mail.length <= 254) return mail;
  }
  throw new WhopEmailError("noemail", "Whop ne donne pas d'adresse pour ce compte");
}
