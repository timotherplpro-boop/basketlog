// Adresse e-mail du compte Whop d'un membre connecté, lue côté serveur, uniquement quand il demande la newsletter.
// Basketlog ne garde jamais les adresses : elles restent chez Whop ; celle-ci part chez Resend (prestataire d'envoi)
// avec l'accord explicite du membre, et n'est jamais renvoyée à la page en entier (voir maskEmail dans lib/resend.js).
// Aucune dépendance à Next.
//
// Whop range l'adresse dans la fiche du MEMBRE (GET /members, champ `email`), pas dans l'abonnement (GET /memberships) ni dans
// l'objet `user` de la fiche. Permissions de la clé API du site (whop.com/dashboard/developer, « Account API Keys ») :
// member:basic:read pour lire les membres, et member:email:read, sans laquelle Whop renvoie `email: null`.
const API = "https://api.whop.com/api/v1";
const company = () => process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";
const MAX_PAGES = 10; // seulement si Whop ignore le filtre par compte : 10 pages de 100 fiches au plus

// kind : nokey (pas de clé API), scope (clé refusée par Whop), network (Whop injoignable ou en erreur), noemail (Whop répond mais
// ne donne pas d'adresse pour ce compte : pas de fiche membre, `email` vide faute de permission, ou adresse illisible).
// detail (noemail seulement) : indicateurs sans donnée personnelle, pour le contrôle admin (?diag=1).
export class WhopEmailError extends Error {
  constructor(kind, message, detail) {
    super(message);
    this.name = "WhopEmailError";
    this.kind = kind;
    if (detail) this.detail = detail;
  }
}

const EMAIL = /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]{2,}$/;

// Adresse du compte connecté (uid vient de la session signée). Whop filtre par compte (user_ids) ; chaque fiche est quand même
// comparée à l'identifiant de la session : la fiche d'un autre compte n'est jamais prise en compte. Si Whop ignorait le filtre,
// la lecture continue page par page jusqu'à la fiche du compte.
export async function memberEmail(uid, { fetch: f = globalThis.fetch, key = process.env.WHOP_API_KEY } = {}) {
  if (!key) throw new WhopEmailError("nokey", "WHOP_API_KEY absente");
  if (typeof uid !== "string" || !/^[A-Za-z0-9_]{3,80}$/.test(uid)) throw new WhopEmailError("noemail", "compte invalide");
  let after = null;
  let rowsSeen = 0;
  let matched = false;
  let emailField = "absent";
  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`${API}/members`);
    url.searchParams.set("account_id", company());
    url.searchParams.append("user_ids", uid);
    url.searchParams.set("first", page === 0 ? "10" : "100");
    if (after) url.searchParams.set("after", after);
    let res;
    try {
      res = await f(url, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store", signal: AbortSignal.timeout(8000) });
    } catch (e) {
      throw new WhopEmailError("network", `Whop ${e?.name === "TimeoutError" ? "délai dépassé" : "injoignable"}`);
    }
    if (res.status === 401 || res.status === 403) throw new WhopEmailError("scope", `Whop ${res.status}`);
    if (!res.ok) throw new WhopEmailError("network", `Whop ${res.status}`);
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json?.data) ? json.data : [];
    rowsSeen += rows.length;
    for (const m of rows) {
      if (m?.user?.id !== uid) continue;
      matched = true;
      emailField = typeof m.email === "string" ? "texte" : m.email === null ? "null" : "absent";
      if (typeof m.email !== "string") continue;
      const mail = m.email.trim().toLowerCase();
      if (EMAIL.test(mail) && mail.length <= 254) return mail;
      emailField = "invalide";
    }
    // Filtre respecté : toutes les fiches reçues sont celles du compte, inutile de lire la suite.
    if (!rows.some((m) => m?.user?.id !== uid)) break;
    if (!json?.page_info?.has_next_page || !json.page_info.end_cursor) break;
    after = json.page_info.end_cursor;
  }
  const why = !matched
    ? "Whop n'a pas de fiche membre pour ce compte"
    : emailField === "null"
      ? "Whop ne renvoie pas l'adresse de ce compte (permission member:email:read de la clé, ou compte sans adresse)"
      : "Whop ne donne pas d'adresse lisible pour ce compte";
  throw new WhopEmailError("noemail", why, { matched, emailField, rows: rowsSeen });
}
