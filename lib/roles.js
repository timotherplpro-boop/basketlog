// Rôles Basketlog : « admin » (Tim et les comptes qu'il nomme) et « createur » (créateurs partenaires invités).
// Les deux ont l'accès complet (comme Lifetime) ; seul l'admin relit les avis et gère les accès.
// Stockage : Supabase, tables fermées au public, lues par des fonctions protégées par la clé serveur.
import { mergePromos } from "./promo";
import { promoMonths } from "./whop-promo";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.BASKETLOG_DB_KEY;
export const rolesConfigured = () => !!(URL_ && KEY && SECRET);

export const ROLES = ["admin", "createur"];

export async function dbRpc(name, body = {}, timeout = 5000) {
  if (!rolesConfigured()) throw new Error("Supabase non configuré");
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: SECRET, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${name} : Supabase ${res.status}`);
  return res.json();
}

// Rôle du compte Whop (null s'il n'en a pas). Lève une erreur si la base ne répond pas : à l'appelant de décider.
export async function getRole(uid) {
  if (!uid || !rolesConfigured()) return null;
  const r = await dbRpc("basketlog_role", { p_uid: uid });
  return ROLES.includes(r) ? r : null;
}

// Rôle et nom affiché du compte (ex. « Tim » au lieu du nom d'utilisateur Whop), ou null sans rôle.
// Lève une erreur si la base ne répond pas.
export async function getRoleInfo(uid) {
  if (!uid || !rolesConfigured()) return null;
  const r = await dbRpc("basketlog_role_info", { p_uid: uid });
  return r && ROLES.includes(r.role) ? { role: r.role, nom: typeof r.nom === "string" && r.nom.trim() ? r.nom.trim().slice(0, 80) : null } : null;
}

// Données de l'espace admin : avis (en attente d'abord), comptes admin et créateurs, invitations en cours,
// chacun avec son code promo (`promo`) ; `orphelins` : codes qui ne correspondent plus à aucun créateur.
// `promosOk` est faux tant que supabase/codes-promo.sql n'a pas été lancé : l'espace admin le signale et masque les codes.
export async function adminData() {
  const [d, promos] = await Promise.all([
    dbRpc("basketlog_admin_list"),
    dbRpc("basketlog_admin_promos").then((list) => (Array.isArray(list) ? list : null)).catch(() => null),
  ]);
  const merged = mergePromos({ roles: d?.roles || [], invitations: d?.invitations || [] }, promos || []);
  // whopAuto : la clé API de Whop est présente, les codes promo sont donc créés chez Whop par le site (lib/whop-promo.js) ;
  // whopMonths : durée de leur remise en paiements (0 : à chaque paiement).
  return { avis: d?.avis || [], ...merged, promosOk: Array.isArray(promos), whopAuto: !!process.env.WHOP_API_KEY, whopMonths: promoMonths() };
}
