// Textes du Short quotidien et des posts « favoris du soir », tirés du même data.json que la vidéo
// (GET https://basketlog-app.com/api/short). Créé le 21/11/2026.
// Usage : node texts.mjs data.json [lien_du_short_youtube]  → JSON { lang, title, description, x, long, tiktok_fr } (+ x_en, title_en, tiktok_en)
// Règles de Tim : pas de vocabulaire de paris, jamais « AI » ni « IA », textes et liens en français depuis le 24/11/2026,
// ligne de l'offre Pro mot pour mot (validée le 20/11/2026), jamais raccourcie.
import { readFileSync } from "node:fs";

const [, , file, shortUrl = ""] = process.argv;
if (!file) { console.error("usage: node texts.mjs data.json [short_url]"); process.exit(1); }
const data = JSON.parse(readFileSync(file, "utf8"));
const games = data.games || [];
if (!games.length) { console.log(JSON.stringify({ empty: true })); process.exit(0); }

// 24/11/2026 : Tim repasse tous ses réseaux en français (« tout ») : posts X / Facebook / LinkedIn, titre et description du
// Short YouTube en français, liens vers la version française du site. Les textes anglais restent en *_en au besoin.
const PROMO = "🎁 Analyse complète : 3 jours à 1 €, puis 9,99 €/mois (+ taxes) 👉 basketlog-app.com/pro";
const PROMO_LONG = "🎁 Analyse complète : 3 jours à 1 €, puis 9,99 €/mois (+ taxes) 👉 https://basketlog-app.com/pro";
const PROMO_EN = "🎁 Full analysis: 3 days for €1, then €9.99/mo (+ tax) 👉 basketlog-app.com/en/pro";
const pct = (p) => Math.round(p * 100);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const day = `${MONTHS[Number(data.d.slice(4, 6)) - 1]} ${Number(data.d.slice(6, 8))}`;
const jour = `${Number(data.d.slice(6, 8))} ${MOIS[Number(data.d.slice(4, 6)) - 1]}`;

const rows = games.map((g) => {
  const homeFav = g.pHome >= 0.5;
  const fav = homeFav ? g.home : g.away;
  const opp = homeFav ? g.away : g.home;
  const p = pct(Math.max(g.pHome, 1 - g.pHome));
  return { g, fav, opp, p, line: `${fav.short} ${p}% ${homeFav ? "vs" : "at"} ${opp.short}`, ligne: `${fav.short} ${p} % ${homeFav ? "vs" : "@"} ${opp.short}`, gap: Math.abs(g.pHome - 0.5) };
});
const byFav = [...rows].sort((a, b) => b.p - a.p);
const top = byFav[0];
const closest = [...rows].sort((a, b) => a.gap - b.gap)[0];
const n = games.length;
const gamesWord = n === 1 ? "game" : "games";
const matchsMot = n === 1 ? "Le match" : `Les ${n} matchs`;

