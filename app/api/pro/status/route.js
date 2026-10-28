import { NextResponse } from "next/server";
import { COOKIE, PLANS, cookieOptions, currentSession } from "../../../../lib/pro";

export const dynamic = "force-dynamic";

// Formule de l'abonné (lue dans le cookie signé, revérifiée chez Whop toutes les 6 h).
export async function GET(req) {
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  const tier = session?.tier && PLANS[session.tier] ? session.tier : "gratuit";
  const per = PLANS[tier].perDay;
  const res = NextResponse.json(
    { tier, perDay: Number.isFinite(per) ? per : null, connected: !!session, uid: session?.uid || null, name: session?.name || null },
    { headers: { "Cache-Control": "no-store" } }
  );
  if (refreshed) res.cookies.set(COOKIE, refreshed, cookieOptions);
  return res;
}
