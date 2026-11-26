import { actuOgImage } from "../../../../lib/og";
import { readActu } from "../../../../lib/actu";

// Visuel de l'actu du jour : ?k=<jeton signé>&f=og|portrait|thumb. Accessible depuis d'autres sites (CORS) pour que
// le navigateur puisse le joindre à un post Facebook ou LinkedIn.
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const a = readActu(q.get("k"));
  if (!a) return new Response("Actu introuvable", { status: 404 });
  return actuOgImage(a, q.get("f") || "og", {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400, s-maxage=2592000" },
  });
}
