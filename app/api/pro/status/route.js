import { NextResponse } from "next/server";
import { COOKIE, PLANS, cookieOptions, currentSession, usageKey } from "../../../../lib/pro";
import { getUsage } from "../../../../lib/usage";
import { isAccountSession } from "../../../../lib/auth-utils";

export const dynamic = "force-dynamic";

// Formule de l'abonné (lue dans le cookie signé, revérifiée chez Whop : 2 min pour un compte gratuit, 6 h pour un Lifetime).
// acct : compte Basketlog par e-mail ou Google (whop : un compte Whop lui est relié) ; cleared : la session n'est plus
// valable (compte supprimé, ou mot de passe changé ailleurs), le cookie est effacé.
export async function GET(req) {
  const { session, refreshed, changed, cleared } = await currentSession(req.cookies.get(COOKIE)?.value);
  const tier = session?.tier && PLANS[session.tier] ? session.tier : session ? "compte" : "gratuit";
  const per = PLANS[tier].perDay;
  const used = session ? (await getUsage(usageKey(session)))?.used ?? null : null; // analyses lancées aujourd'hui
  const acct = isAccountSession(session);
  const res = NextResponse.json(
    {
      tier, perDay: Number.isFinite(per) ? per : null, connected: !!session, uid: session?.uid || null, name: session?.name || null, role: session?.role || null, used, changed: !!changed,
      acct, ...(acct ? { email: session.email || null, whop: !!session.whop } : {}), ...(cleared ? { cleared: true } : {}),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
  if (refreshed) res.cookies.set(COOKIE, refreshed, cookieOptions);
  if (cleared) res.cookies.delete({ name: COOKIE, path: "/" });
  return res;
}
