// Tests avant mise en ligne : pages principales, accès par formule (visiteur, compte gratuit, Starter, Pro, Lifetime),
// avis, espace admin, routes protégées. Usage : SESSION_SECRET=... node tests/smoke.mjs http://localhost:3000
// Les sessions de test sont signées avec SESSION_SECRET, comme celles du site (cookie bl_pro).
import crypto from "node:crypto";
import { unit } from "./unit.mjs";

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.SESSION_SECRET || "";
// Site en ligne (vérification du matin) : les réglages de production sont actifs (offre de sortie, publications), et les
// sessions de test ne peuvent pas être signées (pas de SESSION_SECRET) : on vérifie alors la forme des réponses, pas l'état.
const LIVE = !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(BASE);
let failed = 0, passed = 0, skipped = 0;
const ok = (name) => { passed++; console.log(`  ok   ${name}`); };
const ko = (name, why) => { failed++; console.log(`  ÉCHEC ${name} : ${why}`); };
const skip = (name, why) => { skipped++; console.log(`  --   ${name} (${why})`); };

function session(tier, extra = {}) {
  const data = Buffer.from(JSON.stringify({ uid: `test-${tier}`, name: "Test", tier, paid: tier === "compte" ? null : tier, role: null, v: 2, checked: Date.now(), ...extra })).toString("base64url");
  return `bl_pro=${data}.${crypto.createHmac("sha256", SECRET).update(data).digest("base64url")}`;
}

async function get(path, { cookie, method = "GET", body, ua = "basketlog-tests", headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method, redirect: "manual",
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}), "user-agent": ua, ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, text: await res.text(), cache: res.headers.get("cache-control") || "" };
}

async function json(path) {
  const r = await get(path);
  try { return { status: r.status, body: JSON.parse(r.text) }; } catch { return { status: r.status, body: null }; }
}

const ERROR_PAGE = /Une erreur est survenue|Application error|Internal Server Error/i;

async function pages() {
  console.log("Pages");
  for (const p of ["/", "/en", "/es", "/analyse-basket", "/en/analyse-basket", "/es/analyse-basket", "/pronostic-basket", "/en/pronostic-basket", "/es/pronostic-basket", "/app", "/app/matchs", "/app/bilan", "/app/bilan?l=pub", "/app/classement", "/app/euroleague", "/pro", "/en/pro", "/es/pro", "/pro?code=TESTAUTO", "/avis", "/en/avis", "/es/avis", "/methode", "/widget", "/en/widget", "/es/widget", "/cgu", "/cgv", "/confidentialite", "/mentions-legales", "/cookies", "/reinitialiser", "/en/reinitialiser", "/es/reinitialiser", "/newsletter/confirmer", "/en/newsletter/confirmer", "/es/newsletter/confirmer", "/sitemap.xml", "/robots.txt"]) {
    const r = await get(p);
    if (r.status !== 200) ko(p, `HTTP ${r.status}`);
    else if (ERROR_PAGE.test(r.text)) ko(p, "page d'erreur affichée");
    else ok(p);
  }
  const r = await get("/page-qui-n-existe-pas");
  r.status === 404 ? ok("page inconnue → 404") : ko("page inconnue → 404", `HTTP ${r.status}`);
}

