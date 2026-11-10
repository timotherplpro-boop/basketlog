import { NextResponse } from "next/server";
import { COOKIE, currentSession } from "../../../../lib/pro";
import { nbaToday, seasonForDate } from "../../../../lib/espn";
import { nbaPicks, elPicks, lastDays, sureRecord } from "../../../../lib/history";
import { publishedPicks } from "../../../../lib/pronos";
import { upcomingAnalyses } from "../../../../lib/data";
import { elUpcoming } from "../../../../lib/euroleague";
import { surePicks } from "../../../../lib/sure";
import { SITE } from "../../../../lib/site";
import { mk } from "../../../../lib/i18n";
import { ISSUE_LANGS, buildIssue, clearestFavorites, runWindow, sundaySlot, weekBilan } from "../../../../lib/newsletter";
import { maskEmail, newsletterConfig, resend } from "../../../../lib/resend";
import { sessionEmail } from "../../../../lib/session-email";
import { rehearseBroadcast, scheduleWeek } from "../../../../lib/newsletter-server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Newsletter du dimanche : le mail de la semaine est préparé avec les vrais chiffres du site (bilan des 7 derniers jours,
// matchs à confiance très élevée à venir : lib/newsletter.js) puis PROGRAMMÉ chez Resend pour dimanche 18 h, heure de Paris
// (été comme hiver : l'instant exact est calculé ici et transmis à Resend, peu importe l'heure où Vercel lance la tâche).
// Il part à ceux qui se sont inscrits eux-mêmes dans leur compte (liste « Basketlog newsletter », sujet de leur langue :
// lib/resend.js). Rien ne part tant que NEWSLETTER_ENABLED ne vaut pas 1 et que RESEND_API_KEY n'est pas définie.
//
// Lancée par Vercel deux fois le dimanche (vercel.json) : à 12 h 11 UTC, puis à 13 h 41 UTC avec ?pass=2 (reprise si la première
// n'a pas pu tout lire ; à la reprise, on envoie avec ce qu'on a plutôt que rien). Elle ne programme que dans les 8 heures qui
// précèdent l'envoi, et jamais deux fois : une diffusion « Newsletter <semaine ISO> <langue> » déjà programmée est laissée telle quelle.
// Paramètres (compte admin connecté, sauf mention) :
//   ?dry=1                  aperçu sans rien programmer, même avant que Resend soit branché
//   ?dry=1&lang=fr&format=html|text   le mail lui-même, à ouvrir dans le navigateur
//   ?test=1[&lang=fr]       envoie le mail à l'adresse de l'admin connecté (lui seul), précédé de [TEST]
//   ?diag=1                 vérifie les branchements (adresse de l'admin lisible, domaine d'envoi, liste, sujets) sans rien envoyer
//   ?rehearse=1             répétition de la diffusion : crée un brouillon (liste + sujet), le relit et le supprime ; rien n'est programmé ni envoyé
// Accès : tâche planifiée de Vercel (avec CRON_SECRET s'il est défini) ou compte admin connecté.
let lastRun = 0;

async function access(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return { who: "cron" };
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role === "admin") return { who: "admin", uid: session.uid, session };
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return { who: "cron" };
  return null;
}

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);
const note = (e) => String(e?.message || e).slice(0, 240);

// Les chiffres du mail, tels que le site les affiche : { data, errors }. Une source illisible n'est jamais remplacée par une
// valeur inventée : elle manque, et c'est dit dans errors.
async function collect(slot) {
  const errors = [];
  const today = nbaToday();
  const season = seasonForDate(today);
  const [pub, upcoming, , rec] = await Promise.all([
    within(publishedPicks(), 8000),
    within(upcomingAnalyses(7), 20000),
    within(elUpcoming(7), 10000), // met l'EuroLeague en cache : surePicks ne l'attend que 1,5 s
    within(sureRecord(), 25000),
  ]);
  if (!upcoming) errors.push("matchs à venir illisibles");

  // Bilan des 7 derniers jours : pronostics publiés avant les matchs ; à défaut (aucun sur la période), bilan recalculé.
  const real = pub ? lastDays(pub.graded, 7, today) : [];
  let calc = [];
  if (!real.length) {
    const [cur, el] = await Promise.all([within(nbaPicks(season), 25000), within(elPicks(), 25000)]);
    if (!cur) errors.push("bilan illisible");
    calc = lastDays([...(cur || []), ...(el || [])], 7, today);
  }
  const bilan = weekBilan(real, calc);

  const sure = await surePicks(upcoming, { el: true, days: 7 });
  const favorites = sure.length ? [] : clearestFavorites(upcoming);
  const record = rec?.nba || null;
  return { data: { at: slot.iso, week: slot.week.label, bilan, sure, favorites, record }, errors };
}

