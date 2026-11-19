// Récap du matin (« surprise de la nuit ») : faits tirés des résultats et messages Bluesky / Telegram.
import { recapFacts, recapBluesky, recapTelegram, graphemes, BSKY_MAX, RECAP_MARK } from "../lib/social.js";

export async function recapTests({ ok, ko, eq }) {
  console.log("Récap du matin");
  const rows = [
    { away: "Jazz", home: "Lakers", awayScore: 109, homeScore: 97, pHome: 0.87 },
    { away: "Suns", home: "Kings", awayScore: 128, homeScore: 107, pHome: 0.29 },
    { away: "Bulls", home: "Nets", awayScore: 137, homeScore: 107, pHome: 0.58 },
    { away: "Heat", home: "Celtics", awayScore: 100, homeScore: 100, pHome: 0.6 },
  ];
  const f = recapFacts(rows);
  eq("récap : matchs comptés (égalité exclue)", f.n, 3);
  eq("récap : favoris gagnants", f.ok, 1);
  eq("récap : plus grosse surprise", f.upset && `${f.upset.dog}>${f.upset.fav}`, "Jazz>Lakers");
  eq("récap : plus gros écart", f.blowout && f.blowout.home, "Nets");
  for (const lang of ["fr", "en", "es"]) {
    const b = recapBluesky(f, lang);
    if (graphemes(b.text) <= BSKY_MAX && b.text.startsWith(RECAP_MARK)) ok(`récap ${lang} : longueur et marque`); else ko(`récap ${lang} : longueur et marque`, b.text);
    const link = b.facets.find((x) => x.features[0].$type.endsWith("#link"));
    const bytes = new TextEncoder().encode(b.text);
    const linked = link ? new TextDecoder().decode(bytes.slice(link.index.byteStart, link.index.byteEnd)) : "";
    eq(`récap ${lang} : lien cliquable`, linked, b.url.replace(/^https?:\/\//, ""));
    if (/paris|bet|apuesta/i.test(b.text)) ko(`récap ${lang} : vocabulaire`, b.text); else ok(`récap ${lang} : vocabulaire`);
  }
  eq("récap fr : surprise citée", recapBluesky(f, "fr").text.includes("Jazz 109-97 Lakers"), true);
  const sweep = recapFacts([{ away: "A", home: "B", awayScore: 90, homeScore: 100, pHome: 0.7 }]);
  eq("récap : sans-faute", recapBluesky(sweep, "fr").text.includes("Sans-faute"), true);
  const tg = recapTelegram(f, "en");
  eq("récap telegram : lien", tg.includes('href="https://basketlog-app.com/en/app/resultats"'), true);
}
