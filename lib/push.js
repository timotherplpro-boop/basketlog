// Notifications sur le téléphone (web push, 20/11/2026) : abonnements (table basketlog_push, supabase/push.sql) et envoi.
// Clés VAPID : NEXT_PUBLIC_VAPID_PUBLIC_KEY (publique, dans le navigateur) et VAPID_PRIVATE_KEY (serveur seulement).
// Textes : lib/push-text.js. Envoi quotidien : app/api/cron/push (seulement si PUSH_ENABLED vaut 1).
import webpush from "web-push";

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const SECRET = process.env.BASKETLOG_DB_KEY;
const PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;

export const pushConfigured = () => !!(URL_ && KEY && SECRET && PUBLIC && PRIVATE);
export const pushEnabled = () => pushConfigured() && process.env.PUSH_ENABLED === "1";

async function rpc(name, body) {
  const res = await fetch(`${URL_}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_key: SECRET, ...body }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`${name} : Supabase ${res.status}`);
  return res.json();
}

export const pushAdd = (sub, lang, uid) =>
  rpc("basketlog_push_add", { p_endpoint: sub.endpoint, p_p256dh: sub.keys.p256dh, p_auth: sub.keys.auth, p_langue: lang, p_uid: uid || null });
export const pushRemove = (endpoint) => rpc("basketlog_push_remove", { p_endpoint: endpoint });
export const pushList = () => rpc("basketlog_push_list", {});
export const pushMark = (endpoint, ok) => rpc("basketlog_push_mark", { p_endpoint: endpoint, p_ok: !!ok });

let ready = false;
function setup() {
  if (ready) return;
  webpush.setVapidDetails("mailto:contact@basketlog-app.com", PUBLIC, PRIVATE);
  ready = true;
}

// Envoie une notification. { ok } ; { gone } quand le navigateur a retiré l'abonnement (404 / 410) ; { error } sinon.
export async function sendPush(sub, payload) {
  setup();
  try {
    await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 8 * 3600, urgency: "normal", topic: "matchs-du-jour", timeout: 8000 });
    return { ok: true };
  } catch (e) {
    const code = e?.statusCode;
    if (code === 404 || code === 410) return { gone: true };
    return { error: code ? `HTTP ${code}` : e?.message || "erreur" };
  }
}
