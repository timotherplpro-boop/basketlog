// Rôles Basketlog : « admin » (Tim et les comptes qu'il nomme) et « createur » (créateurs partenaires invités).
// Les deux ont l'accès complet (comme Lifetime) ; seul l'admin relit les avis et gère les accès.
// Stockage : Supabase, tables fermées au public, lues par des fonctions protégées par la clé serveur.
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

// Données de l'espace admin : avis (en attente d'abord), comptes admin et créateurs, invitations en cours.
export async function adminData() {
  const d = await dbRpc("basketlog_admin_list");
  return { avis: d?.avis || [], roles: d?.roles || [], invitations: d?.invitations || [] };
}
