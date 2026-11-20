import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { cleanSubscription, PUSH_LANGS } from "../../../lib/push-text";
import { pushAdd, pushConfigured, pushRemove } from "../../../lib/push";

export const dynamic = "force-dynamic";

// Abonnement aux notifications du soir (components/PushOptIn.jsx) : POST { sub, lang } l'enregistre, DELETE { endpoint }
// le retire. Le compte connecté, s'il y en a un, est noté avec l'abonnement (pour l'envoi d'essai de l'admin).
const json = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function body(req) {
  try {
    const text = await req.text();
    if (text.length > 4000) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(req) {
  if (!pushConfigured()) return json({ error: "config" }, 503);
  const b = await body(req);
  const sub = cleanSubscription(b?.sub);
  if (!sub) return json({ error: "abonnement" }, 400);
  const lang = PUSH_LANGS.includes(b?.lang) ? b.lang : "fr";
  const uid = decodeSession((await cookies()).get(COOKIE)?.value)?.uid || null;
  try {
    await pushAdd(sub, lang, uid);
    return json({ ok: true });
  } catch {
    return json({ error: "base" }, 502);
  }
}

export async function DELETE(req) {
  if (!pushConfigured()) return json({ error: "config" }, 503);
  const b = await body(req);
  const sub = cleanSubscription({ endpoint: b?.endpoint, keys: { p256dh: "x".repeat(20), auth: "x".repeat(8) } });
  if (!sub) return json({ error: "abonnement" }, 400);
  try {
    await pushRemove(sub.endpoint);
    return json({ ok: true });
  } catch {
    return json({ error: "base" }, 502);
  }
}
