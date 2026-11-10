import { NextResponse } from "next/server";
import { dbRpc } from "../../../lib/roles";
import { CODE_RE, cleanCode } from "../../../lib/promo";
import { promoMonths } from "../../../lib/whop-promo";
import { liveOffer } from "../../../lib/exit-offer";

export const dynamic = "force-dynamic";

const out = (body, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

// Vérification d'un code promo de créateur saisi sur /pro : GET /api/promo?code=NOM20 -> { ok: true, code, pct, mois }.
// `mois` : nombre de paiements remisés (1 : premier paiement seulement, 0 : à chaque paiement), pour que la page annonce
// des prix conformes à ce que Whop appliquera.
// Seuls les codes déjà créés chez Whop (whop_ok) sont acceptés, pour ne jamais promettre une remise que le paiement refuserait.
// Rien d'autre que le code, la remise et sa durée n'est renvoyé (ni créateur, ni compte).
export async function GET(req) {
  const code = cleanCode(new URL(req.url).searchParams.get("code") || "");
  if (!CODE_RE.test(code)) return out({ ok: false, raison: "format" });
  let down = false;
  try {
    const list = await dbRpc("basketlog_admin_promos");
    const promo = Array.isArray(list) ? list.find((p) => p?.code === code && p.whop_ok === true) : null;
    if (promo) return out({ ok: true, code: promo.code, pct: promo.pct, mois: promoMonths() });
  } catch {
    down = true;
  }
  // Offre de dernière chance (lib/exit-offer.js) : acceptée seulement quand Whop confirme le code (et éteinte par défaut).
  const offer = await liveOffer();
  if (offer.ok && offer.code === code) return out({ ok: true, code: offer.code, pct: offer.pct, mois: offer.mois });
  return down ? out({ ok: false, raison: "indisponible" }, 503) : out({ ok: false, raison: "inconnu" });
}
