// Désinscription en un clic des e-mails Basketlog (bienvenue, rappels, envois ponctuels) : lien signé dans chaque e-mail
// et en-têtes List-Unsubscribe / List-Unsubscribe-Post (RFC 8058, bouton « Se désabonner » de Gmail et d'Apple Mail).
// Le clic met l'adresse sur la liste de blocage de Resend (« suppressions ») : plus aucun e-mail du site ne lui est envoyé.
// Signature : HMAC-SHA256 de l'adresse avec SESSION_SECRET (ou, à défaut, WHOP_API_KEY), pour qu'on ne puisse pas
// désinscrire l'adresse de quelqu'un d'autre. Aucune dépendance à Next.
import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://basketlog-app.com").replace(/\/$/, "");
const secret = () => process.env.SESSION_SECRET || process.env.WHOP_API_KEY || "";
const norm = (e) => String(e || "").trim().toLowerCase();

export function unsubSig(email) {
  const s = secret();
  if (!s) return "";
  return createHmac("sha256", `unsub:${s}`).update(norm(email)).digest("base64url").slice(0, 32);
}

export function unsubOk(email, sig) {
  const want = unsubSig(email);
  if (!want || typeof sig !== "string" || sig.length !== want.length) return false;
  return timingSafeEqual(Buffer.from(want), Buffer.from(sig));
}

export function unsubUrl(email, lang = "fr") {
  const l = lang === "en" || lang === "es" ? lang : "fr";
  return `${SITE}/api/desinscription?e=${encodeURIComponent(norm(email))}&s=${unsubSig(email)}&l=${l}`;
}

// En-têtes à joindre à l'e-mail.
export const unsubHeaders = (email, lang) => ({
  "List-Unsubscribe": `<${unsubUrl(email, lang)}>, <mailto:contact@basketlog-app.com?subject=STOP>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

// Ajoute l'adresse à la liste de blocage Resend. Lève une erreur si Resend refuse.
export async function suppress(email, fetchImpl = fetch) {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) throw new Error("RESEND_API_KEY absente");
  const r = await fetchImpl("https://api.resend.com/suppressions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ email: norm(email) }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok && r.status !== 409) throw new Error(`Resend ${r.status}`);
  return true;
}
