// Tests sans serveur : détection de la langue des avis, découpage et traduction automatique (appels simulés),
// codes promo des créateurs (nettoyage, lien de paiement, prix remisé) et vérification de ce que Whop a enregistré.
// Usage : node tests/unit.mjs  (lancé aussi par tests/smoke.mjs)
import { pathToFileURL } from "node:url";
import { chunkText, detectLang, localizeReviews, translateRaw } from "../lib/translate.js";
import { accountLabel, creatorNames } from "../lib/accounts.js";
import { DELETE_WORDS, buildPlans, cleanName, deleteConfirmed, normalizeMembership, planOf, renewing, tierOfProduct } from "../lib/account.js";
import { CODE_RE, cleanCode, cleanPct, discounted, mergePromos, randomChars, suggestCode, withPromo } from "../lib/promo.js";
import { asPct, checkPromo, describeProblem, describeProblems, promoMonths, whopPromoReady } from "../lib/whop-promo.js";
import { BSKY_MAX, blueskyPost, elPick, graphemes, nbaPick, socialPosts, telegramText } from "../lib/social.js";
import { socialConfig, socialStatus } from "../lib/social-send.js";

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
  eq("Suppression du compte : seuls les abonnements qui se renouvelleraient sont à arrêter", renewing([one("a", "starter"), one("b", "pro", { cancel_at_period_end: true }), one("c", "lifetime"), one("d", "pro", { status: "past_due" }), one("e", "pro", { status: "expired" })], NOW).map((m) => m.id), ["a", "d"]);

  return { passed, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { passed, failed } = await unit();
  console.log(`\n${passed} réussis, ${failed} en échec`);
  process.exit(failed ? 1 : 0);
}
