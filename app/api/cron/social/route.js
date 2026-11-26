import { NextResponse } from "next/server";
import { socialDay, recapDay } from "../../../../lib/social-day";
import { blueskyProfile, ogImageUrl, RECAP_MARK, launchPosts, POWER_MARK, powerPosts, CONCOURS_MARK, concoursPost } from "../../../../lib/social";
import { powerRankings } from "../../../../lib/data";
import { GROUPS, nationalPosts } from "../../../../lib/nationals.js";
import { nationalBase, nationalFrom } from "../../../../lib/nationals-data";
import { sendTelegramPhoto } from "../../../../lib/social-send";
import { actuToken, readActu, actuUrls } from "../../../../lib/actu";
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
  // Actu du jour (?actu=1, compte admin seulement ; demande de Tim, 26/11/2026 21 h 45 : un visuel fait par IA sur
  // l'actualité, chaque jour, sur chaque réseau, avec des mots-dièse). Paramètres : t (titre sur l'image), x (texte de la
  // page et de Telegram), i (adresse https de l'image de fond), b (texte Bluesky, 300 signes au plus, mots-dièse compris).
  // Visuel version 2 (facultatif) : w (joueur ou équipe), n (stats « 44 PTS|16 REB »), m (score « Spurs|111|116|Blazers »), c (couleurs « C4CED4,E03A3E »), l (étiquette).
  // &dry=1 : rend seulement le jeton et les adresses (page /actu, images og, portrait, thumb) sans rien publier.
  // Publie sur Bluesky (carte avec l'image, lien vers la page) et sur la chaîne Telegram (photo + légende).
  if (sp.get("actu") === "1") {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    let k;
    try {
      k = actuToken({ t: sp.get("t"), x: sp.get("x") || "", i: sp.get("i"), w: sp.get("w"), n: sp.get("n"), m: sp.get("m"), c: sp.get("c"), l: sp.get("l") });
    } catch (e) {
      return json({ ok: false, error: e.message }, 400);
    }
    const a = readActu(k);
    const urls = actuUrls(k);
    const b = String(sp.get("b") || "").trim();
    const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("fr", { granularity: "grapheme" }) : null;
    const len = seg ? [...seg.segment(b)].length : [...b].length;
    if (sp.get("dry") === "1") return json({ ok: true, dry: true, k, ...urls, blueskyLength: len });
    const out = { ok: true, ...urls, bluesky: null, telegram: null, errors: [] };
    const enc = new TextEncoder();
    if (b && len <= 300 && cfg.bluesky) {
      try {
        const facets = [];
        // Liens : adresses complètes et « basketlog-app.com… » écrit sans https (cliquable aussi).
        for (const m of b.matchAll(/https?:\/\/[^\s]+|\bbasketlog-app\.com(?:\/[^\s]*)?/g)) {
          if (m.index > 0 && b[m.index - 1] === "/") continue;
          const s0 = enc.encode(b.slice(0, m.index)).length;
          const uri = /^https?:/.test(m[0]) ? m[0] : `https://${m[0]}`;
          facets.push({ index: { byteStart: s0, byteEnd: s0 + enc.encode(m[0]).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri }] });
        }
        for (const m of b.matchAll(/(^|\s)#([\p{L}\p{N}_]+)/gu)) {
          const at = m.index + m[1].length;
          const s0 = enc.encode(b.slice(0, at)).length;
          facets.push({ index: { byteStart: s0, byteEnd: s0 + enc.encode(`#${m[2]}`).length }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: m[2] }] });
        }
        const sess = await blueskySession(cfg.bluesky);
        const thumb = await blueskyThumb(sess, urls.thumb);
        out.bluesky = await sendBluesky(sess, { text: b, facets, langs: ["fr"], url: urls.page, title: a.t, description: a.x.replace(/\s+/g, " ").slice(0, 200) }, thumb);
      } catch (e) {
        out.errors.push(`bluesky : ${e.message}`);
      }
    } else if (b) out.errors.push(`bluesky : texte de ${len} signes (300 au plus) ou compte non branché`);
    if (cfg.telegram) {
      const chat = cfg.telegram.chats.fr || Object.values(cfg.telegram.chats)[0];
      const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const tags = (b.match(/#[\p{L}\p{N}_]+/gu) || []).join(" ");
      const cap = `<b>${esc(a.t)}</b>\n\n${esc(a.x).slice(0, 760)}\n\n👉 <a href="${urls.page}">basketlog-app.com</a>${tags ? `\n${esc(tags)}` : ""}`;
      try {
        out.telegram = await sendTelegramPhoto(cfg.telegram.token, chat, urls.portrait, cap);
      } catch (e) {
        out.errors.push(`telegram : ${e.message}`);
      }
    }
    out.ok = out.errors.length === 0;
    return json(out);
  }

  // Jeu de Noël sur la chaîne Telegram française (?concourstg=1, compte admin seulement), texte validé par Tim le 26/11
  // (20 h 55, « Fais-moi le chantier ») : achat du Pro obligatoire, mots-dièse en bas. À n'appeler qu'une fois.
  if (sp.get("concourstg") === "1") {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    if (!cfg.telegram) return json({ ok: false, skipped: "bot Telegram non branché" });
    const chat = cfg.telegram.chats.fr || Object.values(cfg.telegram.chats)[0];
    const url = "https://basketlog-app.com/concours";
    const html = `🎄 JEU DE NOËL 🎁\n\n1 PS5 + 1 maillot de Victor Wembanyama à gagner !\n\nPour participer : passe Pro (9,99 €/mois) 👉 <a href="${url}">basketlog-app.com/concours</a>\nDéjà Pro ? Tu participes.\n\nTirage le 20 décembre.\n\nPS5 ou maillot de Wemby ? 👇\n\n#JeuConcours #NBA #Wembanyama #PS5 #Basket`;
    if (sp.get("dry") === "1") return json({ ok: true, dry: true, chat, html });
    try {
      const r = await sendTelegram(cfg.telegram.token, chat, html, url);
      return json({ ok: true, chat, result: r });
    } catch (e) {
      return json({ ok: false, chat, error: e.message });
    }
  }

  // Titre de la chaîne Telegram française (?tgtitle=1, compte admin seulement) : « Basketlog – Probabilités NBA »
  // (demande de Tim, 26/11/2026 20 h 54 : plus de mot « pronostics »). Renvoie aussi la description de la chaîne.
  if (sp.get("tgtitle") === "1") {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    if (!cfg.telegram) return json({ ok: false, skipped: "bot Telegram non branché" });
    const chat = cfg.telegram.chats.fr || Object.values(cfg.telegram.chats)[0];
    const title = "Basketlog – Probabilités NBA";
    const tg = (method, body) => fetch(`https://api.telegram.org/bot${cfg.telegram.token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()).catch((e) => ({ ok: false, description: e.message }));
    const before = await tg("getChat", { chat_id: chat });
    const set = before.result?.title === title ? { ok: true, unchanged: true } : await tg("setChatTitle", { chat_id: chat, title });
    const desc0 = before.result?.description || "";
    const desc = desc0.replace(/Les pronostics/g, "Les probabilités").replace(/pronostics/gi, "probabilités");
    const setDesc = desc && desc !== desc0 ? await tg("setChatDescription", { chat_id: chat, description: desc }) : { ok: true, unchanged: true };
    return json({ ok: !!set.ok && !!setDesc.ok, chat, title, before: before.result?.title || null, description: desc || null, error: set.ok ? (setDesc.ok ? undefined : setDesc.description) : set.description });
  }

  // Suppression d'un post du compte (compte admin seulement) : ?tgdel=<n° du message de la chaîne Telegram française>
  // et/ou ?bskydel=<identifiant du post Bluesky, la fin de l'adresse at://…/app.bsky.feed.post/…>. Sert à remplacer un
  // post raté (Tim, 26/11 22 h 15 : « Remplacer et publier partout »).
  if (sp.get("tgdel") || sp.get("bskydel")) {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    const out = { ok: true, telegram: null, bluesky: null, errors: [] };
    const tgId = Number(sp.get("tgdel"));
    if (tgId > 0 && cfg.telegram) {
      const chat = cfg.telegram.chats.fr || Object.values(cfg.telegram.chats)[0];
      const j = await fetch(`https://api.telegram.org/bot${cfg.telegram.token}/deleteMessage`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chat, message_id: tgId }) }).then((r) => r.json()).catch((e) => ({ ok: false, description: e.message }));
      out.telegram = j.ok ? `message ${tgId} supprimé` : null;
      if (!j.ok) out.errors.push(`telegram : ${j.description}`);
    }
    const rkey = String(sp.get("bskydel") || "").trim();
    if (/^[a-z0-9]{10,20}$/.test(rkey) && cfg.bluesky) {
      try {
        const sess = await blueskySession(cfg.bluesky);
        const r = await fetch(`${sess.pds}/xrpc/com.atproto.repo.deleteRecord`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${sess.jwt}` }, body: JSON.stringify({ repo: sess.did, collection: "app.bsky.feed.post", rkey }) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        out.bluesky = `post ${rkey} supprimé`;
      } catch (e) {
        out.errors.push(`bluesky : ${e.message}`);
      }
    }
    out.ok = !out.errors.length;
    return json(out);
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
  // Jeu de Noël (?concours=1, compte admin seulement ; ?concours=1&dry=1 : aperçu) : Bluesky en français seulement,
  // une seule fois (un message du compte qui commence par « 🎄 JEU DE NOËL » dans les 7 derniers jours bloque l'envoi).
  if (sp.get("concours") === "1") {
    if (who !== "admin") return json({ error: "interdit" }, 401);
    const post = concoursPost();
    if (sp.get("dry") === "1") return json({ ok: true, dry: true, post, bluesky: !!cfg.bluesky });
    if (!cfg.bluesky) return json({ ok: false, skipped: "compte Bluesky non branché (BLUESKY_APP_PASSWORD manquant)" });
    try {
      const s = await blueskySession(cfg.bluesky);
      if (await blueskyPostedSince(s, new Date(Date.now() - 7 * 86400e3).toISOString(), CONCOURS_MARK)) return json({ ok: true, skipped: "déjà publié" });
      const thumb = await blueskyThumb(s, post.image);
      return json({ ok: true, handle: cfg.bluesky.handle, uri: await sendBluesky(s, post, thumb), thumb: !!thumb, at: new Date().toISOString() });
    } catch (e) {
      return json({ ok: false, error: e.message });
    }
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
