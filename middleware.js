import { NextResponse } from "next/server";

// Version anglaise : /en/... affiche la même page que /..., en anglais (en-tête x-bl-lang).
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const en = pathname === "/en" || pathname.startsWith("/en/");
  const headers = new Headers(req.headers);
  headers.set("x-bl-lang", en ? "en" : "fr");
  headers.set("x-bl-path", (pathname + req.nextUrl.search).slice(0, 300)); // adresse vue par le visiteur (sélecteur de langue)
  if (en) {
    const url = req.nextUrl.clone();
    url.pathname = pathname === "/en" ? "/" : pathname.slice(3);
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
