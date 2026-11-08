import { NextResponse } from "next/server";
import { socialDay } from "../../../../lib/social-day";
import { ogImageUrl } from "../../../../lib/social";
import { socialConfig, socialStatus, sendTelegram, telegramCheck, blueskySession, blueskyThumb, sendBluesky, blueskyPostedSince } from "../../../../lib/social-send";
import { COOKIE, currentSession } from "../../../../lib/pro";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Publication quotidienne des pronostics du jour sur Telegram et Bluesky (textes : lib/social.js), lancée par Vercel
// à 15 h 20 UTC (16 h 20 à Paris, 10 h 20 à New York) : juste après l'enregistrement des pronostics de 15 h 07
// (/api/cron/pronos), avant les matchs EuroLeague et NBA du soir.
// Tant que SOCIAL_ENABLED ne vaut pas 1, rien n'est publié : la réponse montre seulement les messages prévus.
// ?dry=1 force l'aperçu ; ?check=1 vérifie les comptes (bot Telegram administrateur de la chaîne, connexion Bluesky)
// sans rien publier. Accès : tâche planifiée de Vercel (avec CRON_SECRET s'il est défini) ou compte admin connecté.
let lastRun = 0;
let lastDay = "";

async function allowed(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return true;
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return true;
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  return session?.role === "admin";
}

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req) {
  if (!(await allowed(req))) return json({ error: "interdit" }, 401);
  const sp = new URL(req.url).searchParams;
  const cfg = socialConfig();
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
  const day = await socialDay();
  const base = { d: day.d, status: socialStatus(cfg), games: day.picks.length, errors: day.errors };
  if (!day.picks.length) return json({ ok: !day.errors.length, ...base, skipped: "aucun match à venir aujourd'hui" });
  if (!cfg.enabled || sp.get("dry") === "1") return json({ ok: true, ...base, dry: true, posts: day.posts });
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
  if (cfg.telegram) {
    for (const [lang, chat] of Object.entries(cfg.telegram.chats)) {
      const p = day.posts[lang];
      try {
        sent.push({ channel: "telegram", lang, chat, ok: true, id: await sendTelegram(cfg.telegram.token, chat, p.telegram, p.telegramPreview) });
      } catch (e) {
        sent.push({ channel: "telegram", lang, chat, ok: false, error: e.message });
      }
    }
  }
  if (sess) {
    for (const lang of cfg.bluesky.langs) {
      try {
        const thumb = await blueskyThumb(sess, ogImageUrl(lang));
        sent.push({ channel: "bluesky", lang, ok: true, uri: await sendBluesky(sess, day.posts[lang].bluesky, thumb) });
      } catch (e) {
        sent.push({ channel: "bluesky", lang, ok: false, error: e.message });
      }
    }
  }
  if (sent.some((s) => s.ok)) lastDay = day.d;
  for (const s of sent.filter((x) => !x.ok)) console.warn(`[social] ${s.channel}${s.lang ? ` ${s.lang}` : ""} : ${s.error}`);
  return json({ ok: sent.length > 0 && sent.every((s) => s.ok), ...base, sent, at: new Date().toISOString() });
}
