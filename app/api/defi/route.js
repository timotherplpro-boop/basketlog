import { NextResponse } from "next/server";
import { memberSession } from "../../../lib/usage";
import { sameOrigin } from "../../../lib/auth-utils";
import { defiGames } from "../../../lib/defi-data";
import { defiSave } from "../../../lib/defi";
import { displayName } from "../../../lib/defi-score";

export const dynamic = "force-dynamic";

// Jeu « Bats le modèle » : enregistre les choix d'un membre connecté. Chaque match doit être encore à venir et l'équipe
// choisie doit le jouer ; le favori du modèle est recalculé ici (jamais pris dans la requête).
// Base pas prête : { ok: false, offline: true } et le navigateur garde les choix.
export async function POST(req) {
  if (!sameOrigin(req.headers)) return NextResponse.json({ ok: false }, { status: 403 });
  const me = await memberSession();
  if (!me?.uid) return NextResponse.json({ ok: false, reason: "login" }, { status: 401 });
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const asked = Array.isArray(body?.picks) ? body.picks.slice(0, 20) : [];
  if (!asked.length) return NextResponse.json({ ok: true, n: 0 });
  const { games } = await defiGames();
  const byId = new Map(games.map((g) => [g.g, g]));
  const rows = [];
  for (const x of asked) {
    const g = byId.get(String(x?.g || ""));
    const p = String(x?.p || "");
    if (!g || (p !== g.home.id && p !== g.away.id)) continue;
    rows.push({ g: g.g, d: g.d, p, m: g.m });
  }
  if (!rows.length) return NextResponse.json({ ok: false, reason: "closed" }, { status: 409 });
  const r = await defiSave(me.uid, displayName(me.name, me.uid), rows);
  if (!r?.ok) return NextResponse.json({ ok: false, offline: true, saved: rows.map((x) => x.g) });
  return NextResponse.json({ ok: true, n: r.n, saved: rows.map((x) => x.g) }, { headers: { "Cache-Control": "no-store" } });
}
