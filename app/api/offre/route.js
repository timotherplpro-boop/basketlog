import { NextResponse } from "next/server";
import { COOKIE, decodeSession } from "../../../lib/pro";
import { liveOffer } from "../../../lib/exit-offer";
import { describeProblems } from "../../../lib/whop-promo";

export const dynamic = "force-dynamic";

// Offre de dernière chance (lib/exit-offer.js) : GET /api/offre -> { code, pct, mois } quand elle est active, {} sinon.
// Active = EXIT_OFFER_CODE et EXIT_OFFER_PCT réglés dans Vercel ET code confirmé par Whop (existe, actif, bonne remise).
// La réponse publique est gardée 5 minutes par le CDN : l'API de Whop n'est pas appelée à chaque visite.
// GET /api/offre?diagnostic=1, connecté en admin : pourquoi l'offre est éteinte, en clair (jamais mis en cache).
export async function GET(req) {
  const admin = decodeSession(req.cookies.get(COOKIE)?.value)?.admin === true;
  if (admin && new URL(req.url).searchParams.get("diagnostic")) {
    const o = await liveOffer({ fresh: true });
    const body = o.ok
      ? { actif: true, code: o.code, pct: o.pct, mois: o.mois }
      : {
          actif: false,
          raison: {
            off: "EXIT_OFFER_CODE et EXIT_OFFER_PCT ne sont pas réglés dans Vercel (offre éteinte)",
            nokey: "WHOP_API_KEY est absente : impossible de vérifier le code chez Whop",
            scope: "Whop a refusé la clé API (permission promo_code:basic:read manquante)",
            network: "Whop est injoignable pour le moment",
            absent: "ce code n'existe pas chez Whop",
            reglages: "le code existe chez Whop mais ses réglages ne correspondent pas",
          }[o.why] || o.why,
          ...(o.problems ? { ecarts: describeProblems(o.problems) } : {}),
        };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  }
  const o = await liveOffer();
  return NextResponse.json(o.ok ? { code: o.code, pct: o.pct, mois: o.mois } : {}, {
    headers: { "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600" },
  });
}
