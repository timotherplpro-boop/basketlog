import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { COOKIE, PREVIEW_TIERS, cookieOptions, decodeSession, encodeSession, resolveAccess } from "../../../lib/pro";
import { adminData, dbRpc, getRole } from "../../../lib/roles";
import { LANGS, mk } from "../../../lib/i18n";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[0-9a-f]{20}$/;
const err = (error, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

// Actions de l'espace admin. Le rôle est relu dans la base à chaque appel (jamais seulement dans le cookie).
// Les messages d'erreur sont rendus dans la langue de l'écran (body.lang : fr, en ou es ; français par défaut).
export async function POST(req) {
  const raw = await req.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const { t } = mk(LANGS.includes(body.lang) ? body.lang : "fr");

  const s = decodeSession(req.cookies.get(COOKIE)?.value);
  if (!s?.uid) return err(t("Connecte-toi avec ton compte admin.", "Log in with your admin account.", "Inicia sesión con tu cuenta de administrador."), 401);
  let role = null;
  try {
    role = await getRole(s.uid);
  } catch {
    return err(t("Base momentanément injoignable, réessaie dans un instant.", "The database is temporarily unreachable, please try again in a moment.", "La base de datos no está accesible por el momento, inténtalo de nuevo en un instante."), 503);
  }
  if (role !== "admin") return err(t("Réservé aux admins.", "Admins only.", "Reservado a los administradores."), 403);

  // Aperçu d'une formule : la session devient celle d'un client de cette formule (ou redevient admin).
  if (body.action === "apercu") {
    const tier = PREVIEW_TIERS.includes(body.tier) ? body.tier : null;
    let next;
    if (tier) {
      next = { ...s, tier, role: null, admin: true, preview: tier, checked: Date.now() };
    } else {
      let a;
      try { a = await resolveAccess(s.uid, { ...s, role: "admin" }); } catch { a = { tier: "lifetime", paid: s.paid ?? "compte", role: "admin", nom: null, v: s.v }; }
      next = { ...s, tier: a.tier, paid: a.paid, role: a.role, name: a.nom || s.name, v: a.v, checked: Date.now() };
      delete next.preview;
      delete next.admin;
    }
    const value = encodeSession(next);
    if (!value) return err(t("Session impossible à mettre à jour.", "Couldn't update the session.", "No se ha podido actualizar la sesión."), 500);
    const res = NextResponse.json({ ok: true, preview: tier }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(COOKIE, value, cookieOptions);
    return res;
  }

  let extra = {};
  try {
    switch (body.action) {
      case "avis_publier":
      case "avis_retirer":
      case "avis_supprimer": {
        if (!UUID.test(String(body.id || ""))) return err(t("Avis introuvable.", "Review not found.", "Opinión no encontrada."));
        await dbRpc("basketlog_admin_avis", { p_id: body.id, p_action: body.action.slice(5) });
        revalidateTag("avis"); // le site affiche tout de suite la liste à jour
        break;
      }
      case "inviter": {
        const r = body.role === "admin" ? "admin" : "createur";
        const note = String(body.note || "").trim().slice(0, 80);
        const res = await dbRpc("basketlog_admin_inviter", { p_role: r, p_note: note || null });
        extra = { code: res?.code || null };
        break;
      }
      case "annuler_invitation": {
        if (!CODE.test(String(body.code || ""))) return err(t("Invitation introuvable.", "Invitation not found.", "Invitación no encontrada."));
        await dbRpc("basketlog_admin_annuler", { p_code: body.code });
        break;
      }
      case "retirer_acces": {
        const uid = String(body.uid || "");
        if (!uid || uid.length > 80) return err(t("Compte introuvable.", "Account not found.", "Cuenta no encontrada."));
        if (uid === s.uid) return err(t("Tu ne peux pas retirer ton propre accès admin.", "You can't remove your own admin access.", "No puedes retirar tu propio acceso de administrador."));
        const res = await dbRpc("basketlog_admin_retirer", { p_uid: uid });
        if (res?.reason === "dernier_admin") return err(t("Il faut garder au moins un admin.", "At least one admin must remain.", "Debe quedar al menos un administrador."));
        break;
      }
      case "lister":
        break;
      default:
        return err(t("Action inconnue.", "Unknown action.", "Acción desconocida."));
    }
    const data = await adminData();
    return NextResponse.json({ ok: true, data, ...extra }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return err(t("L'action n'a pas pu être enregistrée. Réessaie dans un instant.", "The action couldn't be saved. Please try again in a moment.", "No se ha podido guardar la acción. Inténtalo de nuevo en un instante."), 502);
  }
}
