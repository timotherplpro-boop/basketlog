// Parrainage (lib/parrainage.js) : code du lien signé, nom des récompenses, anti-abus, idempotence, paiements des filleuls,
// e-mail au parrain. Sans réseau ni base. Lancé par tests/unit.mjs.
import {
  MAX_PER_YEAR, REAL_MIN, REF_RE, isRealPayment, mailLang, parseReward, proTarget, refCode, refLink, refUid, referrals,
  rewardCheck, rewardCode, rewardEmail, rewardState, rewardsOf, sameEmail, yearCount, filleulRewarded,
} from "../lib/parrainage.js";
import { CODE_RE } from "../lib/promo.js";

export async function parrainageTests({ ok, ko, eq }) {
  console.log("Parrainage");
  const env = { SESSION_SECRET: "secret-de-test" };
  const other = { SESSION_SECRET: "autre-secret" };
  const bl = "bl_3f2a9c1e-5b7d-4e8f-9a0b-1c2d3e4f5a6b";
  const wh = "user_AbC123xYz789Qw";

  // --- Code du lien
  const cb = refCode(bl, env), cw = refCode(wh, env);
  eq("Parrainage : code d'un compte Basketlog, forme attendue", [REF_RE.test(cb), cb.length, cb[0]], [true, 33, "b"]);
  eq("Parrainage : code d'un compte Whop, forme attendue", [REF_RE.test(cw), cw[0]], [true, "w"]);
  eq("Parrainage : le code redonne le compte Basketlog", refUid(cb, env), bl);
  eq("Parrainage : le code redonne le compte Whop", refUid(cw, env), wh);
  eq("Parrainage : même compte, même code (stable)", refCode(bl, env), cb);
  const flip = (c, i) => c.slice(0, i) + (c[i] === "A" ? "B" : "A") + c.slice(i + 1);
  eq("Parrainage : signature modifiée refusée", refUid(flip(cb, cb.length - 1), env), null);
  eq("Parrainage : identifiant modifié refusé", refUid(flip(cb, 3), env), null);
  eq("Parrainage : code signé avec une autre clé refusé", refUid(refCode(bl, other), env), null);
  eq("Parrainage : codes invalides refusés", [refUid("", env), refUid("x", env), refUid("b<script>alert(1)</script>", env), refUid(null, env), refUid(cb, {})], [null, null, null, null, null]);
  eq("Parrainage : pas de code sans clé du serveur", refCode(bl, {}), null);
  eq("Parrainage : identifiant inconnu, pas de code", [refCode("admin", env), refCode("bl_pas-un-uuid", env)], [null, null]);
  eq("Parrainage : lien français et anglais", [refLink("https://basketlog-app.com/", "bX", "fr"), refLink("https://basketlog-app.com", "bX", "en")], ["https://basketlog-app.com/?parrain=bX", "https://basketlog-app.com/en?parrain=bX"]);

  // --- Nom des récompenses (codes promo Whop)
  const filleul = "user_Filleul0001", filleul2 = "user_Filleul0002";
  const r1 = rewardCode(bl, filleul, env);
  eq("Parrainage : nom de récompense accepté par Whop (A-Z, 0-9, 24 max)", [CODE_RE.test(r1), r1.length, r1.startsWith("PARRAIN")], [true, 23, true]);
  eq("Parrainage : même parrain et même filleul, même nom (Whop refuse le doublon)", rewardCode(bl, filleul, env), r1);
  eq("Parrainage : autre filleul, autre nom", rewardCode(bl, filleul2, env) !== r1, true);
  eq("Parrainage : nom lisible par parseReward", !!parseReward(r1) && parseReward(r1).p === parseReward(rewardCode(bl, filleul2, env)).p, true);
  eq("Parrainage : codes des créateurs ignorés", [parseReward("LANUITNBA20"), parseReward("PARRAIN20"), parseReward(null)], [null, null, null]);
  eq("Parrainage : le nom ne contient pas l'identifiant du filleul", r1.includes("FILLEUL"), false);

  // --- Registre, états, plafond
  const now = Date.parse("2026-11-27T12:00:00Z");
  const day = 864e5;
  const promo = (code, { status = "active", uses = 0, ago = 1 } = {}) => ({ id: `promo_${code.slice(-6)}`, code, status, uses, created_at: new Date(now - ago * day).toISOString() });
  eq("Parrainage : états d'une récompense", [rewardState({ status: "active" }), rewardState({ status: "inactive" }), rewardState({ status: "active", uses: 1 }), rewardState({ status: "archived" })], ["attente", "ajoute", "utilise", "annule"]);
  const promos = [promo(r1), promo(rewardCode(bl, filleul2, env), { status: "inactive", ago: 40 }), { id: "promo_c", code: "LANUITNBA20", status: "active" }, promo(rewardCode(wh, "user_Autre00001", env))];
  const mine = rewardsOf(promos, bl, env);
  eq("Parrainage : récompenses du parrain seulement, plus récente d'abord", mine.map((r) => r.state), ["attente", "ajoute"]);
  eq("Parrainage : rien pour un autre compte", rewardsOf(promos, "bl_00000000-0000-4000-8000-000000000000", env).length, 0);
  eq("Parrainage : filleul déjà récompensé repéré", [filleulRewarded(promos, filleul, env), filleulRewarded(promos, "user_Nouveau0001", env)], [true, false]);
  eq("Parrainage : récompenses de l'année", yearCount(mine, now), 2);
  eq("Parrainage : une récompense de plus d'un an ne compte plus", yearCount([{ created: now - 366 * day }, { created: now - 10 * day }], now), 1);

  // --- Anti-abus
  const base = { promos, parrainUid: bl, parrainWhop: "user_PapaWhop001", parrainEmail: "Tim.Dupont@gmail.com", filleulUid: "user_Nouveau0001", filleulEmail: "ami@exemple.fr", now, env };
  eq("Parrainage : nouveau filleul accepté, avec son nom de code", rewardCheck(base), { ok: true, code: rewardCode(bl, "user_Nouveau0001", env) });
  eq("Parrainage : soi-même (même compte Whop que le parrain) refusé", rewardCheck({ ...base, filleulUid: "user_PapaWhop001" }).reason, "soi-meme");
  eq("Parrainage : soi-même (lien d'un compte Whop) refusé", rewardCheck({ ...base, parrainUid: wh, parrainWhop: wh, filleulUid: wh }).reason, "soi-meme");
  eq("Parrainage : soi-même (même e-mail, variantes Gmail) refusé", rewardCheck({ ...base, filleulEmail: "timdupont+basket@googlemail.com" }).reason, "soi-meme");
  eq("Parrainage : e-mails différents acceptés", [sameEmail("a@x.fr", "b@x.fr"), sameEmail("a@x.fr", null), sameEmail("A@X.fr", "a@x.fr")], [false, false, true]);
  eq("Parrainage : une seule récompense par filleul (déjà récompensé)", rewardCheck({ ...base, filleulUid: filleul }).reason, "deja");
  eq("Parrainage : filleul déjà récompensé par un autre parrain refusé", rewardCheck({ ...base, parrainUid: wh, parrainWhop: wh, filleulUid: filleul }).reason, "deja");
  const full = Array.from({ length: MAX_PER_YEAR }, (_, i) => promo(rewardCode(bl, `user_Plein${String(i).padStart(6, "0")}`, env), { ago: 5 + i }));
  eq("Parrainage : 12 mois offerts dans l'année, le 13e est refusé", rewardCheck({ ...base, promos: full }).reason, "plafond");
  const old = full.map((p, i) => (i === 0 ? { ...p, created_at: new Date(now - 400 * day).toISOString() } : p));
  eq("Parrainage : plafond sur 365 jours glissants", rewardCheck({ ...base, promos: old }).ok, true);
  // Idempotence : une fois la récompense créée (ajoutée au registre), le même filleul ne rapporte plus rien.
  const after = [...promos, promo(rewardCheck(base).code)];
  eq("Parrainage : idempotent, seconde tentative refusée", rewardCheck({ ...base, promos: after }).reason, "deja");
  eq("Parrainage : identifiants manquants", rewardCheck({ ...base, filleulUid: null }).reason, "inconnu");

  // --- Paiements des filleuls
  const products = { prod_PRO: "pro", prod_LIFE: "lifetime", prod_START: "starter" };
  const code = refCode(bl, env);
  const pay = (id, o = {}) => ({ id, status: "paid", product: { id: "prod_PRO" }, membership: { id: "mem_1" }, user: { id: "user_Ami00001", email: "Ami@Exemple.fr" }, total: 9.99, refunded_amount: 0, created_at: "2026-11-20T10:00:00Z", paid_at: "2026-11-20T10:00:00Z", ...o });
  eq("Parrainage : l'essai à 1 € n'est pas un vrai paiement", isRealPayment(pay("pay_a", { total: 1.2 }), products), false);
  eq("Parrainage : 9,99 € Pro est un vrai paiement", isRealPayment(pay("pay_b"), products), true);
  eq("Parrainage : remboursé, Starter, impayé : non", [isRealPayment(pay("pay_c", { refunded_amount: 9.99 }), products), isRealPayment(pay("pay_d", { product: { id: "prod_START" } }), products), isRealPayment(pay("pay_e", { status: "open", paid_at: null }), products)], [false, false, false]);
  eq("Parrainage : seuil d'un vrai paiement au-dessus de l'essai", REAL_MIN > 1.5 && REAL_MIN < 7, true);
  const trial = pay("pay_trial", { total: 1.2, metadata: { bl: "x", parrain: code }, created_at: "2026-11-17T10:00:00Z", paid_at: "2026-11-17T10:00:00Z" });
  const renewal = pay("pay_renew", { metadata: {} });
  const later = pay("pay_later", { created_at: "2026-12-20T10:00:00Z", paid_at: "2026-12-20T10:00:00Z" });
  const stranger = pay("pay_x", { user: { id: "user_Inconnu01" }, membership: { id: "mem_9" } });
  const seen = referrals([later, renewal, trial, stranger], products);
  eq("Parrainage : filleul retrouvé par le paiement de son essai", seen.map((r) => [r.filleul, r.ref === code, r.email]), [["user_Ami00001", true, "ami@exemple.fr"]]);
  eq("Parrainage : premier vrai paiement retenu (pas l'essai, pas le suivant)", seen[0].paid?.id, "pay_renew");
  eq("Parrainage : en essai, pas encore de vrai paiement", referrals([trial], products)[0].paid, null);
  eq("Parrainage : code lu sur l'abonnement si le paiement n'en porte pas", referrals([pay("pay_m", { membership: { id: "mem_7" } })], products, [{ id: "mem_7", metadata: { parrain: code }, product: { id: "prod_PRO" } }])[0]?.paid?.id, "pay_m");
  eq("Parrainage : Lifetime payé d'un coup, récompensé", referrals([pay("pay_l", { product: { id: "prod_LIFE" }, total: 99.99, metadata: { parrain: code }, membership: { id: "mem_l" } })], products)[0]?.paid?.plan, "lifetime");
  eq("Parrainage : code abîmé dans les métadonnées ignoré", referrals([pay("pay_z", { metadata: { parrain: "<b>" } })], products).length, 0);

  // --- Abonnement où ajouter les 30 jours
  eq("Parrainage : abonnement Pro en cours choisi", proTarget([{ id: "a", tier: "pro", state: "ends" }, { id: "b", tier: "pro", state: "renews" }])?.id, "b");
  eq("Parrainage : Pro résilié mais actif accepté", proTarget([{ id: "a", tier: "pro", state: "ends" }])?.id, "a");
  eq("Parrainage : ni Pass 24 h, ni Starter, ni Lifetime, ni paiement en échec", proTarget([{ id: "p", tier: "pro", state: "pass" }, { id: "s", tier: "starter", state: "renews" }, { id: "l", tier: "lifetime", state: "lifetime" }, { id: "d", tier: "pro", state: "past_due" }]), null);

  // --- E-mail au parrain
  eq("Parrainage : langues de l'e-mail", [mailLang("fr"), mailLang("en"), mailLang("es"), mailLang("pt"), mailLang("de")], ["fr", "en", "es", "es", "fr"]);
  const fr = rewardEmail({ lang: "fr", name: "carlos", to: "carlos@exemple.fr", added: true, until: "2027-01-15T12:00:00Z" });
  const en = rewardEmail({ lang: "en", to: "a@b.co" });
  const es = rewardEmail({ lang: "es" });
  eq("Parrainage : sujets dans chaque langue", [fr.subject.startsWith("Ton ami"), en.subject.startsWith("Your friend"), es.subject.startsWith("Tu amigo")], [true, true, true]);
  eq("Parrainage : prénom, date et lien Mon compte", [fr.text.includes("Salut Carlos"), fr.text.includes("15 janvier 2027"), fr.html.includes("/app/compte#parrainage"), en.html.includes("/en/app/compte#parrainage")], [true, true, true, true]);
  eq("Parrainage : lien de désinscription quand l'adresse est connue", [!!fr.headers?.["List-Unsubscribe"], !!es.headers], [true, false]);
  const all = [fr, en, es, rewardEmail({ lang: "fr" })].map((m) => `${m.subject} ${m.text}`).join(" ");
  const banned = /\b(IA|AI|pari|paris|cote|cotes|mise|mises|combiné|pronostic|pronostics|bet|bets|betting|odds|apuesta|apuestas)\b|\$/i;
  eq("Parrainage : e-mails sans « IA », sans vocabulaire de paris, prix en euros", [banned.test(all), all.includes("9,99 €") || all.includes("€9.99")], [false, true]);
  ok("Parrainage : tests terminés");
  void ko;
}
