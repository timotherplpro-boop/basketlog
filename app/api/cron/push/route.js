import { NextResponse } from "next/server";
import { socialDay } from "../../../../lib/social-day";
import { pushMessage, PUSH_LANGS } from "../../../../lib/push-text";
import { pushConfigured, pushEnabled, pushList, pushMark, pushRemove, sendPush } from "../../../../lib/push";
import { COOKIE, currentSession } from "../../../../lib/pro";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Notification du jour (web push) aux visiteurs qui l'ont acceptée, lancée par Vercel à 15 h 25 UTC (16 h 25 à Paris,
// 10 h 25 à New York), juste après la publication du jour sur Telegram et Bluesky. Une seule par jour et par abonné.
// Tant que PUSH_ENABLED ne vaut pas 1, rien n'est envoyé : la réponse montre les textes prévus et le nombre d'abonnés.
// ?dry=1 force l'aperçu. ?test=1 (compte admin connecté) envoie seulement aux abonnements de ce compte, même si
// PUSH_ENABLED ne vaut pas 1. Accès : tâche planifiée de Vercel (avec CRON_SECRET s'il est défini) ou compte admin.
let lastDay = "";

async function access(req) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") === `Bearer ${secret}`) return { who: "cron" };
  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (session?.role === "admin") return { who: "admin", uid: session.uid };
  if (!secret && /vercel-cron/i.test(req.headers.get("user-agent") || "")) return { who: "cron" };
  return null;
}

const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(req) {
  const who = await access(req);
  if (!who) return json({ error: "Accès refusé." }, 403);
  if (!pushConfigured()) return json({ error: "Clés VAPID ou base non configurées." }, 503);
  const q = req.nextUrl.searchParams;
  // Annonce du jeu de Noël (?concours=1, compte admin seulement ; Tim, 27/11/2026 10 h 56 : « lance tout ») : une seule
  // notification à chaque abonné FR, EN ou ES (pas en portugais : le Brésil est exclu du jeu). ?concours=1&dry=1 : aperçu.
  if (q.get("concours") === "1") {
    if (who.who !== "admin") return json({ error: "Accès refusé." }, 403);
    const txt = {
      fr: { title: "🎄 Jeu de Noël Basketlog", body: "1 PS5 + 1 maillot de Wemby à gagner ! Réservé aux abonnés Pro, tirage le 20 décembre →", url: "/concours?utm_source=push&utm_medium=notification&utm_campaign=noel" },
      en: { title: "🎄 Basketlog Christmas giveaway", body: "Win a PS5 + a Wemby jersey! For Pro members, draw on December 20 →", url: "/en/concours?utm_source=push&utm_medium=notification&utm_campaign=noel" },
      es: { title: "🎄 Sorteo de Navidad Basketlog", body: "¡Gana una PS5 + una camiseta de Wemby! Para suscriptores Pro, sorteo el 20 de diciembre →", url: "/es/concours?utm_source=push&utm_medium=notification&utm_campaign=noel" },
    };
    let subs0 = [];
    try { subs0 = await pushList(); } catch (e) { return json({ error: `Base : ${e.message}` }, 502); }
    const targets0 = subs0.filter((s) => txt[s.l || "fr"]);
    if (q.get("dry") === "1") return json({ dry: true, abonnes: subs0.length, cibles: targets0.length, messages: txt });
    let sent = 0, gone = 0, failed = 0;
    for (let i = 0; i < targets0.length; i += 20) {
      await Promise.all(targets0.slice(i, i + 20).map(async (s) => {
        const r = await sendPush({ endpoint: s.e, keys: { p256dh: s.k, auth: s.a } }, { ...txt[s.l || "fr"], tag: "concours-noel-2026" });
        if (r.ok) sent++; else if (r.gone) gone++; else failed++;
        try { if (r.gone) await pushRemove(s.e); } catch {}
      }));
    }
    return json({ concours: true, sent, gone, failed, abonnes: subs0.length });
  }
  const test = q.get("test") === "1" && who.who === "admin";

  const day = await socialDay();
  const messages = Object.fromEntries(PUSH_LANGS.map((l) => [l, pushMessage(day.picks, l)]));
  let subs = [];
  try { subs = await pushList(); } catch (e) { return json({ error: `Base : ${e.message}`, messages }, 502); }

  const dry = q.get("dry") === "1" || (!pushEnabled() && !test);
  if (dry) return json({ dry: true, enabled: pushEnabled(), day: day.d, abonnes: subs.length, messages });
  if (!day.picks.length) return json({ day: day.d, sent: 0, note: "Aucun match à venir aujourd'hui." });
  if (!test && lastDay === day.d) return json({ day: day.d, sent: 0, note: "Déjà envoyé aujourd'hui (cette instance)." });

  // Envoi d'essai : seulement l'abonnement de ce navigateur (?endpoint=, fourni par le bouton d'essai de PushOptIn).
  const only = test ? q.get("endpoint") : null;
  if (test && !only) return json({ error: "Envoi d'essai : ajoute ?endpoint= (abonnement de ce navigateur)." }, 400);
  const targets = only ? subs.filter((s) => s.e === only) : subs;

  let sent = 0, gone = 0, failed = 0;
  const started = Date.now();
  for (let i = 0; i < targets.length && Date.now() - started < 50000; i += 20) {
    const batch = targets.slice(i, i + 20);
    await Promise.all(batch.map(async (s) => {
      const msg = messages[s.l] || messages.fr;
      if (!msg) return;
      const r = await sendPush({ endpoint: s.e, keys: { p256dh: s.k, auth: s.a } }, msg);
      if (r.ok) sent++; else if (r.gone) gone++; else failed++;
      try { if (r.gone) await pushRemove(s.e); else await pushMark(s.e, !!r.ok); } catch {}
    }));
  }
  if (!test) lastDay = day.d;
  return json({ day: day.d, test, sent, gone, failed, abonnes: subs.length });
}
