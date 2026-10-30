import { NextResponse } from "next/server";
import { COOKIE, PLANS, cookieOptions, currentSession } from "../../../../lib/pro";
import { getUsage } from "../../../../lib/usage";

export const dynamic = "force-dynamic";

// Formule de l'abonné (lue dans le cookie signé, revérifiée chez Whop toutes les 6 h).
export async function GET(req) {
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  const tier = session?.tier && PLANS[session.tier] ? session.tier : session ? "compte" : "gratuit";
  const per = PLANS[tier].perDay;
  const used = session ? (await getUsage(session.uid))?.used ?? null : null; // analyses lancées aujourd'hui
  const res = NextResponse.json(
    { tier, perDay: Number.isFinite(per) ? per : null, connected: !!session, uid: session?.uid || null, name: session?.name || null, used },
    { headers: { "Cache-Control": "no-store" } }
  );
  if (refreshed) res.cookies.set(COOKIE, refreshed, cookieOptions);
  return res;
}
