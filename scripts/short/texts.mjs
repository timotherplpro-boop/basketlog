// Textes du Short quotidien et des posts « favoris du soir », tirés du même data.json que la vidéo
// (GET https://basketlog-app.com/api/short). Créé le 21/11/2026.
// Usage : node texts.mjs data.json [lien_du_short_youtube]  → JSON { title, description, x, long, tiktok_en, tiktok_fr }
// Règles de Tim : pas de vocabulaire de paris, jamais « AI » ni « IA », liens anglais vers basketlog-app.com/en,
// ligne de l'offre Pro mot pour mot (validée le 20/11/2026), jamais raccourcie.
import { readFileSync } from "node:fs";

const [, , file, shortUrl = ""] = process.argv;
if (!file) { console.error("usage: node texts.mjs data.json [short_url]"); process.exit(1); }
const data = JSON.parse(readFileSync(file, "utf8"));
const games = data.games || [];
if (!games.length) { console.log(JSON.stringify({ empty: true })); process.exit(0); }

const PROMO = "🎁 Full analysis: 3 days for €1, then €9.99/mo (+ tax) 👉 basketlog-app.com/en/pro";
const PROMO_LONG = "🎁 Full analysis: 3 days for €1, then €9.99/mo (+ tax) 👉 https://basketlog-app.com/en/pro";
const pct = (p) => Math.round(p * 100);
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = `${MONTHS[Number(data.d.slice(4, 6)) - 1]} ${Number(data.d.slice(6, 8))}`;

const rows = games.map((g) => {
  const homeFav = g.pHome >= 0.5;
  const fav = homeFav ? g.home : g.away;
  const opp = homeFav ? g.away : g.home;
  const p = pct(Math.max(g.pHome, 1 - g.pHome));
  return { g, fav, opp, p, line: `${fav.short} ${p}% ${homeFav ? "vs" : "at"} ${opp.short}`, gap: Math.abs(g.pHome - 0.5) };
});
const byFav = [...rows].sort((a, b) => b.p - a.p);
const top = byFav[0];
const closest = [...rows].sort((a, b) => a.gap - b.gap)[0];
const n = games.length;
const gamesWord = n === 1 ? "game" : "games";

// Longueur comptée comme X : une adresse = 23, un emoji = 2.
const xLen = (s) => {
  const noUrl = s.replace(/(https?:\/\/)?[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?/gi, "x".repeat(23));
  let len = 0;
  for (const ch of noUrl) len += ch.codePointAt(0) > 0x2000 ? 2 : 1;
  return len;
};

function xPost(nFav, withClosest, withQuestion) {
  const favs = byFav.slice(0, nFav);
  const parts = ["Tonight's biggest NBA favorites 🏀", "", ...favs.map((r) => r.line)];
  if (withClosest && closest && !favs.includes(closest)) parts.push("", `Closest game: ${closest.line}`);
  parts.push("", `All ${n} ${gamesWord}, free → basketlog-app.com/en/app/matchs`);
  if (withQuestion) parts.push("Who's your pick tonight? 👇");
  parts.push("", PROMO);
  return parts.join("\n");
}
const xCandidates = [];
for (let k = Math.min(4, n); k >= 1; k--) {
  xCandidates.push(xPost(k, true, true), xPost(k, false, true), xPost(k, false, false));
}
const x = xCandidates.find((t) => xLen(t) <= 280) || xPost(1, false, false);

const ln = data.lastNight;
const lastNightLine = ln && ln.n && ln.ok / ln.n >= 0.7 ? `Last night: ${ln.ok}/${ln.n} favorites won ✅` : null;
const longParts = ["Tonight's biggest NBA favorites 🏀", "", ...byFav.slice(0, Math.min(4, n)).map((r) => r.line)];
if (closest && n > 4 && !byFav.slice(0, 4).includes(closest)) longParts.push("", `Closest game: ${closest.line}`);
if (lastNightLine) longParts.push("", lastNightLine);
longParts.push("", `Win probabilities for all ${n} ${gamesWord}, free → https://basketlog-app.com/en/app/matchs`);
if (shortUrl) longParts.push(`Tonight's games in 15 seconds ▶️ ${shortUrl}`);
longParts.push("", "Who's your pick tonight? 👇", "", PROMO_LONG);

const description = [
  "Win probability for every NBA game tonight, saved before tip-off:",
  ...rows.map((r) => `• ${r.g.away.short} @ ${r.g.home.short}: ${r.fav.short} ${r.p}%`),
  "",
  "Every game, free 👉 https://basketlog-app.com/en/app/matchs",
  PROMO_LONG,
  "",
  "#NBA #basketball #shorts #Basketlog",
].join("\n");

const out = {
  d: data.d,
  title: `NBA win probabilities tonight (${day}): ${top.fav.short} ${top.p}%? 🏀 | Basketlog #shorts`,
  description,
  x,
  xLength: xLen(x),
  long: longParts.join("\n"),
  tiktok_en: `NBA win probabilities tonight 🏀 Biggest favorite: ${top.fav.short} ${top.p}%. Who's your pick? 👇\nEvery game free 👉 basketlog-app.com/en\n#NBA #nbatiktok #basketball #nbanews`,
  tiktok_fr: `Les probabilités NBA de ce soir 🏀 Plus gros favori : ${top.fav.short} ${top.p} %. Qui gagne selon toi ? 👇\nTous les matchs gratuits 👉 basketlog-app.com\n#NBA #basket #basketball #nbafrance`,
};
if (out.title.length > 100) out.title = `NBA win probabilities tonight (${day}) 🏀 | Basketlog #shorts`;
console.log(JSON.stringify(out, null, 2));
