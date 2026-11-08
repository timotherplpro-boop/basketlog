// Changement de formule en un clic (« Mon compte ») : jeton d'intention signé.
//
// Whop ne sait pas changer la formule d'un abonnement existant : le membre paie la nouvelle formule chez Whop, puis l'ancienne est
// arrêtée EN FIN DE PÉRIODE (jamais avant, et seulement une fois la nouvelle formule confirmée active chez Whop). Le jeton retient
// quel abonnement arrêter. Il est signé (cookie httpOnly, comme la session), lié au compte qui l'a demandé et il expire de lui-même.
// Il ne donne aucun droit par lui-même : au moment d'agir, le serveur relit les abonnements chez Whop et vérifie tout.
// Aucune dépendance à Next : testé dans tests/unit.mjs.
import crypto from "node:crypto";

export const SWITCH_COOKIE = "bl_switch";
export const SWITCH_TTL_MS = 12 * 3600e3; // au-delà, le changement est abandonné : plus rien n'est arrêté
export const SWITCH_TARGETS = ["pro", "lifetime"]; // on ne propose que de monter en gamme (Starter -> Pro ou Lifetime, Pro -> Lifetime)
export const switchCookieOptions = { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: Math.floor(SWITCH_TTL_MS / 1000) };

const MEMBERSHIP_ID = /^[A-Za-z0-9_]{3,80}$/;
const b64 = (s) => Buffer.from(s).toString("base64url");
// La signature couvre aussi l'usage du jeton : un jeton d'une sorte ne peut jamais passer pour une autre (session, intention…).
const mac = (secret, purpose, data) => crypto.createHmac("sha256", secret).update(`${purpose}:${data}`).digest("base64url");

export function signToken(secret, purpose, obj) {
  if (!secret) return null;
  const data = b64(JSON.stringify(obj));
  return `${data}.${mac(secret, purpose, data)}`;
}

export function readToken(secret, purpose, value) {
  if (!secret || typeof value !== "string" || value.length > 1000) return null;
  const parts = value.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const a = Buffer.from(parts[1]);
    const b = Buffer.from(mac(secret, purpose, parts[0]));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null; // jeton abîmé ou modifié
    const x = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return x && typeof x === "object" && !Array.isArray(x) ? x : null;
  } catch {
    return null;
  }
}

// Intention : { u: compte, f: abonnement à arrêter, t: formule visée, at: instant du clic }.
export function makeIntent(secret, { uid, from, tier }, now = Date.now()) {
  if (typeof uid !== "string" || !uid || typeof from !== "string" || !MEMBERSHIP_ID.test(from) || !SWITCH_TARGETS.includes(tier)) return null;
  return signToken(secret, "switch", { u: uid, f: from, t: tier, at: now });
}

// Intention valide pour CE compte : { from, tier, at }, ou null (absente, abîmée, d'un autre compte, expirée ou datée du futur).
export function readIntent(secret, value, uid, now = Date.now()) {
  const x = readToken(secret, "switch", value);
  if (!x || typeof uid !== "string" || !uid || x.u !== uid) return null;
  if (typeof x.f !== "string" || !MEMBERSHIP_ID.test(x.f) || !SWITCH_TARGETS.includes(x.t)) return null;
  const age = now - Number(x.at);
  if (!Number.isFinite(age) || age < -60e3 || age > SWITCH_TTL_MS) return null;
  return { from: x.f, tier: x.t, at: Number(x.at) };
}
