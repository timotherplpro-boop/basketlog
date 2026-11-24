import { NextResponse } from "next/server";
import { currencyFor } from "./lib/currency-shared";

// Versions anglaise (/en/...) et espagnole (/es/...) : même page que /..., dans la langue demandée (en-tête x-bl-lang).
export function middleware(req) {
  const { pathname } = req.nextUrl;
  const m = pathname.match(/^\/(en|es|pt)(?=\/|$)/);
  const lang = m ? m[1] : "fr";
  const headers = new Headers(req.headers);
  headers.set("x-bl-lang", lang);
  headers.set("x-bl-path", (pathname + req.nextUrl.search).slice(0, 300)); // adresse vue par le visiteur (sélecteur de langue)
  let res;
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(3) || "/";
    res = NextResponse.rewrite(url, { request: { headers } });
  } else {
    res = NextResponse.next({ request: { headers } });
  }
  // Monnaie d'affichage (24/11/2026) : euros en zone euro, dollars ailleurs ; lue par lib/use-currency.js.
  const cur = currencyFor({ country: req.headers.get("x-vercel-ip-country"), ua: req.headers.get("user-agent"), en: lang === "en" });
  if (req.cookies.get("bl_cur")?.value !== cur) res.cookies.set("bl_cur", cur, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax", secure: true });
  return res;
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
