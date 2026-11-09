import { NextResponse } from "next/server";
import { SITE } from "../../../../lib/site";
import { COOKIE, SESSION_V, cookieOptions, decodeSession, displayName, encodeSession, resolveAccess, safeNext, NEXT_COOKIE } from "../../../../lib/pro";
import { accountIdOf, isAccountSession } from "../../../../lib/auth-utils";
import { lierWhop } from "../../../../lib/comptes";

// Retour de Whop : échange du code, identité de l'utilisateur, vérification de l'abonnement.
// Visiteur connecté avec un compte Basketlog (e-mail ou Google) : le compte Whop qui vient de se connecter est RELIÉ à ce
// compte (c'est lui qui porte l'abonnement payé chez Whop), au lieu de remplacer la session.
export async function GET(req) {
  const u = new URL(req.url);
  const code = u.searchParams.get("code");
  const state = u.searchParams.get("state");
  const verifier = req.cookies.get("whop_pkce")?.value;
  const expected = req.cookies.get("whop_state")?.value;
  const fail = (why) => {
    const m = (safeNext(req.cookies.get(NEXT_COOKIE)?.value) || "").match(/^\/(en|es)(?=\/|$|\?)/);
    const r = NextResponse.redirect(`${SITE}${m ? `/${m[1]}` : ""}/pro?erreur=${why}`);
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

    const next = safeNext(req.cookies.get(NEXT_COOKIE)?.value);
    const current = decodeSession(req.cookies.get(COOKIE)?.value);
    let session, welcome;
    if (isAccountSession(current) && !current.preview) {
      // Compte e-mail ou Google : on relie ce compte Whop (une seule fois par compte Whop) puis on relit l'abonnement.
      let r;
      try {
        r = await lierWhop(accountIdOf(current.uid), uid);
      } catch (e) {
        console.warn(`[comptes] liaison Whop : ${String(e?.message || e).slice(0, 200)}`);
        return fail("lien");
      }
      if (!r?.ok) return fail(r?.reason === "autre_compte" ? "whop_autre" : "lien");
      console.log("[comptes] compte Whop relié à un compte Basketlog");
      let a = null;
      try {
        a = await resolveAccess(current.uid, current);
      } catch (e) {
        if (e?.gone) return fail("connexion");
      }
      session = a
        ? { ...current, whop: uid, email: a.email || current.email, wname: a.wname || current.wname, tier: a.tier, paid: a.paid, role: a.role, sv: a.sv ?? current.sv, v: SESSION_V, checked: Date.now() }
        : { ...current, whop: uid, checked: 0 }; // Whop ou la base lents : vérification à la requête suivante
      if (a) session.name = displayName(a, session);
      welcome = session.role ? "connexion" : session.tier === "compte" ? "whop_vide" : "abonne";
    } else {
      const { tier, paid, role, nom, v } = await resolveAccess(uid); // formule Whop, ou accès complet d'un admin ou créateur
      // wname : nom du compte Whop, gardé à part pour y revenir si le membre efface le prénom qu'il a choisi dans « Mon compte ».
      const wname = info.preferred_username || info.name || "";
      session = { uid, name: nom || wname, wname, tier, paid, role, v, checked: Date.now() };
      const flow = req.cookies.get("bl_flow")?.value === "signup" ? "inscription" : "connexion";
      welcome = role ? "connexion" : tier === "compte" ? flow : "abonne"; // admin, créateur : pas d'« abonnement actif »
    }
    const value = encodeSession(session);
    if (!value) return fail("config");
    // Retour sur la page d'origine (ex. la fiche match), sinon l'espace membre.
    const dest = new URL(next || "/app", SITE);
    dest.searchParams.set("bienvenue", welcome);
    const r = NextResponse.redirect(dest.toString());
    r.cookies.set(COOKIE, value, cookieOptions);
    r.cookies.delete({ name: NEXT_COOKIE, path: "/api/whop" });
    r.cookies.delete({ name: "bl_flow", path: "/api/whop" });
    r.cookies.delete({ name: "whop_pkce", path: "/api/whop" });
    r.cookies.delete({ name: "whop_state", path: "/api/whop" });
    return r;
  } catch {
    return fail("connexion");
  }
}
