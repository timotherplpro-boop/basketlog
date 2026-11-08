import { NextResponse } from "next/server";
import { socialDay } from "../../../lib/social-day";
import { socialStatus } from "../../../lib/social-send";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Aperçu public des publications automatiques du jour (Telegram, Bluesky), sans rien envoyer : les mêmes chiffres
// que les fiches du site. Indique aussi ce qui est branché (noms publics des comptes, jamais de code d'accès).
export async function GET() {
  const day = await socialDay();
  return NextResponse.json(
    { d: day.d, status: socialStatus(), games: day.picks.length, posts: day.posts, errors: day.errors, generatedAt: new Date().toISOString() },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}
