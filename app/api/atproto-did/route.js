// Nom de domaine comme nom de compte Bluesky (@basketlog-app.com) : Bluesky lit l'identifiant du compte à l'adresse
// https://basketlog-app.com/.well-known/atproto-did (redirigée ici par next.config.mjs). Valeur dans la variable
// d'environnement BLUESKY_DID (ex. did:plc:abc123…, donnée par Bluesky dans « Changer d'identifiant »). Sans elle : 404.
export const dynamic = "force-dynamic";

export function GET() {
  const did = String(process.env.BLUESKY_DID || "").trim();
  if (!/^did:(plc|web):[A-Za-z0-9._:%-]+$/.test(did)) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(did, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
