import { NextResponse } from "next/server";
import { COOKIE, QUESTIONS, aiReady, cookieOptions, currentSession } from "../../../../lib/pro";
import { matchKey, questionUsage, recordQuestion, tierOf } from "../../../../lib/usage";
import { analysisFor } from "../../../../lib/analysisFor";
import { askAI } from "../../../../lib/ask";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const str = (v, n) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" ? String(v) : null);

// Question personnelle à l'IA sur un match : Pro 1 par jour, Lifetime illimitées (usage raisonnable : 50 par jour).
// Corps : { league, id, d, question, lang }. Le quota n'est compté que si l'IA a bien répondu.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const json = (o, status = 200, refreshed = null) => {
    const r = NextResponse.json(o, { status, headers: { "Cache-Control": "no-store" } });
    if (refreshed) r.cookies.set(COOKIE, refreshed, cookieOptions);
    return r;
  };
  const question = (str(body.question, 400) || "").replace(/\s+/g, " ").trim();
  if (question.length < 3) return json({ error: "question" }, 400);
  if (!aiReady()) return json({ error: "ia" }, 503);

  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session) return json({ error: "connexion" }, 401);
  const tier = tierOf(session.tier);
  const limit = QUESTIONS[tier] || 0;
  if (!limit) return json({ error: "formule", tier }, 403, refreshed);

  const league = body.league === "EL" ? "EL" : "NBA";
  const id = str(body.id, 60);
  const d = typeof body.d === "string" && /^\d{8}$/.test(body.d) ? body.d : null;
  const lang = ["fr", "en", "es"].includes(body.lang) ? body.lang : "fr";
  if (!id) return json({ error: "match" }, 400, refreshed);

  const used = await questionUsage(session.uid);
  if (used != null && used >= limit) return json({ error: "limite", used, limit: tier === "lifetime" ? null : limit }, 429, refreshed);

  const a = await analysisFor(league, id, d).catch(() => null);
  if (!a) return json({ error: "match" }, 404, refreshed);
  const answer = await askAI(a, league, question, lang, req.headers.get("x-vercel-oidc-token"));
  if (!answer) return json({ error: "ia" }, 502, refreshed);

  const r = await recordQuestion(session.uid, matchKey(league, id), limit);
  return json({ answer, used: r?.used ?? (used ?? 0) + 1, limit: tier === "lifetime" ? null : limit }, 200, refreshed);
}
