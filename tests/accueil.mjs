// Tests (sans serveur ni réseau) de ce qui vient de l'analyse vidéo d'un SaaS : questions d'accueil après l'inscription,
// question « comment as-tu connu Basketlog ? » après le paiement, offre de dernière chance (éteinte par défaut, vérifiée chez
// Whop avant d'être montrée). Appelé par tests/unit.mjs.
import { WhopPromoError } from "../lib/whop-promo.js";
import { liveOffer, offerConfig, resetOfferMemo, resolveOffer } from "../lib/exit-offer.js";
import { EXIT_GAP, EXIT_KEY, exitAllowed, exitMark, offerLine, proUrlWithCode } from "../lib/exit-offer-ui.js";
import {
  LEAGUES, LEAGUE_IDS, SOURCE_CHOICES, SOURCE_IDS, cleanCreator, cleanProfile, isAnalysisPath, labelOf, markSourceAsked,
  onboardingDone, onboardingTarget, readProfile, saveProfile, sourceAsked,
} from "../lib/onboarding.js";
import { localStore } from "../lib/safe-store.js";

// Stockage de navigateur simulé (getItem, setItem) ; `broken` : tout accès échoue (navigation privée stricte).
const fakeStore = (broken = false) => {
  const m = new Map();
  return {
    getItem: (k) => { if (broken) throw new Error("refusé"); return m.has(k) ? m.get(k) : null; },
    setItem: (k, v) => { if (broken) throw new Error("refusé"); m.set(k, String(v)); },
    raw: m,
  };
};
// Langue simulée comme celle du site : L.en / L.es, et L.href qui préfixe la page.
const lang = (code) => ({ en: code === "en", es: code === "es", href: (p) => (code === "fr" ? p : `/${code}${p}`) });

// Code promo tel que Whop le renvoie (mêmes champs que lib/whop-promo.js lit).
const whopCode = (over = {}) => ({
  id: "promo_1", code: "BIENVENUE10", promo_type: "percentage", amount_off: 0.1, status: "active", duration: "once",
  promo_duration_months: 0, new_users_only: false, unlimited_stock: true, expires_at: null, ...over,
});

