import crypto from "node:crypto";
import { slugify } from "./slug.js";

// « Actu du jour » publiée chaque jour sur les réseaux (demande de Tim, 26/11/2026 21 h 45 : un visuel fait par IA
// sur l'actualité, sur chaque réseau). Sans base de données : titre, texte et adresse de l'image source tiennent dans
// un jeton signé (clé SESSION_SECRET, préfixe « actu: »), que seul un compte admin peut fabriquer (api/cron/social?actu=1).
// Le jeton sert à la page /actu?k=… (aperçu X et LinkedIn) et aux images /api/og/actu?k=…&f=og|portrait|thumb.
// Même logique que lib/pro.js : SESSION_SECRET si défini, sinon clé dérivée de la clé API Whop (jamais exposée).
const SECRET = process.env.SESSION_SECRET
  || (process.env.WHOP_API_KEY ? crypto.createHash("sha256").update(`basketlog-actu:${process.env.WHOP_API_KEY}`).digest("hex") : "");
const mac = (data) => crypto.createHmac("sha256", SECRET).update(`actu:${data}`).digest("base64url").slice(0, 24);

export function actuToken({ t, x = "", i, d, w = "", n = "", m = "", c = "", l = "" }) {
  if (!SECRET) throw new Error("clé de signature manquante");
  // Image de fond facultative depuis la version « stats » (sans joueur) ; si elle est donnée, adresse https.
  if (i && !/^https:\/\//.test(String(i))) throw new Error("image : adresse https attendue");
  const body = { t: String(t || "").trim().slice(0, 110), x: String(x || "").trim().slice(0, 700), i: i ? String(i) : "", d: d || new Date().toISOString().slice(0, 10) };
  // Champs du visuel version 2 (facultatifs) : w joueur ou équipe, n stats « 44 PTS|16 REB », m score « A|111|116|B », c couleurs, l étiquette.
  for (const [key, val, max] of [["w", w, 40], ["n", n, 60], ["m", m, 80], ["c", c, 20], ["l", l, 28]]) {
    const v = String(val || "").trim().slice(0, max);
    if (v) body[key] = v;
  }
  if (!body.t) throw new Error("titre manquant");
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${data}.${mac(data)}`;
}

export function readActu(token) {
  if (!SECRET || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const want = Buffer.from(mac(data));
  const got = Buffer.from(String(sig || ""));
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const a = JSON.parse(Buffer.from(data, "base64url").toString());
    return a && a.t && (!a.i || /^https:\/\//.test(a.i)) ? a : null;
  } catch {
    return null;
  }
}

export const ACTU_SITE = "https://basketlog-app.com";
export const actuUrls = (k) => {
  const q = encodeURIComponent(k);
  return {
    page: `${ACTU_SITE}/actu?k=${q}`,
    og: `${ACTU_SITE}/actu/og?k=${q}&f=og`,
    portrait: `${ACTU_SITE}/actu/og?k=${q}&f=portrait`,
    thumb: `${ACTU_SITE}/actu/og?k=${q}&f=thumb`,
  };
};

// Adresses courtes (27/11 : X n'affichait pas l'image d'un lien de 1 900 signes). Le post Bluesky du jour garde l'adresse
// complète de la page dans sa carte ; ?b=<identifiant du post Bluesky> la retrouve par l'API publique de Bluesky (sans
// compte), puis le jeton est vérifié comme d'habitude. Si le post Bluesky est supprimé, l'adresse courte ne marche plus.
export const ACTU_BSKY_DID = process.env.BLUESKY_DID || "did:plc:hewg2uciwpwuznwx2yzd2her";
export const RKEY_RE = /^[a-z0-9]{10,20}$/;
export async function actuFromBluesky(rkey) {
  if (!RKEY_RE.test(String(rkey || ""))) return null;
  try {
    const at = `at://${ACTU_BSKY_DID}/app.bsky.feed.post/${rkey}`;
    const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPosts?uris=${encodeURIComponent(at)}`, { signal: AbortSignal.timeout(6000), next: { revalidate: 86400 } });
    if (!r.ok) return null;
    const j = await r.json();
    const rec = j?.posts?.[0]?.record;
    const uri = rec?.embed?.external?.uri || "";
    const k = uri ? new URL(uri).searchParams.get("k") : null;
    const a = readActu(k);
    return a ? { a, k, at: actuDate(a, rec?.createdAt) } : null;
  } catch {
    return null;
  }
}
export async function resolveActu(sp = {}) {
  if (sp.k) {
    const a = readActu(sp.k);
    return a ? { a, k: sp.k, urls: actuUrls(sp.k) } : null;
  }
  if (sp.b) {
    const got = await actuFromBluesky(sp.b);
    return got ? { ...got, urls: actuShortUrls(sp.b, got.a.t) } : null;
  }
  return null;
}
// Adresses courtes renvoyées par ?actu=1 (champ « short ») : page = adresse propre de l'article (27/11), visuels par ?b=.
// Demande de Tim (28/11/2026) : les liens des posts des réseaux doivent mener directement au site, pas à la page de l'actu.
// share = lien de partage /actu?b=<rkey> à mettre dans les posts : les robots des réseaux y lisent le visuel (carte X),
// les visiteurs sont envoyés tout de suite sur l'accueil du site (ACTU_HOME). page = article indexable (Google, /actu).
export const ACTU_HOME = "/?utm_source=reseaux&utm_medium=social&utm_campaign=actu";
export const actuShortUrls = (rkey, t) => ({
  page: `${ACTU_SITE}${actuPath(rkey, t)}`,
  share: `${ACTU_SITE}/actu?b=${rkey}`,
  og: `${ACTU_SITE}/actu/og?b=${rkey}&f=og`,
  portrait: `${ACTU_SITE}/actu/og?b=${rkey}&f=portrait`,
  thumb: `${ACTU_SITE}/actu/og?b=${rkey}&f=thumb`,
});

// Articles indexables (27/11/2026) : chaque actu du jour a une adresse propre /actu/<identifiant du post Bluesky>-<titre>,
// toujours sans base de données (le post Bluesky garde le jeton). Le titre en minuscules, sans accents ni signes, 80 signes au plus.
export function actuSlug(t, max = 80) {
  const s = slugify(String(t || "").replace(/œ/g, "oe").replace(/Œ/g, "OE").replace(/æ/g, "ae").replace(/Æ/g, "AE").replace(/ß/g, "ss"));
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const i = cut.lastIndexOf("-");
  return (i >= 20 ? cut.slice(0, i) : s.slice(0, max)).replace(/-+$/, "");
}
export const actuId = (rkey, t) => [rkey, actuSlug(t)].filter(Boolean).join("-");
export const actuPath = (rkey, t) => `/actu/${actuId(rkey, t)}`;
// « 3n3bs5ep3km2s-wembanyama-44-points » -> { rkey: "3n3bs5ep3km2s", slug: "wembanyama-44-points" }. L'identifiant Bluesky
// n'a jamais de tiret : tout ce qui suit le premier tiret est le titre (comparé ensuite au bon titre, sinon redirection).
export function parseActuId(id) {
  const s = String(id || "");
  const i = s.indexOf("-");
  const rkey = i < 0 ? s : s.slice(0, i);
  return RKEY_RE.test(rkey) ? { rkey, slug: i < 0 ? "" : s.slice(i + 1) } : null;
}

// Date de publication : celle du jeton (AAAA-MM-JJ), précisée par l'heure du post Bluesky quand c'est le même jour.
export function actuDate(a, createdAt) {
  const d = String(a?.d || "");
  if (typeof createdAt === "string" && d && createdAt.startsWith(d) && !isNaN(Date.parse(createdAt))) return new Date(createdAt).toISOString();
  return d;
}

// Les derniers articles, retrouvés dans le flux public du compte Bluesky (100 derniers posts, sans les réponses) : chaque
// post du compte dont la carte pointe vers basketlog-app.com/actu?k=<jeton valide>. Cache d'une heure (page /actu, sitemap).
export const ACTU_FEED = `https://public.api.bsky.app/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(ACTU_BSKY_DID)}&limit=100&filter=posts_no_replies`;
export function actuItems(feed, read = readActu) {
  const seen = new Set();
  const out = [];
  for (const it of Array.isArray(feed) ? feed : []) {
    const p = it?.post;
    if (!p || it.reason || (p.author?.did && p.author.did !== ACTU_BSKY_DID)) continue; // reposts : ignorés
    const rkey = String(p.uri || "").split("/").pop();
    if (!RKEY_RE.test(rkey) || seen.has(rkey)) continue;
    let u;
    try {
      u = new URL(String(p.record?.embed?.external?.uri || ""));
    } catch {
      continue;
    }
    if (!/(^|\.)basketlog-app\.com$/.test(u.hostname) || u.pathname !== "/actu") continue;
    const a = read(u.searchParams.get("k"));
    if (!a) continue;
    seen.add(rkey);
    out.push({ rkey, a, path: actuPath(rkey, a.t), at: actuDate(a, p.record?.createdAt) });
  }
  return out;
}
export async function actuList() {
  try {
    const r = await fetch(ACTU_FEED, { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } });
    if (!r.ok) return [];
    return actuItems((await r.json())?.feed);
  } catch {
    return [];
  }
}

// Contenu des articles : texte en paragraphes, résumé pour les moteurs, stats « 44 POINTS|16 REBONDS », score « A|111|116|B ».
export const actuParagraphs = (x) => String(x || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
export function actuStats(n) {
  return String(n || "").split("|").map((s) => s.trim()).filter(Boolean).slice(0, 4).map((s) => {
    const m = /^([+-]?\d[\d.,/:]*(?:\s?%)?)\s*(.*)$/.exec(s);
    return m ? { v: m[1], l: m[2].toLocaleLowerCase("fr-FR") } : { v: "", l: s };
  });
}
export function actuScore(m) {
  const p = String(m || "").split("|").map((s) => s.trim());
  return p.length === 4 && p[0] && p[3] && /^\d{1,3}$/.test(p[1]) && /^\d{1,3}$/.test(p[2]) ? { a: p[0], sa: p[1], sb: p[2], b: p[3] } : null;
}
export const actuScoreText = (m) => {
  const s = actuScore(m);
  return s ? `${s.a} ${s.sa} – ${s.sb} ${s.b}` : "";
};
export function actuDescription(a) {
  const x = String(a?.x || "").replace(/\s+/g, " ").trim();
  if (x) return x.length <= 160 ? x : `${x.slice(0, 158).replace(/[\s,;:.!?–-]+\S*$/, "")}…`;
  const bits = [a?.w, actuStats(a?.n).map((s) => `${s.v} ${s.l}`.trim()).join(", "), actuScoreText(a?.m)].filter(Boolean);
  return `${bits.length ? bits.join(" · ") : a?.t || "Actu NBA"}. L'actu NBA du jour sur Basketlog.`;
}
// « 27 novembre 2026 » (heure de Paris).
export function actuDay(iso) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(iso));
  } catch {
    return "";
  }
}
