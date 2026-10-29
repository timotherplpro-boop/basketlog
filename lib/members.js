// Nombre réel de membres Basketlog (comptes gratuits et abonnés), lu chez Whop côté serveur.
// Aucune estimation : si Whop ne répond pas, la fonction renvoie null et rien n'est affiché.
import { unstable_cache } from "next/cache";

const API = "https://api.whop.com/api/v1";
const COMPANY = process.env.WHOP_COMPANY_ID || "biz_pE2L6siofBGnW6";
const PAGE = 50;
const MAX_PAGES = 40; // 2 000 fiches lues au plus : au-delà, le chiffre affiché reste un minimum garanti

async function whopList(path, params) {
  const items = [];
  let after = null;
  for (let i = 0; i < MAX_PAGES; i++) {
    const u = new URL(`${API}/${path}`);
    u.searchParams.set("account_id", COMPANY);
    u.searchParams.set("first", String(PAGE));
    for (const [k, v] of Object.entries(params)) for (const x of [].concat(v)) u.searchParams.append(k, x);
    if (after) u.searchParams.set("after", after);
    const res = await fetch(u, {
      headers: { Authorization: `Bearer ${process.env.WHOP_API_KEY}` },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`${path} : Whop ${res.status}`);
    const j = await res.json();
    items.push(...(j.data || []));
    if (!j.page_info?.has_next_page || !j.page_info.end_cursor) return { items, complete: true };
    after = j.page_info.end_cursor;
  }
  return { items, complete: false };
}

// Statuts d'abonnement qui donnent encore accès (un compte gratuit est « active » ou « completed »).
const LIVE = new Set(["active", "trialing", "past_due", "completed", "canceling", "expiring", "one_time", "paused"]);

async function countMembers() {
  if (!process.env.WHOP_API_KEY) return null;
  // 1) Membres de l'entreprise : une fiche par personne, hors administrateurs.
  try {
    const { items, complete } = await whopList("members", { statuses: "joined", access_level: "customer" });
    const n = items.filter((m) => m.status === "joined" && m.access_level === "customer").length;
    console.log(`[membres] ${n} membres Whop (liste des membres${complete ? "" : ", lecture plafonnée"})`);
    if (n === 0) {
      // Contrôle, en chiffres seulement : ce que Whop renvoie sans filtre (ex. le propriétaire, compté comme admin).
      const { items: raw } = await whopList("members", {}).catch(() => ({ items: [] }));
      const mix = {};
      for (const m of raw) mix[`${m.access_level}/${m.status}`] = (mix[`${m.access_level}/${m.status}`] || 0) + 1;
      console.log(`[membres] contrôle sans filtre : ${raw.length} fiche(s) ${JSON.stringify(mix)}`);
    }
    return n;
  } catch (e) {
    console.warn(`[membres] liste des membres indisponible (${e.message})`);
  }
  // 2) Repli : abonnements en cours, une personne comptée une seule fois même avec plusieurs formules.
  try {
    const { items, complete } = await whopList("memberships", {});
    const users = new Set(items.filter((m) => LIVE.has(m.status) && m.user?.id).map((m) => m.user.id));
    console.log(`[membres] ${users.size} membres Whop (abonnements${complete ? "" : ", lecture plafonnée"})`);
    return users.size;
  } catch (e) {
    console.warn(`[membres] abonnements indisponibles (${e.message})`);
    return null;
  }
}

// Recompté au plus toutes les heures ; la page n'attend jamais Whop plus d'une seconde.
const cached = unstable_cache(countMembers, ["whop-membres-v2"], { revalidate: 3600 });
export async function memberCount() {
  try {
    return await Promise.race([cached(), new Promise((r) => setTimeout(() => r(null), 1000))]);
  } catch {
    return null;
  }
}