export async function accueilTests({ ok, ko, eq }) {
  console.log("Offre de dernière chance");
  // --- Réglage : éteinte tant que le code et la remise ne sont pas donnés tous les deux et valides
  eq("offre : rien de réglé = éteinte", offerConfig({}), null);
  eq("offre : le code seul ne suffit pas", offerConfig({ EXIT_OFFER_CODE: "BIENVENUE10" }), null);
  eq("offre : la remise seule ne suffit pas", offerConfig({ EXIT_OFFER_PCT: "10" }), null);
  eq("offre : code et remise valides (code mis en majuscules, espaces retirés)", offerConfig({ EXIT_OFFER_CODE: " bienvenue10 ", EXIT_OFFER_PCT: "10" }), { code: "BIENVENUE10", pct: 10 });
  eq("offre : code avec symbole ou espace refusé", offerConfig({ EXIT_OFFER_CODE: "BIEN VENUE!", EXIT_OFFER_PCT: "10" }), null);
  eq("offre : code trop court refusé", offerConfig({ EXIT_OFFER_CODE: "AB", EXIT_OFFER_PCT: "10" }), null);
  for (const bad of ["0", "91", "abc", "10.5", "-5", ""]) eq(`offre : remise « ${bad} » refusée`, offerConfig({ EXIT_OFFER_CODE: "BIENVENUE10", EXIT_OFFER_PCT: bad }), null);

  // --- Vérification chez Whop (réponses simulées) : l'offre n'est active que si Whop confirme tout
  const cfg = { code: "BIENVENUE10", pct: 10 };
  eq("offre : non réglée = off", (await resolveOffer(null)).why, "off");
  eq("offre : code absent chez Whop", (await resolveOffer(cfg, { find: async () => null, months: 1 })).why, "absent");
  eq("offre : clé API refusée par Whop", (await resolveOffer(cfg, { find: async () => { throw new WhopPromoError("scope", "refus"); }, months: 1 })).why, "scope");
  eq("offre : Whop injoignable", (await resolveOffer(cfg, { find: async () => { throw new Error("réseau"); }, months: 1 })).why, "network");
  eq("offre : code conforme = active, remise sur le premier paiement", await resolveOffer(cfg, { find: async () => whopCode(), months: 1 }), { ok: true, code: "BIENVENUE10", pct: 10, mois: 1 });
  eq("offre : durée « à chaque paiement » acceptée quand le site est réglé ainsi", (await resolveOffer(cfg, { find: async () => whopCode({ duration: "forever" }), months: 0 })).ok, true);
  const bad = async (over, months = 1) => resolveOffer(cfg, { find: async () => whopCode(over), months });
  eq("offre : remise différente chez Whop = éteinte", (await bad({ amount_off: 0.3 })).why, "reglages");
  eq("offre : code désactivé chez Whop = éteinte", (await bad({ status: "inactive" })).why, "reglages");
  eq("offre : réservé aux nouveaux clients = éteinte", (await bad({ new_users_only: true })).why, "reglages");
  eq("offre : code qui expire = éteinte", (await bad({ expires_at: "2026-12-31T00:00:00Z" })).why, "reglages");
  eq("offre : utilisations limitées = éteinte", (await bad({ unlimited_stock: false })).why, "reglages");
  eq("offre : durée différente de celle annoncée = éteinte", (await bad({ duration: "forever" }, 1)).why, "reglages");

  // --- Mémoire du serveur : Whop n'est pas interrogé à chaque visite
  const env = { EXIT_OFFER_CODE: "BIENVENUE10", EXIT_OFFER_PCT: "10" };
  let calls = 0, answer = whopCode();
  const find = async () => { calls++; return answer; };
  resetOfferMemo();
  eq("offre : éteinte sans réglage, sans appeler Whop", [(await liveOffer({ env: {}, find, months: 1 })).why, calls], ["off", 0]);
  const t0 = 1_000_000;
  eq("offre : première demande", [(await liveOffer({ env, find, months: 1, now: t0 })).ok, calls], [true, 1]);
  eq("offre : 4 minutes plus tard, réponse gardée en mémoire", [(await liveOffer({ env, find, months: 1, now: t0 + 240e3 })).ok, calls], [true, 1]);
  eq("offre : 6 minutes plus tard, Whop est interrogé à nouveau", [(await liveOffer({ env, find, months: 1, now: t0 + 360e3 })).ok, calls], [true, 2]);
  await liveOffer({ env, find, months: 1, now: t0 + 361e3, fresh: true });
  eq("offre : le diagnostic de l'admin ignore la mémoire", calls, 3);
  answer = null;
  eq("offre : un échec n'est gardé qu'une minute", [(await liveOffer({ env, find, months: 1, now: t0 + 1_000e3 })).why, (await liveOffer({ env, find, months: 1, now: t0 + 1_030e3 })).why, calls], ["absent", "absent", 4]);
  answer = whopCode();
  eq("offre : une minute après un échec, elle revient", [(await liveOffer({ env, find, months: 1, now: t0 + 1_070e3 })).ok, calls], [true, 5]);
  eq("offre : changer le code ou la remise repart de zéro", (await liveOffer({ env: { ...env, EXIT_OFFER_PCT: "20" }, find, months: 1, now: t0 + 1_071e3 })).why, "reglages");
  resetOfferMemo();

  // --- Côté navigateur : une fois tous les 14 jours, jamais sans stockage
  const day = 864e5, now = 50 * day;
  const s1 = fakeStore();
  eq("offre : jamais vue = autorisée", exitAllowed(s1, now), true);
  exitMark(s1, now);
  eq("offre : vue à l'instant = pas redemandée", exitAllowed(s1, now + 1000), false);
  eq("offre : 13 jours plus tard = toujours pas", exitAllowed(s1, now + 13 * day), false);
  eq("offre : 15 jours plus tard = de nouveau possible", exitAllowed(s1, now + 15 * day), true);
  eq("offre : la marque est un horodatage", s1.raw.get(EXIT_KEY), String(now));
  eq("offre : intervalle de 14 jours", EXIT_GAP, 14 * day);
  eq("offre : stockage refusé = jamais montrée", exitAllowed(fakeStore(true), now), false);
  eq("offre : pas de stockage du tout = jamais montrée", exitAllowed(null, now), false);
  eq("lien : /pro avec le code", proUrlWithCode("/pro", "BIENVENUE10"), "/pro?code=BIENVENUE10");
  eq("lien : page anglaise", proUrlWithCode("/en/pro", "BIENVENUE10"), "/en/pro?code=BIENVENUE10");
  eq("lien : adresse déjà munie d'une requête", proUrlWithCode("/pro?x=1", "AB12"), "/pro?x=1&code=AB12");
  const fr = lang("fr"), en = lang("en"), es = lang("es");
  eq("phrase FR : premier paiement", offerLine(fr, "10 %", 1), "−10 % sur ton premier paiement");
  eq("phrase FR : tous les paiements", offerLine(fr, "10 %", 0), "−10 % sur ta formule");
  eq("phrase FR : plusieurs paiements", offerLine(fr, "10 %", 3), "−10 % sur tes 3 premiers paiements");
  eq("phrase EN : premier paiement", offerLine(en, "10%", 1), "10% off your first payment");
  eq("phrase EN : plusieurs paiements", offerLine(en, "10%", 3), "10% off your first 3 payments");
  eq("phrase ES : premier paiement", offerLine(es, "10 %", 1), "−10 % en tu primer pago");
  eq("phrase ES : tous les paiements", offerLine(es, "10 %", 0), "−10 % en tu plan");

  console.log("Questions d'accueil et question de source");
  // --- Où l'on ne dérange pas un nouveau compte : les pages d'analyse
  for (const [path, search, want] of [
    ["/app/match/401", "", true], ["/en/app/match/401", "", true], ["/es/app/match/401", "", true],
    ["/app/euroleague/match/abc", "", true], ["/en/app/euroleague/match/abc", "", true],
    ["/app", "?home=13&away=2", true], ["/en/app", "?home=13&away=2", true],
    ["/app", "?team=13", false], ["/app", "?home=13", false], ["/app", "", false],
    ["/", "", false], ["/en", "", false], ["/app/matchs", "", false], ["/app/euroleague", "", false],
    ["/app/euroleague/equipe/xyz", "", false], ["/app/equipe/13", "", false], ["/pro", "", false], ["/app/compte", "", false],
  ]) eq(`accueil : ${path}${search} ${want ? "est une page d'analyse (pas de questions)" : "accepte les questions"}`, isAnalysisPath(path, search), want);

  // --- Profil enregistré dans le navigateur
  eq("profil : NBA et équipe valide", cleanProfile({ ligue: "nba", equipe: "13", at: 5 }), { ligue: "nba", equipe: "13", passe: false, at: 5 });
  eq("profil : EuroLeague n'a pas d'équipe NBA", cleanProfile({ ligue: "euroleague", equipe: "13" }), { ligue: "euroleague", equipe: null, passe: false, at: 0 });
  eq("profil : équipe inconnue ignorée", cleanProfile({ ligue: "nba", equipe: "999" }), { ligue: "nba", equipe: null, passe: false, at: 0 });
  eq("profil : ligue inconnue ignorée, comptée comme « passé »", cleanProfile({ ligue: "nfl", equipe: "x" }), { ligue: null, equipe: null, passe: true, at: 0 });
  eq("profil : n'importe quoi = rien", [cleanProfile(null), cleanProfile("x"), cleanProfile(12)], [null, null, null]);
  const ps = fakeStore();
  eq("profil : pas encore vu", [onboardingDone(ps), readProfile(ps)], [false, null]);
  const saved = saveProfile(ps, { ligue: "both", equipe: "9" }, 77);
  eq("profil : enregistré", saved, { ligue: "both", equipe: "9", passe: false, at: 77 });
  eq("profil : relu tel quel, et les questions ne sont plus redemandées", [readProfile(ps), onboardingDone(ps)], [saved, true]);
  const ps2 = fakeStore();
  saveProfile(ps2, { passe: true }, 5);
  eq("profil : questions ignorées = jamais redemandées", [onboardingDone(ps2), readProfile(ps2)?.passe], [true, true]);
  eq("profil : stockage refusé = questions jamais posées", [onboardingDone(fakeStore(true)), onboardingDone(null)], [true, true]);
  eq("profil : écrire sans stockage ne casse rien", saveProfile(fakeStore(true), { ligue: "nba" }, 1)?.ligue, "nba");

  // --- Où l'on envoie la personne ensuite
  eq("destination : équipe NBA = ses prochains matchs", onboardingTarget({ ligue: "nba", equipe: "13" }, fr), "/app?team=13");
  eq("destination : page anglaise", onboardingTarget({ ligue: "both", equipe: "2" }, en), "/en/app?team=2");
  eq("destination : EuroLeague", onboardingTarget({ ligue: "euroleague" }, es), "/es/app/euroleague");
  eq("destination : pas d'équipe = les matchs de ce soir", onboardingTarget({ ligue: "nba", equipe: null }, fr), "/app/matchs");
  eq("destination : profil vide = les matchs de ce soir", onboardingTarget(null, fr), "/app/matchs");

  // --- Textes : chaque choix existe en français, anglais et espagnol, sans doublon d'identifiant
  for (const [name, list] of [["compétitions", LEAGUES], ["sources", SOURCE_CHOICES]]) {
    const complete = list.every((c) => Array.isArray(c.t) && c.t.length === 3 && c.t.every((x) => typeof x === "string" && x.trim()));
    complete ? ok(`textes : ${name} dans les trois langues`) : ko(`textes : ${name} dans les trois langues`, "un libellé manque");
    eq(`textes : ${name} sans doublon`, new Set(list.map((c) => c.id)).size, list.length);
  }
  eq("textes : libellé selon la langue", [labelOf(LEAGUES[2], fr), labelOf(LEAGUES[2], en), labelOf(LEAGUES[2], es)], ["Les deux", "Both", "Las dos"]);
  eq("compétitions : identifiants", [...LEAGUE_IDS], ["nba", "euroleague", "both"]);
  eq("sources : TikTok, Instagram, YouTube et X proposent de nommer le créateur", SOURCE_CHOICES.filter((s) => s.creator).map((s) => s.id), ["tiktok", "instagram", "youtube", "x"]);
  eq("sources : pas de vocabulaire de paris dans les choix", SOURCE_CHOICES.concat(LEAGUES).some((c) => /pari|bet|apuest/i.test(c.t.join(" "))), false);
  eq("sources : « ami » et « autre » existent", [SOURCE_IDS.has("ami"), SOURCE_IDS.has("autre")], [true, true]);

  // --- Nom du créateur saisi : nettoyé avant d'être envoyé
  eq("créateur : nom simple", cleanCreator("  @La Nuit NBA  "), "@La Nuit NBA");
  eq("créateur : symboles et balises retirés", cleanCreator("<script>alert(1)</script> Tim!!"), "scriptalert1script Tim");
  eq("créateur : accents gardés", cleanCreator("Étienne le basketteur"), "Étienne le basketteur");
  eq("créateur : espaces multiples réduits", cleanCreator("a    b"), "a b");
  eq("créateur : 40 caractères au plus", cleanCreator("x".repeat(80)).length, 40);
  eq("créateur : vide ou absent", [cleanCreator(""), cleanCreator(null), cleanCreator("!!!")], ["", "", ""]);

  // --- Question de source : une seule fois
  const ss = fakeStore();
  eq("source : pas encore posée", sourceAsked(ss), false);
  markSourceAsked(ss, 5);
  eq("source : posée une fois, plus jamais", sourceAsked(ss), true);
  eq("source : stockage refusé = jamais posée", [sourceAsked(fakeStore(true)), sourceAsked(null)], [true, true]);
  eq("stockage : sans navigateur, null", localStore(), null);
}
