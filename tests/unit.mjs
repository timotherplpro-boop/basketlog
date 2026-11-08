// Tests sans serveur : détection de la langue des avis, découpage et traduction automatique (appels simulés),
// codes promo des créateurs (nettoyage, lien de paiement, prix remisé) et vérification de ce que Whop a enregistré.
// Usage : node tests/unit.mjs  (lancé aussi par tests/smoke.mjs)
import { pathToFileURL } from "node:url";
import { chunkText, detectLang, localizeReviews, translateRaw } from "../lib/translate.js";
import { accountLabel, creatorNames } from "../lib/accounts.js";
import { CODE_RE, cleanCode, cleanPct, discounted, mergePromos, randomChars, suggestCode, withPromo } from "../lib/promo.js";
import { asPct, checkPromo, describeProblem, describeProblems, promoMonths, whopPromoReady } from "../lib/whop-promo.js";

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

  return { passed, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { passed, failed } = await unit();
  console.log(`\n${passed} réussis, ${failed} en échec`);
  process.exit(failed ? 1 : 0);
}
