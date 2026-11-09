// Tests sans serveur : détection de la langue des avis, découpage et traduction automatique (appels simulés),
// codes promo des créateurs (nettoyage, lien de paiement, prix remisé) et vérification de ce que Whop a enregistré.
// Usage : node tests/unit.mjs  (lancé aussi par tests/smoke.mjs)
import { pathToFileURL } from "node:url";
import { chunkText, detectLang, localizeReviews, translateRaw } from "../lib/translate.js";
import { accountLabel, creatorNames, noEndDate } from "../lib/accounts.js";
import { DELETE_WORDS, buildPlans, cleanName, creatorCodes, deleteConfirmed, normalizeMembership, planOf, renewing, switchStep, switchTargets, tierOfProduct } from "../lib/account.js";
import { SWITCH_COOKIE, SWITCH_TARGETS, SWITCH_TTL_MS, makeIntent, readIntent, readToken, signToken } from "../lib/switch.js";
import { CODE_RE, cleanCode, cleanPct, discounted, mergePromos, randomChars, suggestCode, withPromo } from "../lib/promo.js";
import { asPct, checkPromo, describeProblem, describeProblems, promoMonths, whopPromoReady } from "../lib/whop-promo.js";
import { BSKY_BIO_MAX, BSKY_MAX, BSKY_NAME_MAX, blueskyPost, blueskyProfile, elPick, graphemes, nbaPick, socialPosts, telegramText } from "../lib/social.js";
import { blueskySetProfile, socialConfig, socialStatus } from "../lib/social-send.js";
import { MIN_PASSWORD, fakeVerify, hashPassword, passwordProblem, verifyPassword } from "../lib/password.js";
import { RESET_TOKEN_RE, accountIdOf, accountUid, clientIp, inAppBrowser, isAccountSession, limitKey, localName, maskEmail, newResetToken, normEmail, sameOrigin, tokenHash, whopUidOf } from "../lib/auth-utils.js";
import { GoogleAuthError, exchangeCode, googleAuthUrl, readIdToken } from "../lib/google-auth.js";
import { mailReady, resetEmail, sendMail } from "../lib/mail.js";
import { newsletterTests } from "./newsletter.mjs";

