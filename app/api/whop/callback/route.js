import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { COOKIE, cookieOptions, encodeSession, whopTier } from "../../../../lib/pro";

// Retour de Whop : échange du code, identité de l'utilisateur, vérification de l'abonnement.
export async function GET(req) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const verifier = req.cookies.get("whop_pkce")?.value;
  const expected = req.cookies.get("whop_state")?.value;
  const fail = (why) => {
    const r = NextResponse.redirect(`${SITE}/pro?erreur=${why}`);
    r.cookies.delete({ name: "whop_pkce", path: "/api/whop" });
    r.cookies.delete({ name: "whop_state", path: "/api/whop" });
    return r;
  };
  if (!code || !state || !verifier || state !== expected) return fail("connexion");

  try {
    const body = {
      grant_type: "authorization_code",
      code,
      redirect_uri: `${SITE}/api/whop/callback`,
      client_id: process.env.WHOP_CLIENT_ID,
      code_verifier: verifier,
    };
    if (process.env.WHOP_CLIENT_SECRET) body.client_secret = process.env.WHOP_CLIENT_SECRET;
    const tok = await fetch("https://api.whop.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!tok.ok) return fail("connexion");
    const { access_token } = await tok.json();
    const info = await fetch("https://api.whop.com/oauth/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : null));
    const uid = info?.sub;
    if (!uid) return fail("connexion");

    const tier = await whopTier(uid);
    const value = encodeSession({ uid, name: info.preferred_username || info.name || "", tier, checked: Date.now() });
    if (!value) return fail("config");
    const r = NextResponse.redirect(`${SITE}/pro?${tier === "gratuit" ? "erreur=abonnement" : "ok=1"}`);
    r.cookies.set(COOKIE, value, cookieOptions);
    r.cookies.delete({ name: "whop_pkce", path: "/api/whop" });
    r.cookies.delete({ name: "whop_state", path: "/api/whop" });
    return r;
  } catch {
    return fail("connexion");
  }
}
