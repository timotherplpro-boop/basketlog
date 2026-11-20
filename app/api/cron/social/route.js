import { NextResponse } from "next/server";
import { socialDay, recapDay } from "../../../../lib/social-day";
import { blueskyProfile, ogImageUrl, RECAP_MARK, launchPosts, POWER_MARK, powerPosts } from "../../../../lib/social";
import { powerRankings } from "../../../../lib/data";
import { GROUPS, nationalPosts } from "../../../../lib/nationals.js";
import { nationalBase, nationalFrom } from "../../../../lib/nationals-data";
import { socialConfig, socialStatus, sendTelegram, telegramCheck, blueskySession, blueskyThumb, sendBluesky, blueskyPostedSince, blueskySetProfile } from "../../../../lib/social-send";
import { COOKIE, currentSession } from "../../../../lib/pro";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Publication quotidienne des pronostics du jour sur Telegram et Bluesky (textes : lib/social.js), lancée par Vercel
// à 15 h 20 UTC (16 h 20 à Paris, 10 h 20 à New York) : juste après l'enregistrement des pronostics de 15 h 07
// (/api/cron/pronos), avant les matchs EuroLeague et NBA du soir.
// Tant que SOCIAL_ENABLED ne vaut pas 1, rien n'est publié : la réponse montre seulement les messages prévus.
// ?dry=1 force l'aperçu ; ?check=1 vérifie les comptes (bot Telegram administrateur de la chaîne, connexion Bluesky)
// sans rien publier. ?profile=1 pose le nom, la présentation et le logo du compte Bluesky (?profile=1&dry=1 : aperçu),
// pour un compte admin connecté seulement. Accès : tâche planifiée de Vercel (avec CRON_SECRET s'il est défini)
// ou compte admin connecté.
let lastRun = 0;
let lastDay = "";
let lastRecap = "";

// "cron", "admin" ou null.
async function access(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return "cron";
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role === "admin") return "admin";
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return "cron";
  return null;
}

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Envoie des publications { [langue]: { telegram, telegramPreview, bluesky } } sur les chaînes Telegram de chaque langue
// et sur Bluesky (langues branchées). sess : session Bluesky déjà ouverte (ou null).
async function sendPosts(cfg, sess, posts) {
  const out = [];
  for (const [lang, p] of Object.entries(posts || {})) {
    const chat = cfg.telegram?.chats?.[lang];
    if (chat) {
      try { out.push({ channel: "telegram", lang, ok: true, id: await sendTelegram(cfg.telegram.token, chat, p.telegram, p.telegramPreview) }); }
      catch (e) { out.push({ channel: "telegram", lang, ok: false, error: e.message }); }
    }
    if (sess && cfg.bluesky.langs.includes(lang)) {
      try {
        const thumb = await blueskyThumb(sess, ogImageUrl(lang));
        out.push({ channel: "bluesky", lang, ok: true, uri: await sendBluesky(sess, p.bluesky, thumb) });
      } catch (e) { out.push({ channel: "bluesky", lang, ok: false, error: e.message }); }
    }
  }
  return out;
}

// « 🇫🇷 Les Français en NBA cette nuit » (en français) et « 🇪🇸 Españoles y latinos… » (en espagnol), après les pronostics du jour.
async function nationalsToday() {
  const base = await nationalBase();
  const out = [];
  for (const g of [GROUPS.fr, GROUPS.es]) {
    const posts = nationalPosts(g, nationalFrom(g, base).tonight);
    if (posts) out.push(posts);
  }
  return out;
}

