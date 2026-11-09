import { NextResponse } from "next/server";
import { SITE } from "../../../../../lib/site";
import { COOKIE, cookieOptions, encodeSession, freshAccountSession, safeNext } from "../../../../../lib/pro";
import { GoogleAuthError, exchangeCode, readIdToken } from "../../../../../lib/google-auth";
import { clientIp } from "../../../../../lib/auth-utils";
import { allowed, compteGoogle, comptesConfigured } from "../../../../../lib/comptes";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Retour de Google après « Continuer avec Google » : vérification de la demande (state, PKCE, nonce), échange du code
// contre l'identité du compte Google, puis connexion ou création du compte Basketlog (supabase/comptes.sql) et retour
// sur la page d'origine. En cas d'échec, retour sur la même page avec la fenêtre de connexion et un message.
const FLOW = ["g_state", "g_pkce", "g_nonce", "g_next", "g_lang"];

export async function GET(req) {
  const u = new URL(req.url);
  const next = safeNext(req.cookies.get("g_next")?.value) || "/app";
  const lang = ["en", "es"].includes(req.cookies.get("g_lang")?.value) ? req.cookies.get("g_lang").value : "fr";
  const done = (params, session = null) => {
    const d = new URL(next, SITE);
    for (const [k, v] of Object.entries(params)) d.searchParams.set(k, v);
    const r = NextResponse.redirect(d.toString());
    for (const n of FLOW) r.cookies.delete({ name: n, path: "/api/auth/google" });
    const value = session ? encodeSession(session) : null;
    if (value) r.cookies.set(COOKIE, value, cookieOptions);
    return r;
  };
  const fail = (why) => done({ connexion: "1", erreur_auth: why });

  const gErr = u.searchParams.get("error");
  if (gErr) return fail(gErr === "access_denied" ? "google_annule" : "google");
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const verifier = req.cookies.get("g_pkce")?.value;
  if (!code || !state || !verifier || state !== req.cookies.get("g_state")?.value) return fail("google");
  if (!comptesConfigured()) return fail("indispo");
  if (!(await allowed("google-ip", clientIp(req.headers), 40, 15))) return fail("trop");

  let g;
  try {
    const idToken = await exchangeCode({ code, verifier, redirectUri: `${SITE}/api/auth/google/retour` });
    g = readIdToken(idToken, { nonce: req.cookies.get("g_nonce")?.value || null });
  } catch (e) {
    console.warn(`[comptes] Google : ${String(e?.message || e).slice(0, 200)}`);
    return fail(e instanceof GoogleAuthError && e.kind === "down" ? "google_indispo" : e instanceof GoogleAuthError && e.kind === "config" ? "google_off" : "google");
  }
  let r;
  try {
    r = await compteGoogle(g, lang);
  } catch (e) {
    console.warn(`[comptes] Google, base : ${String(e?.message || e).slice(0, 200)}`);
    return fail("indispo");
  }
  if (!r?.ok) return fail(r?.reason === "email_non_verifie" ? "google_non_verifie" : "google");
  if (r.nouveau) console.log("[comptes] nouveau compte (Google)");
  if (r.mdp_retire) console.log("[comptes] compte relié à Google : ancien mot de passe jamais vérifié retiré");
  const session = await freshAccountSession({ id: r.id, email: r.email, nom: g.name, whop_uid: null, sv: r.sv });
  return done({ bienvenue: r.nouveau ? "nouveau-google" : "retour-google" }, session);
}
