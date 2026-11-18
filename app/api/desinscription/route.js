import { suppress, unsubOk } from "../../../lib/unsub";

export const dynamic = "force-dynamic";

// Lien « Se désinscrire » des e-mails Basketlog (lib/unsub.js). GET : clic sur le lien (page de confirmation) ;
// POST : désinscription en un clic depuis la messagerie (RFC 8058). Dans les deux cas, l'adresse est bloquée chez Resend.
const T = {
  fr: { ok: "C'est fait : tu ne recevras plus d'e-mails de Basketlog.", bad: "Ce lien de désinscription n'est pas valide. Écris « STOP » à contact@basketlog-app.com et on s'en occupe.", err: "Un souci technique nous empêche de te désinscrire tout de suite. Écris « STOP » à contact@basketlog-app.com et on s'en occupe.", back: "Retour au site" },
  en: { ok: "Done: you won't receive any more emails from Basketlog.", bad: "This unsubscribe link isn't valid. Email \"STOP\" to contact@basketlog-app.com and we'll take care of it.", err: "A technical issue prevents us from unsubscribing you right now. Email \"STOP\" to contact@basketlog-app.com and we'll take care of it.", back: "Back to the site" },
  es: { ok: "Listo: ya no recibirás más correos de Basketlog.", bad: "Este enlace para darte de baja no es válido. Escribe «STOP» a contact@basketlog-app.com y nos encargamos.", err: "Un problema técnico nos impide darte de baja ahora mismo. Escribe «STOP» a contact@basketlog-app.com y nos encargamos.", back: "Volver al sitio" },
};

async function run(req) {
  const u = new URL(req.url);
  const email = u.searchParams.get("e") || "";
  const sig = u.searchParams.get("s") || "";
  if (!email || !unsubOk(email, sig)) return "bad";
  try {
    await suppress(email);
    console.log("[desinscription] adresse bloquée");
    return "ok";
  } catch (e) {
    console.warn(`[desinscription] échec : ${String(e?.message || e).slice(0, 120)}`);
    return "err";
  }
}

export async function POST(req) {
  const r = await run(req);
  return new Response(null, { status: r === "ok" ? 200 : r === "bad" ? 400 : 502 });
}

export async function GET(req) {
  const r = await run(req);
  const l = new URL(req.url).searchParams.get("l");
  const t = T[l === "en" || l === "es" ? l : "fr"];
  const home = l === "en" || l === "es" ? `/${l}` : "/";
  const html = `<!doctype html><html lang="${l || "fr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Basketlog</title></head>
<body style="margin:0;padding:48px 20px;background:#0b1220;color:#f3f4f6;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;text-align:center">
<p style="font-size:24px;font-weight:800;margin:0 0 20px">🏀 Basketlog</p>
<p style="font-size:17px;line-height:1.5;max-width:460px;margin:0 auto 28px">${t[r]}</p>
<a href="${home}" style="color:#f97316;font-weight:700">${t.back}</a></body></html>`;
  return new Response(html, { status: r === "ok" ? 200 : r === "bad" ? 400 : 502, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
