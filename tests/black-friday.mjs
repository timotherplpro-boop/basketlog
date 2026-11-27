// Tests de l'offre Black Friday 2026 (lib/black-friday.js) : fin de l'offre, prix, vérification des réglages chez Whop (appels simulés),
// création idempotente du code, lignes des posts (longueurs), annonce unique, newsletter et textes du script du soir.
// Aucune dépendance au jour où les tests tournent : les dates sont passées explicitement. Appelé par tests/unit.mjs.
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { BF, BF_END_MS, BF_PRICES, bfAnnounce, bfBar, bfEur, bfLine, bfLive, bfNewsletter, bfPath, bfPush } from "../lib/black-friday.js";
import { discounted } from "../lib/promo.js";
import { convert } from "../lib/pricing.js";
import { checkPromo, createPromo, disablePromo, ensureBlackFriday } from "../lib/whop-promo.js";
import { bfConfig, liveBf, liveOffer, resetBfMemo, resetOfferMemo } from "../lib/exit-offer.js";
import { BSKY_MAX, bfPost, blueskyPost, graphemes, telegramText } from "../lib/social.js";
import { offerLines } from "../lib/newsletter.js";

const DURING = Date.parse("2026-11-28T12:00:00Z");
const AFTER = Date.parse("2026-12-01T12:00:00Z");

