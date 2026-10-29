import { NextResponse } from "next/server";
import { FREE_SIGNUP_URL, safeNext, NEXT_COOKIE, flowCookieOptions } from "../../../../lib/pro";

// « Créer mon compte gratuit » : inscription sur la page Whop du compte gratuit (e-mail, Google ou Apple),
// puis retour automatique par /api/whop/login, et enfin sur la page d'origine.
export async function GET(req) {
  const res = NextResponse.redirect(FREE_SIGNUP_URL);
  const next = safeNext(new URL(req.url).searchParams.get("next"));
  if (next) res.cookies.set(NEXT_COOKIE, next, flowCookieOptions);
  res.cookies.set("bl_flow", "signup", flowCookieOptions);
  return res;
}
