import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { COOKIE } from "../../../../lib/pro";

export async function GET() {
  const r = NextResponse.redirect(`${SITE}/pro`);
  r.cookies.delete({ name: COOKIE, path: "/" });
  return r;
}
