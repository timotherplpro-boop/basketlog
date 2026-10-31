import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { adminData, dbRpc, getRole } from "../../../lib/roles";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[0-9a-f]{20}$/;
const err = (error, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

// Actions de l'espace admin. Le rôle est relu dans la base à chaque appel (jamais seulement dans le cookie).
export async function POST(req) {
  const s = decodeSession(req.cookies.get(COOKIE)?.value);
  if (!s?.uid) return err("Connecte-toi avec ton compte admin.", 401);
  let role = null;
  try { role = await getRole(s.uid); } catch { return err("Base momentanément injoignable, réessaie dans un instant.", 503); }
  if (role !== "admin") return err("Réservé aux admins.", 403);

  const body = await req.json().catch(() => ({}));
  let extra = {};
  try {
    switch (body.action) {
      case "avis_publier":
      case "avis_retirer":
      case "avis_supprimer": {
        if (!UUID.test(String(body.id || ""))) return err("Avis introuvable.");
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
        if (!CODE.test(String(body.code || ""))) return err("Invitation introuvable.");
        await dbRpc("basketlog_admin_annuler", { p_code: body.code });
        break;
      }
      case "retirer_acces": {
        const uid = String(body.uid || "");
        if (!uid || uid.length > 80) return err("Compte introuvable.");
        if (uid === s.uid) return err("Tu ne peux pas retirer ton propre accès admin.");
        const res = await dbRpc("basketlog_admin_retirer", { p_uid: uid });
        if (res?.reason === "dernier_admin") return err("Il faut garder au moins un admin.");
        break;
      }
      case "lister":
        break;
      default:
        return err("Action inconnue.");
    }
    const data = await adminData();
    return NextResponse.json({ ok: true, data, ...extra }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return err("L'action n'a pas pu être enregistrée. Réessaie dans un instant.", 502);
  }
}
