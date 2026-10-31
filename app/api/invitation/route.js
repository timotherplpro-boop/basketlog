import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, decodeSession, encodeSession, resolveAccess } from "../../../lib/pro";
import { dbRpc } from "../../../lib/roles";

export const dynamic = "force-dynamic";

// Activation d'un lien d'invitation (créateur ou admin) par le compte connecté. La session est mise à jour
// tout de suite : l'accès complet s'ouvre sans attendre la prochaine vérification.
export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const t = (fr, en, es) => (body.lang === "en" ? en : body.lang === "es" ? es : fr);
  const s = decodeSession(req.cookies.get(COOKIE)?.value);
  if (!s?.uid) return NextResponse.json({ ok: false, error: t("Connecte-toi d'abord.", "Please log in first.", "Inicia sesión primero.") }, { status: 401 });
  const code = String(body.code || "");
  if (!/^[0-9a-f]{20}$/.test(code)) return NextResponse.json({ ok: false, error: t("Lien d'invitation introuvable.", "Invitation link not found.", "Enlace de invitación no encontrado.") }, { status: 400 });

  let r;
  try {
    r = await dbRpc("basketlog_claim", { p_code: code, p_uid: s.uid, p_nom: s.name || null });
  } catch {
    return NextResponse.json({ ok: false, error: t("Activation impossible pour le moment, réessaie dans un instant.", "Activation isn't possible right now, please try again in a moment.", "No se puede activar por ahora, inténtalo de nuevo en un momento.") }, { status: 502 });
  }
  if (!r?.ok) {
    const why = {
      utilisee: t("Ce lien a déjà été utilisé par un autre compte.", "This link has already been used by another account.", "Otra cuenta ya ha usado este enlace."),
      expiree: t("Ce lien a expiré. Demande un nouveau lien.", "This link has expired. Ask for a new one.", "Este enlace ha caducado. Pide uno nuevo."),
    }[r?.reason] || t("Lien d'invitation introuvable.", "Invitation link not found.", "Enlace de invitación no encontrado.");
    return NextResponse.json({ ok: false, error: why }, { status: 400 });
  }

  let a;
  try { a = await resolveAccess(s.uid, { ...s, role: r.role }); } catch { a = { tier: "lifetime", paid: s.paid ?? s.tier ?? "compte", role: r.role }; }
  const res = NextResponse.json({ ok: true, role: a.role }, { headers: { "Cache-Control": "no-store" } });
  const value = encodeSession({ ...s, tier: a.tier, paid: a.paid, role: a.role, checked: Date.now() });
  if (value) res.cookies.set(COOKIE, value, cookieOptions);
  return res;
}
