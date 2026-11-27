import { actuOgImage } from "../../../../lib/og";
import { resolveActu } from "../../../../lib/actu";

// Visuel de l'actu du jour : ?k=<jeton signé> ou ?b=<identifiant du post Bluesky> (adresse courte), &f=og|portrait|thumb. Accessible depuis d'autres sites (CORS) pour que
// le navigateur puisse le joindre à un post Facebook ou LinkedIn.
export async function GET(req) {
  const q = new URL(req.url).searchParams;
  const got = await resolveActu({ k: q.get("k"), b: q.get("b") });
  if (!got) return new Response("Actu introuvable", { status: 404 });
  const a = got.a;
  return actuOgImage(a, q.get("f") || "og", {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400, s-maxage=2592000" },
  });
}