export async function GET(req) {
  const who = await access(req);
  if (!who) return json({ error: "interdit" }, 401);
  const sp = new URL(req.url).searchParams;
  const cfg = socialConfig();
  if (sp.get("profile") === "1") {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    const profile = blueskyProfile();
    if (sp.get("dry") === "1") return json({ ok: true, dry: true, profile });
    if (!cfg.bluesky) return json({ ok: false, profile, skipped: "compte Bluesky non branché (BLUESKY_APP_PASSWORD manquant)" });
    try {
      const sess = await blueskySession(cfg.bluesky);
      const res = await blueskySetProfile(sess, profile);
      if (res.avatarError) console.warn(`[social] logo Bluesky : ${res.avatarError}`);
      return json({ ok: true, handle: cfg.bluesky.handle, did: sess.did, profile, ...res, at: new Date().toISOString() });
    } catch (e) {
      console.warn(`[social] profil Bluesky : ${e.message}`);
      return json({ ok: false, handle: cfg.bluesky.handle, profile, error: e.message });
    }
  }
  // Post de lancement de l'offre Pro (?promo=1, compte admin seulement ; ?promo=1&dry=1 : aperçu). Une fois par langue :
  // un message Bluesky qui commence pareil dans les 12 dernières heures bloque la langue (Telegram compris).
  if (sp.get("promo") === "1") {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    const posts = launchPosts();
    if (sp.get("dry") === "1") return json({ ok: true, dry: true, posts });
    const out = [];
    let ps = null;
    if (cfg.bluesky) {
      try { ps = await blueskySession(cfg.bluesky); } catch (e) { out.push({ channel: "bluesky", ok: false, error: e.message }); }
    }
    const since = new Date(Date.now() - 12 * 3600e3).toISOString();
    for (const [lang, p] of Object.entries(posts)) {
      if (ps && (await blueskyPostedSince(ps, since, p.bluesky.text.slice(0, 15)))) { out.push({ lang, skipped: "déjà publié" }); continue; }
      const chat = cfg.telegram?.chats?.[lang];
      if (chat) {
        try { out.push({ channel: "telegram", lang, ok: true, id: await sendTelegram(cfg.telegram.token, chat, p.telegram, p.telegramPreview) }); }
        catch (e) { out.push({ channel: "telegram", lang, ok: false, error: e.message }); }
      }
      if (ps && cfg.bluesky.langs.includes(lang)) {
        try {
          const thumb = await blueskyThumb(ps, ogImageUrl(lang));
          out.push({ channel: "bluesky", lang, ok: true, uri: await sendBluesky(ps, p.bluesky, thumb) });
        } catch (e) { out.push({ channel: "bluesky", lang, ok: false, error: e.message }); }
      }
    }
    return json({ ok: out.every((x) => x.ok !== false), sent: out, at: new Date().toISOString() });
  }
  if (sp.get("check") === "1") {
    const check = { status: socialStatus(cfg), telegram: {}, bluesky: null };
    if (cfg.telegram) {
      for (const [lang, chat] of Object.entries(cfg.telegram.chats)) {
        try {
          check.telegram[lang] = { ok: true, ...(await telegramCheck(cfg.telegram.token, chat)) };
        } catch (e) {
          check.telegram[lang] = { ok: false, chat, error: e.message };
        }
      }
    }
    if (cfg.bluesky) {
      try {
        const s = await blueskySession(cfg.bluesky);
        check.bluesky = { ok: true, handle: cfg.bluesky.handle, did: s.did };
      } catch (e) {
        check.bluesky = { ok: false, handle: cfg.bluesky.handle, error: e.message };
      }
    }
    const tg = Object.values(check.telegram);
    const ok = tg.every((t) => t.ok && t.admin && t.canPost) && (!check.bluesky || check.bluesky.ok) && (tg.length > 0 || !!check.bluesky);
    return json({ ok, ...check, at: new Date().toISOString() });
  }
  // Power ranking de la semaine (?power=1, le lundi à 08 h 33 UTC) : top 5, plus forte hausse et plus forte baisse sur 7 jours.
  if (sp.get("power") === "1") {
    const rows = await powerRankings().catch(() => null);
    const posts = rows ? powerPosts(rows) : null;
    const pbase = { status: socialStatus(cfg), power: true };
    if (!posts) return json({ ok: false, ...pbase, skipped: "power ranking indisponible" });
    if (!cfg.enabled || sp.get("dry") === "1") return json({ ok: true, ...pbase, dry: true, posts });
    if (!cfg.telegram && !cfg.bluesky) return json({ ok: false, ...pbase, skipped: "aucun compte branché" });
    let ps = null;
    const errs = [];
    if (cfg.bluesky) {
      try {
        ps = await blueskySession(cfg.bluesky);
        if (await blueskyPostedSince(ps, new Date(Date.now() - 6 * 3600e3).toISOString(), POWER_MARK)) return json({ ok: true, ...pbase, skipped: "déjà publié (Bluesky)" });
      } catch (e) { errs.push({ channel: "bluesky", ok: false, error: e.message }); }
    }
    const sent = [...errs, ...(await sendPosts(cfg, ps, posts))];
    for (const s of sent.filter((x) => !x.ok)) console.warn(`[social power] ${s.channel}${s.lang ? ` ${s.lang}` : ""} : ${s.error}`);
    return json({ ok: sent.length > 0 && sent.every((s) => s.ok), ...pbase, sent, at: new Date().toISOString() });
  }
  // Récap du matin (?recap=1, 08 h 13 UTC) : résultats de la veille, plus grosse surprise, lien vers /app/resultats.
  if (sp.get("recap") === "1") {
    const r = await recapDay();
    const rbase = { d: r.d, status: socialStatus(cfg), games: r.facts.n, recap: true };
    if (!r.posts) return json({ ok: true, ...rbase, skipped: "aucun match terminé hier" });
    if (!cfg.enabled || sp.get("dry") === "1") return json({ ok: true, ...rbase, dry: true, posts: r.posts });
    if (!cfg.telegram && !cfg.bluesky) return json({ ok: false, ...rbase, skipped: "aucun compte branché" });
    if (lastRecap === r.d) return json({ ok: true, ...rbase, skipped: "récap déjà publié" });
    const out = [];
    let rs = null;
    if (cfg.bluesky) {
      try {
        rs = await blueskySession(cfg.bluesky);
        if (await blueskyPostedSince(rs, new Date(Date.now() - 6 * 3600e3).toISOString(), RECAP_MARK)) {
          lastRecap = r.d;
          return json({ ok: true, ...rbase, skipped: "récap déjà publié (Bluesky)" });
        }
      } catch (e) {
        out.push({ channel: "bluesky", ok: false, error: e.message });
      }
    }
    lastRecap = r.d;
    const tg = async () => {
      const o = [];
      for (const [lang, chat] of Object.entries(cfg.telegram?.chats || {})) {
        const p = r.posts[lang];
        if (!p) continue;
        try { o.push({ channel: "telegram", lang, ok: true, id: await sendTelegram(cfg.telegram.token, chat, p.telegram, p.telegramPreview) }); }
        catch (e) { o.push({ channel: "telegram", lang, ok: false, error: e.message }); }
      }
      return o;
    };
    const bs = async () => {
      const o = [];
      if (!rs) return o;
      for (const lang of cfg.bluesky.langs) {
        const p = r.posts[lang];
        if (!p) continue;
        try {
          const thumb = await blueskyThumb(rs, ogImageUrl(lang));
          o.push({ channel: "bluesky", lang, ok: true, uri: await sendBluesky(rs, p.bluesky, thumb) });
        } catch (e) { o.push({ channel: "bluesky", lang, ok: false, error: e.message }); }
      }
      return o;
    };
    const [a1, a2] = await Promise.all([tg(), bs()]);
    out.push(...a1, ...a2);
    for (const s of out.filter((x) => !x.ok)) console.warn(`[social récap] ${s.channel}${s.lang ? ` ${s.lang}` : ""} : ${s.error}`);
    return json({ ok: out.length > 0 && out.every((s) => s.ok), ...rbase, sent: out, at: new Date().toISOString() });
  }

  const day = await socialDay();
  const base = { d: day.d, status: socialStatus(cfg), games: day.picks.length, errors: day.errors };
  if (!day.picks.length) return json({ ok: !day.errors.length, ...base, skipped: "aucun match à venir aujourd'hui" });
  if (!cfg.enabled || sp.get("dry") === "1") return json({ ok: true, ...base, dry: true, posts: day.posts, nationals: await nationalsToday().catch((e) => ({ error: e.message })) });
  if (!cfg.telegram && !cfg.bluesky) return json({ ok: false, ...base, skipped: "aucun compte branché (variables Telegram ou Bluesky manquantes)" });
  if (Date.now() - lastRun < 60e3) return json({ ok: true, ...base, skipped: "déjà lancé il y a moins d'une minute" });
  if (lastDay === day.d) return json({ ok: true, ...base, skipped: "déjà publié aujourd'hui" });
  lastRun = Date.now();

  const sent = [];
  // Bluesky d'abord : s'il montre que le bot a déjà publié dans les 6 dernières heures, la tâche a déjà tourné
  // (relance de Vercel) et rien n'est republié, Telegram compris.
  let sess = null;
  if (cfg.bluesky) {
    try {
      sess = await blueskySession(cfg.bluesky);
      if (await blueskyPostedSince(sess, new Date(Date.now() - 6 * 3600e3).toISOString())) {
        lastDay = day.d;
        return json({ ok: true, ...base, skipped: "déjà publié aujourd'hui (Bluesky)" });
      }
    } catch (e) {
      sent.push({ channel: "bluesky", ok: false, error: e.message });
    }
  }
  // Telegram et Bluesky en parallèle (chacun dans l'ordre de ses langues), pour tenir dans le temps de la fonction.
  const telegramJob = async () => {
    const out = [];
    for (const [lang, chat] of Object.entries(cfg.telegram?.chats || {})) {
      const p = day.posts[lang];
      try {
        out.push({ channel: "telegram", lang, chat, ok: true, id: await sendTelegram(cfg.telegram.token, chat, p.telegram, p.telegramPreview) });
      } catch (e) {
        out.push({ channel: "telegram", lang, chat, ok: false, error: e.message });
      }
    }
    return out;
  };
  const blueskyJob = async () => {
    const out = [];
    if (!sess) return out;
    for (const lang of cfg.bluesky.langs) {
      try {
        const thumb = await blueskyThumb(sess, ogImageUrl(lang));
        out.push({ channel: "bluesky", lang, ok: true, uri: await sendBluesky(sess, day.posts[lang].bluesky, thumb) });
      } catch (e) {
        out.push({ channel: "bluesky", lang, ok: false, error: e.message });
      }
    }
    return out;
  };
  const [tgSent, bsSent] = await Promise.all([telegramJob(), blueskyJob()]);
  sent.push(...tgSent, ...bsSent);
  // Joueurs français, espagnols et latinos de la nuit (rien si aucun ne joue).
  try {
    for (const posts of await nationalsToday()) sent.push(...(await sendPosts(cfg, sess, posts)).map((x) => ({ ...x, nationals: true })));
  } catch (e) { console.warn(`[social] joueurs du soir : ${e.message}`); }
  if (sent.some((s) => s.ok)) lastDay = day.d;
  for (const s of sent.filter((x) => !x.ok)) console.warn(`[social] ${s.channel}${s.lang ? ` ${s.lang}` : ""} : ${s.error}`);
  return json({ ok: sent.length > 0 && sent.every((s) => s.ok), ...base, sent, at: new Date().toISOString() });
}
