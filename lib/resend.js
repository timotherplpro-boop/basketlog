// Newsletter : liste d'envoi, consentement et diffusions chez Resend (API REST). Aucune dépendance à Next.
// Réglages dans les variables d'environnement de Vercel, jamais dans le code :
//   RESEND_API_KEY        clé « accès complet » créée sur resend.com/api-keys
//   NEWSLETTER_ENABLED    1 pour ouvrir l'inscription et envoyer ; sinon rien ne s'affiche et rien ne part
//   NEWSLETTER_LANGS      langues ouvertes (par défaut fr ; fr,en,es pour les trois)
//   NEWSLETTER_FROM       expéditeur (par défaut « Basketlog <newsletter@basketlog-app.com> »)
//   NEWSLETTER_REPLY_TO   adresse de réponse (par défaut contact@basketlog-app.com)
// Le consentement vit chez Resend, nulle part ailleurs : la personne s'inscrit elle-même (jamais ajoutée par nous),
// elle est alors dans la liste « Basketlog newsletter » et abonnée (opt_in) au sujet de sa langue ; chaque diffusion est
// limitée à ce sujet, donc personne ne reçoit rien sans cet abonnement. Le lien de désinscription de chaque mail, ou
// l'interrupteur de « Mon compte », la repasse en opt_out. Les messages d'erreur ne reprennent jamais la clé ni une adresse.
export const LANGS = ["fr", "en", "es"];
export const SEGMENT_NAME = "Basketlog newsletter";
export const topicName = (lang) => `Newsletter Basketlog (${lang})`;
const TOPIC_DESC = "Newsletter hebdomadaire de Basketlog, le dimanche à 18 h (heure de Paris)";
export const CONSENT_PROP = "consent_at"; // date et heure (ISO) de la demande d'inscription, preuve du consentement

const API = "https://api.resend.com";

export function newsletterConfig(env = process.env) {
  const key = String(env.RESEND_API_KEY || "").trim();
  const langs = String(env.NEWSLETTER_LANGS || "fr").split(",").map((s) => s.trim()).filter((l) => LANGS.includes(l));
  return {
    key,
    ready: !!key,
    enabled: !!key && String(env.NEWSLETTER_ENABLED || "").trim() === "1",
    langs: langs.length ? [...new Set(langs)] : ["fr"],
    from: String(env.NEWSLETTER_FROM || "").trim() || "Basketlog <newsletter@basketlog-app.com>",
    replyTo: String(env.NEWSLETTER_REPLY_TO || "").trim() || "contact@basketlog-app.com",
  };
}

export const normEmail = (e) => String(e ?? "").trim().toLowerCase();
export const isEmail = (e) => typeof e === "string" && e.length <= 254 && /^[^\s@<>()"',;:\\]+@[^\s@<>()"',;:\\]+\.[^\s@<>()"',;:\\]{2,}$/.test(e);
// « tim***@gmail.com » : montre à la personne où part la newsletter sans afficher son adresse en entier.
export function maskEmail(e) {
  const [user, domain] = String(e || "").split("@");
  if (!user || !domain) return "";
  return `${user.slice(0, Math.min(3, Math.max(1, user.length - 1)))}***@${domain}`;
}

// kind : nokey, scope (clé refusée ou sans droit), notfound, invalid, conflict, rate, network,
// blocked (adresse désinscrite de tous les envois du compte Resend), unconfirmed (Resend n'a pas enregistré le changement).
export class ResendError extends Error {
  constructor(kind, message, extra = {}) {
    super(message);
    this.name = "ResendError";
    this.kind = kind;
    Object.assign(this, extra);
  }
}

