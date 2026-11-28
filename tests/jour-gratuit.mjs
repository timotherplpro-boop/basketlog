// Tests de l'annonce « 1 jour gratuit sur Basketlog Pro » (lib/jour-gratuit.js, jgPost de lib/social.js), demandée par Tim le
// 28/11/2026 : longueurs Bluesky et Telegram, liens et mots-dièse, ligne Black Friday seulement pendant l'offre, notifications
// dans les 4 langues, mots interdits. Appelé par tests/unit.mjs.
import { JG_MARK, jgAnnounce, jgPush, JG_TXT } from "../lib/jour-gratuit.js";
import { BSKY_MAX, graphemes, jgPost } from "../lib/social.js";

const DURING = Date.parse("2026-11-28T18:00:00Z"); // Black Friday en cours
const AFTER = Date.parse("2026-12-02T12:00:00Z");
const BANNED = /\b(IA|AI)\b|pari|cote|mise|combiné|pronostic|essai gratuit|free trial|\$ ?9[.,]99|9[.,]99 ?\$/i;

export async function jourGratuitTests({ ok, ko, eq }) {
  console.log("Jour gratuit");
  const enc = new TextEncoder(), dec = new TextDecoder();
  for (const [name, now] of [["pendant le Black Friday", DURING], ["après", AFTER]]) {
    const p = jgPost(now);
    eq(`Bluesky ${name} : ≤ ${BSKY_MAX} signes, commence par la marque anti-doublon, lien /pro`, [graphemes(p.text) <= BSKY_MAX, p.text.startsWith(JG_MARK), p.url], [true, true, "https://basketlog-app.com/pro"]);
    eq(`Bluesky ${name} : le lien et les mots-dièse tombent pile (octets)`, p.facets.every((f) => { const t = dec.decode(enc.encode(p.text).slice(f.index.byteStart, f.index.byteEnd)); const ft = f.features[0]; return ft.uri ? t === ft.uri.replace(/^https:\/\//, "") : t === `#${ft.tag}`; }), true);
    eq(`Telegram ${name} : lien HTML, 1 jour gratuit, carte demandée, légende ≤ 1024 signes`, [p.html.includes('<a href="https://basketlog-app.com/pro">'), p.html.includes("1 jour gratuit") && p.html.includes("carte demandée"), p.html.replace(/<[^>]+>/g, "").length <= 1024], [true, true, true]);
  }
  eq("Ligne Black Friday seulement pendant l'offre", [jgPost(DURING).text.includes("BLACKFRIDAY"), jgPost(AFTER).text.includes("BLACKFRIDAY"), jgAnnounce(AFTER).telegram("x").includes("BLACKFRIDAY")], [true, false, false]);
  const push = ["fr", "en", "es", "pt"].map((l) => jgPush(l));
  eq("Notifications : 4 langues, lien /pro de la langue", push.map((m) => m.url.split("?")[0]), ["/pro", "/en/pro", "/es/pro", "/pt/pro"]);
  const all = [jgPost(DURING).text, jgPost(DURING).html, ...push.flatMap((m) => [m.title, m.body]), ...Object.values(JG_TXT).flatMap((t) => Object.values(t))];
  const bad = all.filter((t) => BANNED.test(t));
  if (!bad.length) ok("Aucun mot interdit (IA, paris, « essai gratuit », prix en dollars)"); else ko("Mots interdits", bad.join(" | "));
}
