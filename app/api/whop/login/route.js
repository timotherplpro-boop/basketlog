import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { safeNext, NEXT_COOKIE, flowCookieOptions } from "../../../../lib/pro";

// Démarre « Se connecter avec Whop » (OAuth + PKCE).
export async function GET(req) {
  const clientId = process.env.WHOP_CLIENT_ID;
  if (!clientId) return NextResponse.redirect(`${SITE}/pro?erreur=config`);
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("base64url");
  const url = new URL("https://api.whop.com/oauth/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: `${SITE}/api/whop/callback`,
    scope: "openid profile",
    state,
    nonce: crypto.randomBytes(16).toString("base64url"),
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  const res = NextResponse.redirect(url.toString());
  const opts = { httpOnly: true, secure: true, sameSite: "lax", path: "/api/whop", maxAge: 600 };
  res.cookies.set("whop_pkce", verifier, opts);
  res.cookies.set("whop_state", state, opts);
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (next) res.cookies.set(NEXT_COOKIE, next, flowCookieOptions);
  return res;
}
