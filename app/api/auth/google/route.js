import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { safeNext } from "../../../../lib/pro";
import { googleAuthUrl, googleReady } from "../../../../lib/google-auth";

export const dynamic = "force-dynamic";

// « Continuer avec Google » : départ vers la page Google « Choisis un compte » (OAuth + PKCE). Le retour arrive sur
// /api/auth/google/retour. next : page où revenir une fois connecté (chemin interne au site uniquement).
const GOOGLE_FLOW_COOKIE = { httpOnly: true, secure: true, sameSite: "lax", path: "/api/auth/google", maxAge: 600 };

export async function GET(req) {
  const u = new URL(req.url);
  const next = safeNext(u.searchParams.get("next")) || "/app";
  const lang = ["en", "es"].includes(u.searchParams.get("lang")) ? u.searchParams.get("lang") : "fr";
  if (!googleReady()) {
    const d = new URL(next, SITE);
    d.searchParams.set("connexion", "1");
    d.searchParams.set("erreur_auth", "google_off");
    return NextResponse.redirect(d.toString());
  }
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const state = crypto.randomBytes(16).toString("base64url");
  const nonce = crypto.randomBytes(16).toString("base64url");
  const res = NextResponse.redirect(googleAuthUrl({ redirectUri: `${SITE}/api/auth/google/retour`, state, challenge, nonce, lang }));
  res.cookies.set("g_state", state, GOOGLE_FLOW_COOKIE);
  res.cookies.set("g_pkce", verifier, GOOGLE_FLOW_COOKIE);
  res.cookies.set("g_nonce", nonce, GOOGLE_FLOW_COOKIE);
  res.cookies.set("g_next", next, GOOGLE_FLOW_COOKIE);
  res.cookies.set("g_lang", lang, GOOGLE_FLOW_COOKIE);
  return res;
}
