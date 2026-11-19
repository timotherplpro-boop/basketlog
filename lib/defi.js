// Jeu « Bats le modèle » : lecture et écriture des choix des membres dans Supabase (supabase/defi.sql).
// Base absente ou script pas encore lancé : chaque fonction renvoie null et le jeu reste en mode navigateur.
import { dbRpc, rolesConfigured } from "./roles";

export const defiConfigured = () => rolesConfigured();

export async function defiSave(uid, nom, picks) {
  if (!defiConfigured()) return null;
  try { return await dbRpc("basketlog_defi_set", { p_uid: uid, p_nom: nom || null, p_picks: picks }); }
  catch (e) { console.warn(`[défi] enregistrement : ${e.message}`); return null; }
}
export async function defiMine(uid, from, to) {
  if (!defiConfigured()) return null;
  try { const r = await dbRpc("basketlog_defi_get", { p_uid: uid, p_from: from, p_to: to }); return Array.isArray(r) ? r : null; }
  catch (e) { console.warn(`[défi] lecture : ${e.message}`); return null; }
}
export async function defiRange(from, to) {
  if (!defiConfigured()) return null;
  try { const r = await dbRpc("basketlog_defi_range", { p_from: from, p_to: to }, 8000); return Array.isArray(r) ? r : null; }
  catch (e) { console.warn(`[défi] classement : ${e.message}`); return null; }
}
export async function defiForget(uid) {
  if (!defiConfigured()) return null;
  try { return await dbRpc("basketlog_defi_supprimer", { p_uid: uid }); }
  catch (e) { console.warn(`[défi] effacement : ${e.message}`); return null; }
}