// Ce qui peut finir dans les journaux du serveur : ni adresse e-mail ni clé.
const redact = (s) => String(s || "").replace(/[^\s@/()"']+@[^\s@/()"']+/g, "…").replace(/re_[A-Za-z0-9_]{8,}/g, "…");
const safePath = (p) => redact(p.replace(/(\/contacts\/)[^/?]+/, "$1…"));
const retryAfterMs = (res) => {
  const s = Number(res.headers?.get?.("retry-after"));
  return Number.isFinite(s) && s > 0 ? Math.min(s, 5) * 1000 : 1100;
};

// Client Resend. fetch et sleep sont injectables pour les tests ; l'application utilise resend() plus bas.
export function createResend({ key, fetch: f = globalThis.fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)) } = {}) {
  const cache = { segment: null, topics: {}, prop: false };

  async function call(method, path, body, headers = {}) {
    if (!key) throw new ResendError("nokey", "RESEND_API_KEY absente");
    let res;
    for (let attempt = 1; ; attempt++) {
      try {
        res = await f(`${API}${path}`, {
          method,
          headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "User-Agent": "basketlog-newsletter/1", ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
          body: body === undefined ? undefined : JSON.stringify(body),
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
      } catch (e) {
        throw new ResendError("network", `${method} ${safePath(path)} : ${e?.name === "TimeoutError" ? "délai dépassé" : "Resend injoignable"}`);
      }
      if (res.status === 429 && attempt < 2) { await sleep(retryAfterMs(res)); continue; } // limite de 10 requêtes par seconde : une seconde tentative
      break;
    }
    const json = await res.json().catch(() => null);
    if (res.ok) return json;
    const detail = redact(json?.message || json?.error?.message || "").replace(/\s+/g, " ").slice(0, 200);
    const kind = res.status === 401 || res.status === 403 ? "scope"
      : res.status === 404 ? "notfound"
      : res.status === 409 ? "conflict"
      : res.status === 400 || res.status === 422 ? "invalid"
      : res.status === 429 ? "rate"
      : "network";
    throw new ResendError(kind, `${method} ${safePath(path)} : Resend ${res.status}${detail ? ` (${detail})` : ""}`, { status: res.status, detail });
  }

  // Toutes les pages d'une liste (100 par page, 10 pages au plus).
  async function listAll(path, { paged = true } = {}) {
    const out = [];
    let after = null;
    for (let i = 0; i < 10; i++) {
      const q = paged ? `${path}${path.includes("?") ? "&" : "?"}limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}` : path;
      const j = await call("GET", q);
      const data = Array.isArray(j?.data) ? j.data : [];
      out.push(...data);
      if (!paged || !j?.has_more || !data.length) break;
      after = data[data.length - 1].id;
    }
    return out;
  }

  // ---------- Liste, sujets et propriété : trouvés par leur nom, créés au premier besoin ----------
  async function segmentId({ create = true } = {}) {
    if (cache.segment) return cache.segment;
    const found = (await listAll("/segments")).find((x) => x.name === SEGMENT_NAME);
    if (found) return (cache.segment = found.id);
    if (!create) return null;
    const made = await call("POST", "/segments", { name: SEGMENT_NAME });
    return (cache.segment = made?.id || null);
  }

  async function topicId(lang, { create = true } = {}) {
    if (cache.topics[lang]) return cache.topics[lang];
    const found = (await listAll("/topics", { paged: false })).find((x) => x.name === topicName(lang));
    if (found) return (cache.topics[lang] = found.id);
    if (!create) return null;
    // opt_out par défaut : personne n'est abonné tant qu'il ne l'a pas demandé (ce réglage ne se change plus après la création).
    const made = await call("POST", "/topics", { name: topicName(lang), description: TOPIC_DESC, default_subscription: "opt_out" });
    return (cache.topics[lang] = made?.id || null);
  }

  // Propriété « consent_at » : utile mais jamais bloquante (sans elle, l'inscription se fait quand même).
  async function consentProperty() {
    if (cache.prop) return true;
    try {
      const have = (await listAll("/contact-properties")).some((p) => p.key === CONSENT_PROP);
      if (!have) await call("POST", "/contact-properties", { key: CONSENT_PROP, type: "string" });
      return (cache.prop = true);
    } catch {
      return false;
    }
  }

  // ---------- Contacts ----------
  async function contact(email) {
    try {
      const c = await call("GET", `/contacts/${encodeURIComponent(normEmail(email))}`);
      return c?.id ? c : null;
    } catch (e) {
      if (e.kind === "notfound") return null;
      throw e;
    }
  }

  // Abonnements d'un contact à des sujets : PATCH /contacts/{id}/topics. Le corps HTTP est directement la LISTE
  // [{ id, subscription: "opt_in" | "opt_out" }], et non { topics: [...] } comme dans le SDK Node : sinon Resend répond
  // 422 « The `` field must be an `array` » (docs : resend.com/docs/api-reference/contacts/update-contact-topics).
  const setTopics = (contactId, items) => call("PATCH", `/contacts/${contactId}/topics`, items);

  // { known, subscribed, blocked } : abonné = dans le sujet de cette langue en opt_in et pas désinscrit de tout.
  async function status(email, lang) {
    const c = await contact(email);
    if (!c) return { known: false, subscribed: false, blocked: false };
    if (c.unsubscribed) return { known: true, subscribed: false, blocked: true };
    const tid = await topicId(lang, { create: false });
    if (!tid) return { known: true, subscribed: false, blocked: false };
    const mine = (await listAll(`/contacts/${c.id}/topics`)).find((x) => x.id === tid);
    return { known: true, subscribed: mine?.subscription === "opt_in", blocked: false };
  }

  // Relecture après écriture : Resend peut mettre un instant à refléter le changement, la dernière lecture fait foi.
  async function confirmed(email, lang, wanted) {
    let s = await status(email, lang);
    if (s.subscribed === wanted) return s;
    await sleep(700);
    s = await status(email, lang);
    if (s.subscribed !== wanted) throw new ResendError("unconfirmed", `Resend n'a pas enregistré ${wanted ? "l'inscription" : "la désinscription"}`);
    return s;
  }

  // La personne demande la newsletter (elle clique, depuis son compte) : contact, liste et sujet, puis relecture.
  async function subscribe(email, lang, { now = new Date() } = {}) {
    if (!isEmail(normEmail(email))) throw new ResendError("invalid", "adresse e-mail invalide");
    const mail = normEmail(email);
    let c = await contact(mail);
    // Désinscrite de TOUS les envois du compte Resend (autre liste, réglage manuel) : on ne passe jamais outre un refus.
    if (c?.unsubscribed) throw new ResendError("blocked", "adresse désinscrite de tous les envois");
    const [sid, tid, hasProp] = [await segmentId(), await topicId(lang), await consentProperty()];
    const props = hasProp ? { [CONSENT_PROP]: now.toISOString() } : null;
    if (!c) {
      try {
        c = await call("POST", "/contacts", { email: mail, unsubscribed: false, ...(props ? { properties: props } : {}) });
      } catch (e) {
        if (e.kind === "invalid" && props) c = await call("POST", "/contacts", { email: mail, unsubscribed: false });
        else if (e.kind === "conflict") c = await contact(mail); // créé entre-temps (double clic)
        else throw e;
      }
    } else if (props) {
      await call("PATCH", `/contacts/${c.id}`, { properties: props }).catch(() => {});
    }
    if (!c?.id) throw new ResendError("unconfirmed", "contact non créé");
    await setTopics(c.id, [{ id: tid, subscription: "opt_in" }]);
    try {
      await call("POST", `/contacts/${c.id}/segments/${sid}`);
    } catch (e) {
      if (e.kind !== "conflict" && e.kind !== "invalid") throw e; // déjà dans la liste
    }
    return confirmed(mail, lang, true);
  }

  // La personne ne veut plus la newsletter : opt_out. Le contact reste (avec cette mention) pour ne plus lui écrire.
  async function unsubscribe(email, lang) {
    const c = await contact(email);
    if (!c) return { known: false, subscribed: false, blocked: false };
    const tid = await topicId(lang, { create: false });
    if (!tid) return { known: true, subscribed: false, blocked: !!c.unsubscribed };
    await setTopics(c.id, [{ id: tid, subscription: "opt_out" }]);
    return confirmed(email, lang, false);
  }

  // Compte supprimé : l'adresse disparaît de Resend. Si elle sert aussi à une autre liste du compte (un autre site de Tim),
  // elle y reste : on la retire seulement de la nôtre et on la désabonne de tous nos sujets.
  async function forget(email) {
    const c = await contact(email);
    if (!c) return { existed: false, removed: false };
    const sid = await segmentId({ create: false });
    const segments = await listAll(`/contacts/${c.id}/segments`);
    // Effacé seulement s'il est dans notre liste et dans aucune autre : un contact sans liste, ou d'une autre liste, n'est pas à nous.
    if (sid && segments.length > 0 && segments.every((s) => s.id === sid)) {
      await call("DELETE", `/contacts/${c.id}`);
      return { existed: true, removed: true };
    }
    const mine = [];
    for (const lang of LANGS) {
      const tid = await topicId(lang, { create: false });
      if (tid) mine.push({ id: tid, subscription: "opt_out" });
    }
    if (mine.length) await setTopics(c.id, mine);
    if (sid) await call("DELETE", `/contacts/${c.id}/segments/${sid}`).catch(() => {});
    return { existed: true, removed: false };
  }

  // Y a-t-il au moins un contact dans la liste ? (pas de diffusion pour une liste vide)
  async function hasContacts() {
    const sid = await segmentId({ create: false });
    if (!sid) return false;
    const j = await call("GET", `/contacts?segment_id=${encodeURIComponent(sid)}&limit=1`);
    return Array.isArray(j?.data) && j.data.length > 0;
  }

  // ---------- Diffusions ----------
  const broadcasts = () => listAll("/broadcasts");
  async function createBroadcast({ name, subject, previewText, html, text, from, replyTo, lang }) {
    const [segment_id, topic_id] = [await segmentId(), await topicId(lang)];
    const j = await call("POST", "/broadcasts", { name, segment_id, topic_id, from, reply_to: [replyTo], subject, preview_text: previewText, html, text });
    if (!j?.id) throw new ResendError("unconfirmed", "diffusion non créée");
    return j.id;
  }
  // scheduledAt : instant ISO 8601 (UTC) ; sans lui, envoi immédiat.
  const sendBroadcast = (id, scheduledAt) => call("POST", `/broadcasts/${encodeURIComponent(id)}/send`, scheduledAt ? { scheduled_at: scheduledAt } : {});
  const getBroadcast = (id) => call("GET", `/broadcasts/${encodeURIComponent(id)}`);
  const deleteBroadcast = (id) => call("DELETE", `/broadcasts/${encodeURIComponent(id)}`);
  // Annule une diffusion programmée : elle repasse en brouillon, aucun e-mail ne part (POST /broadcasts/{id}/cancel, sans corps).
  const cancelBroadcast = (id) => call("POST", `/broadcasts/${encodeURIComponent(id)}/cancel`);

  // Mail isolé (test envoyé à l'admin lui-même). idempotencyKey : une relance ne l'envoie pas deux fois.
  const sendEmail = ({ from, to, subject, html, text, replyTo, idempotencyKey }) =>
    call("POST", "/emails", { from, to: [].concat(to), subject, html, text, ...(replyTo ? { reply_to: [replyTo] } : {}) }, idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {});

  // Domaine d'envoi : { name, status } ou null.
  async function domain(name) {
    const d = (await listAll("/domains")).find((x) => x.name === name);
    return d ? { name: d.name, status: d.status, region: d.region } : null;
  }

  return { status, subscribe, unsubscribe, forget, hasContacts, broadcasts, createBroadcast, sendBroadcast, getBroadcast, deleteBroadcast, cancelBroadcast, sendEmail, domain, segmentId, topicId };
}

// Client de l'application : créé à la demande avec la clé du moment (null sans clé).
let shared = null;
let sharedKey = "";
export function resend() {
  const { key } = newsletterConfig();
  if (!key) return null;
  if (!shared || sharedKey !== key) {
    shared = createResend({ key });
    sharedKey = key;
  }
  return shared;
}
