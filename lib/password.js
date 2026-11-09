// Mots de passe des comptes Basketlog : jamais gardés en clair. La base ne reçoit qu'une empreinte scrypt
// (sel aléatoire, 32 768 itérations mémoire-dures), au format « s1$N$r$p$sel$empreinte ».
import crypto from "node:crypto";

export const MIN_PASSWORD = 6; // comme Visifoot : « Mot de passe (min. 6 caractères) »
export const MAX_PASSWORD = 200;

const N = 32768, R = 8, P = 1, LEN = 32;
const PREFIX = `s1$${N}$${R}$${P}$`;

const scrypt = (pw, salt, len, n, r, p) =>
  new Promise((resolve, reject) => {
    crypto.scrypt(pw, salt, len, { N: n, r, p, maxmem: 256 * n * r * p }, (err, key) => (err ? reject(err) : resolve(key)));
  });

// Même mot de passe quelle que soit la façon dont le clavier compose les accents (« é » en un ou deux caractères).
const norm = (pw) => String(pw).normalize("NFKC");

// Problème d'un mot de passe choisi : « court », « long » ou null s'il convient.
export function passwordProblem(pw) {
  if (typeof pw !== "string" || pw.length < MIN_PASSWORD) return "court";
  if (pw.length > MAX_PASSWORD) return "long";
  return null;
}

export async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(norm(pw), salt, LEN, N, R, P);
  return `${PREFIX}${salt.toString("base64url")}$${key.toString("base64url")}`;
}

// Réglages lisibles dans une empreinte, bornés (une empreinte abîmée ne doit pas faire calculer le serveur des minutes).
function parse(stored) {
  if (typeof stored !== "string") return null;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "s1") return null;
  const [n, r, p] = parts.slice(1, 4).map((x) => Number(x));
  if (![16384, 32768, 65536, 131072].includes(n) || r !== 8 || !(p >= 1 && p <= 4)) return null;
  const salt = Buffer.from(parts[4], "base64url");
  const key = Buffer.from(parts[5], "base64url");
  if (salt.length < 16 || key.length < 16 || key.length > 64) return null;
  return { n, r, p, salt, key };
}

export async function verifyPassword(pw, stored) {
  const h = parse(stored);
  if (!h || typeof pw !== "string" || pw.length > MAX_PASSWORD) return false;
  const got = await scrypt(norm(pw), h.salt, h.key.length, h.n, h.r, h.p);
  return got.length === h.key.length && crypto.timingSafeEqual(got, h.key);
}

// Compte inconnu ou sans mot de passe : on calcule quand même une empreinte, pour répondre dans le même temps
// (sinon la durée de la réponse dirait quelles adresses ont un compte).
let dummy = null;
export async function fakeVerify(pw) {
  dummy ||= hashPassword(crypto.randomBytes(12).toString("hex"));
  await verifyPassword(typeof pw === "string" ? pw.slice(0, MAX_PASSWORD) : "", await dummy);
  return false;
}