export async function unit() {
  let passed = 0, failed = 0;
  const ok = (name) => { passed++; console.log(`  ok   ${name}`); };
  const ko = (name, why) => { failed++; console.log(`  ÉCHEC ${name} : ${why}`); };
  const eq = (name, got, want) => (JSON.stringify(got) === JSON.stringify(want) ? ok(name) : ko(name, `obtenu ${JSON.stringify(got)}, attendu ${JSON.stringify(want)}`));
  console.log("Traduction des avis");

  // --- Langue d'un avis
  const samples = [
    ["fr", "Super application, les analyses sont vraiment précises et j'ai enfin compris le jeu !"],
    ["fr", "Je l'utilise tous les jours avant les matchs, c'est très utile pour mes pronostics."],
    ["en", "Great app, the analysis is really accurate and it helps me before every game."],
    ["en", "I've been using it for a month and it's the best tool I have found for NBA predictions."],
    ["es", "Muy buena aplicación, los análisis son muy precisos y me ayudan antes de cada partido."],
    ["es", "¡Excelente herramienta! La uso todos los días para preparar mis vídeos de baloncesto."],
  ];
  for (const [lang, text] of samples) eq(`langue ${lang} : ${text.slice(0, 28)}…`, detectLang(text), lang);
  eq("texte trop court : langue inconnue", detectLang("Top"), null);
  eq("texte sans mot repérable : langue inconnue", detectLang("Celtics Lakers Knicks Bulls Heat"), null);

  // --- Découpage (MyMemory refuse plus de 500 octets par requête)
  const long = "Une phrase assez longue pour le test, avec des accents éèà. ".repeat(20);
  const chunks = chunkText(long, 200);
  eq("découpage : chaque morceau tient dans 200 octets", chunks.every((c) => new TextEncoder().encode(c).length <= 200), true);
  eq("découpage : aucun mot perdu", chunks.join(" ").split(/\s+/).length, long.trim().split(/\s+/).length);
  const glued = "x".repeat(1000);
  eq("découpage : un mot géant est coupé", chunkText(glued, 450).every((c) => c.length <= 450) && chunkText(glued, 450).join("") === glued, true);
  eq("découpage : texte vide", chunkText("  "), []);

  // --- Appel à MyMemory (simulé)
  const reply = (body, status = 200) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
  const good = (t) => reply({ responseData: { translatedText: t, match: 0.9 }, quotaFinished: false, responseStatus: 200 });
  eq("traduction : texte renvoyé", await translateRaw("Super application", "fr", "en", good("Great app")), "Great app");
  eq("traduction : entités HTML décodées", await translateRaw("Super application", "fr", "en", good("It&#39;s &quot;great&quot; &amp; fun")), `It's "great" & fun`);
  let seenUrl = "";
  await translateRaw("Super application", "fr", "es", async (u) => { seenUrl = u; return good("Gran aplicación")(); });
  eq("traduction : paire de langues envoyée", new URL(seenUrl).searchParams.get("langpair"), "fr|es");
  for (const [name, f] of [
    ["quota épuisé", reply({ responseData: { translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY" }, quotaFinished: true, responseStatus: 429 })],
    ["erreur serveur", reply({}, 500)],
    ["réponse vide", reply({ responseData: { translatedText: "" }, responseStatus: 200 })],
  ]) {
    try { await translateRaw("Super application", "fr", "en", f); ko(`traduction : ${name} refusée`, "aucune erreur levée"); } catch { ok(`traduction : ${name} refusée`); }
  }

  // --- Avis dans la langue de la page
  const fake = async (text, from, to) => `[${from}>${to}] ${text}`;
  const rev = (id, texte, profil = null) => ({ id, prenom: "Karim", texte, profil, note: 5 });
  const fr = rev("a", samples[0][1], "Fan des Celtics depuis 2008");
  const en = rev("b", samples[2][1]);
  const es = rev("c", samples[4][1]);
  const out = await localizeReviews([fr, en, es], "en", fake);
  eq("page anglaise : avis français traduit", [out[0].translated, out[0].texte.startsWith("[fr>en] ")], [true, true]);
  eq("page anglaise : mention « Qui es-tu ? » traduite", out[0].profil, "[fr>en] Fan des Celtics depuis 2008");
  eq("page anglaise : original conservé", out[0].orig, { texte: fr.texte, profil: fr.profil, lang: "fr" });
  eq("page anglaise : avis anglais inchangé", out[1], en);
  eq("page anglaise : avis espagnol traduit", out[2].texte.startsWith("[es>en] "), true);
  const outFr = await localizeReviews([fr, en], "fr", fake);
  eq("page française : avis anglais traduit, avis français inchangé", [outFr[0], outFr[1].texte.startsWith("[en>fr] ")], [fr, true]);
  const outEs = await localizeReviews([fr, es], "es", fake);
  eq("page espagnole : avis français traduit, avis espagnol inchangé", [outEs[0].texte.startsWith("[fr>es] "), outEs[1]], [true, es]);
  eq("prénom jamais traduit", out[0].prenom, "Karim");
  const down = await localizeReviews([fr, en], "en", async () => { throw new Error("hors service"); });
  eq("service en panne : avis affichés tels quels", down, [fr, en]);
  const same = await localizeReviews([fr], "en", async (t) => t);
  eq("traduction identique à l'original : pas de mention « traduit »", same, [fr]);
  const slow = await localizeReviews([fr, es, fr, es, fr, es], "en", async (t, f, to) => { await new Promise((r) => setTimeout(r, 40)); return fake(t, f, to); }, { budgetMs: 50, parallel: 1 });
  eq("temps limité : les avis restants gardent leur version d'origine", slow.some((r) => r.translated) && slow.some((r) => !r.translated), true);
  eq("langue inconnue : liste inchangée", await localizeReviews([fr], "de", fake), [fr]);

  // --- Codes promo des créateurs (lib/promo.js)
  console.log("Codes promo des créateurs");
  eq("code : accents, espaces et symboles retirés", cleanCode("@La Nuit NBA !"), "LANUITNBA");
  eq("code : accents français", cleanCode("Élodie Ça-Va"), "ELODIECAVA");
  eq("code : 24 caractères au plus", cleanCode("a".repeat(40)).length, 24);
  eq("code : valeur vide", [cleanCode(null), cleanCode(undefined), cleanCode("")], ["", "", ""]);
  eq("format de code : valides", ["TIM20", "NBA2026", "ABC", "A".repeat(24)].map((c) => CODE_RE.test(c)), [true, true, true, true]);
  eq("format de code : refusés", ["AB", "TIM 20", "tim20", "TIM-20", "É20", "A".repeat(25), ""].map((c) => CODE_RE.test(c)), [false, false, false, false, false, false, false]);
  eq("remise : entier de 1 à 90 accepté sous toutes ses formes", [1, 20, 90, "20", "20 %", "20,0", " 15 ", "20 %"].map(cleanPct), [1, 20, 90, 20, 20, 20, 15, 20]);
  eq("remise : refusée hors de 1 à 90 ou non entière", [0, 91, -5, 12.5, "12,5", "", null, undefined, "abc", NaN, 100].map(cleanPct), [null, null, null, null, null, null, null, null, null, null, null]);
  eq("code proposé : nom + remise", suggestCode("@lanuitnba", 20), "LANUITNBA20");
  eq("code proposé : nom trop long raccourci (24 au plus)", suggestCode("a".repeat(30), 15), `${"A".repeat(22)}15`);
  eq("code proposé : remise invalide, nom seul", suggestCode("Tipoff", "abc"), "TIPOFF");
  eq("code proposé : nom trop court, rien sans hasard", suggestCode("Al", 20), "");
  eq("code proposé : nom trop court, code tiré au hasard", suggestCode("Al", 20, () => "XXXX"), "BLXXXX20");
  eq("code proposé : toujours un code valide", ["@lanuitnba", "Élodie", "a".repeat(40), "Al", "@@"].every((n) => CODE_RE.test(suggestCode(n, 20, randomChars))), true);
  eq("hasard : 6 caractères sans 0, O, 1, I", /^[A-HJ-NP-Z2-9]{6}$/.test(randomChars(6)), true);
  eq("hasard : deux tirages différents", randomChars(12) !== randomChars(12), true);
  const roles = [{ uid: "u1", role: "createur" }, { uid: "u2", role: "admin" }];
  const invitations = [{ code: "a".repeat(20), role: "createur" }];
  const promos = [
    { id: "p1", code: "ONE20", pct: 20, uid: "u1", inv_code: "b".repeat(20) },
    { id: "p2", code: "TWO15", pct: 15, uid: null, inv_code: "a".repeat(20) },
    { id: "p3", code: "OLD10", pct: 10, uid: null, inv_code: "c".repeat(20) },
  ];
  const merged = mergePromos({ roles, invitations }, promos);
  eq("promos : le compte retrouve son code, l'admin n'en a pas", merged.roles.map((r) => r.promo?.code ?? null), ["ONE20", null]);
  eq("promos : l'invitation retrouve son code", merged.invitations[0].promo?.code, "TWO15");
  eq("promos : un code sans créateur est isolé", merged.orphelins.map((p) => p.code), ["OLD10"]);
  eq("promos : sans codes, tout reste affichable", [mergePromos({ roles, invitations }, []).roles.map((r) => r.promo), mergePromos({ roles, invitations }, []).orphelins], [[null, null], []]);
  eq("promos : sans arguments", mergePromos(), { roles: [], invitations: [], orphelins: [] });

  // --- Code promo dans le lien de paiement et prix remisé (lib/promo.js)
  console.log("Code promo dans le paiement");
  const LINK = "https://whop.com/checkout/plan_abc";
  eq("lien : le code est ajouté (promoCode)", withPromo(LINK, "ZEBRA20"), `${LINK}?promoCode=ZEBRA20`);
  eq("lien : les paramètres existants sont gardés", withPromo(`${LINK}?d2c=true`, "ZEBRA20"), `${LINK}?d2c=true&promoCode=ZEBRA20`);
  eq("lien : un ancien code est remplacé, pas doublé", withPromo(`${LINK}?promoCode=OLD10`, "ZEBRA20"), `${LINK}?promoCode=ZEBRA20`);
  eq("lien : sans code ou avec un code invalide, lien inchangé", [withPromo(LINK, ""), withPromo(LINK, null), withPromo(LINK, undefined), withPromo(LINK, "ab"), withPromo(LINK, "zebra20"), withPromo(LINK, "A&B=1")], [LINK, LINK, LINK, LINK, LINK, LINK]);
  eq("lien : vide ou illisible, rendu tel quel", [withPromo("", "ZEBRA20"), withPromo(undefined, "ZEBRA20"), withPromo("pas un lien", "ZEBRA20")], ["", undefined, "pas un lien"]);
  eq("prix remisé : arrondi au centime", [discounted(13.99, 20), discounted(29.99, 20), discounted(99.99, 20), discounted(13.99, 15), discounted(10, 50), discounted(29.99, 90), discounted(13.99, 1)], [11.19, 23.99, 79.99, 11.89, 5, 3, 13.85]);
  eq("prix remisé : jamais négatif ni supérieur au prix", [13.99, 29.99, 99.99].every((a) => [1, 20, 50, 90].every((pct) => discounted(a, pct) > 0 && discounted(a, pct) < a)), true);

  // --- Vérification de ce que Whop a enregistré (lib/whop-promo.js)
  console.log("Codes promo chez Whop");
  const pctOf = (o) => asPct({ promo_type: "percentage", ...o });
  eq("Whop : remise relue en % (fraction décimale)", [pctOf({ amount_off: 0.25 }), pctOf({ amount_off: 0.2 }), pctOf({ amount_off: 0.07 }), pctOf({ amount_off: 0.9 }), pctOf({ amount_off: 0.01 })], [25, 20, 7, 90, 1]);
  eq("Whop : un entier est lu tel quel (20 → « 2000 % »), donc détecté", pctOf({ amount_off: 20 }), 2000);
  eq("Whop : montant fixe, valeur absente ou réponse vide : pas de %", [asPct({ promo_type: "flat_amount", amount_off: 5 }), pctOf({}), pctOf({ amount_off: null }), asPct(null), asPct(undefined)], [null, null, null, null, null]);
  const conform = (over = {}) => ({ id: "promo_1", code: "zebra20", promo_type: "percentage", amount_off: 0.2, status: "active", duration: "forever", promo_duration_months: null, new_users_only: false, expires_at: null, unlimited_stock: true, stock: null, ...over });
  const kinds = (p, opt = {}) => checkPromo(p, { code: "ZEBRA20", pct: 20, months: 0, ...opt }).map((x) => x.k);
  eq("code conforme : aucun écart (la casse du nom est ignorée)", [kinds(conform()), kinds(conform({ code: "ZEBRA20" })), kinds(conform({ code: "Zebra20" }))], [[], [], []]);
  eq("écart : remise en entier au lieu de fraction", kinds(conform({ amount_off: 20 })), ["remise"]);
  eq("écart : 1 % relu comme 100 %", checkPromo(conform({ amount_off: 1 }), { code: "ZEBRA20", pct: 1, months: 0 }), [{ k: "remise", got: 100, want: 1 }]);
  eq("écart : remise différente", checkPromo(conform({ amount_off: 0.1 }), { code: "ZEBRA20", pct: 20, months: 0 }), [{ k: "remise", got: 10, want: 20 }]);
  eq("écart : remise très proche mais pas égale (12,5 % pour 12 %)", checkPromo(conform({ amount_off: 0.125 }), { code: "ZEBRA20", pct: 12, months: 0 }).map((x) => x.k), ["remise"]);
  eq("écart : montant fixe au lieu d'un pourcentage", kinds(conform({ promo_type: "flat_amount", amount_off: 5 })), ["type", "remise"]);
  eq("écart : désactivé ou archivé", [kinds(conform({ status: "inactive" })), kinds(conform({ status: "archived" })), kinds(conform({ status: undefined }))], [["etat"], ["etat"], ["etat"]]);
  eq("écart : réservé aux nouveaux clients", kinds(conform({ new_users_only: true })), ["nouveaux"]);
  eq("écart : date d'expiration", checkPromo(conform({ expires_at: "2026-12-01T00:00:00Z" }), { code: "ZEBRA20", pct: 20, months: 0 }), [{ k: "expire", got: "2026-12-01T00:00:00Z" }]);
  eq("écart : nombre d'utilisations limité", checkPromo(conform({ unlimited_stock: false, stock: 10 }), { code: "ZEBRA20", pct: 20, months: 0 }), [{ k: "stock", got: 10 }]);
  eq("écart : autre nom de code", kinds(conform({ code: "autre" })), ["code"]);
  eq("écart : plusieurs à la fois, tous relevés", kinds(conform({ amount_off: 0.5, status: "inactive", new_users_only: true })), ["remise", "etat", "nouveaux"]);
  eq("durée : à chaque paiement attendu", [kinds(conform({ duration: "once" })), kinds(conform({ duration: "repeating", promo_duration_months: 3 })), kinds(conform({ duration: undefined }))], [["duree"], ["duree"], ["duree"]]);
  eq("durée : premier paiement seulement attendu (1)", [kinds(conform({ duration: "once" }), { months: 1 }), kinds(conform({ duration: "forever" }), { months: 1 })], [[], ["duree"]]);
  eq("durée : un seul paiement écrit « repeating » sur 1 mois est accepté, sur 2 mois non", [kinds(conform({ duration: "repeating", promo_duration_months: 1 }), { months: 1 }), kinds(conform({ duration: "repeating", promo_duration_months: 2 }), { months: 1 })], [[], ["duree"]]);
  eq("durée : 3 premiers paiements attendus", [kinds(conform({ duration: "repeating", promo_duration_months: 3 }), { months: 3 }), kinds(conform({ duration: "repeating", promo_duration_months: 2 }), { months: 3 }), kinds(conform({ duration: "once" }), { months: 3 })], [[], ["paiements"], ["duree"]]);
  eq("réponse vide ou illisible : écart « vide »", [checkPromo(null, { code: "ZEBRA20", pct: 20 }), checkPromo(undefined, { code: "ZEBRA20", pct: 20 }), checkPromo("x", { code: "ZEBRA20", pct: 20 })], [[{ k: "vide" }], [{ k: "vide" }], [{ k: "vide" }]]);
  const tEn = (fr, e) => e, tEs = (fr, e, sp) => sp;
  const gap = { k: "remise", got: 2000, want: 20 };
  eq("écart en phrase : français par défaut, anglais, espagnol", [describeProblem(gap), describeProblem(gap, tEn), describeProblem(gap, tEs)], ["remise de 2000 % au lieu de 20 %", "discount of 2000% instead of 20%", "descuento del 2000 % en lugar del 20 %"]);
  eq("écart en phrase : durée, avec des mots plutôt que le jargon de Whop", [describeProblem({ k: "duree", got: "once", want: "forever" }), describeProblem({ k: "duree", got: "once", want: "forever" }, tEn)], ["durée : premier paiement seulement au lieu de à chaque paiement", "duration: first payment only instead of every payment"]);
  eq("écart en phrase : tous les types ont une phrase dans les trois langues", ["vide", "code", "type", "remise", "etat", "duree", "paiements", "nouveaux", "expire", "stock"].every((k) => [undefined, tEn, tEs].every((t) => describeProblem({ k, got: "x", want: "y" }, t).length > 3 && !/^\?$/.test(describeProblem({ k, got: "x", want: "y" }, t)))), true);
  eq("écart en phrase : valeur absente affichée « ? »", describeProblem({ k: "remise", got: null, want: 20 }), "remise de ? % au lieu de 20 %");
  eq("écarts en liste : séparés par « ; » (français) ou « ; » collé (anglais, espagnol), liste vide = texte vide", [describeProblems([gap, { k: "etat", got: "inactive" }]), describeProblems([gap, { k: "etat", got: "inactive" }], tEn), describeProblems([gap, { k: "etat", got: "inactive" }], tEs), describeProblems([]), describeProblems(undefined)], ["remise de 2000 % au lieu de 20 % ; statut « inactive »", "discount of 2000% instead of 20%; status “inactive”", "descuento del 2000 % en lugar del 20 %; estado «inactive»", "", ""]);

  const env = { key: process.env.WHOP_API_KEY, months: process.env.WHOP_PROMO_MONTHS };
  const setEnv = (name, v) => { if (v === undefined) delete process.env[name]; else process.env[name] = v; };
  const months = (v) => { setEnv("WHOP_PROMO_MONTHS", v); return promoMonths(); };
  eq("durée de la remise (WHOP_PROMO_MONTHS) : premier paiement seulement par défaut", [months(undefined), months(""), months(" ")], [1, 1, 1]);
  eq("durée de la remise : 0 = à chaque paiement, de 1 à 36 = nombre de paiements", [months("0"), months("1"), months("3"), months("12"), months("36"), months(" 3 ")], [0, 1, 3, 12, 36, 3]);
  eq("durée de la remise : valeur invalide = valeur par défaut (premier paiement)", [months("37"), months("100"), months("-1"), months("2.5"), months("abc"), months("1e1"), months("0x10")], [1, 1, 1, 1, 1, 1, 1]);
  setEnv("WHOP_PROMO_MONTHS", env.months);
  setEnv("WHOP_API_KEY", undefined);
  const noKey = whopPromoReady();
  setEnv("WHOP_API_KEY", "k");
  const withKey = whopPromoReady();
  setEnv("WHOP_API_KEY", env.key);
  eq("liaison Whop : active seulement si la clé API est présente", [noKey, withKey], [false, true]);

  // --- Nom d'un compte dans l'admin et les statistiques (lib/accounts.js)
  console.log("Noms des comptes");
  eq("créateur : le nom saisi à l'invitation passe devant le nom du compte Whop", accountLabel({ role: "createur", uid: "u1", nom: "matheosds", note: "Gonzopicks" }), { main: "Gonzopicks", sub: "matheosds", whop: true });
  eq("créateur : même nom (casse, espaces, accents ignorés) : pas de doublon", [accountLabel({ role: "createur", nom: "gonzopicks", note: "GONZOPICKS" }), accountLabel({ role: "createur", nom: "Gonzo Picks", note: "gonzopicks" }), accountLabel({ role: "createur", nom: "Élodie", note: "elodie" })], [{ main: "GONZOPICKS", sub: "", whop: true }, { main: "gonzopicks", sub: "", whop: true }, { main: "elodie", sub: "", whop: true }]);
  eq("créateur sans nom saisi : le nom du compte Whop, puis rien", [accountLabel({ role: "createur", uid: "u1", nom: "matheosds", note: null }), accountLabel({ role: "createur", uid: "u1", nom: "matheosds", note: "  " }), accountLabel({ role: "createur", uid: "u1", nom: "matheosds" })], [{ main: "matheosds", sub: "", whop: false }, { main: "matheosds", sub: "", whop: false }, { main: "matheosds", sub: "", whop: false }]);
  eq("créateur sans nom du tout : l'identifiant du compte", accountLabel({ role: "createur", uid: "user_abc", nom: null, note: null }), { main: "user_abc", sub: "", whop: false });
  eq("créateur sans nom de compte Whop : le nom saisi seul", accountLabel({ role: "createur", uid: "u1", nom: null, note: "Gonzopicks" }), { main: "Gonzopicks", sub: "", whop: true });
  eq("admin : l'ordre ne change pas (nom du compte, puis la note)", [accountLabel({ role: "admin", uid: "u0", nom: "Tim", note: "Propriétaire" }), accountLabel({ role: "admin", uid: "u2", nom: "marie_w", note: "Marie" })], [{ main: "Tim", sub: "Propriétaire", whop: false }, { main: "marie_w", sub: "Marie", whop: false }]);
  eq("admin : note identique au nom, ou absente : pas de doublon", [accountLabel({ role: "admin", nom: "Tim", note: "tim" }), accountLabel({ role: "admin", nom: "Tim", note: null })], [{ main: "Tim", sub: "", whop: false }, { main: "Tim", sub: "", whop: false }]);
  eq("ligne vide ou absente : rien d'affiché, sans erreur", [accountLabel(null), accountLabel(undefined), accountLabel({})], [{ main: "", sub: "", whop: false }, { main: "", sub: "", whop: false }, { main: "", sub: "", whop: false }]);
  // Liens d'invitation sans date de fin (supabase/liens-sans-expiration.sql : date de fin repoussée de 100 ans).
  const NOW_INV = Date.parse("2026-11-08T14:00:00Z");
  eq("lien d'invitation : une date à 100 ans (ce que pose le script, avec ou sans fuseau) = sans date de fin", [noEndDate("2126-11-08T14:35:00.123456+00:00", NOW_INV), noEndDate("2126-11-08T14:35:00Z", NOW_INV), noEndDate("2126-11-08T15:35:00+01:00", NOW_INV)], [true, true, true]);
  eq("lien d'invitation : une date proche (ancien lien à 30 jours, ou dans un an) garde sa date", [noEndDate("2026-12-08T14:00:00Z", NOW_INV), noEndDate("2027-11-08T14:00:00Z", NOW_INV), noEndDate("2026-11-08T14:00:00Z", NOW_INV)], [false, false, false]);
  eq("lien d'invitation : seuil à 50 ans (49 ans = date affichée, 51 ans = sans date de fin)", [noEndDate("2075-11-08T14:00:00Z", NOW_INV), noEndDate("2077-11-08T14:00:00Z", NOW_INV)], [false, true]);
  eq("lien d'invitation : date absente, vide ou illisible = pas « sans date de fin » (jamais d'affirmation à tort)", [noEndDate(null), noEndDate(undefined), noEndDate(""), noEndDate("pas une date"), noEndDate(42), noEndDate({})], [false, false, false, false, false, false]);
  eq("lien d'invitation : sans heure donnée, l'heure actuelle sert de repère", [noEndDate(new Date(Date.now() + 100 * 365.25 * 864e5).toISOString()), noEndDate(new Date(Date.now() + 30 * 864e5).toISOString())], [true, false]);
  eq("statistiques : seuls les créateurs avec un nom saisi sont renommés", creatorNames([
    { uid: "u0", role: "admin", nom: "Tim", note: "Propriétaire" },
    { uid: "u1", role: "createur", nom: "matheosds", note: " Gonzopicks " },
    { uid: "u2", role: "createur", nom: "autre", note: "" },
    { uid: "u3", role: "createur", nom: "x", note: null },
    null,
  ]), { u1: "Gonzopicks" });
  eq("statistiques : sans rôles, rien", [creatorNames(), creatorNames([])], [{}, {}]);

  // --- Publications automatiques du jour (Telegram, Bluesky)
  console.log("Publications automatiques");
  const SD = "20261108";
  const socPicks = [
    { league: "NBA", href: `/app/match/1?d=${SD}`, date: "2026-11-09T00:00:00Z", away: "Jazz", home: "Timberwolves", pHome: 0.9, conf: "Très élevée" },
    { league: "NBA", href: `/app/match/2?d=${SD}`, date: "2026-11-08T20:30:00Z", away: "76ers", home: "Bulls", pHome: 0.27, conf: "Élevée" },
    { league: "NBA", href: `/app/match/3?d=${SD}`, date: "2026-11-08T23:00:00Z", away: "Lakers", home: "Pistons", pHome: 0.66, conf: "Moyenne" },
    { league: "EL", href: "/app/euroleague/match/77", date: "2026-11-08T19:30:00Z", away: "Real Madrid", home: "Monaco & Co", pHome: 0.42, conf: "Moyenne" },
  ];
  const socRec = { n: 55, ok: 47, since: 2026 };
  const tgFr = telegramText(socPicks, "fr", { d: SD, record: socRec });
  const tgEn = telegramText(socPicks, "en", { d: SD, record: socRec });
  const tgEs = telegramText(socPicks, "es", { d: SD, record: socRec });
  eq("Telegram FR : marque, titre et jour", [tgFr.startsWith("🏀 <b>Basketlog · Pronostics NBA et EuroLeague de ce soir</b>"), tgFr.includes("dimanche 8 novembre · heures de Paris")], [true, true]);
  eq("Telegram : confiance très élevée avant les autres matchs", tgFr.indexOf("Confiance très élevée") < tgFr.indexOf("Timberwolves") && tgFr.indexOf("Timberwolves") < tgFr.indexOf("Les autres matchs"), true);
  eq("Telegram FR : lien de la fiche et favori avec sa probabilité", [tgFr.includes('href="https://basketlog-app.com/app/match/1?d=20261108"'), tgFr.includes("<b>Timberwolves 90 %</b>"), tgFr.includes("<b>76ers 73 %</b>")], [true, true, true]);
  eq("Telegram : caractères spéciaux échappés (HTML)", [tgFr.includes("Monaco &amp; Co"), tgFr.includes("Monaco & Co")], [true, false]);
  eq("Telegram EN : liens /en, « vs », pourcentage collé", [tgEn.includes("https://basketlog-app.com/en/app/match/1?d=20261108"), tgEn.includes("Jazz vs Timberwolves"), tgEn.includes("<b>Timberwolves 90%</b>"), tgEn.includes("Sunday, November 8 · times in ET")], [true, true, true, true]);
  eq("Telegram ES : liens /es, Euroliga, jour sans virgule", [tgEs.includes("https://basketlog-app.com/es/app/euroleague/match/77"), tgEs.includes("Euroliga · "), tgEs.includes("Confianza muy alta"), tgEs.includes("domingo 8 de noviembre")], [true, true, true, true]);
  eq("Telegram : bilan recalculé cité (55 matchs, depuis 2025-26), avec son lien", [tgFr.includes("Bilan recalculé</a> depuis 2025-26") && tgFr.includes("47 matchs sur 55"), tgEn.includes("47 of 55 games"), tgEs.includes("47 de 55 partidos")], [true, true, true]);
  eq("Telegram : bilan absent sous 20 matchs ou inconnu", [telegramText(socPicks, "fr", { d: SD, record: { n: 12, ok: 11, since: 2026 } }).includes("📊"), telegramText(socPicks, "fr", { d: SD }).includes("📊")], [false, false]);
  eq("Telegram : sans match à confiance très élevée, une seule liste « Les matchs »", (() => { const t = telegramText(socPicks.slice(1), "fr", { d: SD }); return [t.includes("🔒"), t.includes("<b>Les matchs</b>")]; })(), [false, true]);

  const socMany = Array.from({ length: 15 }, (_, i) => ({ league: "NBA", href: `/app/match/${100 + i}?d=${SD}`, date: `2026-11-09T0${i % 4}:00:00Z`, away: `Visiteurs${i}`, home: `Trailblazers${i}`, pHome: 0.5 + (i % 9) / 20, conf: i < 2 ? "Très élevée" : "Moyenne" }));
  const socAll = [socialPosts(socPicks, { d: SD, record: socRec }), socialPosts(socMany, { d: SD, record: socRec })];
  const socBsky = socAll.flatMap((p) => Object.values(p).map((x) => x.bluesky));
  eq(`Bluesky : ${BSKY_MAX} graphèmes au plus, même avec 15 matchs`, socBsky.every((b) => graphemes(b.text) <= BSKY_MAX), true);
  eq("Telegram : moins de 4 096 caractères avec 15 matchs", socAll.every((p) => Object.values(p).every((x) => x.telegram.length < 4096)), true);
  const socDec = new TextDecoder();
  const socFacet = (b, f) => socDec.decode(new TextEncoder().encode(b.text).slice(f.index.byteStart, f.index.byteEnd));
  eq("Bluesky : le lien et les mots-dièse tombent pile sur leur texte (positions en octets)", socBsky.every((b) => b.facets.length >= 2 && b.facets.every((f) => {
    const feat = f.features[0];
    return feat.$type.endsWith("#link") ? socFacet(b, f) === feat.uri.replace(/^https?:\/\//, "") : socFacet(b, f) === `#${feat.tag}`;
  })), true);
  const socB0 = socialPosts(socPicks, { d: SD }).es.bluesky;
  eq("Bluesky ES : langue, lien de la page du jour, #NBA et #EuroLeague", [socB0.langs, socB0.url, socB0.text.includes("#NBA #EuroLeague"), socB0.text.split("\n")[1]], [["es"], "https://basketlog-app.com/es/app/matchs", true, "🔒 Timberwolves 90 % vs Jazz"]);
  const socElOnly = blueskyPost([socPicks[3]], "fr", { d: SD });
  eq("Bluesky : soirée EuroLeague seule = lien vers la page EuroLeague, #EuroLeague seul", [socElOnly.url, socElOnly.text.includes("#NBA"), socElOnly.text.includes("#EuroLeague")], ["https://basketlog-app.com/app/euroleague", false, true]);
  const socTexts = socAll.flatMap((p) => Object.values(p).flatMap((x) => [x.telegram, x.bluesky.text]));
  eq("Publications : aucun vocabulaire de paris", socTexts.some((t) => /\b(paris|parier|pariez|mise|cotes?)\b/.test(t) || /\b(bets?|betting|odds|wager)\b/i.test(t) || /\b(apuestas?|cuotas?)\b/i.test(t)), false);
  eq("Publications : jamais le mot « IA »", socTexts.some((t) => /\bIA\b/.test(t)), false);
  eq("Fiches au format commun (NBA : nom court ou complet ; EuroLeague)", [
    nbaPick({ game: { id: 5, date: "2026-11-08T20:30:00Z", home: { short: "Bulls", name: "Chicago Bulls" }, away: { name: "Philadelphia 76ers" } }, pHome: 0.3, confidence: "Élevée" }, SD),
    elPick({ g: { id: 9, date: "2026-11-08T19:30:00Z", home: { name: "AS Monaco", short: "Monaco" }, away: { name: "Real Madrid" } }, a: { pHome: 0.42, confidence: "Moyenne" } }),
  ], [
    { league: "NBA", href: "/app/match/5?d=20261108", date: "2026-11-08T20:30:00Z", home: "Bulls", away: "Philadelphia 76ers", pHome: 0.3, conf: "Élevée" },
    { league: "EL", href: "/app/euroleague/match/9", date: "2026-11-08T19:30:00Z", home: "Monaco", away: "Real Madrid", pHome: 0.42, conf: "Moyenne" },
  ]);

  const socNone = socialConfig({});
  eq("Comptes : rien de branché sans variables, publication coupée", [socNone.enabled, socNone.telegram, socNone.bluesky], [false, null, null]);
  const cfgFull = socialConfig({ SOCIAL_ENABLED: " 1 ", TELEGRAM_BOT_TOKEN: "123:secret-telegram", TELEGRAM_CHAT_FR: "@basketlog", TELEGRAM_CHAT_ES: " @basketlog_es ", BLUESKY_HANDLE: "@basketlog.bsky.social", BLUESKY_APP_PASSWORD: "abcd-efgh-secret", BLUESKY_LANGS: "fr, de ,es" });
  eq("Comptes : chaînes par langue, nom Bluesky sans @, langues inconnues ignorées", [cfgFull.enabled, cfgFull.telegram.chats, cfgFull.bluesky.handle, cfgFull.bluesky.langs], [true, { fr: "@basketlog", es: "@basketlog_es" }, "basketlog.bsky.social", ["fr", "es"]]);
  eq("Comptes : sans code d'accès = non branché (Telegram sans code, Bluesky sans mot de passe)", [socialConfig({ TELEGRAM_CHAT_FR: "@x" }).telegram, socialConfig({ BLUESKY_HANDLE: "a" }).bluesky], [null, null]);
  eq("Comptes : noms par défaut (@basketlog en français, basketlog.bsky.social) quand seuls les codes sont donnés", [socialConfig({ TELEGRAM_BOT_TOKEN: "x" }).telegram.chats, socialConfig({ BLUESKY_APP_PASSWORD: "y" }).bluesky.handle], [{ fr: "@basketlog" }, "basketlog.bsky.social"]);
  const socPub = JSON.stringify(socialStatus(cfgFull));
  eq("Comptes : l'état public ne montre aucun code d'accès", [socPub.includes("secret"), socPub.includes("@basketlog_es"), socPub.includes("basketlog.bsky.social")], [false, true, true]);

  // --- Profil Bluesky : texte (lib/social.js) et écriture (lib/social-send.js, appels simulés)
  const bp = blueskyProfile();
  eq(`Profil Bluesky : nom (${BSKY_NAME_MAX}) et présentation (${BSKY_BIO_MAX}) dans les limites, en trois langues`, [bp.displayName, graphemes(bp.displayName) <= BSKY_NAME_MAX, graphemes(bp.description) <= BSKY_BIO_MAX, bp.description.split("\n").length], ["Basketlog", true, true, 4]);
  eq("Profil Bluesky : adresse du site avec https:// (cliquable) et logo du site", [bp.description.endsWith("https://basketlog-app.com"), bp.avatarUrl], [true, "https://basketlog-app.com/icons/icon-512.png"]);
  eq("Profil Bluesky : ni vocabulaire de paris, ni « IA »", /\b(paris|parier|mise|cotes?|bets?|betting|odds|apuestas?|cuotas?)\b/i.test(bp.description) || /\bIA\b/.test(bp.description), false);
  const realFetch = globalThis.fetch;
  const bsCalls = [];
  const bsFake = ({ existing, image = true }) => async (url, opts = {}) => {
    const u = String(url);
    bsCalls.push({ u, body: typeof opts.body === "string" ? JSON.parse(opts.body) : null, auth: opts.headers?.authorization || null });
    if (u.endsWith("/icons/icon-512.png")) return image ? new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } }) : new Response("x", { status: 404 });
    if (u.includes("/xrpc/com.atproto.repo.getRecord?")) return existing ? Response.json({ uri: "at://did:plc:t/app.bsky.actor.profile/self", cid: "bafyold", value: existing }) : Response.json({ error: "RecordNotFound", message: "Could not locate record" }, { status: 400 });
    if (u.endsWith("/xrpc/com.atproto.repo.uploadBlob")) return Response.json({ blob: { $type: "blob", ref: { $link: "bafyimg" }, mimeType: "image/png", size: 4 } });
    if (u.endsWith("/xrpc/com.atproto.repo.putRecord")) return Response.json({ uri: "at://did:plc:t/app.bsky.actor.profile/self", cid: "bafynew" });
    return Response.json({ error: "Unexpected" }, { status: 500 });
  };
  const bsSess = { did: "did:plc:t", jwt: "jwt-test", pds: "https://pds.test" };
  const bsPut = () => bsCalls.filter((c) => c.u.endsWith("putRecord")).at(-1)?.body;
  try {
    globalThis.fetch = bsFake({ existing: { $type: "app.bsky.actor.profile", displayName: "", banner: { $type: "blob", ref: { $link: "bafyban" } }, createdAt: "2026-11-08T10:00:00.000Z" } });
    const r1 = await blueskySetProfile(bsSess, bp);
    const p1 = bsPut();
    eq("Profil Bluesky : nom, présentation et logo posés, bannière et date gardées, écriture conditionnée à la version lue", [r1.avatar, r1.created, p1.repo, p1.collection, p1.rkey, p1.swapRecord, p1.record.displayName, p1.record.description === bp.description, p1.record.avatar?.ref?.$link, p1.record.banner?.ref?.$link, p1.record.createdAt], [true, false, "did:plc:t", "app.bsky.actor.profile", "self", "bafyold", "Basketlog", true, "bafyimg", "bafyban", "2026-11-08T10:00:00.000Z"]);
    eq("Profil Bluesky : écritures envoyées avec la session du compte", bsCalls.filter((c) => /uploadBlob|putRecord/.test(c.u)).every((c) => c.auth === "Bearer jwt-test"), true);
    globalThis.fetch = bsFake({ existing: null, image: false });
    const r2 = await blueskySetProfile(bsSess, bp);
    const p2 = bsPut();
    eq("Profil Bluesky : profil encore vide = créé ; logo injoignable = nom et présentation posés quand même", [r2.created, r2.avatar, !!r2.avatarError, "swapRecord" in p2, p2.record.displayName, "avatar" in p2.record, !!p2.record.createdAt], [true, false, true, false, "Basketlog", false, true]);
    globalThis.fetch = async (url) => (String(url).includes("getRecord") ? Response.json({ error: "AuthRequired", message: "Bad token" }, { status: 401 }) : Response.json({}));
    let r3 = null;
    try { await blueskySetProfile(bsSess, bp); } catch (e) { r3 = e.message; }
    eq("Profil Bluesky : refus de lecture (autre que profil absent) = rien n'est écrit, erreur sans code d'accès", [!!r3 && r3.includes("401"), !!r3 && r3.includes("jwt-test")], [true, false]);
  } finally {
    globalThis.fetch = realFetch;
  }


  // --- « Mon compte » : prénom, mot de confirmation, abonnements Whop (lib/account.js)
  console.log("Mon compte");
  eq("Prénom : un prénom simple passe", cleanName("Léa"), { ok: true, name: "Léa" });
  eq("Prénom : espaces, tabulations et retours nettoyés", cleanName("  Léa \t  Dupont \n"), { ok: true, name: "Léa Dupont" });
  eq("Prénom : vide = revenir au nom Whop", [cleanName("   "), cleanName(null), cleanName(undefined)], [{ ok: true, name: "" }, { ok: true, name: "" }, { ok: true, name: "" }]);
  eq("Prénom : un seul caractère refusé", cleanName("L"), { ok: false, reason: "court" });
  eq("Prénom : 40 caractères passent, 41 refusés", [cleanName("x".repeat(40)).ok, cleanName("x".repeat(41))], [true, { ok: false, reason: "long" }]);
  eq("Prénom : balises et adresses web refusées", ["<b>Tim</b>", "https://pirate.example", "www.pirate.fr", "voir http:x", "a://b"].map((x) => cleanName(x).reason), ["invalide", "invalide", "invalide", "invalide", "invalide"]);
  eq("Prénom : émojis et signes courants acceptés (2 émojis = 2 caractères)", [cleanName("Gonzo_picks 🏀").ok, cleanName("🏀🏀").ok, cleanName("Jean-Pierre O'Neil").ok], [true, true, true]);
  eq("Prénom : caractères invisibles supprimés, contrôles remplacés par un espace", [cleanName("Té\u200bo").name, cleanName("Lé\u0000a").name, cleanName("A\u202eB").name], ["Téo", "Lé a", "A B"]);
  eq("Suppression : le mot de confirmation est accepté dans les trois langues, sans casse ni accents", ["SUPPRIMER", "supprimer", "  Supprimer ", "DELETE", "delete", "Eliminar", "ELIMINAR"].map(deleteConfirmed), [true, true, true, true, true, true, true]);
  eq("Suppression : tout autre texte est refusé", ["", " ", null, undefined, "oui", "SUPPRIME", "supprimé", "SUPPRIMER!", "SUPPRIMER MON COMPTE", "DELET"].map(deleteConfirmed), [false, false, false, false, false, false, false, false, false, false]);

  // --- Codes promo d'un créateur (lecture de basketlog_createur_infos avant la suppression de son compte)
  eq("Codes créateur : forme normale conservée, code mis en majuscules, remise entière", creatorCodes([{ code: "gonzo", pct: 20 }, { code: " LIEN15 ", pct: "15" }, { code: "AB1", pct: 90 }]), [{ code: "GONZO", pct: 20 }, { code: "LIEN15", pct: 15 }, { code: "AB1", pct: 90 }]);
  eq("Codes créateur : un code n'apparaît qu'une fois (casse ignorée), dans l'ordre reçu", creatorCodes([{ code: "GONZO", pct: 20 }, { code: "gonzo", pct: 25 }, { code: "AUTRE", pct: 10 }]), [{ code: "GONZO", pct: 20 }, { code: "AUTRE", pct: 10 }]);
  eq("Codes créateur : forme invalide ignorée (trop court, trop long, signes, vide, pas du texte)", creatorCodes([{ code: "AB", pct: 20 }, { code: "A".repeat(25), pct: 20 }, { code: "GON-ZO", pct: 20 }, { code: "GON ZO", pct: 20 }, { code: "", pct: 20 }, { code: 123456, pct: 20 }, { code: null, pct: 20 }, { pct: 20 }]), []);
  eq("Codes créateur : 24 caractères acceptés, remise hors 1 à 90 ou non entière ignorée", creatorCodes([{ code: "A".repeat(24), pct: 1 }, { code: "ZERO", pct: 0 }, { code: "TROP", pct: 91 }, { code: "VIRGULE", pct: 12.5 }, { code: "TEXTE", pct: "beaucoup" }, { code: "NEG", pct: -5 }, { code: "VIDE" }]), [{ code: "A".repeat(24), pct: 1 }]);
  eq("Codes créateur : n'importe quoi d'autre qu'une liste donne une liste vide, sans erreur ; les champs en trop sont retirés", [creatorCodes(null), creatorCodes(undefined), creatorCodes("GONZO"), creatorCodes({ code: "GONZO", pct: 20 }), creatorCodes([null, 5, "x", []]), creatorCodes([{ code: "GONZO", pct: 20, whop_ok: true, uid: "u1" }])], [[], [], [], [], [], [{ code: "GONZO", pct: 20 }]]);
  eq("Suppression : les trois mots", DELETE_WORDS, { fr: "SUPPRIMER", en: "DELETE", es: "ELIMINAR" });

  const IDS = { lifetime: "prod_L", pro: "prod_P", starter: "prod_S" };
  const raw = (o = {}) => ({
    id: "mem_1", status: "active", cancel_at_period_end: false, current_period_end: "2099-12-08T10:00:00Z", billing_period_days: 30,
    product: { id: "prod_P", title: "Basketlog Pro" }, user_id: "user_1", renewal_price: { amount: "29.99", currency: "EUR" },
    manage_url: "https://whop.com/@me/settings/orders/mem_1", ...o,
  });
  const norm = (o) => normalizeMembership(raw(o), IDS);
  eq("Formule d'un produit Whop (Lifetime, Pro, Starter, inconnu, vide, variables absentes)", [tierOfProduct("prod_L", IDS), tierOfProduct("prod_P", IDS), tierOfProduct("prod_S", IDS), tierOfProduct("prod_X", IDS), tierOfProduct(null, IDS), tierOfProduct("prod_P", {}), tierOfProduct(undefined, { pro: undefined })], ["lifetime", "pro", "starter", null, null, null, null]);
  eq("Abonnement Whop : lecture complète", norm(), { id: "mem_1", uid: "user_1", status: "active", productId: "prod_P", title: "Basketlog Pro", tier: "pro", cancelAtPeriodEnd: false, periodEnd: "2099-12-08T10:00:00Z", periodDays: 30, renewal: { amount: 29.99, currency: "eur" }, manageUrl: "https://whop.com/@me/settings/orders/mem_1" });
  eq("Abonnement Whop : acheteur lu dans « user.id » comme dans « user_id », produit lu dans « product_id »", [norm({ user_id: undefined, user: { id: "user_2" } }).uid, norm({ product: undefined, product_id: "prod_S" }).tier], ["user_2", "starter"]);
  eq("Abonnement Whop : sans acheteur, uid vide (jamais pris pour celui d'un autre)", norm({ user_id: undefined }).uid, null);
  eq("Abonnement Whop : seuls les liens https whop.com sont gardés", ["https://evil.example/x", "javascript:alert(1)", "http://whop.com/x", "https://whop.com.evil.example/x", "https://sub.whop.com/x", 42, null].map((u) => norm({ manage_url: u }).manageUrl), [null, null, null, null, "https://sub.whop.com/x", null, null]);
  eq("Abonnement Whop : prix absent ou invalide = pas de prix, fiche sans identifiant = rejetée", [norm({ renewal_price: null }).renewal, norm({ renewal_price: { amount: "abc" } }).renewal, normalizeMembership({}, IDS), normalizeMembership(null, IDS)], [null, null, null, null]);
  eq("Abonnement Whop : date de fin prise sur expires_at à défaut de la période", norm({ current_period_end: null, expires_at: "2099-01-01T00:00:00Z" }).periodEnd, "2099-01-01T00:00:00Z");
  eq("Abonnement Whop : ancien nom de la fin de période (renewal_period_end) lu aussi, current_period_end prioritaire", [norm({ current_period_end: undefined, renewal_period_end: "2099-06-01T00:00:00Z" }).periodEnd, norm({ renewal_period_end: "2099-06-01T00:00:00Z" }).periodEnd], ["2099-06-01T00:00:00Z", "2099-12-08T10:00:00Z"]);
  eq("Abonnement Whop : prix en nombre seul + devise de la fiche, ou objet avec sa propre devise", [norm({ renewal_price: 13.99, currency: "EUR" }).renewal, norm({ renewal_price: "13.99", currency: "usd" }).renewal, norm({ renewal_price: { amount: 5, currency: "USD" }, currency: "eur" }).renewal, norm({ renewal_price: 13.99 }).renewal, norm({ renewal_price: -1 }).renewal, norm({ renewal_price: "" }).renewal], [{ amount: 13.99, currency: "eur" }, { amount: 13.99, currency: "usd" }, { amount: 5, currency: "usd" }, { amount: 13.99, currency: null }, null, null]);

  const NOW = Date.parse("2026-11-08T12:00:00Z");
  const st = (o) => planOf(norm(o), NOW);
  eq("État : abonnement actif = se renouvelle, résiliable", [st({}).state, st({}).canCancel, st({}).canResume], ["renews", true, false]);
  eq("État : période d'essai = se renouvelle", st({ status: "trialing" }).state, "renews");
  eq("État : paiement refusé = à régler, toujours résiliable", [st({ status: "past_due" }).state, st({ status: "past_due" }).canCancel], ["past_due", true]);
  eq("État : résilié en fin de période = actif jusqu'à la date, reprise possible", [st({ cancel_at_period_end: true }).state, st({ cancel_at_period_end: true }).canCancel, st({ cancel_at_period_end: true }).canResume], ["ends", false, true]);
  eq("État : anciens noms « canceling » / « expiring »", [st({ status: "canceling", cancel_at_period_end: true }).canResume, st({ status: "expiring" }).state, st({ status: "expiring" }).canResume], [true, "ends", false]);
  eq("État : annulé mais encore dans la période payée = actif jusqu'à la date, sans reprise", [st({ status: "canceled" }).state, st({ status: "canceled" }).canResume], ["ends", false]);
  eq("État : annulé ou expiré et terminé = rien à afficher", [st({ status: "canceled", current_period_end: "2026-10-01T00:00:00Z" }), st({ status: "expired" }), st({ status: "unresolved" })], [null, null, null]);
  eq("État : produit d'un autre vendeur ou compte gratuit = rien à afficher", st({ product: { id: "prod_FREE" } }), null);
  eq("État : Lifetime = à vie, jamais résiliable", [st({ product: { id: "prod_L" } }).state, st({ product: { id: "prod_L" } }).canCancel, st({ product: { id: "prod_L" }, status: "completed" }).state, st({ product: { id: "prod_L" }, status: "expired" })], ["lifetime", false, "lifetime", null]);
  eq("État : Starter payé en une fois = payé, sans action", [st({ product: { id: "prod_S" }, status: "completed" }).state, st({ product: { id: "prod_S" }, status: "completed" }).canCancel], ["paid", false]);

  const one = (id, tier, o = {}) => norm({ id, product: { id: IDS[tier], title: tier }, ...o });
  const names = (list) => list.map((p) => `${p.tier}:${p.state}${p.included ? `>${p.included}` : ""}${p.duplicate ? "x2" : ""}`);
  eq("Plans : Lifetime d'abord, puis actifs par formule, puis résiliés ; Starter et Pro déjà compris dans Lifetime signalés",
    names(buildPlans([one("a", "starter"), one("b", "pro", { cancel_at_period_end: true }), one("c", "lifetime"), one("d", "pro")], NOW)),
    ["lifetime:lifetime", "pro:renews>lifetime", "starter:renews>lifetime", "pro:ends"]);
  eq("Plans : Starter compris dans un Pro actif", names(buildPlans([one("a", "starter"), one("b", "pro")], NOW)), ["pro:renews", "starter:renews>pro"]);
  eq("Plans : un Pro qui s'arrête ou dont le paiement échoue ne « comprend » pas le Starter", [
    names(buildPlans([one("a", "starter"), one("b", "pro", { cancel_at_period_end: true })], NOW)),
    names(buildPlans([one("a", "starter"), one("b", "pro", { status: "past_due" })], NOW)),
  ], [["starter:renews", "pro:ends"], ["pro:past_due", "starter:renews"]]);
  eq("Plans : deux abonnements de la même formule = doublon signalé sur les deux", names(buildPlans([one("a", "pro"), one("b", "pro")], NOW)), ["pro:renewsx2", "pro:renewsx2"]);
  eq("Plans : un abonnement qui s'arrête n'est pas un doublon", names(buildPlans([one("a", "pro"), one("b", "pro", { cancel_at_period_end: true })], NOW)), ["pro:renews", "pro:ends"]);
  eq("Plans : liste vide ou sans formule Basketlog", [buildPlans([], NOW), buildPlans([norm({ product: { id: "prod_FREE" } })], NOW), buildPlans(null, NOW)], [[], [], []]);
  // Un abonnement résilié mais encore valable, déjà compris dans une formule supérieure active (cas de l'ancien Starter juste après
  // le passage à Pro) est signalé « covered » : l'écran déconseille de le reprendre (double paiement).
  const cov = (list) => buildPlans(list, NOW).map((p) => `${p.tier}:${p.state}${p.covered ? `~${p.covered}` : ""}`);
  eq("Plans : Starter résilié + Pro actif = Starter signalé comme déjà compris dans Pro", cov([one("a", "starter", { cancel_at_period_end: true }), one("b", "pro")]), ["pro:renews", "starter:ends~pro"]);
  eq("Plans : Starter ou Pro résilié + Lifetime actif = signalé comme déjà compris dans Lifetime", cov([one("a", "starter", { cancel_at_period_end: true }), one("b", "pro", { cancel_at_period_end: true }), one("c", "lifetime")]), ["lifetime:lifetime", "pro:ends~lifetime", "starter:ends~lifetime"]);
  eq("Plans : Pro résilié + Starter actif = rien à signaler (le Starter ne comprend pas le Pro)", cov([one("a", "pro", { cancel_at_period_end: true }), one("b", "starter")]), ["starter:renews", "pro:ends"]);
  eq("Plans : tout est résilié, ou la formule supérieure a un paiement refusé = rien à signaler", [
    cov([one("a", "starter", { cancel_at_period_end: true }), one("b", "pro", { cancel_at_period_end: true })]),
    cov([one("a", "starter", { cancel_at_period_end: true }), one("b", "pro", { status: "past_due" })]),
  ], [["pro:ends", "starter:ends"], ["pro:past_due", "starter:ends"]]);
  eq("Plans : un abonnement annulé sans reprise possible n'est pas signalé ; la clé n'existe que s'il y a lieu", [
    cov([one("a", "starter", { status: "canceled" }), one("b", "pro")]),
    "covered" in buildPlans([one("a", "starter")], NOW)[0],
    "covered" in buildPlans([one("a", "starter", { cancel_at_period_end: true })], NOW)[0],
  ], [["pro:renews", "starter:ends"], false, false]);
  eq("Suppression du compte : seuls les abonnements qui se renouvelleraient sont à arrêter", renewing([one("a", "starter"), one("b", "pro", { cancel_at_period_end: true }), one("c", "lifetime"), one("d", "pro", { status: "past_due" }), one("e", "pro", { status: "expired" })], NOW).map((m) => m.id), ["a", "d"]);


  // --- Changement de formule en un clic : quelles formules proposer, et quand l'ancien abonnement peut être arrêté
  console.log("Changement de formule");
  const targets = (list, id) => { const plans = buildPlans(list, NOW); return switchTargets(plans.find((p) => p.id === id), plans); };
  eq("Changement : depuis Starter on propose Pro puis Lifetime", targets([one("a", "starter")], "a"), ["pro", "lifetime"]);
  eq("Changement : depuis Pro on ne propose que Lifetime", targets([one("a", "pro")], "a"), ["lifetime"]);
  eq("Changement : rien depuis un Lifetime ni depuis un paiement unique", [targets([one("a", "lifetime")], "a"), targets([one("a", "starter", { status: "completed" })], "a")], [[], []]);
  eq("Changement : rien depuis un abonnement déjà résilié, ni dont le paiement a échoué", [targets([one("a", "starter", { cancel_at_period_end: true })], "a"), targets([one("a", "starter", { status: "past_due" })], "a")], [[], []]);
  eq("Changement : une formule que le compte a déjà n'est pas reproposée, même résiliée mais encore active (on la reprend)", [
    targets([one("a", "starter"), one("b", "pro", { cancel_at_period_end: true })], "a"),
    targets([one("a", "starter"), one("b", "lifetime", { status: "completed" })], "a"),
  ], [["lifetime"], []]);
  eq("Changement : rien depuis un abonnement déjà compris dans une formule supérieure active (il suffit de le résilier)", [targets([one("a", "starter"), one("b", "pro")], "a"), targets([one("a", "pro"), one("b", "lifetime")], "a")], [[], []]);
  eq("Changement : rien depuis un doublon (on résilie d'abord l'un des deux)", targets([one("a", "pro"), one("b", "pro")], "a"), []);
  eq("Changement : on ne redescend jamais en un clic (Pro vers Starter n'est jamais proposé)", SWITCH_TARGETS.includes("starter"), false);
  eq("Changement : plan absent ou liste absente = rien", [switchTargets(null, []), switchTargets(undefined, undefined)], [[], []]);

  const step = (list, from) => { const r = switchStep(buildPlans(list, NOW), from); return `${r.step}${r.better ? `>${r.better.tier}` : ""}`; };
  eq("Suite : l'ancien se renouvelle et rien ne le remplace encore = on attend le paiement", step([one("a", "starter")], "a"), "pending");
  eq("Suite : la nouvelle formule (Pro, Lifetime) est active = l'ancien est à arrêter", [step([one("a", "starter"), one("b", "pro")], "a"), step([one("a", "starter"), one("c", "lifetime")], "a"), step([one("a", "pro"), one("c", "lifetime", { status: "completed" })], "a")], ["cancel>pro", "cancel>lifetime", "cancel>lifetime"]);
  eq("Suite : la meilleure formule active est retenue", step([one("a", "starter"), one("b", "pro"), one("c", "lifetime")], "a"), "cancel>lifetime");
  eq("Suite : la nouvelle formule payée une fois (état « payé ») compte aussi", step([one("a", "starter"), one("b", "pro", { status: "completed" })], "a"), "cancel>pro");
  eq("Suite : une nouvelle formule dont le paiement échoue, ou déjà résiliée, ne remplace rien : on attend", [step([one("a", "starter"), one("b", "pro", { status: "past_due" })], "a"), step([one("a", "starter"), one("b", "pro", { cancel_at_period_end: true })], "a")], ["pending", "pending"]);
  eq("Suite : une formule de rang égal ou inférieur ne remplace pas l'ancien", [step([one("a", "pro"), one("b", "starter")], "a"), step([one("a", "pro"), one("b", "pro", { cancel_at_period_end: true })], "a")], ["pending", "pending"]);
  eq("Suite : l'ancien déjà résilié et la nouvelle en place = rien à faire", step([one("a", "starter", { cancel_at_period_end: true }), one("b", "pro")], "a"), "already>pro");
  eq("Suite : l'ancien déjà résilié sans remplaçant, ou disparu, ou inconnu = le changement n'a plus d'objet", [step([one("a", "starter", { cancel_at_period_end: true })], "a"), step([one("b", "pro")], "a"), step([], "a"), switchStep(null, "a").step, step([one("a", "starter")], undefined)], ["moot", "moot", "moot", "moot", "moot"]);
  eq("Suite : un abonnement qui ne se résilie pas (Lifetime, paiement unique) n'est jamais arrêté", [step([one("a", "lifetime"), one("b", "pro")], "a"), step([one("a", "starter", { status: "completed" }), one("b", "pro")], "a")], ["moot", "moot>pro"]);
  eq("Suite : un paiement refusé sur l'ancien est arrêté aussi quand la nouvelle formule est en place", step([one("a", "starter", { status: "past_due" }), one("b", "pro")], "a"), "cancel>pro");

  const KEY = "clé-de-test";
  const T0 = Date.parse("2026-11-08T12:00:00Z");
  const tok = makeIntent(KEY, { uid: "user_1", from: "mem_1", tier: "pro" }, T0);
  eq("Jeton : valable pour son compte, avec l'abonnement et la formule visée", readIntent(KEY, tok, "user_1", T0 + 60e3), { from: "mem_1", tier: "pro", at: T0 });
  eq("Jeton : refusé pour un autre compte, sans compte, ou avec une autre clé", [readIntent(KEY, tok, "user_2", T0), readIntent(KEY, tok, "", T0), readIntent(KEY, tok, null, T0), readIntent("autre-clé", tok, "user_1", T0)], [null, null, null, null]);
  eq("Jeton : valable jusqu'à 12 h pile, refusé ensuite", [readIntent(KEY, tok, "user_1", T0 + SWITCH_TTL_MS)?.tier, readIntent(KEY, tok, "user_1", T0 + SWITCH_TTL_MS + 1)], ["pro", null]);
  eq("Jeton : daté du futur (plus d'une minute) refusé, une minute d'écart d'horloge tolérée", [readIntent(KEY, tok, "user_1", T0 - 61e3), readIntent(KEY, tok, "user_1", T0 - 60e3)?.tier], [null, "pro"]);
  const [data, sig] = tok.split(".");
  const forged = Buffer.from(JSON.stringify({ u: "user_1", f: "mem_VICTIME", t: "pro", at: T0 })).toString("base64url");
  eq("Jeton : contenu modifié, signature tronquée, vide ou mal formé = refusé", [readIntent(KEY, `${forged}.${sig}`, "user_1", T0), readIntent(KEY, `${data}.${sig.slice(0, -2)}`, "user_1", T0), readIntent(KEY, `${data}.`, "user_1", T0), readIntent(KEY, `.${sig}`, "user_1", T0), readIntent(KEY, `${data}.${sig}.x`, "user_1", T0), readIntent(KEY, data, "user_1", T0), readIntent(KEY, "", "user_1", T0), readIntent(KEY, null, "user_1", T0), readIntent(KEY, 42, "user_1", T0), readIntent(KEY, `${data}.${sig}`.padEnd(2000, "x"), "user_1", T0)], [null, null, null, null, null, null, null, null, null, null]);
  eq("Jeton : une session (même clé, même forme, autre usage) ne passe jamais pour une intention, ni l'inverse", [
    readIntent(KEY, signToken(KEY, "session", { u: "user_1", f: "mem_1", t: "pro", at: T0 }), "user_1", T0),
    readToken(KEY, "session", tok),
    readToken(KEY, "switch", signToken(KEY, "session", { u: "user_1" })),
  ], [null, null, null]);
  eq("Jeton : formule visée ou abonnement invalide à la lecture = refusé (même bien signé)", [
    readIntent(KEY, signToken(KEY, "switch", { u: "user_1", f: "mem_1", t: "starter", at: T0 }), "user_1", T0),
    readIntent(KEY, signToken(KEY, "switch", { u: "user_1", f: "mem_1", t: "gratuit", at: T0 }), "user_1", T0),
    readIntent(KEY, signToken(KEY, "switch", { u: "user_1", f: "../x", t: "pro", at: T0 }), "user_1", T0),
    readIntent(KEY, signToken(KEY, "switch", { u: "user_1", f: 12345, t: "pro", at: T0 }), "user_1", T0),
    readIntent(KEY, signToken(KEY, "switch", { u: "user_1", f: "mem_1", t: "pro", at: "hier" }), "user_1", T0),
    readIntent(KEY, signToken(KEY, "switch", ["user_1"]), "user_1", T0),
    readIntent(KEY, signToken(KEY, "switch", null), "user_1", T0),
  ], [null, null, null, null, null, null, null]);
  eq("Jeton : fabrication refusée pour une formule, un abonnement ou un compte invalide ; Lifetime accepté", [
    makeIntent(KEY, { uid: "user_1", from: "mem_1", tier: "starter" }, T0), makeIntent(KEY, { uid: "user_1", from: "mem 1", tier: "pro" }, T0), makeIntent(KEY, { uid: "user_1", from: "", tier: "pro" }, T0),
    makeIntent(KEY, { uid: "", from: "mem_1", tier: "pro" }, T0), makeIntent(KEY, { uid: "user_1", from: 7, tier: "pro" }, T0), makeIntent("", { uid: "user_1", from: "mem_1", tier: "pro" }, T0),
    typeof makeIntent(KEY, { uid: "user_1", from: "mem_1", tier: "lifetime" }, T0),
  ], [null, null, null, null, null, null, "string"]);
  eq("Jeton : sans clé de signature, rien ne se signe ni ne se lit", [signToken("", "switch", {}), readToken("", "switch", tok)], [null, null]);
  eq("Jeton : cookie nommé bl_switch, 12 h", [SWITCH_COOKIE, SWITCH_TTL_MS], ["bl_switch", 43200000]);


  {
  // ---------- Comptes Basketlog (e-mail ou Google) ----------
  console.log("Comptes Basketlog");
  eq("Mot de passe : 6 caractères minimum, comme Visifoot", [MIN_PASSWORD, passwordProblem("abcde"), passwordProblem("abcdef"), passwordProblem(""), passwordProblem(null), passwordProblem("x".repeat(201))], [6, "court", null, "court", "court", "long"]);
  const h1 = await hashPassword("Basket2026!");
  eq("Mot de passe : empreinte scrypt, jamais le mot de passe", [/^s1\$32768\$8\$1\$[A-Za-z0-9_-]{22}\$[A-Za-z0-9_-]{43}$/.test(h1), h1.includes("Basket2026")], [true, false]);
  eq("Mot de passe : deux empreintes du même mot de passe diffèrent (sel)", (await hashPassword("Basket2026!")) !== h1, true);
  eq("Mot de passe : bon / mauvais / vide", [await verifyPassword("Basket2026!", h1), await verifyPassword("basket2026!", h1), await verifyPassword("", h1)], [true, false, false]);
  const accent = await hashPassword("café-pass");
  eq("Mot de passe : « é » composé ou décomposé = même mot de passe", await verifyPassword("café-pass", accent), true);
  const hParts = h1.split("$");
  eq("Mot de passe : empreinte abîmée ou réglages exagérés refusés sans calcul", [
    await verifyPassword("Basket2026!", hParts.slice(0, 5).join("$")),
    await verifyPassword("Basket2026!", ["s1", "1048576", "8", "1", hParts[4], hParts[5]].join("$")),
    await verifyPassword("Basket2026!", ["s2", ...hParts.slice(1)].join("$")),
    await verifyPassword("Basket2026!", null),
    await verifyPassword("Basket2026!", `${h1.slice(0, -2)}AA`),
  ], [false, false, false, false, false]);
  eq("Mot de passe : faux calcul pour un compte inconnu", await fakeVerify("n'importe quoi"), false);

  eq("E-mail : normalisé comme dans la base", [normEmail("  Tim@Exemple.FR "), normEmail("pas-une-adresse"), normEmail("a b@c.fr"), normEmail("a@b"), normEmail(42), normEmail(`${"x".repeat(250)}@a.fr`)], ["tim@exemple.fr", null, null, null, null, null]);
  const acctId = "3f2a1c9e-8b7d-4e6f-9a1b-2c3d4e5f6a7b";
  eq("Identifiant de compte : « bl_ » + id, rien d'autre", [accountUid(acctId), accountIdOf(`bl_${acctId}`), accountIdOf("user_abc"), accountIdOf("bl_pas-un-uuid"), accountIdOf(`bl_${acctId}x`), accountIdOf(null)], [`bl_${acctId}`, acctId, null, null, null, null]);
  eq("Session de compte e-mail : reconnue, compte Whop relié", [
    isAccountSession({ uid: `bl_${acctId}`, acct: 1 }), isAccountSession({ uid: `bl_${acctId}` }), isAccountSession({ uid: "user_abc", acct: 1 }), isAccountSession(null),
    whopUidOf({ uid: `bl_${acctId}`, acct: 1, whop: "user_x" }), whopUidOf({ uid: `bl_${acctId}`, acct: 1 }), whopUidOf({ uid: "user_abc" }), whopUidOf(null),
  ], [true, false, false, false, "user_x", null, "user_abc", null]);
  eq("Nom par défaut : début de l'adresse, nettoyé", [localName("tim.dupont@gmail.com"), localName("<b>x</b>@a.fr"), localName(""), localName(`${"a".repeat(60)}@a.fr`).length], ["tim.dupont", "bx/b", "Membre", 40]);
  eq("Adresse masquée", [maskEmail("tim@gmail.com"), maskEmail("t@x.fr"), maskEmail("pas-une-adresse")], ["t••@gmail.com", "t•@x.fr", ""]);
  const rtok = newResetToken();
  eq("Lien « mot de passe oublié » : jeton de 43 caractères, empreinte sha256", [RESET_TOKEN_RE.test(rtok), /^[0-9a-f]{64}$/.test(tokenHash(rtok)), tokenHash(rtok) === tokenHash(rtok), newResetToken() !== rtok, RESET_TOKEN_RE.test("court"), RESET_TOKEN_RE.test(`${rtok}=`)], [true, true, true, true, false, false]);
  eq("Limite d'essais : clé stable, sans l'adresse en clair, différente selon la clé du serveur", [
    limitKey("connexion", "tim@exemple.fr", "k1") === limitKey("connexion", "tim@exemple.fr", "k1"),
    limitKey("connexion", "tim@exemple.fr", "k1").includes("tim"),
    limitKey("connexion", "tim@exemple.fr", "k1") === limitKey("connexion", "tim@exemple.fr", "k2"),
    limitKey("connexion", "tim@exemple.fr", "k1").length <= 120,
  ], [true, false, false, true]);
  const H = (o) => new Headers(o);
  eq("Requêtes d'écriture : seulement depuis le site lui-même", [
    sameOrigin(H({ host: "basketlog-app.com", origin: "https://basketlog-app.com" })),
    sameOrigin(H({ host: "basketlog-app.com", origin: "https://pirate.com" })),
    sameOrigin(H({ host: "basketlog-app.com", "sec-fetch-site": "cross-site" })),
    sameOrigin(H({ host: "basketlog-app.com" })),
    sameOrigin(H({ host: "basketlog-app.com", origin: "pas une adresse" })),
  ], [true, false, false, true, false]);
  eq("Adresse IP du visiteur (première de x-forwarded-for)", [clientIp(H({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })), clientIp(H({ "x-real-ip": "5.6.7.8" })), clientIp(H({}))], ["1.2.3.4", "5.6.7.8", "inconnue"]);
  eq("Navigateur d'Instagram / TikTok repéré (Google y refuse la connexion)", [
    inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0"),
    inAppBrowser("Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/119.0 Mobile Safari/537.36 trill_310 musical_ly_2023"),
    inAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"),
    inAppBrowser("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"),
  ], [true, true, false, false]);

  // Google : page « Choisis un compte » et jeton d'identité reçu de Google
  const gu = new URL(googleAuthUrl({ redirectUri: "https://basketlog-app.com/api/auth/google/retour", state: "st", challenge: "ch", nonce: "no", lang: "es", clientId: "cid.apps.googleusercontent.com" }));
  eq("Google : demande OAuth avec PKCE, compte au choix, langue", [gu.origin + gu.pathname, gu.searchParams.get("client_id"), gu.searchParams.get("scope"), gu.searchParams.get("code_challenge_method"), gu.searchParams.get("prompt"), gu.searchParams.get("hl"), gu.searchParams.get("response_type")], ["https://accounts.google.com/o/oauth2/v2/auth", "cid.apps.googleusercontent.com", "openid email profile", "S256", "select_account", "es", "code"]);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const jwt = (p) => `${b64({ alg: "RS256" })}.${b64(p)}.signature`;
  const NOW = Date.UTC(2026, 10, 9, 20);
  const gBase = { iss: "https://accounts.google.com", aud: "cid", sub: "1234567890", email: "Lea@Gmail.com", email_verified: true, given_name: "Léa", exp: NOW / 1000 + 3600, nonce: "n1" };
  eq("Google : identité lue (adresse en minuscules, prénom)", readIdToken(jwt(gBase), { clientId: "cid", nonce: "n1", now: NOW }), { sub: "1234567890", email: "lea@gmail.com", verified: true, name: "Léa" });
  eq("Google : « email_verified » en texte accepté, sans prénom", readIdToken(jwt({ ...gBase, email_verified: "true", given_name: undefined, iss: "accounts.google.com" }), { clientId: "cid", now: NOW }), { sub: "1234567890", email: "lea@gmail.com", verified: true, name: null });
  const kindOf = (fn) => { try { fn(); return "ok"; } catch (e) { return e instanceof GoogleAuthError ? e.kind : "autre"; } };
  eq("Google : jeton refusé (autre site, émetteur, expiré, nonce, sans e-mail, mal formé)", [
    kindOf(() => readIdToken(jwt({ ...gBase, aud: "autre" }), { clientId: "cid", now: NOW })),
    kindOf(() => readIdToken(jwt({ ...gBase, iss: "https://pirate.com" }), { clientId: "cid", now: NOW })),
    kindOf(() => readIdToken(jwt({ ...gBase, exp: NOW / 1000 - 3600 }), { clientId: "cid", now: NOW })),
    kindOf(() => readIdToken(jwt(gBase), { clientId: "cid", nonce: "autre", now: NOW })),
    kindOf(() => readIdToken(jwt({ ...gBase, email: undefined }), { clientId: "cid", now: NOW })),
    kindOf(() => readIdToken("pas.un-jeton", { clientId: "cid", now: NOW })),
    kindOf(() => readIdToken(jwt(gBase), { clientId: "", now: NOW })),
  ], ["audience", "invalid", "invalid", "invalid", "invalid", "invalid", "audience"]);
  const saved = { id: process.env.GOOGLE_CLIENT_ID, secret: process.env.GOOGLE_CLIENT_SECRET };
  process.env.GOOGLE_CLIENT_ID = "cid"; process.env.GOOGLE_CLIENT_SECRET = "secret";
  let sentBody = null;
  const tokenOk = async (u, init) => { sentBody = new URLSearchParams(init.body); return new Response(JSON.stringify({ id_token: "a.b.c", access_token: "x" }), { status: 200 }); };
  eq("Google : code échangé contre le jeton d'identité (avec PKCE et le secret du site)", await exchangeCode({ code: "4/0AbCdEfGhIjK", verifier: "v".repeat(43), redirectUri: "https://basketlog-app.com/api/auth/google/retour" }, { fetchImpl: tokenOk }), "a.b.c");
  eq("Google : échange envoyé avec les bons champs", [sentBody.get("grant_type"), sentBody.get("client_id"), sentBody.get("client_secret"), sentBody.get("code_verifier").length], ["authorization_code", "cid", "secret", 43]);
  const gKind = async (f, code = "4/0AbCdEfGhIjK") => { try { await exchangeCode({ code, verifier: "v", redirectUri: "r" }, { fetchImpl: f }); return "ok"; } catch (e) { return e instanceof GoogleAuthError ? e.kind : "autre"; } };
  eq("Google : code refusé, Google en panne ou injoignable, code absent", [
    await gKind(async () => new Response("{}", { status: 400 })),
    await gKind(async () => new Response("{}", { status: 503 })),
    await gKind(async () => { throw new Error("réseau"); }),
    await gKind(async () => new Response(JSON.stringify({ access_token: "x" }), { status: 200 })),
    await gKind(tokenOk, ""),
  ], ["invalid", "down", "down", "invalid", "invalid"]);
  process.env.GOOGLE_CLIENT_SECRET = "";
  eq("Google : sans secret réglé, rien n'est tenté", await gKind(tokenOk), "config");
  process.env.GOOGLE_CLIENT_ID = saved.id || ""; process.env.GOOGLE_CLIENT_SECRET = saved.secret || "";

  // E-mail « mot de passe oublié »
  const mFr = resetEmail({ lang: "fr", link: "https://basketlog-app.com/reinitialiser#abc", name: "Tim" });
  const mEn = resetEmail({ lang: "en", link: "https://basketlog-app.com/en/reinitialiser#abc" });
  const mEs = resetEmail({ lang: "es", link: "https://basketlog-app.com/es/reinitialiser#abc", name: "Léa" });
  eq("E-mail : objet dans la langue du compte", [mFr.subject.startsWith("Ton lien"), mEn.subject.startsWith("Your link"), mEs.subject.startsWith("Tu enlace")], [true, true, true]);
  eq("E-mail : lien présent (texte et HTML), durée annoncée", [mFr.text.includes("#abc") && mFr.html.includes("#abc"), mFr.text.includes("60 minutes"), mEn.html.includes("Hi,"), mEs.html.includes("Hola, Léa:")], [true, true, true, true]);
  const xss = resetEmail({ lang: "fr", link: "https://basketlog-app.com/reinitialiser#a", name: "<script>alert(1)</script>" });
  eq("E-mail : prénom échappé dans le HTML", [xss.html.includes("<script>"), xss.html.includes("&lt;script&gt;")], [false, true]);
  const savedMail = { k: process.env.RESEND_API_KEY, f: process.env.MAIL_FROM };
  process.env.RESEND_API_KEY = ""; process.env.MAIL_FROM = "";
  eq("E-mail : sans réglages, envoi désactivé", mailReady(), false);
  process.env.RESEND_API_KEY = "re_test"; process.env.MAIL_FROM = "Basketlog <compte@basketlog-app.com>";
  let mailReq = null;
  await sendMail({ to: "lea@gmail.com", ...mFr }, async (u, init) => { mailReq = { u, init: { ...init, body: JSON.parse(init.body) } }; return new Response(JSON.stringify({ id: "1" }), { status: 200 }); });
  eq("E-mail : envoyé à Resend (destinataire, expéditeur, réponse vers le contact)", [mailReq.u, mailReq.init.headers.Authorization, mailReq.init.body.to, mailReq.init.body.from, mailReq.init.body.reply_to], ["https://api.resend.com/emails", "Bearer re_test", ["lea@gmail.com"], "Basketlog <compte@basketlog-app.com>", "contact@basketlog-app.com"]);
  let mailErr = null;
  try { await sendMail({ to: "x@y.fr", ...mFr }, async () => new Response("{}", { status: 422 })); } catch (e) { mailErr = e.message; }
  eq("E-mail : refus de Resend signalé", mailErr, "Resend 422");
  process.env.RESEND_API_KEY = savedMail.k || ""; process.env.MAIL_FROM = savedMail.f || "";
  }

  {
    // Newsletter et comptes Basketlog : l'adresse vient du compte (session signée ou fiche de la base), jamais de Whop.
    const { sessionEmail } = await import("../lib/session-email.js");
    const id = "8a5f0c1e-1111-4222-8333-944455556666";
    const bl = { uid: `bl_${id}`, acct: 1, email: "Tim@Exemple.fr", v: 2 };
    const noWhop = async () => { throw new Error("Whop ne doit pas être appelé pour un compte Basketlog"); };
    eq("Newsletter : compte Basketlog, adresse du compte, pas encore prouvée", await sessionEmail(bl, { lookup: noWhop, fiche: async (x) => (x === id ? { email: "tim@exemple.fr", email_ok: false } : null) }), { email: "tim@exemple.fr", account: true, proven: false });
    eq("Newsletter : compte Basketlog prouvé (Google ou lien reçu par e-mail)", (await sessionEmail(bl, { lookup: noWhop, fiche: async () => ({ email: "tim@exemple.fr", email_ok: true }) })).proven, true);
    eq("Newsletter : sans fiche, l'adresse de la session signée (jamais prouvée par défaut)", await sessionEmail(bl, { lookup: noWhop }), { email: "tim@exemple.fr", account: true, proven: false });
    let kind = null;
    try { await sessionEmail(bl, { lookup: noWhop, fiche: async () => null }); } catch (e) { kind = e.kind; }
    eq("Newsletter : compte supprimé entre-temps, aucune adresse", kind, "noemail");
    eq("Newsletter : compte Whop, adresse lue chez Whop", await sessionEmail({ uid: "user_abc" }, { lookup: async (u) => `${u}@whop.test` }), { email: "user_abc@whop.test", account: false, proven: true });
  }

  await newsletterTests({ ok, ko, eq });

  return { passed, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { passed, failed } = await unit();
  console.log(`\n${passed} réussis, ${failed} en échec`);
  process.exit(failed ? 1 : 0);
}