// Longueur comptée comme X : une adresse = 23, un emoji = 2.
const xLen = (s) => {
  const noUrl = s.replace(/(https?:\/\/)?[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?/gi, "x".repeat(23));
  let len = 0;
  for (const ch of noUrl) len += ch.codePointAt(0) > 0x2000 ? 2 : 1;
  return len;
};

// Mots-dièse sous chaque post (demande de Tim, 26/11/2026 : « n'oublie pas les hashtags »).
const TAGS_X = "#NBA #Basket";
const TAGS_LONG = "#NBA #Basket #Basketball #nbafrance";

function xPost(nFav, withClosest, withQuestion) {
  const favs = byFav.slice(0, nFav);
  const parts = ["Les plus gros favoris NBA de cette nuit 🏀", "", ...favs.map((r) => r.ligne)];
  if (withClosest && closest && !favs.includes(closest)) parts.push("", `Match le plus serré : ${closest.ligne}`);
  parts.push("", `${matchsMot}, gratuit${n === 1 ? "" : "s"} → basketlog-app.com/app/matchs`);
  if (withQuestion) parts.push("Qui gagne selon toi ? 👇");
  parts.push("", PROMO, "", TAGS_X);
  return parts.join("\n");
}
const xCandidates = [];
for (let k = Math.min(4, n); k >= 1; k--) {
  xCandidates.push(xPost(k, true, true), xPost(k, false, true), xPost(k, false, false));
}
const x = xCandidates.find((t) => xLen(t) <= 280) || xPost(1, false, false);

// Ancienne version anglaise (avant le 24/11/2026), gardée au besoin.
function xPostEn(nFav) {
  const parts = ["Tonight's biggest NBA favorites 🏀", "", ...byFav.slice(0, nFav).map((r) => r.line), "", `All ${n} ${gamesWord}, free → basketlog-app.com/en/app/matchs`, "", PROMO_EN];
  return parts.join("\n");
}
const x_en = [4, 3, 2, 1].map((k) => xPostEn(Math.min(k, n))).find((t) => xLen(t) <= 280) || xPostEn(1);

const ln = data.lastNight;
const bilanNuit = ln && ln.n && ln.ok / ln.n >= 0.7 ? `La nuit dernière : ${ln.ok}/${ln.n} favoris ont gagné ✅` : null;
const longParts = ["Les plus gros favoris NBA de cette nuit 🏀", "", ...byFav.slice(0, Math.min(4, n)).map((r) => r.ligne)];
if (closest && n > 4 && !byFav.slice(0, 4).includes(closest)) longParts.push("", `Match le plus serré : ${closest.ligne}`);
if (bilanNuit) longParts.push("", bilanNuit);
longParts.push("", `Probabilités de victoire des ${n} match${n === 1 ? "" : "s"}, gratuites → https://basketlog-app.com/app/matchs`);
if (shortUrl) longParts.push(`Les matchs de cette nuit en 15 secondes ▶️ ${shortUrl}`);
longParts.push("", "Qui gagne selon toi ? 👇", "", PROMO_LONG, "", TAGS_LONG);

const description = [
  "Probabilité de victoire de chaque match NBA de cette nuit, enregistrée avant le coup d'envoi :",
  ...rows.map((r) => `• ${r.g.away.short} @ ${r.g.home.short} : ${r.fav.short} ${r.p} %`),
  "",
  "Tous les matchs, gratuits 👉 https://basketlog-app.com/app/matchs",
  PROMO_LONG,
  "",
  "#NBA #basket #nbafrance #shorts #Basketlog",
].join("\n");

const out = {
  d: data.d,
  lang: "fr", // vidéo du Short à publier sur YouTube : la version française (render.mjs data.json fr sortie.mp4)
  title: `Probabilités NBA de cette nuit (${jour}) : ${top.fav.short} ${top.p} % ? 🏀 | Basketlog #shorts`,
  description,
  x,
  xLength: xLen(x),
  long: longParts.join("\n"),
  tiktok_fr: `Les probabilités NBA de cette nuit 🏀 Plus gros favori : ${top.fav.short} ${top.p} %. Qui gagne selon toi ? 👇\nTous les matchs gratuits 👉 basketlog-app.com\n#NBA #basket #basketball #nbafrance`,
  x_en,
  title_en: `NBA win probabilities tonight (${day}): ${top.fav.short} ${top.p}%? 🏀 | Basketlog #shorts`,
  tiktok_en: `NBA win probabilities tonight 🏀 Biggest favorite: ${top.fav.short} ${top.p}%. Who's your pick? 👇\nEvery game free 👉 basketlog-app.com/en\n#NBA #nbatiktok #basketball #nbanews`,
};
if (out.title.length > 100) out.title = `Probabilités NBA de cette nuit (${jour}) 🏀 | Basketlog #shorts`;
console.log(JSON.stringify(out, null, 2));
