// Envoi des publications du jour (textes : lib/social.js) sur Telegram et Bluesky.
// Les codes d'accès sont dans les variables d'environnement de Vercel, jamais dans le code :
//   TELEGRAM_BOT_TOKEN                 code du bot donné par @BotFather (le bot est administrateur des chaînes)
//   TELEGRAM_CHAT_FR / _EN / _ES       chaîne de chaque langue, par son nom public (ex. @basketlog) ; une seule suffit
//   BLUESKY_HANDLE                     nom du compte (ex. basketlog.bsky.social ou basketlog-app.com)
//   BLUESKY_APP_PASSWORD               mot de passe d'application Bluesky (pas celui du compte)
//   BLUESKY_LANGS                      langues publiées sur Bluesky (par défaut fr,en,es : un message par langue)
//   SOCIAL_ENABLED                     1 pour publier ; sinon la tâche planifiée ne fait qu'un aperçu
// Les messages d'erreur ne reprennent jamais un code d'accès.

const LANGS = ["fr", "en", "es"];
const timeout = (ms) => AbortSignal.timeout(ms);

export function socialConfig(env = process.env) {
  const chats = {};
  for (const l of LANGS) {
    const c = String(env[`TELEGRAM_CHAT_${l.toUpperCase()}`] || "").trim();
    if (c) chats[l] = c;
  }
  const token = String(env.TELEGRAM_BOT_TOKEN || "").trim();
  const handle = String(env.BLUESKY_HANDLE || "").trim().replace(/^@/, "");
  const password = String(env.BLUESKY_APP_PASSWORD || "").trim();
  const langs = String(env.BLUESKY_LANGS || "fr,en,es").split(",").map((s) => s.trim()).filter((l) => LANGS.includes(l));
  return {
    enabled: String(env.SOCIAL_ENABLED || "").trim() === "1",
    telegram: token && Object.keys(chats).length ? { token, chats } : null,
    bluesky: handle && password && langs.length ? { handle, password, langs } : null,
  };
}

// Ce qui est branché, sans aucun code d'accès (pour l'aperçu public et l'admin).
export function socialStatus(cfg = socialConfig()) {
  return {
    enabled: cfg.enabled,
    telegram: cfg.telegram ? Object.entries(cfg.telegram.chats).map(([lang, chat]) => ({ lang, chat })) : [],
    bluesky: cfg.bluesky ? { handle: cfg.bluesky.handle, langs: cfg.bluesky.langs } : null,
  };
}

export async function sendTelegram(token, chat, html, previewUrl) {
  let r;
  try {
    r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: timeout(12000),
      body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", link_preview_options: { url: previewUrl, prefer_large_media: true } }),
    });
  } catch (e) {
    throw new Error(`Telegram injoignable (${e.name === "TimeoutError" ? "délai dépassé" : "réseau"})`);
  }
  const j = await r.json().catch(() => ({}));
  if (!j.ok) throw new Error(`Telegram ${r.status} : ${String(j.description || "réponse inattendue").slice(0, 160)}`);
  return j.result?.message_id ?? null;
}

async function xrpc(base, method, { jwt, body, raw, type } = {}) {
  let r;
  try {
    r = await fetch(`${base}/xrpc/${method}`, {
      method: "POST",
      headers: { ...(jwt ? { authorization: `Bearer ${jwt}` } : {}), "content-type": type || "application/json" },
      body: raw ?? JSON.stringify(body),
      signal: timeout(15000),
    });
  } catch (e) {
    throw new Error(`Bluesky injoignable (${method}, ${e.name === "TimeoutError" ? "délai dépassé" : "réseau"})`);
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Bluesky ${method} ${r.status} : ${String(j.message || j.error || "réponse inattendue").slice(0, 160)}`);
  return j;
}

// Connexion avec le mot de passe d'application ; les écritures vont ensuite au serveur qui héberge le compte.
export async function blueskySession({ handle, password }) {
  const s = await xrpc("https://bsky.social", "com.atproto.server.createSession", { body: { identifier: handle, password } });
  const pds = (s.didDoc?.service || []).find((x) => x.id === "#atproto_pds" || x.type === "AtprotoPersonalDataServer")?.serviceEndpoint;
  return { did: s.did, jwt: s.accessJwt, pds: (pds || "https://bsky.social").replace(/\/$/, "") };
}

// Image de la carte d'aperçu (facultative : sans elle, le message part quand même).
export async function blueskyThumb(sess, imageUrl) {
  try {
    const r = await fetch(imageUrl, { signal: timeout(12000) });
    if (!r.ok) return null;
    const type = (r.headers.get("content-type") || "image/png").split(";")[0];
    if (!/^image\//.test(type)) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (!buf.length || buf.length > 950000) return null; // Bluesky refuse les images de plus d'environ 1 Mo
    const j = await xrpc(sess.pds, "com.atproto.repo.uploadBlob", { jwt: sess.jwt, raw: buf, type });
    return j.blob || null;
  } catch {
    return null;
  }
}

export async function sendBluesky(sess, post, thumb) {
  const record = {
    $type: "app.bsky.feed.post",
    text: post.text,
    createdAt: new Date().toISOString(),
    langs: post.langs,
    ...(post.facets?.length ? { facets: post.facets } : {}),
    embed: { $type: "app.bsky.embed.external", external: { uri: post.url, title: post.title, description: post.description, ...(thumb ? { thumb } : {}) } },
  };
  const j = await xrpc(sess.pds, "com.atproto.repo.createRecord", { jwt: sess.jwt, body: { repo: sess.did, collection: "app.bsky.feed.post", record } });
  return j.uri || null;
}

// Le bot a-t-il déjà publié depuis cette heure ? Évite un doublon si la tâche planifiée est relancée le même jour.
// Seuls ses propres messages comptent (ils commencent tous par « 🏀 ») : un message écrit à la main ne bloque rien.
export async function blueskyPostedSince(sess, sinceIso, marker = "🏀") {
  try {
    const q = new URLSearchParams({ actor: sess.did, limit: "10", filter: "posts_no_replies" });
    const r = await fetch(`${sess.pds}/xrpc/app.bsky.feed.getAuthorFeed?${q}`, { headers: { authorization: `Bearer ${sess.jwt}` }, signal: timeout(10000) });
    if (!r.ok) return false;
    const j = await r.json();
    return (j.feed || []).some((f) => {
      const rec = f.post?.record || {};
      return f.post?.author?.did === sess.did && String(rec.createdAt || "") >= sinceIso && String(rec.text || "").startsWith(marker);
    });
  } catch {
    return false;
  }
}
