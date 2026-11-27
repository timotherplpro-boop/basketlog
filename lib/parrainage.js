// Parrainage (décision de Tim, 27/11/2026 : « Vas-y, fais tout ») : chaque compte connecté a un lien personnel. Quand un ami
// arrivé par ce lien devient abonné PAYANT (premier vrai paiement après l'essai Pro à 1 €, ou achat Lifetime), le parrain gagne
// UN MOIS DE PRO OFFERT : 30 jours gratuits ajoutés à son abonnement Pro chez Whop (son prochain paiement est repoussé d'autant),
// tout de suite s'il a un abonnement Pro, sinon dès qu'il en prend un (bouton dans « Mon compte », ou la tâche quotidienne).
// Aucun argent versé, aucun prix changé : la seule « dépense » est le mois offert.
//
// Sans base de données (aucune table ni fonction SQL nouvelle) :
//  - le code du lien contient l'identifiant du compte du parrain, signé (HMAC, clé du serveur) : personne ne peut en fabriquer ;
//  - l'ami garde ce code 30 jours dans un cookie httpOnly (bl_parrain) ; /api/pay le transmet à Whop dans les métadonnées
//    du paiement (« parrain »), qui restent attachées au paiement de l'essai, donc à l'abonnement ;
//  - chaque récompense est un code promo Whop au nom fixe PARRAIN + empreinte du parrain + empreinte du filleul (8 + 8 caractères,
//    HMAC) : Whop refuse de créer deux fois le même nom (idempotence), la liste des codes sert de registre (plafond de 12 par an,
//    une seule récompense par filleul, affichage dans « Mon compte ») et l'état du code dit où en est la récompense :
//    actif = mois en attente, désactivé = 30 jours ajoutés à l'abonnement. Le nom du code n'est jamais montré aux membres.
// Les créateurs partenaires (code promo à 40 %, lib/commission.js) ne sont pas concernés : rien ici ne touche à leurs codes.
// Aucune dépendance à Next (testé dans tests/parrainage.mjs).
import { createHmac, timingSafeEqual } from "node:crypto";
import { CONTACT } from "./mail.js";
import { firstName, layout } from "./lifecycle-mail.js";
import { unsubHeaders, unsubUrl } from "./unsub.js";

export const REF_PARAM = "parrain"; // https://basketlog-app.com/?parrain=CODE
export const REF_COOKIE = "bl_parrain";
export const REF_DAYS = 30; // durée du cookie de l'ami invité
export const REWARD_DAYS = 30; // un mois de Pro offert
export const MAX_PER_YEAR = 12; // mois offerts au plus par parrain, sur 365 jours glissants
export const REAL_MIN = 2; // montant minimum d'un « vrai » paiement : l'essai coûte 1 € (+ taxes)
export const SCAN_DAYS = 45; // paiements relus chaque jour par /api/cron/parrainage
export const REWARD_PREFIX = "PARRAIN";

const secret = (env = process.env) => env.SESSION_SECRET || env.WHOP_API_KEY || "";
export const parrainageReady = (env) => !!secret(env);