export async function blackFridayTests({ ok, ko, eq }) {
  console.log("Black Friday");

  // --- Fin de l'offre : lundi 30/11/2026 à 23:59:59, heure de Paris
  eq("Fin : 23:59:59 à Paris (UTC+1) = 22:59:59 UTC", BF_END_MS, Date.parse("2026-11-30T23:59:59+01:00"));
  eq("bfLive : ouvert jusqu'à la dernière seconde, fermé ensuite", [bfLive(DURING), bfLive(BF_END_MS), bfLive(BF_END_MS + 1), bfLive(AFTER)], [true, true, false, false]);
  eq("Code, remise et paiements remisés", [BF.CODE, BF.PCT, BF.MONTHS], ["BLACKFRIDAY", 30, 2]);

  // --- Calcul des prix (mêmes arrondis que l'affichage de /pro : discounted de lib/promo.js)
  eq("Prix remisés : essai 0,70 €, 1er mois 6,99 €, Lifetime 69,99 €", [discounted(1, 30), discounted(9.99, 30), discounted(99.99, 30)], [0.7, 6.99, 69.99]);
  eq("Prix de l'offre = prix remisés de /pro", BF_PRICES, { trialWas: 1, trial: 0.7, proWas: 9.99, pro: 6.99, lifetimeWas: 99.99, lifetime: 69.99 });
  eq("Formats : euros en français et en espagnol, €69.99 en anglais", [bfEur(0.7, "fr"), bfEur(69.99, "es"), bfEur(99.99, "en"), bfEur(6.99, "pt")], ["0,70 €", "69,99 €", "€99.99", "6,99 €"]);
  const fx = { cur: "USD", rate: 1.16 };
  eq("Hors zone euro : l'essai remisé est converti puis remisé au centime (jamais 9,99 $)", [convert(1, fx), discounted(convert(1, fx), 30), discounted(convert(9.99, fx), 30)], [1.16, 0.81, 8.11]);

  // --- Liens et textes
  eq("Liens : /pro?code=BLACKFRIDAY dans chaque langue", ["fr", "en", "es", "pt"].map((l) => bfPath(l)), ["/pro?code=BLACKFRIDAY", "/en/pro?code=BLACKFRIDAY", "/es/pro?code=BLACKFRIDAY", "/pt/pro?code=BLACKFRIDAY"]);
  const all = [];
  for (const l of ["fr", "en", "es", "pt"]) all.push(...Object.values(bfBar(l)), bfLine(l), ...Object.values(bfNewsletter(l)), ...Object.values(bfPush(l)).filter((v) => !v.startsWith("/")));
  const a = bfAnnounce();
  all.push(a.bluesky(a.tags), a.telegram("x", a.tags));
  eq("Textes : jamais « IA », « AI », « essai gratuit », aucun vocabulaire de paris", all.some((t) => /\b(IA|AI)\b/.test(t) || /essai gratuit|free trial/i.test(t) || /\b(paris|parier|mise|cotes?|combiné|pronostics?)\b/i.test(t) || /\b(bets?|betting|odds|wager|apuestas?|cuotas?)\b/i.test(t) || /9[,.]99 ?\$|\$ ?9[,.]99/.test(t)), false);
  eq("Bandeau en français : texte de la demande", `🖤 ${bfBar("fr").title} : ${bfBar("fr").full} →`, "🖤 Black Friday : -30 % sur Pro et Lifetime avec le code BLACKFRIDAY, jusqu'à lundi minuit →");

  // --- Vérification des réglages chez Whop (checkPromo)
  const conform = (over = {}) => ({ id: "promo_bf", code: "blackfriday", promo_type: "percentage", amount_off: 0.3, status: "active", duration: "repeating", promo_duration_months: 2, new_users_only: false, expires_at: BF.END, unlimited_stock: true, stock: null, ...over });
  const kinds = (p, extra = {}) => checkPromo(p, { code: BF.CODE, pct: BF.PCT, months: BF.MONTHS, expires: BF.END, ...extra }).map((x) => x.k);
  eq("Whop : code conforme (30 %, 2 paiements, expire à la fin de l'offre)", kinds(conform()), []);
  eq("Whop : sans date d'expiration (champ ignoré par Whop) accepté", kinds(conform({ expires_at: null })), []);
  eq("Whop : autre date d'expiration, 1 seul paiement, autre remise refusés", [kinds(conform({ expires_at: "2026-11-29T22:59:59Z" })), kinds(conform({ promo_duration_months: 1 })), kinds(conform({ amount_off: 0.25 }))], [["expire"], ["paiements"], ["remise"]]);
  eq("Whop : une date d'expiration reste refusée pour les codes sans échéance (créateurs)", checkPromo(conform(), { code: BF.CODE, pct: 30, months: 2 }).map((x) => x.k), ["expire"]);

  // --- Création du code chez Whop (API simulée)
  const realFetch = globalThis.fetch;
  const key = process.env.WHOP_API_KEY;
  process.env.WHOP_API_KEY = "test-key";
  const calls = [];
  const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  try {
    globalThis.fetch = async (url, init = {}) => { calls.push({ method: init.method || "GET", path: new URL(url).pathname, body: init.body ? JSON.parse(init.body) : null }); return reply(200, conform()); };
    const r1 = await createPromo({ code: BF.CODE, pct: BF.PCT, months: BF.MONTHS, expires: BF.END });
    const b = calls[0].body;
    eq("Création : 30 %, 2 mois, expires_at, une fois par client, toutes formules, tous clients", [b.amount_off, b.promo_duration_months, b.expires_at, b.one_per_customer, b.product_ids, b.plan_ids, b.new_users_only, b.promo_type], [30, 2, BF.END, true, undefined, undefined, false, "percentage"]);
    eq("Création : résultat relu chez Whop", [r1.code, r1.pct, r1.expires_at, r1.expiryRefused], ["BLACKFRIDAY", 30, BF.END, undefined]);

    // Whop refuse expires_at : nouvel essai sans, et on le dit
    calls.length = 0;
    globalThis.fetch = async (url, init = {}) => { const body = init.body ? JSON.parse(init.body) : null; calls.push({ method: init.method || "GET", body }); return body?.expires_at ? reply(422, { error: { message: "unknown field expires_at" } }) : reply(200, conform({ expires_at: null })); };
    const r2 = await createPromo({ code: BF.CODE, pct: BF.PCT, months: BF.MONTHS, expires: BF.END });
    eq("Création : expires_at refusé -> réessai sans, signalé (expiryRefused)", [calls.length, "expires_at" in calls[1].body, r2.expiryRefused, r2.expires_at], [2, false, true, null]);

    // Whop enregistre autre chose : code désactivé aussitôt
    calls.length = 0;
    globalThis.fetch = async (url, init = {}) => { calls.push({ method: init.method || "GET", path: new URL(url).pathname }); return reply(200, conform({ amount_off: 0.1 })); };
    let err = null;
    try { await createPromo({ code: BF.CODE, pct: BF.PCT, months: BF.MONTHS, expires: BF.END }); } catch (e) { err = e; }
    eq("Création : réglages différents -> erreur « mismatch » et désactivation", [err?.kind, calls.some((c) => c.path.endsWith("/deactivate"))], ["mismatch", true]);

    // Idempotence : le code existe déjà (409), il est renvoyé tel quel, sans second code
    calls.length = 0;
    globalThis.fetch = async (url, init = {}) => {
      const method = init.method || "GET";
      calls.push({ method, path: new URL(url).pathname });
      if (method === "POST") return reply(409, { error: { message: "already exists" } });
      return reply(200, { data: [conform()], page_info: { has_next_page: false } });
    };
    const e1 = await ensureBlackFriday();
    eq("ensureBlackFriday : code déjà chez Whop -> renvoyé (exists), rien d'autre créé", [e1.state, e1.promo.code, e1.promo.pct, calls.filter((c) => c.method === "POST").length], ["exists", "BLACKFRIDAY", 30, 1]);

    // Désactivation après la fin de l'offre
    calls.length = 0;
    globalThis.fetch = async (url, init = {}) => { const method = init.method || "GET"; calls.push({ method, path: new URL(url).pathname }); return method === "GET" ? reply(200, { data: [conform()], page_info: { has_next_page: false } }) : reply(200, conform({ status: "inactive" })); };
    const d1 = await disablePromo(BF.CODE);
    eq("Fin de l'offre : disablePromo désactive le code chez Whop", [d1.state, calls.some((c) => c.method === "POST" && c.path.endsWith("/deactivate"))], ["disabled", true]);
    globalThis.fetch = async () => reply(200, { data: [conform({ status: "inactive" })], page_info: { has_next_page: false } });
    eq("Fin de l'offre : déjà désactivé = rien à faire", (await disablePromo(BF.CODE)).state, "already");
  } finally {
    globalThis.fetch = realFetch;
    if (key === undefined) delete process.env.WHOP_API_KEY; else process.env.WHOP_API_KEY = key;
  }

  // --- /api/promo : code accepté tant que l'offre court et que Whop confirme (find simulé)
  resetBfMemo();
  const found = async () => conform();
  const bfOk = await liveBf({ find: found, now: DURING, fresh: true });
  eq("liveBf : Whop confirme -> { ok, pct 30, mois 2 }", [bfOk.ok, bfOk.code, bfOk.pct, bfOk.mois], [true, "BLACKFRIDAY", 30, 2]);
  eq("liveBf : code absent chez Whop -> refusé (jamais de remise promise)", (await liveBf({ find: async () => null, now: DURING, fresh: true })).why, "absent");
  eq("liveBf : réglages différents chez Whop -> refusé", (await liveBf({ find: async () => conform({ amount_off: 0.1 }), now: DURING, fresh: true })).why, "reglages");
  eq("liveBf : Whop injoignable -> refusé", (await liveBf({ find: async () => { throw new Error("réseau"); }, now: DURING, fresh: true })).ok, false);
  let asked = 0;
  const after = await liveBf({ find: async () => { asked++; return conform(); }, now: AFTER, fresh: true });
  eq("liveBf : après la fin, refusé sans appeler Whop", [after.ok, after.why, asked], [false, "off", 0]);
  resetBfMemo();

  // --- Offre de dernière chance : propose BLACKFRIDAY pendant l'offre, rien sinon
  resetOfferMemo();
  const exit = await liveOffer({ env: {}, find: found, now: DURING, fresh: true, blackFriday: true });
  eq("Offre de dernière chance : BLACKFRIDAY pendant l'offre", [exit.ok, exit.code, exit.pct, exit.mois], [true, "BLACKFRIDAY", 30, 2]);
  eq("Offre de dernière chance : éteinte après la fin (sans réglage)", (await liveOffer({ env: {}, find: found, now: AFTER, fresh: true, blackFriday: true })).why, "off");
  eq("Offre de dernière chance : sans l'option, l'offre Black Friday n'est pas considérée (code saisi sur /pro)", (await liveOffer({ env: {}, find: found, now: DURING, fresh: true })).why, "off");
  eq("bfConfig : durée de 2 paiements et expiration", [bfConfig(DURING).months, bfConfig(DURING).expires, bfConfig(AFTER)], [2, BF.END, null]);
  resetOfferMemo();

  // --- Posts Bluesky et Telegram : la ligne Black Friday avec celle du jeu quand ça tient, en priorité sinon
  const SD = "20261128";
  const pick = (i, conf = "Moyenne", p = 0.6) => ({ league: "NBA", href: `/app/match/${i}?d=${SD}`, date: `2026-11-29T0${i % 4}:00:00Z`, away: `Visiteurs${i}`, home: `Trailblazers${i}`, pHome: p, conf });
  const few = [pick(1, "Très élevée", 0.9), pick(2), pick(3)];
  const many = Array.from({ length: 15 }, (_, i) => pick(i + 10));
  const sureMany = Array.from({ length: 8 }, (_, i) => pick(i + 40, "Très élevée", 0.8 + i / 100));
  const dec = new TextDecoder(), enc = new TextEncoder();
  for (const [name, picks] of [["3 matchs", few], ["15 matchs", many], ["8 matchs très sûrs", sureMany]]) {
    for (const l of ["fr", "en", "es"]) {
      const p = blueskyPost(picks, l, { d: SD, now: DURING });
      const link = p.facets.find((f) => f.features[0].uri?.includes("code=BLACKFRIDAY"));
      const shownLink = link ? dec.decode(enc.encode(p.text).slice(link.index.byteStart, link.index.byteEnd)) : null;
      eq(`Bluesky ${l} (${name}) : ≤ ${BSKY_MAX} signes, ligne Black Friday et lien cliquable exact`, [graphemes(p.text) <= BSKY_MAX, p.text.includes(`code ${BF.CODE}`) || p.text.includes(`código ${BF.CODE}`), shownLink], [true, true, link ? link.features[0].uri.replace(/^https?:\/\//, "") : "x"]);
    }
  }
  const pAvec = blueskyPost(few, "fr", { d: SD, now: DURING });
  eq("Bluesky : avec 3 matchs, la ligne Black Friday est là (les autres lignes seulement si elles tiennent dans 300 signes)", [pAvec.text.includes("🖤"), graphemes(pAvec.text) <= BSKY_MAX], [true, true]);
  const pLong = blueskyPost(sureMany, "fr", { d: SD, now: DURING });
  eq("Bluesky : quand ça ne tient pas, la ligne Black Friday passe avant le jeu de Noël", [pLong.text.includes("🖤"), graphemes(pLong.text) <= BSKY_MAX], [true, true]);
  const pFin = blueskyPost(few, "fr", { d: SD, now: AFTER });
  eq("Bluesky : après la fin, plus de ligne Black Friday", pFin.text.includes("BLACKFRIDAY"), false);
  const tgIn = telegramText(few, "fr", { d: SD, now: DURING }), tgOut = telegramText(few, "fr", { d: SD, now: AFTER });
  eq("Telegram : ligne Black Friday avec son lien pendant l'offre, absente après", [tgIn.includes('href="https://basketlog-app.com/pro?code=BLACKFRIDAY"'), tgIn.indexOf("🖤") < tgIn.indexOf("🎁"), tgOut.includes("BLACKFRIDAY")], [true, true, false]);

  // --- Annonce unique (?bf=1)
  const post = bfPost();
  eq(`Annonce Bluesky : ≤ ${BSKY_MAX} signes, commence par la marque anti-doublon, lien /pro?code=BLACKFRIDAY`, [graphemes(post.text) <= BSKY_MAX, post.text.startsWith("🖤 BLACK FRIDAY"), post.url], [true, true, "https://basketlog-app.com/pro?code=BLACKFRIDAY"]);
  eq("Annonce Bluesky : le lien et les mots-dièse tombent pile (octets)", post.facets.every((f) => { const t = dec.decode(enc.encode(post.text).slice(f.index.byteStart, f.index.byteEnd)); const ft = f.features[0]; return ft.uri ? t === ft.uri.replace(/^https?:\/\//, "") : t === `#${ft.tag}`; }), true);
  eq("Annonce Telegram : lien HTML, prix remisés et mention hors taxes", [post.html.includes('<a href="https://basketlog-app.com/pro?code=BLACKFRIDAY">'), post.html.includes("69,99 €") && post.html.includes("0,70 €") && post.html.includes("6,99 €"), post.html.includes("hors taxes")], [true, true, true]);
  eq("Annonce : visuel Black Friday hors de /api/", post.image.includes("/bf/og") && !post.image.includes("/api/"), true);

  // --- Newsletter
  const nlIn = offerLines("fr", DURING), nlOut = offerLines("fr", AFTER);
  eq("Newsletter : ligne Black Friday en tête pendant l'offre (3 langues), absente après", [nlIn[0].text.includes("BLACKFRIDAY"), nlIn[0].url.includes("/pro?code=BLACKFRIDAY"), offerLines("en", DURING)[0].url.includes("/en/pro?code=BLACKFRIDAY"), offerLines("es", DURING)[0].url.includes("/es/pro?code=BLACKFRIDAY"), nlOut.some((x) => x.text.includes("BLACKFRIDAY"))], [true, true, true, true, false]);

  // --- Notification : une par langue
  eq("Notification : un texte par langue, avec le lien de la langue", ["fr", "en", "es", "pt"].map((l) => [bfPush(l).title.length > 0, bfPush(l).url.startsWith(l === "fr" ? "/pro?code=BLACKFRIDAY" : `/${l}/pro?code=BLACKFRIDAY`)]), [[true, true], [true, true], [true, true], [true, true]]);

  // --- Script des posts du soir (X 280 signes, une adresse compte 23)
  const dir = mkdtempSync(join(tmpdir(), "bf-texts-"));
  const mkGames = (n) => Array.from({ length: n }, (_, i) => ({ away: { short: `AW${i}`, name: `Away ${i}` }, home: { short: `HM${i}`, name: `Home ${i}` }, pHome: 0.55 + i / 40 }));
  const run = (n, now) => {
    const f = join(dir, `d${n}.json`);
    writeFileSync(f, JSON.stringify({ d: "20261128", games: mkGames(n), lastNight: { n: 8, ok: 6 } }));
    return JSON.parse(execFileSync(process.execPath, [join(process.cwd(), "scripts/short/texts.mjs"), f], { env: { ...process.env, TEXTS_NOW: now }, encoding: "utf8" }));
  };
  const xLen = (s) => { let len = 0; for (const ch of s.replace(/(https?:\/\/)?[a-z0-9-]+\.[a-z]{2,}(\/[^\s]*)?/gi, "x".repeat(23))) len += ch.codePointAt(0) > 0x2000 ? 2 : 1; return len; };
  for (const n of [1, 4, 9]) {
    const o = run(n, "2026-11-28T12:00:00Z");
    eq(`Posts du soir (${n} matchs) : X ≤ 280, ligne Black Friday sur X, Facebook/LinkedIn et description du Short`, [xLen(o.x) <= 280, o.x.includes("BLACKFRIDAY"), o.long.includes("https://basketlog-app.com/pro?code=BLACKFRIDAY"), o.description.includes("BLACKFRIDAY")], [true, true, true, true]);
  }
  const o9 = run(9, "2026-11-28T12:00:00Z");
  eq("Posts du soir : mêmes mots que lib/black-friday.js", o9.long.includes(`🖤 ${bfLine("fr")} 👉 https://basketlog-app.com${bfPath("fr")}`), true);
  eq("Posts du soir : jeu de Noël gardé sur Facebook et LinkedIn pendant l'offre", o9.long.includes("Jeu de Noël"), true);
  const oAfter = run(4, "2026-12-01T12:00:00Z");
  eq("Posts du soir : après la fin, plus de Black Friday, le jeu de Noël revient sur X", [oAfter.x.includes("BLACKFRIDAY"), oAfter.long.includes("BLACKFRIDAY"), oAfter.x.includes("Jeu de Noël")], [false, false, true]);
  const oEnd = run(4, "2026-11-30T22:59:59Z"), oEnd1 = run(4, "2026-11-30T23:00:00Z");
  eq("Posts du soir : même fin d'offre que le site (dernière seconde incluse)", [oEnd.x.includes("BLACKFRIDAY"), oEnd1.x.includes("BLACKFRIDAY")], [true, false]);
}
