// Analyses complètes lancées par les membres : limite du jour vérifiée côté serveur (par compte Whop,
// donc valable sur tous les appareils) et historique. Stockage : Supabase, via des fonctions protégées par une clé serveur.
import { cookies } from "next/headers";
import { COOKIE, PLANS, decodeSession, usageKey } from "./pro";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.BASKETLOG_DB_KEY;
const configured = () => !!(URL_ && KEY && SECRET);

// La journée d'analyses se termine à minuit, heure de Paris.
export const usageDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(d);
export const matchKey = (league, id) => `${league === "EL" ? "EL" : "NBA"}:${String(id).slice(0, 60)}`;
export const tierOf = (t) => (t && t !== "gratuit" && PLANS[t] ? t : "compte");
export const tierLimit = (tier) => {
  const p = PLANS[tierOf(tier)].perDay;
  return Number.isFinite(p) ? p : null; // null = illimité
};

async function rpc(name, body) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: SECRET, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`${name} : Supabase ${res.status}`);
  return res.json();
}

// Membre connecté (cookie de session signé), sans appel à Whop. uid = clé des compteurs d'analyses
// (celle de l'aperçu quand un admin regarde le site comme un client).
export async function memberSession() {
  const s = decodeSession((await cookies()).get(COOKIE)?.value);
  return s?.uid ? { uid: usageKey(s), name: s.name || "", tier: tierOf(s.tier) } : null;
}

// Analyses du jour : { used, keys } ; null si la base est injoignable.
export async function getUsage(uid) {
  if (!configured()) return null;
  try {
    const r = await rpc("basketlog_usage", { p_uid: uid, p_day: usageDay() });
    return { used: Number(r?.used) || 0, keys: Array.isArray(r?.keys) ? r.keys : [] };
  } catch (e) {
    console.warn(`[analyses] lecture impossible (${e.message})`);
    return null;
  }
}

// Enregistre une analyse si la formule le permet. Base injoignable : on laisse passer plutôt que de bloquer un membre.
export async function recordAnalysis(uid, key, info, limit) {
  if (!configured()) return { ok: true, used: null, offline: true };
  try {
    return await rpc("basketlog_use_analysis", { p_uid: uid, p_day: usageDay(), p_match: key, p_info: info, p_limit: limit });
  } catch (e) {
    console.warn(`[analyses] enregistrement impossible (${e.message})`);
    return { ok: true, used: null, offline: true };
  }
}

// Questions personnelles à l'IA posées aujourd'hui (null si la base est injoignable).
export async function questionUsage(uid) {
  if (!configured()) return null;
  try {
    const r = await rpc("basketlog_question_usage", { p_uid: uid, p_day: usageDay() });
    return Number(r?.used) || 0;
  } catch (e) {
    console.warn(`[questions] lecture impossible (${e.message})`);
    return null;
  }
}

export async function recordQuestion(uid, key, limit) {
  if (!configured()) return null;
  try {
    return await rpc("basketlog_use_question", { p_uid: uid, p_day: usageDay(), p_match: key, p_limit: limit });
  } catch (e) {
    console.warn(`[questions] enregistrement impossible (${e.message})`);
    return null;
  }
}

export async function getHistory(uid, limit = 100) {
  if (!configured()) return null;
  try {
    const r = await rpc("basketlog_history", { p_uid: uid, p_limit: limit });
    return Array.isArray(r) ? r : [];
  } catch (e) {
    console.warn(`[analyses] historique indisponible (${e.message})`);
    return null;
  }
}

// Accès à l'analyse complète d'un match, décidé par le serveur :
// open = déjà lancée (aujourd'hui ou un autre jour) ou base injoignable · available = analyse à lancer · limit = quota atteint · visitor = sans compte.
// Compte gratuit : aucune analyse complète (comme Visifoot), donc toujours l'aperçu, même si la base est injoignable.
export async function analysisAccess(league, id) {
  const m = await memberSession();
  if (!m) return { state: "visitor" };
  const limit = tierLimit(m.tier);
  if (limit === 0) return { state: "limit", used: 0, limit, tier: m.tier };
  const u = await getUsage(m.uid);
  if (!u) return { state: "open", used: 0, limit, tier: m.tier };
  const key = matchKey(league, id);
  if (u.keys.includes(key)) return { state: "open", used: u.used, limit, tier: m.tier };
  // Analyse déjà débloquée un autre jour (ex. à 22 h, pour un match NBA qui commence après minuit) : elle reste
  // ouverte, sans repasser par le quota du jour.
  if (limit != null) {
    const hist = await getHistory(m.uid, 60);
    if (hist?.some((r) => (r.key || r.match_key || r.match) === key)) return { state: "open", used: u.used, limit, tier: m.tier };
  }
  if (limit != null && u.used >= limit) return { state: "limit", used: u.used, limit, tier: m.tier };
  return { state: "available", used: u.used, limit, tier: m.tier };
}