const summary = (data) => ({
  bilan: data.bilan ? { n: data.bilan.n, ok: data.bilan.ok, sureN: data.bilan.sureN, sureOk: data.bilan.sureOk, source: data.bilan.source } : null,
  sure: data.sure.length,
  favorites: data.favorites.length,
  record: data.record ? { n: data.record.n, ok: data.record.ok, since: data.record.since } : null,
});

const configView = (cfg) => ({ ready: cfg.ready, enabled: cfg.enabled, langs: cfg.langs, from: cfg.from, replyTo: cfg.replyTo });

export async function GET(req) {
  const me = await access(req);
  if (!me) return json({ error: "interdit" }, 401);
  const sp = new URL(req.url).searchParams;
  const cfg = newsletterConfig();
  const admin = me.who === "admin";
  const dry = sp.get("dry") === "1";
  const langOf = (v) => (ISSUE_LANGS.includes(v) ? v : "fr");

  // ---------- Vérification des branchements (admin) ----------
  if (sp.get("diag") === "1") {
    if (!admin) return json({ error: "interdit" }, 401);
    const out = { config: configView(cfg), slot: sundaySlot(), whop: null, resend: null };
    try {
      const who = await sessionEmail(me.session);
      out.whop = { ok: true, email: maskEmail(who.email), source: who.account ? "compte Basketlog" : "Whop" };
    } catch (e) {
      out.whop = { ok: false, kind: e?.kind || "?", error: note(e), ...(e?.detail ? { detail: e.detail } : {}) };
    }
    const r = resend();
    if (!r) {
      out.resend = { ok: false, error: "RESEND_API_KEY absente" };
    } else {
      const domainName = (cfg.from.match(/@([^>\s]+)/) || [])[1] || "";
      const part = async (fn) => { try { return { ok: true, ...(await fn()) }; } catch (e) { return { ok: false, kind: e?.kind || "?", error: note(e) }; } };
      out.resend = {
        domain: await part(async () => ({ name: domainName, ...((await r.domain(domainName)) || { status: "absent" }) })),
        segment: await part(async () => ({ id: (await r.segmentId({ create: false })) || null })),
        topics: Object.fromEntries(await Promise.all(cfg.langs.map(async (l) => [l, await part(async () => ({ id: (await r.topicId(l, { create: false })) || null }))]))),
        contacts: await part(async () => ({ any: await r.hasContacts() })),
      };
    }
    return json({ ok: true, diag: true, ...out, at: new Date().toISOString() });
  }

  // ---------- Répétition de la diffusion (admin) : un brouillon créé puis supprimé, jamais programmé ni envoyé ----------
  if (sp.get("rehearse") === "1") {
    if (!admin) return json({ error: "interdit" }, 401);
    const r = resend();
    if (!r) return json({ ok: false, rehearse: true, error: "RESEND_API_KEY absente" });
    return json({ rehearse: true, ...(await rehearseBroadcast({ client: r, from: cfg.from, replyTo: cfg.replyTo })), at: new Date().toISOString() });
  }

  // ---------- Programmation : d'abord les garde-fous, avant toute lecture des chiffres ----------
  const now = Date.now();
  const win = runWindow(now);
  const slot = win.slot;
  const test = sp.get("test") === "1";
  const base = { week: slot.week.label, at: slot.iso, local: slot.local, status: configView(cfg) };
  if (!dry && !test) {
    if (!cfg.enabled) return json({ ok: true, ...base, skipped: "newsletter fermée (NEWSLETTER_ENABLED différent de 1, ou RESEND_API_KEY absente)" });
    if (!win.open) return json({ ok: true, ...base, skipped: "hors fenêtre : la tâche programme dans les 8 heures qui précèdent l'envoi, au moins 5 minutes avant" });
  }

  // ---------- Le contenu (aperçu, test et programmation) ----------
  const { data, errors } = await collect(slot);

  if (dry) {
    if (!admin && sp.get("format")) return json({ error: "interdit" }, 401);
    const langs = sp.get("lang") ? [langOf(sp.get("lang"))] : cfg.langs;
    const issues = langs.map((lang) => ({ lang, ...buildIssue(data, lang) }));
    const fmt = sp.get("format");
    if (fmt === "html" || fmt === "text") {
      const it = issues[0];
      return new Response(fmt === "html" ? it.html : it.text, { headers: { "Content-Type": `${fmt === "html" ? "text/html" : "text/plain"}; charset=utf-8`, "Cache-Control": "no-store" } });
    }
    return json({
      ok: !errors.length,
      dry: true,
      config: configView(cfg),
      week: slot.week.label,
      send: { at: slot.iso, local: slot.local, programmedIn: win.open ? "fenêtre ouverte" : "fenêtre fermée (la tâche programme dans les 8 h qui précèdent l'envoi)" },
      data: summary(data),
      issues: issues.map((i) => ({ lang: i.lang, subject: i.subject, preheader: i.preheader, empty: i.empty, htmlChars: i.html.length })),
      errors,
    });
  }

  // ---------- Test : le mail à l'adresse de l'admin connecté (compte Basketlog, ou Whop), rien d'autre ----------
  if (test) {
    if (!admin) return json({ error: "interdit" }, 401);
    const r = resend();
    if (!r) return json({ ok: false, error: "RESEND_API_KEY absente : définis-la dans Vercel pour envoyer un test" }, 200);
    const lang = langOf(sp.get("lang"));
    const issue = buildIssue({ ...data, unsubscribeUrl: `${SITE}${mk(lang).href("/app/compte")}` }, lang);
    try {
      const to = (await sessionEmail(me.session)).email;
      const sent = await r.sendEmail({
        from: cfg.from, to, replyTo: cfg.replyTo, subject: `[TEST] ${issue.subject}`, html: issue.html, text: issue.text,
        idempotencyKey: `newsletter-test-${slot.week.label}-${lang}-${me.uid}-${Math.floor(now / 60000)}`,
      });
      console.log(`[newsletter] test envoyé à l'admin (${lang})`);
      return json({ ok: true, test: true, to: maskEmail(to), lang, id: sent?.id || null, note: "Le lien « Se désinscrire » du test renvoie vers Mon compte ; dans le vrai envoi, Resend met le lien de désinscription de chaque lecteur.", errors });
    } catch (e) {
      console.warn(`[newsletter] test : ${e?.kind || "?"} — ${note(e)}`);
      return json({ ok: false, test: true, error: note(e), kind: e?.kind || "?" });
    }
  }

  // ---------- Programmation de la semaine ----------
  const lastChance = sp.get("pass") === "2";
  if (errors.length && !lastChance) {
    console.warn(`[newsletter] données incomplètes, reprise prévue : ${errors.join(" ; ")}`);
    return json({ ok: false, ...base, skipped: "données incomplètes : la reprise de 13 h 41 UTC réessaie", errors });
  }
  if (Date.now() - lastRun < 60e3) return json({ ok: true, ...base, skipped: "déjà lancé il y a moins d'une minute" });
  lastRun = Date.now();

  let results;
  try {
    results = await scheduleWeek({ client: resend(), langs: cfg.langs, slot, data, from: cfg.from, replyTo: cfg.replyTo });
  } catch (e) {
    console.warn(`[newsletter] lecture des diffusions : ${e?.kind || "?"} — ${note(e)}`);
    return json({ ok: false, ...base, error: `Resend : ${note(e)}`, errors });
  }
  return json({ ok: results.every((x) => x.state !== "erreur"), ...base, pass: lastChance ? 2 : 1, data: summary(data), results, errors });
}
