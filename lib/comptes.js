// Comptes Basketlog (e-mail + mot de passe, ou Google) : accès à la base (supabase/comptes.sql).
// Chaque fonction lève une erreur si la base ne répond pas ; « non installée » se reconnaît avec comptesNotInstalled(e).
import { dbRpc, profileNotInstalled, rolesConfigured } from "./roles";
import { limitKey } from "./auth-utils";

export const comptesConfigured = rolesConfigured;
// Script supabase/comptes.sql pas encore lancé : Supabase répond 404 aux fonctions.
export const comptesNotInstalled = profileNotInstalled;

const obj = (r) => (r && typeof r === "object" ? r : null);

export const inscrire = (email, hash, lang, marketing = false) =>
  dbRpc("basketlog_compte_inscrire", { p_email: email, p_mdp: hash, p_langue: lang, p_marketing: !!marketing });
export const compteParEmail = async (email) => obj(await dbRpc("basketlog_compte_email", { p_email: email }));
export const compteGoogle = (g, lang) =>
  dbRpc("basketlog_compte_google", { p_sub: g.sub, p_email: g.email, p_verifie: !!g.verified, p_nom: g.name || null, p_langue: lang, p_marketing: false });
export const getCompte = async (id) => obj(await dbRpc("basketlog_compte_get", { p_id: id }));
export const compteVu = (id) => dbRpc("basketlog_compte_vu", { p_id: id }).catch(() => null);
export const lierWhop = (id, whop) => dbRpc("basketlog_compte_lier_whop", { p_id: id, p_whop: whop });
export const changerMdp = (id, hash) => dbRpc("basketlog_compte_mdp", { p_id: id, p_mdp: hash });
export const reglerMarketing = (id, ok) => dbRpc("basketlog_compte_marketing", { p_id: id, p_ok: !!ok });
export const creerReinit = async (email, hash, minutes) => obj(await dbRpc("basketlog_reinit_creer", { p_email: email, p_jeton: hash, p_minutes: minutes }));
export const reinitValide = async (hash) => (await dbRpc("basketlog_reinit_valide", { p_jeton: hash })) === true;
export const utiliserReinit = (hash, mdp) => dbRpc("basketlog_reinit_utiliser", { p_jeton: hash, p_mdp: mdp });
export const supprimerCompteEmail = (id) => dbRpc("basketlog_compte_email_supprimer", { p_id: id }, 10000);
export const adminComptes = (limite = 500) => dbRpc("basketlog_admin_comptes", { p_limite: limite }, 8000);

// Limite d'essais (connexion, inscription, mot de passe oublié), comptée dans la base pour valoir sur toutes les
// instances du site. Base injoignable ou script pas encore lancé : limite gardée en mémoire par l'instance.
const local = new Map();
function localHit(key, max, minutes) {
  const now = Date.now();
  const list = (local.get(key) || []).filter((t) => now - t < minutes * 60e3);
  list.push(now);
  local.set(key, list);
  if (local.size > 5000) local.clear();
  return list.length <= max;
}
const PEPPER = process.env.SESSION_SECRET || process.env.BASKETLOG_DB_KEY || process.env.WHOP_API_KEY || "";
export async function allowed(action, value, max, minutes) {
  const key = limitKey(action, value, PEPPER);
  try {
    return (await dbRpc("basketlog_tentative", { p_cle: key, p_max: max, p_minutes: minutes }, 3000)) !== false;
  } catch {
    return localHit(key, max, minutes);
  }
}
