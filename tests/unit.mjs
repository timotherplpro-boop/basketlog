// Tests sans serveur : détection de la langue des avis, découpage et traduction automatique (appels simulés).
// Usage : node tests/unit.mjs  (lancé aussi par tests/smoke.mjs)
import { pathToFileURL } from "node:url";
import { chunkText, detectLang, localizeReviews, translateRaw } from "../lib/translate.js";
import { CODE_RE, cleanCode, cleanPct, mergePromos, randomChars, suggestCode } from "../lib/promo.js";

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

  return { passed, failed };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { passed, failed } = await unit();
  console.log(`\n${passed} réussis, ${failed} en échec`);
  process.exit(failed ? 1 : 0);
}
