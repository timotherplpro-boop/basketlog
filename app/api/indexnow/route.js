// Signale les pages du site à Bing, Yandex, Seznam, Naver… via IndexNow (une fois par jour, tâche Vercel).
// N'envoie que les adresses du sitemap de Basketlog : sans risque si quelqu'un appelle cette route.
import sitemap from "../../sitemap";
import { SITE } from "../../../lib/site";

export const dynamic = "force-dynamic";
const KEY = "d04d8f4f6a2af98245da534805f6cd84"; // publique par nature : publiée dans /<clé>.txt
let last = 0;

export async function GET() {
  if (Date.now() - last < 10 * 60e3) return Response.json({ ok: true, skipped: "envoi récent" });
  last = Date.now();
  const urlList = (await sitemap()).map((e) => e.url).slice(0, 10000);
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
  });
  return Response.json({ ok: res.ok, status: res.status, sent: urlList.length });
}
