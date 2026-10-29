import { NextResponse } from "next/server";

// Versions anglaise (/en/...) et espagnole (/es/...) : même page que /..., dans la langue demandée (en-tête x-bl-lang).
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/(en|es)(?=\/|$)/);
  const lang = m ? m[1] : "fr";
  const headers = new Headers(req.headers);
  headers.set("x-bl-lang", lang);
  headers.set("x-bl-path", (pathname + req.nextUrl.search).slice(0, 300)); // adresse vue par le visiteur (sélecteur de langue)
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    return NextResponse.rewrite(url, { request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
