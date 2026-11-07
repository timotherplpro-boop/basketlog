import { after } from "next/server";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { dbRpc, rolesConfigured } from "../../../lib/roles";
import { usageDay } from "../../../lib/usage";
import { STEP_IDS, SOURCE_IDS, LANGS } from "../../../lib/funnel-steps";

export const dynamic = "force-dynamic";

// Compteur anonyme du parcours vers l'abonnement (lib/funnel.js) : +1 sur (jour, étape, source, langue, appareil).
// Rien n'est gardé sur la personne : ni adresse IP, ni identifiant, ni cookie. L'adresse IP ne sert qu'à freiner,
// en mémoire et quelques secondes, un envoi en rafale.
const BOT = /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|whatsapp|telegram|discord|curl|wget|python|node-fetch|axios|go-http|basketlog-tests/i;
const PAID = new Set(["starter", "pro", "lifetime"]);
const done = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

const burst = new Map(); // ip -> [début de la minute, nombre]
function tooMany(ip) {
  const now = Date.now();
  const b = burst.get(ip);
  if (!b || now - b[0] > 60e3) {
    if (burst.size > 5000) burst.clear();
    burst.set(ip, [now, 1]);
    return false;
  }
  b[1]++;
  return b[1] > 30;
}

let warned = 0;

export async function POST(req) {
  if (!rolesConfigured()) return done();
  const h = req.headers;
  const site = h.get("sec-fetch-site");
  if (site && site !== "same-origin") return done(); // envoyé depuis une autre page que Basketlog
  const ua = h.get("user-agent") || "";
  if (!ua || BOT.test(ua)) return done();
  let b = null;
  try { b = JSON.parse((await req.text()).slice(0, 300)); } catch { return done(); }
  const step = typeof b?.e === "string" && STEP_IDS.has(b.e) ? b.e : null;
  if (!step) return done();
  // Admin, créateurs et abonnés (déjà payants) ne comptent pas : on mesure le parcours des futurs clients.
  const s = decodeSession(req.cookies.get(COOKIE)?.value);
  if (s?.role || s?.admin || PAID.has(s?.paid)) return done();
  const ip = (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "?";
  if (tooMany(ip)) return done();
  const source = SOURCE_IDS.has(b.s) ? b.s : "autre";
  const langue = LANGS.includes(b.l) ? b.l : "fr";
  const appareil = /ipad|tablet/i.test(ua) ? "tablette" : /mobi|android|iphone|ipod/i.test(ua) ? "mobile" : "ordinateur";
  after(async () => {
    try {
      await dbRpc("basketlog_stat_hit", { p_jour: usageDay(), p_etape: step, p_source: source, p_langue: langue, p_appareil: appareil }, 4000);
    } catch (e) {
      if (warned++ < 3) console.warn(`[stats] compteur non enregistré (${e.message})`);
    }
  });
  return done();
}
