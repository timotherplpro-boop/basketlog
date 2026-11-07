// Tests avant mise en ligne : pages principales, accès par formule (visiteur, compte gratuit, Starter, Pro, Lifetime),
// avis, espace admin, routes protégées. Usage : SESSION_SECRET=... node tests/smoke.mjs http://localhost:3000
// Les sessions de test sont signées avec SESSION_SECRET, comme celles du site (cookie bl_pro).
import crypto from "node:crypto";
import { unit } from "./unit.mjs";

const BASE = (process.argv[2] || process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const SECRET = process.env.SESSION_SECRET || "";
let failed = 0, passed = 0, skipped = 0;
const ok = (name) => { passed++; console.log(`  ok   ${name}`); };
const ko = (name, why) => { failed++; console.log(`  ÉCHEC ${name} : ${why}`); };
const skip = (name, why) => { skipped++; console.log(`  --   ${name} (${why})`); };

function session(tier, extra = {}) {
  const data = Buffer.from(JSON.stringify({ uid: `test-${tier}`, name: "Test", tier, paid: tier === "compte" ? null : tier, role: null, v: 2, checked: Date.now(), ...extra })).toString("base64url");
  return `bl_pro=${data}.${crypto.createHmac("sha256", SECRET).update(data).digest("base64url")}`;
}

async function get(path, { cookie, method = "GET", body } = {}) {
  const res = await fetch(BASE + path, {
    method, redirect: "manual",
    headers: { ...(cookie ? { cookie } : {}), ...(body ? { "content-type": "application/json" } : {}), "user-agent": "basketlog-tests" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, text: await res.text() };
}

const ERROR_PAGE = /Une erreur est survenue|Application error|Internal Server Error/i;

async function pages() {
  console.log("Pages");
  for (const p of ["/", "/en", "/es", "/analyse-basket", "/en/analyse-basket", "/es/analyse-basket", "/pronostic-basket", "/en/pronostic-basket", "/es/pronostic-basket", "/app", "/app/matchs", "/app/bilan", "/app/bilan?l=pub", "/app/classement", "/app/euroleague", "/pro", "/avis", "/en/avis", "/es/avis", "/methode", "/cgu", "/cgv", "/confidentialite", "/mentions-legales", "/cookies", "/sitemap.xml", "/robots.txt"]) {
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
  /n&#x27;as accès qu&#x27;à|n'as accès qu'à/.test(v.text) ? ok("visiteur : analyse verrouillée") : ko("visiteur : analyse verrouillée", "verrou absent");
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
  const api = await get("/api/admin", { method: "POST", body: { action: "avis_publier", id: "x" } });
  [401, 403, 404].includes(api.status) ? ok("API admin refusée sans session") : ko("API admin refusée sans session", `HTTP ${api.status}`);
  const avis = await get("/api/avis", { method: "POST", body: { prenom: "Test", note: 5, texte: "Test automatique, ne pas publier.", elapsed: 10000 } });
  [401, 403].includes(avis.status) ? ok("avis refusé sans compte") : ko("avis refusé sans compte", `HTTP ${avis.status}`);
  if (SECRET) {
    const avis2 = await get("/api/avis", { method: "POST", cookie: session("compte"), body: { prenom: "Test", note: 5, texte: "Test automatique, ne pas publier.", elapsed: 10000 } });
    [401, 403, 503].includes(avis2.status) ? ok("avis refusé à un compte gratuit") : ko("avis refusé à un compte gratuit", `HTTP ${avis2.status}`);
  }
  const cron = await get("/api/cron/pronos");
  cron.status === 401 ? ok("tâche planifiée refusée aux inconnus") : ko("tâche planifiée refusée aux inconnus", `HTTP ${cron.status}`);
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
await videosApi();
{ const u = await unit(); passed += u.passed; failed += u.failed; } // traduction des avis (sans serveur)
console.log(`\n${passed} réussis, ${failed} en échec, ${skipped} ignorés`);
process.exit(failed ? 1 : 0);