// ---------- Code du lien ----------
// Compte Basketlog « bl_<uuid> » -> « b » + uuid en base64url (22 caractères) ; compte Whop « user_XXX » -> « w » + XXX ;
// puis 10 caractères de signature. Exemple : bq83a…Zk2.
const UUID = /^bl_([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/;
const WHOP_UID = /^user_[A-Za-z0-9]{4,60}$/;
const SIG_LEN = 10;
export const REF_RE = /^[bw][A-Za-z0-9_-]{14,80}$/;

const sig = (body, s) => createHmac("sha256", `basketlog-parrain:${s}`).update(body).digest("base64url").slice(0, SIG_LEN);

export function refCode(uid, env) {
  const s = secret(env);
  if (!s || typeof uid !== "string") return null;
  const m = UUID.exec(uid);
  const body = m ? `b${Buffer.from(m.slice(1).join(""), "hex").toString("base64url")}` : WHOP_UID.test(uid) ? `w${uid.slice(5)}` : null;
  return body ? body + sig(body, s) : null;
}

// Identifiant du compte du parrain, ou null (code abîmé, inventé ou signé avec une autre clé).
export function refUid(code, env) {
  const s = secret(env);
  if (!s || typeof code !== "string" || !REF_RE.test(code)) return null;
  const body = code.slice(0, -SIG_LEN);
  const got = Buffer.from(code.slice(-SIG_LEN));
  const want = Buffer.from(sig(body, s));
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  if (body[0] === "b") {
    if (body.length !== 23) return null;
    const h = Buffer.from(body.slice(1), "base64url").toString("hex");
    return h.length === 32 ? `bl_${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}` : null;
  }
  const uid = `user_${body.slice(1)}`;
  return WHOP_UID.test(uid) ? uid : null;
}

// Lien à partager, dans la langue de la page du parrain : https://basketlog-app.com/?parrain=… ou …/en?parrain=…
export const refLink = (site, code, lang = "fr") =>
  `${String(site).replace(/\/$/, "")}${["en", "es", "pt"].includes(lang) ? `/${lang}` : "/"}?${REF_PARAM}=${encodeURIComponent(code)}`;

// ---------- Registre des récompenses (codes promo Whop) ----------
const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I, comme les codes des créateurs (lib/promo.js)
function tag(kind, uid, s) {
  const h = createHmac("sha256", `basketlog-parrain-${kind}:${s}`).update(String(uid)).digest();
  let out = "";
  for (let i = 0; i < 8; i++) out += ALPHA[h[i] % 32];
  return out;
}
const REWARD_RE = /^PARRAIN([A-HJ-NP-Z2-9]{8})([A-HJ-NP-Z2-9]{8})$/;

// Nom du code promo d'une récompense (23 caractères, majuscules et chiffres : accepté par Whop comme lib/promo.js CODE_RE).
export function rewardCode(parrainUid, filleulUid, env) {
  const s = secret(env);
  if (!s || !parrainUid || !filleulUid) return null;
  return `${REWARD_PREFIX}${tag("p", parrainUid, s)}${tag("f", filleulUid, s)}`;
}
export function parseReward(code) {
  const m = REWARD_RE.exec(String(code || "").toUpperCase());
  return m ? { p: m[1], f: m[2] } : null;
}

// attente : mois pas encore ajouté ; ajoute : 30 jours ajoutés (code désactivé) ; utilise : code servi au paiement
// (donné à la main par Tim, par exemple) ; annule : code archivé chez Whop.
export function rewardState(c) {
  if (Number(c?.uses) > 0) return "utilise";
  if (c?.status === "active") return "attente";
  return c?.status === "archived" ? "annule" : "ajoute";
}

// Récompenses d'un parrain, de la plus récente à la plus ancienne : [{ id, code, created, state }].
export function rewardsOf(promos, parrainUid, env) {
  const s = secret(env);
  if (!s || !parrainUid) return [];
  const p = tag("p", parrainUid, s);
  return (promos || [])
    .filter((c) => parseReward(c?.code)?.p === p)
    .map((c) => ({ id: c.id, code: String(c.code).toUpperCase(), created: Date.parse(c.created_at || "") || null, state: rewardState(c) }))
    .sort((a, b) => (b.created || 0) - (a.created || 0));
}

// Récompenses des 365 derniers jours (une date illisible compte, par prudence).
export const yearCount = (rewards, now = Date.now()) =>
  (rewards || []).filter((r) => !r.created || now - r.created < 365 * 864e5).length;

export function filleulRewarded(promos, filleulUid, env) {
  const s = secret(env);
  if (!s || !filleulUid) return false;
  const f = tag("f", filleulUid, s);
  return (promos || []).some((c) => parseReward(c?.code)?.f === f);
}

// Même adresse, aux variantes près : casse, « +étiquette », points des adresses Gmail.
export function sameEmail(a, b) {
  const norm = (e) => {
    const m = /^([^@\s]+)@([^@\s]+)$/.exec(String(e || "").trim().toLowerCase());
    if (!m) return null;
    let [, user, dom] = m;
    user = user.split("+")[0];
    if (dom === "gmail.com" || dom === "googlemail.com") { user = user.replace(/\./g, ""); dom = "gmail.com"; }
    return user ? `${user}@${dom}` : null;
  };
  const x = norm(a), y = norm(b);
  return !!x && x === y;
}

// Nouvelle récompense possible ? { ok: true, code } ou { ok: false, reason } :
//   inconnu (identifiant manquant), soi-meme (même compte ou même e-mail), deja (ce filleul a déjà rapporté un mois, à ce
//   parrain ou à un autre), plafond (12 mois offerts sur les 365 derniers jours).
export function rewardCheck({ promos, parrainUid, parrainWhop = null, parrainEmail = null, filleulUid, filleulEmail = null, now = Date.now(), env } = {}) {
  if (!parrainUid || !filleulUid) return { ok: false, reason: "inconnu" };
  if (filleulUid === parrainUid || (parrainWhop && filleulUid === parrainWhop)) return { ok: false, reason: "soi-meme" };
  if (sameEmail(parrainEmail, filleulEmail)) return { ok: false, reason: "soi-meme" };
  if (filleulRewarded(promos, filleulUid, env)) return { ok: false, reason: "deja" };
  if (yearCount(rewardsOf(promos, parrainUid, env), now) >= MAX_PER_YEAR) return { ok: false, reason: "plafond" };
  return { ok: true, code: rewardCode(parrainUid, filleulUid, env) };
}

// ---------- Paiements des filleuls (GET /payments, GET /memberships de Whop) ----------
const idOf = (v) => (typeof v === "string" ? v : v && typeof v === "object" && typeof v.id === "string" ? v.id : null);
const amt = (x) => (x == null ? 0 : typeof x === "object" ? Number(x.amount) || 0 : Number(x) || 0);
const refOf = (o) => (typeof o?.metadata?.parrain === "string" && REF_RE.test(o.metadata.parrain) ? o.metadata.parrain : null);

// products : { prod_… : "pro" | "lifetime" | "starter" } (lib/whop-read.js productPlans) ; memPlan : { mem_… : formule }.
const planOfPayment = (p, products = {}, memPlan = {}) => products[idOf(p?.product) || p?.product_id] || memPlan[idOf(p?.membership) || p?.membership_id] || null;

// « Vrai » paiement : payé, formule Pro ou Lifetime, au moins REAL_MIN (l'essai à 1 € + taxes n'en est pas un), pas remboursé.
export function isRealPayment(p, products = {}, memPlan = {}) {
  if (!p || typeof p !== "object") return false;
  const status = String(p.status || "").toLowerCase();
  if (!(status === "paid" || (!!p.paid_at && !p.refunded_at && status !== "refunded"))) return false;
  const plan = planOfPayment(p, products, memPlan);
  if (plan !== "pro" && plan !== "lifetime") return false;
  const total = amt(p.total ?? p.subtotal ?? p.amount);
  return total >= REAL_MIN && amt(p.refunded_amount) < total;
}

// Filleuls vus dans les paiements, un par compte Whop : [{ filleul, email, ref, plan, paid }] où ref est le code du lien
// (métadonnées du paiement, d'un autre paiement du même abonnement ou de l'abonnement) et paid le premier vrai paiement
// { id, at, plan, ref } (null tant que l'ami est en essai).
export function referrals(payments, products = {}, memberships = []) {
  const memPlan = {}, memRef = new Map();
  for (const m of memberships || []) {
    const id = idOf(m);
    if (!id) continue;
    const plan = products[idOf(m.product) || m.product_id];
    if (plan) memPlan[id] = plan;
    if (refOf(m)) memRef.set(id, refOf(m));
  }
  for (const p of payments || []) {
    const mem = idOf(p?.membership) || p?.membership_id || null;
    if (mem && refOf(p) && !memRef.has(mem)) memRef.set(mem, refOf(p));
  }
  const out = new Map();
  for (const p of payments || []) {
    const mem = idOf(p?.membership) || p?.membership_id || null;
    const ref = refOf(p) || (mem && memRef.get(mem)) || null;
    const uid = idOf(p?.user) || p?.user_id || null;
    if (!ref || !uid) continue;
    const at = Date.parse(p.paid_at || p.created_at || "") || 0;
    const plan = planOfPayment(p, products, memPlan);
    const cur = out.get(uid) || { filleul: uid, email: null, ref, plan, paid: null };
    if (!cur.email && typeof p.user?.email === "string") cur.email = p.user.email.trim().toLowerCase();
    if (isRealPayment(p, products, memPlan) && (!cur.paid || at < cur.paid.at)) cur.paid = { id: String(p.id || ""), at, plan, ref };
    out.set(uid, cur);
  }
  return [...out.values()];
}

// Abonnement Pro du parrain où ajouter les 30 jours (plans : lib/account.js buildPlans) : en cours (essai compris) de
// préférence, sinon résilié mais encore actif (son accès dure alors 30 jours de plus). Jamais le Pass 24 h ni un paiement en échec.
export function proTarget(plans) {
  const list = (plans || []).filter((p) => p?.tier === "pro" && (p.state === "renews" || p.state === "ends"));
  return list.find((p) => p.state === "renews") || list[0] || null;
}

// ---------- E-mail au parrain (fr, en, es ; le portugais reçoit l'espagnol) ----------
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://basketlog-app.com").replace(/\/$/, "");
export const mailLang = (l) => (l === "en" ? "en" : l === "es" || l === "pt" ? "es" : "fr");

function dateLabel(iso, l) {
  const ms = Date.parse(iso || "");
  if (!Number.isFinite(ms)) return null;
  const loc = { fr: "fr-FR", en: "en-US", es: "es-ES" }[l];
  return new Intl.DateTimeFormat(loc, { timeZone: l === "en" ? "America/New_York" : "Europe/Paris", day: "numeric", month: "long", year: "numeric" }).format(new Date(ms));
}

// added : 30 jours déjà ajoutés à l'abonnement Pro (until : nouvelle date du prochain paiement) ; sinon mois en attente.
export function rewardEmail({ lang = "fr", name = null, to = null, added = false, until = null } = {}) {
  const l = mailLang(lang);
  const n = firstName(name);
  const link = `${SITE}${l === "fr" ? "" : `/${l}`}/app/compte#parrainage`;
  const when = dateLabel(until, l);
  const T = {
    fr: {
      subject: "Ton ami s'est abonné : 1 mois de Pro offert 🎁",
      hello: n ? `Salut ${n},` : "Salut,",
      paras: [
        "Bonne nouvelle : un ami que tu as invité sur Basketlog vient de s'abonner. Merci !",
        added
          ? `On a ajouté 30 jours gratuits à ton abonnement Pro${when ? ` : ton prochain paiement est repoussé au ${when}` : ""}. Tu n'as rien à faire.`
          : "Tu gagnes 1 mois de Basketlog Pro offert. Il t'attend dans « Mon compte » : dès que tu as un abonnement Pro (essai 3 jours pour 1 €, puis 9,99 €/mois, résiliable à tout moment), tes 30 jours gratuits s'y ajoutent en un clic, avant ton prochain paiement.",
      ],
      cta: added ? "Voir mon compte" : "Récupérer mon mois offert",
      after: [`Continue de partager ton lien : chaque ami qui s'abonne t'offre un nouveau mois (jusqu'à ${MAX_PER_YEAR} par an).`],
      foot: `Tu reçois cet e-mail parce qu'un ami s'est abonné à Basketlog avec ton lien de parrainage. Contact : ${CONTACT}`,
      unsubLabel: "Ne plus recevoir d'e-mails",
    },
    en: {
      subject: "Your friend subscribed: 1 month of Pro on us 🎁",
      hello: n ? `Hi ${n},` : "Hi there,",
      paras: [
        "Good news: a friend you invited to Basketlog just subscribed. Thank you!",
        added
          ? `We added 30 free days to your Pro subscription${when ? `: your next payment moves to ${when}` : ""}. Nothing to do on your side.`
          : "You've earned 1 free month of Basketlog Pro. It's waiting in “My account”: as soon as you have a Pro subscription (3-day trial for €1, then €9.99/month, cancel anytime), add your 30 free days in one click, before your next payment.",
      ],
      cta: added ? "See my account" : "Claim my free month",
      after: [`Keep sharing your link: every friend who subscribes gets you another month (up to ${MAX_PER_YEAR} a year).`],
      foot: `You're getting this email because a friend subscribed to Basketlog with your referral link. Questions? ${CONTACT}`,
      unsubLabel: "Unsubscribe",
    },
    es: {
      subject: "Tu amigo se ha suscrito: 1 mes de Pro gratis 🎁",
      hello: n ? `¡Hola, ${n}!` : "¡Hola!",
      paras: [
        "Buenas noticias: un amigo al que invitaste a Basketlog acaba de suscribirse. ¡Gracias!",
        added
          ? `Hemos añadido 30 días gratis a tu suscripción Pro${when ? `: tu próximo pago pasa al ${when}` : ""}. No tienes que hacer nada.`
          : "Has ganado 1 mes de Basketlog Pro gratis. Te espera en «Mi cuenta»: en cuanto tengas una suscripción Pro (prueba de 3 días por 1 €, luego 9,99 €/mes, cancela cuando quieras), añade tus 30 días gratis en un clic, antes de tu próximo pago.",
      ],
      cta: added ? "Ver mi cuenta" : "Conseguir mi mes gratis",
      after: [`Sigue compartiendo tu enlace: cada amigo que se suscribe te regala otro mes (hasta ${MAX_PER_YEAR} al año).`],
      foot: `Recibes este correo porque un amigo se suscribió a Basketlog con tu enlace de invitación. ¿Preguntas? ${CONTACT}`,
      unsubLabel: "Darse de baja",
    },
  }[l];
  const unsub = to ? unsubUrl(to, l) : null;
  return { subject: T.subject, ...layout(l, { ...T, link, unsub }), ...(to ? { headers: unsubHeaders(to, l) } : {}) };
}
