import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { COOKIE, safeNext } from "../../../../lib/pro";

// Déconnexion, puis retour sur la page demandée (accueil par défaut).
export async function GET(req) {
  const next = safeNext(new URL(req.url).searchParams.get("next")) || "/";
  const r = NextResponse.redirect(`${SITE}${next}`);
  r.cookies.delete({ name: COOKIE, path: "/" });
  return r;
}
