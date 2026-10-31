import { ogImage } from "../../../lib/og";

// Image de partage en anglais et en espagnol (la française est app/opengraph-image.jsx).
export async function GET(req) {
  const lang = new URL(req.url).searchParams.get("lang") === "es" ? "es" : "en";
  return ogImage(lang, { headers: { "Cache-Control": "public, max-age=86400, s-maxage=604800" } });
}