async function access() {
  console.log("Accès à l'analyse complète");
  const list = await get("/app/matchs");
  const m = list.text.match(/href="(\/app\/match\/\d+\?d=\d{8})"/);
  if (!m) return skip("fiche match", "aucun match listé aujourd'hui ou données NBA indisponibles");
  const url = m[1].replace(/&amp;/g, "&");
  const v = await get(url);
  if (v.status !== 200) return ko(`fiche ${url}`, `HTTP ${v.status}`);
  /Score projeté|Score final|Score en direct/.test(v.text) ? ok("fiche match affichée") : ko("fiche match affichée", "carte du match absente");
  // Visiteur sans compte, comme chez Visifoot : « Crée ton compte gratuit pour voir l'analyse » (analyse floutée), pas l'aperçu.
  /Crée ton compte gratuit pour voir l(&#x27;|')analyse/.test(v.text) && /ar-wall/.test(v.text) ? ok("visiteur : inscription demandée avant l'analyse") : ko("visiteur : inscription demandée avant l'analyse", "mur d'inscription absent");
  !/n&#x27;as accès qu&#x27;à|n'as accès qu'à/.test(v.text) ? ok("visiteur : pas de fenêtre de paiement avant l'inscription") : ko("visiteur : pas de fenêtre de paiement avant l'inscription", "verrou « 30 % » affiché à un visiteur");
  if (!SECRET) return skip("formules", "SESSION_SECRET absent");
  const free = await get(url, { cookie: session("compte") });
  /n&#x27;as accès qu&#x27;à|n'as accès qu'à/.test(free.text) ? ok("compte gratuit : analyse verrouillée") : ko("compte gratuit : analyse verrouillée", "verrou absent");
  for (const tier of ["starter", "pro", "lifetime"]) {
    const r = await get(url, { cookie: session(tier) });
    const locked = /n&#x27;as accès qu&#x27;à|n'as accès qu'à/.test(r.text);
    !locked ? ok(`${tier} : pas de verrou « 30 % »`) : ko(`${tier} : pas de verrou « 30 % »`, "verrou visiteur affiché à un abonné");
  }
}

async function protectedRoutes() {
  console.log("Routes protégées");
  const admin = await get("/app/admin");
  admin.status === 404 ? ok("espace admin caché aux visiteurs") : ko("espace admin caché aux visiteurs", `HTTP ${admin.status}`);
  if (SECRET) {
    const a2 = await get("/app/admin", { cookie: session("lifetime") });
    a2.status === 404 ? ok("espace admin caché aux abonnés") : ko("espace admin caché aux abonnés", `HTTP ${a2.status}`);
  }
  const stats = await get("/app/admin/stats");
  stats.status === 404 ? ok("statistiques admin cachées aux visiteurs") : ko("statistiques admin cachées aux visiteurs", `HTTP ${stats.status}`);
  const beacon = await get("/api/stats", { method: "POST", body: { e: "visite", s: "direct", l: "fr" } });
  beacon.status === 204 ? ok("compteur du parcours : réponse vide") : ko("compteur du parcours : réponse vide", `HTTP ${beacon.status}`);
  const social = await get("/api/cron/social");
  social.status === 401 ? ok("publication automatique refusée sans accès") : ko("publication automatique refusée sans accès", `HTTP ${social.status}`);
  if (SECRET) {
    const s2 = await get("/api/cron/social", { cookie: session("lifetime") });
    s2.status === 401 ? ok("publication automatique refusée aux abonnés") : ko("publication automatique refusée aux abonnés", `HTTP ${s2.status}`);
  }
  // Profil Bluesky : jamais par la tâche planifiée ni un abonné, aperçu seulement pour un admin (aucune écriture ici).
  const prof = await get("/api/cron/social?profile=1&dry=1");
  prof.status === 401 ? ok("profil Bluesky refusé sans accès") : ko("profil Bluesky refusé sans accès", `HTTP ${prof.status}`);
  if (!process.env.CRON_SECRET) {
    const profCron = await get("/api/cron/social?profile=1&dry=1", { ua: "vercel-cron/1.0" });
    profCron.status === 401 ? ok("profil Bluesky refusé à la tâche planifiée") : ko("profil Bluesky refusé à la tâche planifiée", `HTTP ${profCron.status}`);
  }
  if (SECRET) {
    const profSub = await get("/api/cron/social?profile=1&dry=1", { cookie: session("lifetime") });
    profSub.status === 401 ? ok("profil Bluesky refusé aux abonnés") : ko("profil Bluesky refusé aux abonnés", `HTTP ${profSub.status}`);
    const profAdmin = await get("/api/cron/social?profile=1&dry=1", { cookie: session("lifetime", { role: "admin" }) });
    let pa = null;
    try { pa = JSON.parse(profAdmin.text); } catch {}
    profAdmin.status === 200 && pa?.dry === true && pa.profile?.displayName === "Basketlog" && !/PASSWORD|jwt/i.test(profAdmin.text)
      ? ok("profil Bluesky : aperçu pour un admin, rien d'écrit, aucun code d'accès")
      : ko("profil Bluesky : aperçu pour un admin, rien d'écrit, aucun code d'accès", `HTTP ${profAdmin.status} ${profAdmin.text.slice(0, 120)}`);
  }
  const preview = await get("/api/social");
  let pv = null;
  try { pv = JSON.parse(preview.text); } catch {}
  preview.status === 200 && pv && "posts" in pv && pv.status && (LIVE ? typeof pv.status.enabled === "boolean" : pv.status.enabled === false) && !/TOKEN|PASSWORD/i.test(preview.text)
    ? ok("aperçu des publications : public, rien d'activé, aucun code d'accès")
    : ko("aperçu des publications : public, rien d'activé, aucun code d'accès", `HTTP ${preview.status} ${preview.text.slice(0, 120)}`);
  const did = await get("/.well-known/atproto-did");
  did.status === 404 ? ok("identifiant Bluesky du domaine : absent tant qu'il n'est pas configuré") : ko("identifiant Bluesky du domaine : absent tant qu'il n'est pas configuré", `HTTP ${did.status}`);
  const api = await get("/api/admin", { method: "POST", body: { action: "avis_publier", id: "x" } });
  [401, 403, 404].includes(api.status) ? ok("API admin refusée sans session") : ko("API admin refusée sans session", `HTTP ${api.status}`);
  const sync = await get("/api/admin", { method: "POST", body: { action: "promo_sync", id: "00000000-0000-0000-0000-000000000000" } });
  [401, 403, 404].includes(sync.status) ? ok("synchronisation Whop refusée sans session") : ko("synchronisation Whop refusée sans session", `HTTP ${sync.status}`);
  const avis =await get("/api/avis", { method: "POST", body: { prenom: "Test", note: 5, texte: "Test automatique, ne pas publier.", elapsed: 10000 } });
  [401, 403].includes(avis.status) ? ok("avis refusé sans compte") : ko("avis refusé sans compte", `HTTP ${avis.status}`);
  if (SECRET) {
    const avis2 = await get("/api/avis", { method: "POST", cookie: session("compte"), body: { prenom: "Test", note: 5, texte: "Test automatique, ne pas publier.", elapsed: 10000 } });
    [401, 403, 503].includes(avis2.status) ? ok("avis refusé à un compte gratuit") : ko("avis refusé à un compte gratuit", `HTTP ${avis2.status}`);
  }
  // Comptes Basketlog (e-mail, Google) : rien n'est créé ici, seulement des refus.
  const crossSite = await fetch(BASE + "/api/auth", { method: "POST", headers: { "content-type": "application/json", origin: "https://exemple-pirate.com", "user-agent": "basketlog-tests" }, body: JSON.stringify({ action: "connexion", email: "x@exemple.com", mdp: "abcdef" }) });
  crossSite.status === 403 ? ok("connexion refusée depuis un autre site") : ko("connexion refusée depuis un autre site", `HTTP ${crossSite.status}`);
  const unknown = await get("/api/auth", { method: "POST", body: { action: "pirater" } });
  [400, 503].includes(unknown.status) ? ok("action de compte inconnue refusée") : ko("action de compte inconnue refusée", `HTTP ${unknown.status}`);
  const badMail = await get("/api/auth", { method: "POST", body: { action: "inscription", email: "pas-une-adresse", mdp: "abcdef" } });
  [400, 503].includes(badMail.status) ? ok("inscription : adresse invalide refusée") : ko("inscription : adresse invalide refusée", `HTTP ${badMail.status}`);
  const shortPw = await get("/api/auth", { method: "POST", body: { action: "inscription", email: "test-auto@exemple.com", mdp: "abc" } });
  [400, 503].includes(shortPw.status) ? ok("inscription : mot de passe trop court refusé") : ko("inscription : mot de passe trop court refusé", `HTTP ${shortPw.status}`);
  const wrong = await get("/api/auth", { method: "POST", body: { action: "connexion", email: "inconnu-test-auto@exemple.com", mdp: "mauvais-mot" } });
  [401, 429, 503].includes(wrong.status) ? ok("connexion : compte inconnu refusé") : ko("connexion : compte inconnu refusé", `HTTP ${wrong.status}`);
  const google = await get("/api/auth/google?next=/pro");
  [302, 303, 307, 308].includes(google.status) ? ok("« Continuer avec Google » : redirection") : ko("« Continuer avec Google » : redirection", `HTTP ${google.status}`);
  const gBack = await get("/api/auth/google/retour?code=faux-code-de-test&state=x");
  [302, 303, 307, 308].includes(gBack.status) ? ok("retour de Google sans demande valable : refusé") : ko("retour de Google sans demande valable : refusé", `HTTP ${gBack.status}`);

  const cron = await get("/api/cron/pronos");
  cron.status === 401 ? ok("tâche planifiée refusée aux inconnus") : ko("tâche planifiée refusée aux inconnus", `HTTP ${cron.status}`);
}

// Newsletter du dimanche : l'état et l'inscription demandent un compte, la préparation du mail et son envoi un compte admin.
// Ici rien n'est écrit chez Resend et rien n'est programmé : aucune inscription, aucun envoi, aucun mail de test.
async function newsletterRoutes() {
  console.log("Newsletter");
  const anon = await get("/api/compte/newsletter");
  anon.status === 401 ? ok("newsletter : état refusé sans compte") : ko("newsletter : état refusé sans compte", `HTTP ${anon.status}`);
  const anonPost = await get("/api/compte/newsletter", { method: "POST", body: { action: "abonner", lang: "fr" } });
  [401, 403].includes(anonPost.status) ? ok("newsletter : inscription refusée sans compte") : ko("newsletter : inscription refusée sans compte", `HTTP ${anonPost.status}`);
  const cron = await get("/api/cron/newsletter");
  cron.status === 401 ? ok("newsletter : préparation de l'envoi refusée aux inconnus") : ko("newsletter : préparation de l'envoi refusée aux inconnus", `HTTP ${cron.status}`);
  const preview = await get("/api/cron/newsletter?dry=1&format=html");
  preview.status === 401 ? ok("newsletter : aperçu du mail refusé sans compte admin") : ko("newsletter : aperçu du mail refusé sans compte admin", `HTTP ${preview.status}`);
  // Lien « Confirme ton inscription » (page ouverte depuis l'e-mail, sans session) : un jeton absent, absurde ou forgé n'inscrit personne.
  const confirm = (body, headers) => get("/api/newsletter/confirmer", { method: "POST", body, headers });
  const forged = `${"A".repeat(60)}.${"B".repeat(43)}`;
  const c1 = await confirm({ action: "verifier", jeton: "abc", lang: "fr" });
  c1.status === 200 && /"valide":false/.test(c1.text) ? ok("confirmation : jeton absurde = lien non valable") : ko("confirmation : jeton absurde = lien non valable", `HTTP ${c1.status} ${c1.text.slice(0, 120)}`);
  const c2 = await confirm({ action: "confirmer", jeton: "abc", lang: "fr" });
  c2.status === 400 ? ok("confirmation : inscription refusée avec un jeton absurde") : ko("confirmation : inscription refusée avec un jeton absurde", `HTTP ${c2.status}`);
  const c3 = await confirm({ action: "confirmer", jeton: forged, lang: "fr" });
  [400, 503].includes(c3.status) && !/"subscribed":true/.test(c3.text) ? ok("confirmation : jeton forgé = aucune inscription (503 tant que la newsletter est fermée)") : ko("confirmation : jeton forgé = aucune inscription", `HTTP ${c3.status} ${c3.text.slice(0, 120)}`);
  const c4 = await confirm({ action: "autre", jeton: forged, lang: "fr" });
  c4.status === 400 ? ok("confirmation : action inconnue refusée") : ko("confirmation : action inconnue refusée", `HTTP ${c4.status}`);
  const c5 = await confirm({ action: "confirmer", jeton: forged, lang: "fr" }, { "sec-fetch-site": "cross-site" });
  c5.status === 403 ? ok("confirmation : requête venue d'un autre site refusée") : ko("confirmation : requête venue d'un autre site refusée", `HTTP ${c5.status}`);
  const c6 = await get("/api/newsletter/confirmer");
  c6.status === 405 ? ok("confirmation : lecture directe de l'adresse refusée (POST seulement)") : ko("confirmation : lecture directe de l'adresse refusée", `HTTP ${c6.status}`);
  if (!SECRET) return;
  const mine = await get("/api/compte/newsletter?lang=fr", { cookie: session("compte") });
  let j = null;
  try { j = JSON.parse(mine.text); } catch {}
  mine.status === 200 && j?.ok === true && typeof j.available === "boolean" && !/re_[A-Za-z0-9]{8}|Bearer/.test(mine.text)
    ? ok("newsletter : état pour un compte (fermée tant que la clé Resend et NEWSLETTER_ENABLED manquent), sans clé dans la réponse")
    : ko("newsletter : état pour un compte", `HTTP ${mine.status} ${mine.text.slice(0, 120)}`);
  for (const [name, path] of [["préparation de l'envoi", "/api/cron/newsletter"], ["mail de test", "/api/cron/newsletter?test=1"], ["diagnostic", "/api/cron/newsletter?diag=1"]]) {
    const r = await get(path, { cookie: session("lifetime") });
    r.status === 401 ? ok(`newsletter : ${name} refusé aux abonnés`) : ko(`newsletter : ${name} refusé aux abonnés`, `HTTP ${r.status}`);
  }
  const diag = await get("/api/cron/newsletter?diag=1", { cookie: session("lifetime", { role: "admin" }) });
  let d = null;
  try { d = JSON.parse(diag.text); } catch {}
  diag.status === 200 && d?.diag === true && d.config && !/re_[A-Za-z0-9]{8}|Bearer/.test(diag.text)
    ? ok("newsletter : diagnostic pour un admin (lecture seule), sans clé dans la réponse")
    : ko("newsletter : diagnostic pour un admin", `HTTP ${diag.status} ${diag.text.slice(0, 120)}`);
}

// Codes promo des créateurs : champ sur /pro dans les trois langues, et vérification publique d'un code (/api/promo).
// Sans base ou sans code connu, la réponse doit être un refus (« inconnu », ou « indisponible » en 503), jamais une remise.
async function promoCodes() {
  console.log("Codes promo");
  for (const [path, re, label] of [["/pro", /J(&#x27;|')ai un code promo/, "J'ai un code promo"], ["/en/pro", /I have a promo code/, "I have a promo code"], ["/es/pro", /Tengo un código promocional/, "Tengo un código promocional"]]) {
    const r = await get(path);
    re.test(r.text) ? ok(`${path} : champ « ${label} » proposé`) : ko(`${path} : champ « ${label} » proposé`, "libellé absent");
  }
  for (const [path, name] of [["/api/promo", "sans code"], ["/api/promo?code=a", "trop court"], ["/api/promo?code=%21%21%21%20", "symboles seuls"]]) {
    const r = await json(path);
    r.status === 200 && r.body?.ok === false && r.body.raison === "format" ? ok(`/api/promo : ${name} refusé`) : ko(`/api/promo : ${name} refusé`, `HTTP ${r.status} ${JSON.stringify(r.body)}`);
  }
  const unk = await json("/api/promo?code=TESTAUTO0000");
  const refused = unk.body?.ok === false && ((unk.status === 200 && unk.body.raison === "inconnu") || (unk.status === 503 && unk.body.raison === "indisponible"));
  refused ? ok("/api/promo : code inconnu jamais accepté") : ko("/api/promo : code inconnu jamais accepté", `HTTP ${unk.status} ${JSON.stringify(unk.body)}`);
  // Offre de dernière chance : éteinte tant qu'elle n'est pas réglée et confirmée par Whop (réponse vide, jamais un code), et
  // le diagnostic n'est lisible que par l'admin.
  if (LIVE) return offreEnLigne();
  const offre = await get("/api/offre");
  let oj = null;
  try { oj = JSON.parse(offre.text); } catch {}
  offre.status === 200 && oj && typeof oj === "object" && !oj.code && Object.keys(oj).length === 0 && /s-maxage/.test(offre.cache)
    ? ok("/api/offre : éteinte par défaut ({}), réponse gardée par le CDN")
    : ko("/api/offre : éteinte par défaut", `HTTP ${offre.status} ${offre.text.slice(0, 120)} (${offre.cache})`);
  const diagPublic = await get("/api/offre?diagnostic=1");
  diagPublic.status === 200 && !/raison|actif/.test(diagPublic.text) ? ok("/api/offre : diagnostic caché aux visiteurs") : ko("/api/offre : diagnostic caché aux visiteurs", diagPublic.text.slice(0, 120));
  // Les sessions de test ont la forme réelle : un admin porte role: "admin" (sans « admin »), « admin » vrai n'existe que pendant
  // l'aperçu d'une formule (role: null) ; un abonné ou un créateur ne voit jamais le diagnostic.
  const diagSeen = (r) => {
    try { const j = JSON.parse(r.text); return r.status === 200 && j?.actif === false && typeof j.raison === "string" && /no-store/.test(r.cache); } catch { return false; }
  };
  const diagAdmin = await get("/api/offre?diagnostic=1", { cookie: session("lifetime", { role: "admin" }) });
  diagSeen(diagAdmin)
    ? ok("/api/offre : diagnostic pour l'admin (offre éteinte), jamais mis en cache")
    : ko("/api/offre : diagnostic pour l'admin", `HTTP ${diagAdmin.status} ${diagAdmin.text.slice(0, 160)} (${diagAdmin.cache})`);
  const diagPreview = await get("/api/offre?diagnostic=1", { cookie: session("lifetime", { role: null, admin: true }) });
  diagSeen(diagPreview)
    ? ok("/api/offre : diagnostic aussi pendant l'aperçu d'une formule par l'admin")
    : ko("/api/offre : diagnostic pendant l'aperçu d'une formule", `HTTP ${diagPreview.status} ${diagPreview.text.slice(0, 160)}`);
  for (const [who, extra] of [["à un abonné", {}], ["à un créateur", { role: "createur" }]]) {
    const r = await get("/api/offre?diagnostic=1", { cookie: session("lifetime", extra) });
    r.status === 200 && !/raison|actif/.test(r.text) ? ok(`/api/offre : diagnostic caché ${who}`) : ko(`/api/offre : diagnostic caché ${who}`, r.text.slice(0, 120));
  }
  const promoOffre = await json("/api/promo?code=BIENVENUE10");
  promoOffre.body?.ok === false ? ok("/api/promo : le code de l'offre de sortie n'est jamais accepté tant qu'elle est éteinte") : ko("/api/promo : code de l'offre éteinte", JSON.stringify(promoOffre.body));
}

// Site en ligne : l'offre peut être activée (code et remise venant de Vercel, vérifiés auprès de Whop). On vérifie que la
// réponse est cohérente : vide si éteinte, sinon un code valide accepté par /api/promo avec la même remise, et le diagnostic
// toujours caché aux visiteurs.
async function offreEnLigne() {
  const offre = await get("/api/offre");
  let oj = null;
  try { oj = JSON.parse(offre.text); } catch {}
  const off = oj && typeof oj === "object" && Object.keys(oj).length === 0;
  const on = oj && /^[A-Z0-9]{3,32}$/.test(oj.code || "") && Number.isInteger(oj.pct) && oj.pct >= 1 && oj.pct <= 90;
  // Le CDN de Vercel garde s-maxage pour lui et ne renvoie au navigateur que « public, max-age=60 ».
  offre.status === 200 && (off || on) && /public/.test(offre.cache) && !/no-store|private/.test(offre.cache)
    ? ok(`/api/offre : ${on ? `active (${oj.code}, -${oj.pct} %)` : "éteinte"}, réponse publique (cache)`)
    : ko("/api/offre : réponse cohérente", `HTTP ${offre.status} ${offre.text.slice(0, 120)} (${offre.cache})`);
  const diagPublic = await get("/api/offre?diagnostic=1");
  diagPublic.status === 200 && !/raison|actif/.test(diagPublic.text) ? ok("/api/offre : diagnostic caché aux visiteurs") : ko("/api/offre : diagnostic caché aux visiteurs", diagPublic.text.slice(0, 120));
  if (!on) return;
  const promo = await json(`/api/promo?code=${encodeURIComponent(oj.code)}`);
  promo.body?.ok === true && promo.body.pct === oj.pct
    ? ok("/api/promo : le code de l'offre active est accepté avec la même remise")
    : ko("/api/promo : code de l'offre active", JSON.stringify(promo.body));
}

// Widget à intégrer : page HTML autonome, gardée par le CDN, intégrable par d'autres sites (le reste du site ne l'est pas).
async function widgetRoute() {
  console.log("Widget");
  for (const [lang, re] of [["fr", /Probabilités NBA/], ["en", /NBA win probabilities/], ["es", /Probabilidades NBA/]]) {
    const res = await fetch(`${BASE}/api/widget?lang=${lang}`, { headers: { "user-agent": "basketlog-tests" } });
    const text = await res.text();
    const csp = res.headers.get("content-security-policy") || "";
    res.status === 200 && re.test(text) && /Basketlog/.test(text) && /public/.test(res.headers.get("cache-control") || "") && /frame-ancestors \*/.test(csp) && !res.headers.get("x-frame-options")
      ? ok(`/api/widget (${lang}) : HTML, lien Basketlog, cache public, intégrable partout`)
      : ko(`/api/widget (${lang})`, `HTTP ${res.status} csp=${csp} xfo=${res.headers.get("x-frame-options")} ${text.slice(0, 80)}`);
  }
  const page = await fetch(`${BASE}/widget`, { headers: { "user-agent": "basketlog-tests" } });
  const ptext = await page.text();
  page.status === 200 && /api\/widget\?lang=fr/.test(ptext) && /frame-ancestors 'self'/.test(page.headers.get("content-security-policy") || "")
    ? ok("/widget : aperçu et code d'intégration, la page elle-même reste non intégrable")
    : ko("/widget", `HTTP ${page.status} csp=${page.headers.get("content-security-policy")}`);
}

async function videosApi() {
  console.log("Données des vidéos");
  const r = await get("/api/videos");
  if (r.status === 503) return skip("/api/videos", "données NBA indisponibles");
  try {
    const j = JSON.parse(r.text);
    Array.isArray(j.games) && Array.isArray(j.rows) ? ok(`/api/videos (${j.games.length} matchs)`) : ko("/api/videos", "format inattendu");
  } catch {
    ko("/api/videos", `réponse illisible (HTTP ${r.status})`);
  }
}

await pages();
await access();
await protectedRoutes();
await newsletterRoutes();
await promoCodes();
await videosApi();
await widgetRoute();
{ const u = await unit(); passed += u.passed; failed += u.failed; } // traduction des avis (sans serveur)
console.log(`\n${passed} réussis, ${failed} en échec, ${skipped} ignorés`);
process.exit(failed ? 1 : 0);
