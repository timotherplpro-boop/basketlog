// Tests de la newsletter du dimanche (sans serveur ni réseau) : créneau d'envoi 18 h à Paris, semaine ISO, contenu du mail en
// français, anglais et espagnol, client Resend simulé (inscription, désinscription, suppression, diffusion, erreurs),
// lecture de l'adresse chez Whop, e-mail de confirmation des comptes Basketlog (lien signé, limites d'envoi) et retrait de la liste
// à la suppression d'un compte. Appelé par tests/unit.mjs.
import {
  BILAN_MIN, MAX_SHOWN, PLACEHOLDER, afterSend, buildIssue, clearestFavorites, isoWeek, issueName, parisToUtc, runWindow, sundaySlot, weekBilan,
} from "../lib/newsletter.js";
import { CONSENT_PROP, ResendError, SEGMENT_NAME, createResend, isEmail, maskEmail, newsletterConfig, normEmail, topicName } from "../lib/resend.js";
import { WhopEmailError, memberEmail } from "../lib/whop-email.js";
import { forgetNewsletter, rehearseBroadcast, scheduleWeek } from "../lib/newsletter-server.js";
import { CONFIRM_LIMITS, CONFIRM_TOKEN_RE, CONFIRM_TTL_MS, checkConfirmation, confirmLink, emailTag, makeConfirm, readConfirm, requestConfirmation } from "../lib/newsletter-confirm.js";
import { confirmEmail } from "../lib/mail.js";
import { signToken } from "../lib/switch.js";
import crypto from "node:crypto";

// ---------- Un « faux Resend » en mémoire : les routes de l'API REST dont le client a besoin ----------
function fakeResend(opts = {}) {
  const st = { segments: [], topics: [], props: [], contacts: [], broadcasts: [], emails: [], domains: [], calls: [], seq: 0 };
  const nid = (p) => `${p}_${++st.seq}`;
  const res = (status, body, headers = {}) => ({ ok: status >= 200 && status < 300, status, headers: { get: (k) => headers[String(k).toLowerCase()] ?? null }, json: async () => body });
  const find = (key) => st.contacts.find((c) => c.id === key || c.email === decodeURIComponent(key).toLowerCase());
  async function fetch(url, init = {}) {
    const u = new URL(url);
    const method = init.method || "GET";
    const path = u.pathname;
    const body = init.body ? JSON.parse(init.body) : undefined;
    st.calls.push({ method, path: decodeURIComponent(path), query: u.search, body, headers: init.headers || {} });
    if (opts.intercept) { const r = opts.intercept(method, path, st); if (r) return r; }
    let m;
    if (method === "GET" && path === "/segments") return res(200, { data: st.segments, has_more: false });
    if (method === "POST" && path === "/segments") { const s = { id: nid("seg"), name: body.name }; st.segments.push(s); return res(200, s); }
    if (method === "GET" && path === "/topics") return res(200, { data: st.topics });
    if (method === "POST" && path === "/topics") { const t = { id: nid("top"), name: body.name, description: body.description, default_subscription: body.default_subscription }; st.topics.push(t); return res(200, t); }
    if (method === "GET" && path === "/contact-properties") return res(200, { data: st.props, has_more: false });
    if (method === "POST" && path === "/contact-properties") { st.props.push({ key: body.key, type: body.type }); return res(200, { key: body.key }); }
    if (method === "GET" && path === "/domains") return res(200, { data: st.domains, has_more: false });
    if (method === "GET" && path === "/contacts") {
      const sid = u.searchParams.get("segment_id");
      return res(200, { data: st.contacts.filter((c) => !sid || c.segments.includes(sid)).slice(0, Number(u.searchParams.get("limit") || 100)), has_more: false });
    }
    if (method === "POST" && path === "/contacts") {
      if (find(body.email)) return res(409, { message: "Contact already exists" });
      const c = { id: nid("con"), email: body.email.toLowerCase(), unsubscribed: !!body.unsubscribed, properties: body.properties || {}, topics: {}, segments: [] };
      st.contacts.push(c);
      return res(200, { id: c.id });
    }
    if ((m = path.match(/^\/contacts\/([^/]+)$/))) {
      const c = find(m[1]);
      if (method === "GET") return c ? res(200, c) : res(404, { message: "Contact not found" });
      if (!c) return res(404, { message: "Contact not found" });
      if (method === "PATCH") { Object.assign(c.properties, body.properties || {}); return res(200, { id: c.id }); }
      if (method === "DELETE") { st.contacts = st.contacts.filter((x) => x !== c); return res(200, { deleted: true }); }
    }
    if ((m = path.match(/^\/contacts\/([^/]+)\/topics$/))) {
      const c = find(m[1]);
      if (!c) return res(404, { message: "Contact not found" });
      // Comme l'API réelle : le corps est directement la liste [{ id, subscription }] ; un objet { topics: [...] } est refusé (422).
      if (method === "PATCH") { if (!Array.isArray(body)) return res(422, { message: "The `` field must be an `array`." }); if (!opts.ignoreTopicWrites) for (const t of body) c.topics[t.id] = t.subscription; return res(200, { id: c.id }); }
      if (method === "GET") return res(200, { data: st.topics.map((t) => ({ id: t.id, name: t.name, subscription: c.topics[t.id] || t.default_subscription })), has_more: false });
    }
    if ((m = path.match(/^\/contacts\/([^/]+)\/segments$/)) && method === "GET") {
      const c = find(m[1]);
      return c ? res(200, { data: c.segments.map((sid) => st.segments.find((s) => s.id === sid)), has_more: false }) : res(404, { message: "Contact not found" });
    }
    if ((m = path.match(/^\/contacts\/([^/]+)\/segments\/([^/]+)$/))) {
      const c = find(m[1]);
      if (!c) return res(404, { message: "Contact not found" });
      if (method === "POST") { if (c.segments.includes(m[2])) return res(409, { message: "already in segment" }); c.segments.push(m[2]); return res(200, { id: c.id }); }
      if (method === "DELETE") { c.segments = c.segments.filter((x) => x !== m[2]); return res(200, { deleted: true }); }
    }
    if (path === "/broadcasts" && method === "GET") return res(200, { data: st.broadcasts, has_more: false });
    if (path === "/broadcasts" && method === "POST") { const b = { id: nid("bro"), status: "draft", ...body }; st.broadcasts.push(b); return res(200, { id: b.id }); }
    if ((m = path.match(/^\/broadcasts\/([^/]+)\/send$/)) && method === "POST") {
      const b = st.broadcasts.find((x) => x.id === m[1]);
      if (!b) return res(404, { message: "Broadcast not found" });
      b.status = "queued"; b.scheduled_at = body?.scheduled_at || null;
      return res(200, { id: b.id });
    }
    if ((m = path.match(/^\/broadcasts\/([^/]+)$/))) {
      const b = st.broadcasts.find((x) => x.id === m[1]);
      if (!b) return res(404, { message: "Broadcast not found" });
      if (method === "GET") return res(200, b);
      if (method === "DELETE") { st.broadcasts = st.broadcasts.filter((x) => x !== b); return res(200, { deleted: true }); }
    }
    if (path === "/emails" && method === "POST") { st.emails.push({ ...body, key: (init.headers || {})["Idempotency-Key"] }); return res(200, { id: nid("em") }); }
    return res(404, { message: "route inconnue du faux Resend" });
  }
  return { st, fetch, res };
}
const noSleep = async () => {};
const mkClient = (opts) => { const f = fakeResend(opts); return { ...f, client: createResend({ key: "re_test_key_123456789", fetch: f.fetch, sleep: noSleep }) }; };
const calls = (st, method, re) => st.calls.filter((c) => c.method === method && re.test(c.path));

export async function newsletterTests({ ok, ko, eq }) {
  console.log("Newsletter du dimanche");
  const P = (iso) => Date.parse(iso);

  // --- Créneau d'envoi : dimanche 18 h à Paris, été comme hiver
  const slot = (iso) => { const s = sundaySlot(P(iso)); return [s.local, s.iso, s.week.label]; };
  eq("Créneau : lundi 9 novembre 2026 (hiver) = dimanche 15 novembre à 18 h = 17 h UTC, semaine 46", slot("2026-11-09T19:06:00Z"), ["2026-11-15", "2026-11-15T17:00:00.000Z", "2026-W46"]);
  eq("Créneau : été (UTC+2) = 16 h UTC", slot("2026-07-06T10:00:00Z"), ["2026-07-12", "2026-07-12T16:00:00.000Z", "2026-W28"]);
  eq("Créneau : le dimanche du passage à l'heure d'été (29 mars 2026) = 18 h à 16 h UTC", slot("2026-03-23T10:00:00Z"), ["2026-03-29", "2026-03-29T16:00:00.000Z", "2026-W13"]);
  eq("Créneau : le dimanche du retour à l'heure d'hiver (25 octobre 2026) = 18 h à 17 h UTC", slot("2026-10-19T10:00:00Z"), ["2026-10-25", "2026-10-25T17:00:00.000Z", "2026-W43"]);
  eq("Créneau : le matin du changement d'heure (29 mars, 1 h 30 à Paris) = le jour même", slot("2026-03-29T00:30:00Z"), ["2026-03-29", "2026-03-29T16:00:00.000Z", "2026-W13"]);
  eq("Créneau : dimanche avant 18 h = le jour même", slot("2026-11-15T12:11:00Z"), ["2026-11-15", "2026-11-15T17:00:00.000Z", "2026-W46"]);
  eq("Créneau : dimanche 17 h 59 à Paris = encore le jour même", slot("2026-11-15T16:59:00Z")[0], "2026-11-15");
  eq("Créneau : dimanche 18 h pile ou après = dimanche suivant", [slot("2026-11-15T17:00:00Z")[0], slot("2026-11-15T17:30:00Z")[0]], ["2026-11-22", "2026-11-22"]);
  eq("Créneau : samedi 23 h 30 UTC = dimanche 0 h 30 à Paris = ce dimanche", slot("2026-11-14T23:30:00Z")[0], "2026-11-15");
  eq("Créneau : samedi soir à Paris = le lendemain", slot("2026-11-14T20:00:00Z")[0], "2026-11-15");
  eq("Créneau : accepte une Date ou un texte ISO", [sundaySlot(new Date("2026-11-09T19:06:00Z")).iso, sundaySlot("2026-11-09T19:06:00Z").iso], ["2026-11-15T17:00:00.000Z", "2026-11-15T17:00:00.000Z"]);
  eq("Créneau : l'heure d'envoi tombe toujours à 18 h à Paris toute l'année (52 dimanches de suite)", (() => {
    const bad = [];
    for (let d = 0; d < 365; d += 7) {
      const s = sundaySlot(P("2026-01-01T10:00:00Z") + d * 86400e3);
      const h = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(s.at));
      const wd = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(s.at);
      if (h !== 18 || wd !== "Sun") bad.push(s.iso);
    }
    return bad;
  })(), []);
  eq("Heure de Paris → UTC : hiver, été", [new Date(parisToUtc(2026, 11, 15, 18, 0)).toISOString(), new Date(parisToUtc(2026, 7, 12, 18, 0)).toISOString()], ["2026-11-15T17:00:00.000Z", "2026-07-12T16:00:00.000Z"]);

  eq("Semaine ISO : dimanche 15 novembre 2026 = 2026-W46", isoWeek(2026, 11, 15).label, "2026-W46");
  eq("Semaine ISO : le dimanche appartient à la semaine qui finit ce jour-là, le lundi ouvre la suivante", [isoWeek(2026, 11, 15).label, isoWeek(2026, 11, 16).label], ["2026-W46", "2026-W47"]);
  eq("Semaine ISO : fin d'année (3 janvier 2027 = 2026-W53) et début d'année (1er janvier 2026 = W01, 30 décembre 2024 = 2025-W01)", [isoWeek(2027, 1, 3).label, isoWeek(2026, 1, 1).label, isoWeek(2024, 12, 30).label], ["2026-W53", "2026-W01", "2025-W01"]);
  eq("Nom de la diffusion : un par semaine et par langue", [issueName("2026-W46", "fr"), issueName("2026-W46", "en")], ["Newsletter 2026-W46 fr", "Newsletter 2026-W46 en"]);

  // --- Fenêtre de programmation : dans les 8 h qui précèdent l'envoi, au moins 5 min avant
  const open = (iso) => runWindow(P(iso)).open;
  eq("Fenêtre : le dimanche à 13 h 11 et 14 h 41 (Paris, hiver) = ouverte", [open("2026-11-15T12:11:00Z"), open("2026-11-15T13:41:00Z")], [true, true]);
  eq("Fenêtre : le dimanche d'été à 14 h 11 et 15 h 41 (Paris) = ouverte", [open("2026-07-12T12:11:00Z"), open("2026-07-12T13:41:00Z")], [true, true]);
  eq("Fenêtre : 9 h et 10 h d'avance = fermée au-delà de 8 h, ouverte en dessous", [open("2026-11-15T08:59:00Z"), open("2026-11-15T09:01:00Z")], [false, true]);
  eq("Fenêtre : moins de 5 minutes avant l'envoi, ou après 18 h = fermée", [open("2026-11-15T16:56:00Z"), open("2026-11-15T16:54:00Z"), open("2026-11-15T17:01:00Z")], [false, true, false]);
  eq("Fenêtre : un lundi ou un mercredi = fermée (jamais une semaine à l'avance)", [open("2026-11-09T19:00:00Z"), open("2026-11-11T12:00:00Z")], [false, false]);

  // --- Bilan des 7 jours : les pronostics publiés priment, jamais mélangés avec le bilan recalculé
  const g = (okN, n, conf) => Array.from({ length: n }, (_, i) => ({ ok: i < okN, conf: conf || "Moyenne" }));
  eq("Bilan : pronostics publiés, avec la part « confiance très élevée »", weekBilan([...g(3, 4), { ok: true, conf: "Très élevée" }, { ok: false, conf: "Très élevée" }], []), { n: 6, ok: 4, sureN: 2, sureOk: 1, source: "published" });
  eq("Bilan : aucun pronostic publié = bilan recalculé", weekBilan([], g(5, 7)), { n: 7, ok: 5, sureN: 0, sureOk: 0, source: "recalculated" });
  eq("Bilan : quelques pronostics publiés (moins de 5) = pas de bilan, on ne mélange pas avec le recalculé", weekBilan(g(2, 3), g(5, 20)), null);
  eq("Bilan : moins de 5 matchs = pas de bilan (les deux sources)", [weekBilan(g(3, BILAN_MIN - 1), []), weekBilan([], g(3, BILAN_MIN - 1)), weekBilan(null, null), weekBilan(undefined, undefined)], [null, null, null, null]);

  // --- Contenu du mail
  const team = (abbr, short) => ({ abbr, short, name: short });
  const sample = {
    at: "2026-11-15T17:00:00.000Z", week: "2026-W46",
    bilan: { n: 62, ok: 41, sureN: 14, sureOk: 13, source: "published" },
    sure: [
      { league: "NBA", href: "/app/match/401?d=20261115", date: "2026-11-15T18:00:00Z", home: team("OKC", "Thunder"), away: team("UTA", "Jazz"), pHome: 0.93 },
      { league: "EL", href: "/app/euroleague/match/77", date: "2026-11-17T19:30:00Z", home: team("RMB", "Real Madrid"), away: team("PAR", "Paris"), pHome: 0.12 },
    ],
    favorites: [], record: { n: 120, ok: 108, since: 2026 },
  };
  const fr = buildIssue(sample, "fr"), en = buildIssue(sample, "en"), es = buildIssue(sample, "es");
  eq("Mail FR : objet, bilan chiffré, pourcentage, repère de campagne", [fr.subject, fr.html.includes("41 matchs</b> sur 62") || fr.html.includes("41 matchs sur 62"), fr.text.includes("41 matchs sur 62 (66 %)"), fr.html.includes("utm_campaign=2026-W46")], ["Basketlog · 2 matchs à confiance très élevée cette semaine", true, true, true]);
  eq("Mail FR : liens vers le site sans préfixe de langue, avec le repère de campagne", [fr.html.includes("https://basketlog-app.com/app/bilan?utm_source=newsletter&amp;utm_medium=email&amp;utm_campaign=2026-W46"), fr.html.includes("https://basketlog-app.com/app/match/401?d=20261115&amp;utm_source=newsletter")], [true, true]);
  eq("Mail FR : lien de désinscription = la balise de Resend, dans le HTML et le texte", [fr.html.includes(PLACEHOLDER), fr.text.includes(`Se désinscrire : ${PLACEHOLDER}`)], [true, true]);
  eq("Mail EN : liens en /en, objet et bilan en anglais", [en.html.includes("https://basketlog-app.com/en/app/bilan?"), en.subject, en.text.includes("41 of 62 games (66%)")], [true, "Basketlog · 2 very-high-confidence games this week", true]);
  eq("Mail ES : liens en /es, objet et bilan en espagnol", [es.html.includes("https://basketlog-app.com/es/app/bilan?"), es.subject, es.text.includes("41 de 62 partidos")], [true, "Basketlog · 2 partidos de confianza muy alta esta semana", true]);
  eq("Mail : lang de la page, aperçu, titre", [fr.html.includes('<html lang="fr"'), en.html.includes('<html lang="en"'), es.html.includes('<html lang="es"'), fr.preheader.startsWith("Le favori de Basketlog a gagné 41 matchs sur 62")], [true, true, true, true]);
  eq("Mail : mentions de l'éditeur (nom, SIREN) et aide Joueurs Info Service dans les trois langues", [fr, en, es].map((x) => x.text.includes("Timothé Ramplou") && x.text.includes("925 107 740") && x.text.includes("09 74 75 13 13")), [true, true, true]);
  const idLine = (x) => x.text.split("\n").find((l) => l.includes("925 107 740"));
  eq("Mail : mention de l'éditeur sans double parenthèse, adresse en espagnol (« Francia »), SIREN en toutes lettres", [fr, en, es].map(idLine), [
    "Basketlog est édité par Timothé Ramplou, entrepreneur individuel (SIREN 925 107 740), 14 rue d’Aubuisson, 31000 Toulouse, France.",
    "Basketlog is published by Timothé Ramplou, sole proprietor (French micro-entreprise), 14 rue d’Aubuisson, 31000 Toulouse, France. SIREN 925 107 740.",
    "Basketlog está editado por Timothé Ramplou, empresario individual (micro-entreprise francesa), 14 rue d’Aubuisson, 31000 Toulouse, Francia. SIREN 925 107 740.",
  ]);
  eq("Mail : texte brut, l'espace avant les deux-points est une règle du français (ni en anglais ni en espagnol)", [fr, en, es].map((x) => / :/.test(x.text)), [true, false, false]);
  eq("Mail : le bloc « confiance très élevée » reprend les mots du site (« favori à 88 % et plus »)", [fr, en, es].map((x) => x.text.split("\n").find((l) => /88/.test(l) && /NBA/.test(l))), [
    "Les matchs avec un favori à 88\u202f% et plus, NBA et EuroLeague (heure de Paris).",
    "Games with a favorite at 88% or more, NBA and EuroLeague (ET).",
    "Partidos con un favorito al 88\u202f% o más, NBA y Euroliga (hora de España).",
  ]);
  eq("Mail : lien « Mon compte » et confidentialité sans repère de campagne (liens de gestion), dans la bonne langue", [fr.text.includes("https://basketlog-app.com/app/compte"), en.text.includes("https://basketlog-app.com/en/confidentialite"), es.text.includes("https://basketlog-app.com/es/app/compte")], [true, true, true]);
  eq("Mail : ligne « confiance très élevée » du bilan et ligne de bilan recalculé depuis 2025-26", [fr.text.includes("Confiance très élevée : 13 sur 14"), fr.text.includes("Bilan recalculé depuis 2025-26 : nos favoris en confiance très élevée ont gagné 108 matchs sur 120")], [true, true]);
  eq("Mail : le favori d'un match est le côté le plus probable (Real Madrid à 88 % pour pHome 0,12 → l'extérieur Paris 88 %)", fr.text.includes("favori : Paris 88 %"), true);
  eq("Mail : pas vide avec un bilan ou des matchs ; vide sans rien", [fr.empty, buildIssue({ bilan: null, sure: [], favorites: [] }, "fr").empty, buildIssue({ bilan: { n: 4, ok: 4, sureN: 0, sureOk: 0 }, sure: [], favorites: [] }, "fr").empty, buildIssue({ bilan: null, sure: sample.sure }, "fr").empty], [false, true, true, false]);
  eq("Mail : pourcentage seulement à partir de 10 matchs (« 7 sur 9 » sinon)", [buildIssue({ bilan: { n: 9, ok: 7, sureN: 0, sureOk: 0 }, sure: [] }, "fr").text.includes("7 matchs sur 9."), buildIssue({ bilan: { n: 10, ok: 7, sureN: 0, sureOk: 0 }, sure: [] }, "fr").text.includes("7 matchs sur 10 (70 %).")], [true, true]);
  eq("Mail : « 1 match » au singulier", buildIssue({ bilan: { n: 5, ok: 1, sureN: 0, sureOk: 0 }, sure: [] }, "fr").text.includes("1 match sur 5"), true);
  const many = Array.from({ length: MAX_SHOWN + 3 }, (_, i) => ({ league: "NBA", href: `/app/match/${i}?d=20261115`, date: `2026-11-1${5 + (i % 3)}T20:00:00Z`, home: team("AAA", `Dom${i}`), away: team("BBB", `Ext${i}`), pHome: 0.9 }));
  const long = buildIssue({ ...sample, sure: many }, "fr");
  eq("Mail : au plus 10 matchs listés, le reste résumé en une ligne", [(long.text.match(/^- /gm) || []).length, long.text.includes("+ 3 autres matchs à confiance très élevée dans l'appli")], [MAX_SHOWN, true]);
  const fav = buildIssue({ bilan: null, sure: [], favorites: sample.sure }, "fr");
  eq("Mail : sans match à confiance très élevée, les favoris les plus nets (titre et objet adaptés)", [fav.subject, fav.text.includes("LES FAVORIS LES PLUS NETS DE LA SEMAINE")], ["Basketlog · le bilan de la semaine et les matchs à suivre", true]);
  eq("Mail : la ligne de bilan recalculé n'apparaît pas pour les favoris, ni sous 20 matchs", [fav.text.includes("Bilan recalculé"), buildIssue({ ...sample, record: { n: 19, ok: 19, since: 2026 } }, "fr").text.includes("Bilan recalculé")], [false, false]);
  const danger = buildIssue({ ...sample, sure: [{ ...sample.sure[0], home: team("X", '<b onclick="x">Y</b> & Co'), away: team("Z", "Zed") }] }, "fr");
  eq("Mail : noms d'équipes échappés dans le HTML (rien d'injectable), tels quels dans le texte", [danger.html.includes('<b onclick'), danger.html.includes("&lt;b onclick=&quot;x&quot;&gt;Y&lt;/b&gt; &amp; Co"), danger.text.includes('<b onclick="x">Y</b> & Co')], [false, true, true]);
  eq("Mail : lien de désinscription fourni par l'appelant (test envoyé à l'admin)", [buildIssue({ ...sample, unsubscribeUrl: "https://basketlog-app.com/app/compte" }, "fr").html.includes(PLACEHOLDER), buildIssue({ ...sample, unsubscribeUrl: "https://basketlog-app.com/app/compte" }, "fr").text.includes("Se désinscrire : https://basketlog-app.com/app/compte")], [false, true]);
  eq("Mail : HTML clair uniquement, sans script ni image distante", [fr.html.includes('name="color-scheme" content="light only"'), /<script|<img/i.test(fr.html)], [true, false]);
  // Basketlog donne des probabilités : aucun vocabulaire de paris dans le corps du mail (le pied de page cite l'aide aux joueurs).
  const body = (x) => x.text.split("\n--\n")[0];
  const bets = { fr: /\b(pari|paris|parier|pariez|parie|cote|cotes|mise|mises|bookmakers?|pronostiqueurs?)\b/, en: /\b(bet|bets|betting|odds|wager|stake|bookmakers?|tipster)\b/i, es: /\b(apuesta|apuestas|apostar|cuota|cuotas|casas de apuestas)\b/i };
  eq("Mail : aucun vocabulaire de paris dans le corps (FR, EN, ES)", [bets.fr.test(body(fr)), bets.en.test(body(en)), bets.es.test(body(es))], [false, false, false]);
  eq("Mail : mêmes remarques sur le HTML (hors pied de page)", [fr, en, es].map((x, i) => [bets.fr, bets.en, bets.es][i].test(x.html.split("<tr><td bgcolor=\"#f3f4f6\"")[0].replace(/<[^>]+>/g, " "))), [false, false, false]);
  const clear = clearestFavorites([
    { id: "1", d: "20261115", date: "2026-11-15T20:00:00Z", home: team("A", "A"), away: team("B", "B"), pHome: 0.6 },
    { id: "2", d: "20261115", date: "2026-11-15T19:00:00Z", home: team("C", "C"), away: team("D", "D"), pHome: 0.1 },
    { id: "3", d: "20261116", date: "2026-11-16T19:00:00Z", home: team("E", "E"), away: team("F", "F"), pHome: 0.8, live: true },
    { id: "4", d: "20261116", date: "2026-11-16T21:00:00Z", home: team("G", "G"), away: team("H", "H"), pHome: 0.7 },
    { id: "5", d: "20261117", date: "2026-11-17T21:00:00Z", home: null, away: team("H", "H"), pHome: 0.99 },
  ], 2);
  eq("Favoris les plus nets : les 2 plus nets, hors matchs en cours ou incomplets, classés par heure", clear.map((x) => x.href), ["/app/match/2?d=20261115", "/app/match/4?d=20261116"]);

  // --- Envoi à 18 h : le mail est préparé à 13 h 11, un match déjà commencé à l'heure d'envoi sort de la liste
  {
    const at = "2026-11-15T17:00:00.000Z"; // dimanche 18 h à Paris
    const pick = (id, date) => ({ league: "NBA", href: `/app/match/${id}?d=20261115`, date, home: team("A", `A${id}`), away: team("B", `B${id}`), pHome: 0.9 });
    const ids = (list) => list.map((p) => p.href.match(/match\/(\d+)/)[1]);
    const data = {
      at, week: "2026-W46", bilan: sample.bilan, record: sample.record,
      sure: [pick(1, "2026-11-15T12:30:00Z"), pick(2, at), pick(3, "2026-11-15T17:00:01Z"), pick(4, "2026-11-16T00:30:00Z"), pick(5, undefined), pick(6, "pas une date")],
      favorites: [pick(7, "2026-11-15T16:00:00Z"), pick(8, "2026-11-15T20:00:00Z")],
    };
    const out = afterSend(data);
    eq("Envoi 18 h : un match commencé avant l'heure d'envoi, ou à l'instant même, sort de la liste ; les suivants restent dans l'ordre", ids(out.sure), ["3", "4", "5", "6"]);
    eq("Envoi 18 h : un match sans date lisible reste (on ne retire que ce qu'on sait être passé)", [ids(out.sure).includes("5"), ids(out.sure).includes("6")], [true, true]);
    eq("Envoi 18 h : les favoris de repli sont filtrés de la même façon", ids(out.favorites), ["8"]);
    eq("Envoi 18 h : le reste du contenu est intact et l'original n'est pas modifié", [out.bilan === data.bilan, out.record === data.record, out.week, out.at, data.sure.length, data.favorites.length], [true, true, "2026-W46", at, 6, 2]);
    eq("Envoi 18 h : l'heure d'envoi peut être donnée à part (avant tous les matchs : rien de retiré ; après : seuls les matchs sans date restent)", [afterSend(data, "2026-11-15T10:00:00Z").sure.length, afterSend(data, "2026-11-16T12:00:00Z").sure.length], [6, 2]);
    const noAt = { ...data, at: undefined };
    eq("Envoi 18 h : sans heure d'envoi lisible, rien n'est retiré", [afterSend(noAt) === noAt, afterSend({ sure: data.sure }).sure.length, afterSend(data, "n'importe quoi").sure.length, afterSend().sure === undefined], [true, 6, 6, true]);
    const early = buildIssue(afterSend({ ...sample, sure: [pick(9, "2026-11-15T12:30:00Z"), ...sample.sure] }), "fr");
    eq("Envoi 18 h : l'objet compte les matchs restants, pas ceux déjà commencés", [early.subject, early.text.includes("A9")], ["Basketlog · 2 matchs à confiance très élevée cette semaine", false]);
  }

  // --- Adresse e-mail : contrôle et masque
  eq("Adresse : validation et normalisation", [isEmail("tim@gmail.com"), isEmail("tim@gmail"), isEmail("a b@x.fr"), isEmail("<a@b.fr>"), isEmail(""), isEmail(null), normEmail("  Tim@Gmail.COM ")], [true, false, false, false, false, false, "tim@gmail.com"]);
  eq("Adresse : masque « tim***@gmail.com », jamais l'adresse entière", [maskEmail("timothe@gmail.com"), maskEmail("ab@x.fr"), maskEmail(""), maskEmail("pas-une-adresse")], ["tim***@gmail.com", "a***@x.fr", "", ""]);

  // --- Réglages par variables d'environnement
  eq("Réglages : sans clé, tout est fermé", [newsletterConfig({}).ready, newsletterConfig({}).enabled, newsletterConfig({ NEWSLETTER_ENABLED: "1" }).enabled], [false, false, false]);
  eq("Réglages : clé seule = branché mais fermé ; clé + NEWSLETTER_ENABLED=1 = ouvert", [newsletterConfig({ RESEND_API_KEY: "re_x" }).ready, newsletterConfig({ RESEND_API_KEY: "re_x" }).enabled, newsletterConfig({ RESEND_API_KEY: "re_x", NEWSLETTER_ENABLED: "1" }).enabled, newsletterConfig({ RESEND_API_KEY: "re_x", NEWSLETTER_ENABLED: "true" }).enabled], [true, false, true, false]);
  eq("Réglages : langues ouvertes (français par défaut, valeurs inconnues ignorées, doublons retirés)", [newsletterConfig({}).langs, newsletterConfig({ NEWSLETTER_LANGS: "fr, en,xx,en" }).langs, newsletterConfig({ NEWSLETTER_LANGS: "xx" }).langs], [["fr"], ["fr", "en"], ["fr"]]);
  eq("Réglages : expéditeur et adresse de réponse par défaut, ou choisis", [newsletterConfig({}).from, newsletterConfig({}).replyTo, newsletterConfig({ NEWSLETTER_FROM: "Basketlog <n@x.fr>" }).from], ["Basketlog <newsletter@basketlog-app.com>", "contact@basketlog-app.com", "Basketlog <n@x.fr>"]);

  // --- Client Resend simulé : inscription, désinscription, suppression
  const MAIL = "Tim@Gmail.com";
  {
    const { st, client } = mkClient();
    eq("Resend : adresse inconnue = ni inscrite ni bloquée", await client.status(MAIL, "fr"), { known: false, subscribed: false, blocked: false });
    const s = await client.subscribe(MAIL, "fr", { now: new Date("2026-11-09T19:30:00Z") });
    const c = st.contacts[0];
    eq("Resend : inscription = abonnée au sujet de sa langue (opt_in), relue chez Resend", [s.subscribed, s.blocked, st.topics.length, c.topics[st.topics[0].id]], [true, false, 1, "opt_in"]);
    eq("Resend : l'abonnement au sujet part comme l'API le veut (corps = liste [{ id, subscription }], pas { topics: [...] } : 422 sinon)", calls(st, "PATCH", /\/topics$/).map((x) => x.body), [[{ id: st.topics[0].id, subscription: "opt_in" }]]);
    eq("Resend : le contact est créé en minuscules, avec la date de la demande (preuve du consentement), dans la liste « Basketlog newsletter »", [c.email, c.properties[CONSENT_PROP], c.segments, st.segments.map((x) => x.name)], ["tim@gmail.com", "2026-11-09T19:30:00.000Z", [st.segments[0].id], [SEGMENT_NAME]]);
    eq("Resend : sujet créé « opt_out par défaut » (personne n'est abonné d'office), nommé par langue", [st.topics[0].default_subscription, st.topics[0].name], ["opt_out", topicName("fr")]);
    eq("Resend : la propriété consent_at est créée en texte", st.props, [{ key: CONSENT_PROP, type: "string" }]);
    eq("Resend : l'état se relit : abonnée", (await client.status(MAIL, "fr")).subscribed, true);
    eq("Resend : abonnée en français ne l'est pas en anglais", (await client.status(MAIL, "en")).subscribed, false);
    await client.subscribe(MAIL, "fr");
    eq("Resend : un second clic ne crée pas de doublon", [st.contacts.length, st.topics.length, st.segments.length], [1, 1, 1]);
    const u = await client.unsubscribe(MAIL, "fr");
    eq("Resend : désinscription = opt_out, le contact reste (trace du refus), toujours dans la liste", [u.subscribed, c.topics[st.topics[0].id], st.contacts.length, c.segments.length], [false, "opt_out", 1, 1]);
    eq("Resend : liste non vide tant qu'un contact existe", await client.hasContacts(), true);
    eq("Resend : désinscrire une adresse inconnue ne crée rien", [(await client.unsubscribe("autre@x.fr", "fr")).known, st.contacts.length], [false, 1]);
    const f = await client.forget(MAIL);
    eq("Resend : compte supprimé, adresse seulement dans notre liste = contact effacé", [f, st.contacts.length], [{ existed: true, removed: true }, 0]);
    eq("Resend : adresse déjà absente = rien à faire", await client.forget(MAIL), { existed: false, removed: false });
  }
  {
    const { st, client } = mkClient();
    await client.subscribe("tim@gmail.com", "fr");
    const c = st.contacts[0];
    st.segments.push({ id: "seg_autre", name: "General" });
    c.segments.push("seg_autre"); // le même e-mail sert aussi à une autre liste du compte Resend (un autre site)
    const f = await client.forget("tim@gmail.com");
    eq("Resend : adresse aussi dans une autre liste = jamais effacée, retirée seulement de la nôtre et désabonnée de nos sujets", [f, st.contacts.length, c.segments, c.topics[st.topics[0].id]], [{ existed: true, removed: false }, 1, ["seg_autre"], "opt_out"]);
  }
  {
    const { st, client } = mkClient();
    await client.segmentId(); // la liste existe, mais ce contact n'est dans aucune liste : il n'est pas à nous
    st.contacts.push({ id: "con_x", email: "x@y.fr", unsubscribed: false, properties: {}, topics: {}, segments: [] });
    const f = await client.forget("x@y.fr");
    eq("Resend : contact sans liste (pas à nous) = jamais effacé", [f, st.contacts.length], [{ existed: true, removed: false }, 1]);
  }
  {
    const { st, client } = mkClient();
    st.contacts.push({ id: "con_b", email: "bloque@x.fr", unsubscribed: true, properties: {}, topics: {}, segments: [] });
    let err = null;
    try { await client.subscribe("bloque@x.fr", "fr"); } catch (e) { err = e; }
    eq("Resend : adresse désinscrite de TOUS les envois du compte = jamais réinscrite, aucune écriture", [err?.kind, st.calls.some((x) => x.method !== "GET"), (await client.status("bloque@x.fr", "fr")).blocked], ["blocked", false, true]);
    const before = st.calls.length;
    let bad = null;
    try { await client.subscribe("pas-une-adresse", "fr"); } catch (e) { bad = e; }
    eq("Resend : adresse invalide refusée avant tout appel", [bad?.kind, st.calls.length - before], ["invalid", 0]);
  }
  {
    const { client } = mkClient({ ignoreTopicWrites: true });
    let err = null;
    try { await client.subscribe("tim@gmail.com", "fr"); } catch (e) { err = e; }
    eq("Resend : si Resend n'enregistre pas l'inscription (relue deux fois), l'erreur le dit au lieu d'afficher un faux succès", err?.kind, "unconfirmed");
  }
  {
    // Sans propriété consent_at (création refusée) : l'inscription se fait quand même
    const { st, client } = mkClient({ intercept: (m, p) => (m === "POST" && p === "/contact-properties" ? { ok: false, status: 403, headers: { get: () => null }, json: async () => ({ message: "no" }) } : null) });
    const s = await client.subscribe("tim@gmail.com", "fr");
    eq("Resend : la preuve de consentement est un plus, jamais un blocage (sans elle l'inscription réussit)", [s.subscribed, st.contacts[0].properties], [true, {}]);
  }

  // --- Diffusions
  {
    const { st, client } = mkClient();
    await client.subscribe("tim@gmail.com", "fr");
    const id = await client.createBroadcast({ name: "Newsletter 2026-W46 fr", subject: "S", previewText: "P", html: "<p>h</p>", text: "t", from: "Basketlog <newsletter@basketlog-app.com>", replyTo: "contact@basketlog-app.com", lang: "fr" });
    const b = st.broadcasts[0];
    eq("Diffusion : limitée à la liste ET au sujet de la langue, avec réponse, aperçu, HTML et texte", [b.segment_id === st.segments[0].id, b.topic_id === st.topics[0].id, b.reply_to, b.preview_text, b.html, b.text, b.name, b.status], [true, true, ["contact@basketlog-app.com"], "P", "<p>h</p>", "t", "Newsletter 2026-W46 fr", "draft"]);
    await client.sendBroadcast(id, "2026-11-15T17:00:00.000Z");
    eq("Diffusion : programmée à l'instant exact transmis (17 h UTC = 18 h à Paris)", [st.broadcasts[0].status, st.broadcasts[0].scheduled_at], ["queued", "2026-11-15T17:00:00.000Z"]);
    eq("Diffusion : relue par nom et supprimable", [(await client.broadcasts()).map((x) => x.name), await client.deleteBroadcast(id).then(() => st.broadcasts.length)], [["Newsletter 2026-W46 fr"], 0]);
    eq("Liste vide : pas de diffusion à préparer", await mkClient().client.hasContacts(), false);
  }
  {
    // Répétition (admin) : brouillon dans la liste et le sujet, relu, supprimé ; jamais programmé ni envoyé
    const { st, client } = mkClient();
    await client.subscribe("tim@gmail.com", "fr");
    const r = await rehearseBroadcast({ client, from: "Basketlog <newsletter@basketlog-app.com>", replyTo: "contact@basketlog-app.com", now: new Date("2026-11-10T09:40:00Z") });
    eq("Répétition : brouillon créé dans la liste et le sujet, relu, supprimé, rien programmé ni envoyé",
      [r.ok, r.steps.relecture.status, r.steps.relecture.liste, r.steps.relecture.sujet, r.steps.relecture.apercu, r.steps.relecture.reponse, r.steps.suppression.disparu, st.broadcasts.length, calls(st, "POST", /\/send$/).length, st.emails.length],
      [true, "draft", true, true, true, true, true, 0, 0, 0]);
    const bad = mkClient({ intercept: (m, p) => (m === "POST" && p === "/broadcasts" ? { ok: false, status: 403, headers: { get: () => null }, json: async () => ({ message: "Broadcasts are not available on your plan" }) } : null) });
    await bad.client.subscribe("tim@gmail.com", "fr");
    const rb = await rehearseBroadcast({ client: bad.client, from: "Basketlog <newsletter@basketlog-app.com>", replyTo: "contact@basketlog-app.com" });
    eq("Répétition : si Resend refuse la création, l'étape le dit (sans lever d'erreur) et rien n'est supprimé ni envoyé", [rb.ok, rb.steps.creation.ok, rb.steps.creation.kind, rb.steps.relecture, rb.steps.suppression, bad.st.broadcasts.length], [false, false, "scope", undefined, undefined, 0]);
  }
  {
    const { st, client } = mkClient();
    await client.sendEmail({ from: "Basketlog <newsletter@basketlog-app.com>", to: "tim@gmail.com", subject: "[TEST] S", html: "<p>h</p>", text: "t", replyTo: "contact@basketlog-app.com", idempotencyKey: "newsletter-test-1" });
    eq("Test à l'admin : un seul destinataire, clé d'idempotence transmise (une relance ne l'envoie pas deux fois)", [st.emails[0].to, st.emails[0].key, st.emails[0].reply_to], [["tim@gmail.com"], "newsletter-test-1", ["contact@basketlog-app.com"]]);
    st.domains.push({ name: "basketlog-app.com", status: "verified", region: "eu-west-1" });
    eq("Domaine d'envoi : statut relu (ou absent)", [await client.domain("basketlog-app.com"), await client.domain("autre.fr")], [{ name: "basketlog-app.com", status: "verified", region: "eu-west-1" }, null]);
  }

  // --- Erreurs : jamais d'adresse ni de clé dans les messages, une reprise sur la limite de débit
  {
    const secret = "re_SECRETKEY1234567890";
    const f = fakeResend({ intercept: (m, p) => (p.startsWith("/contacts/") ? { ok: false, status: 500, headers: { get: () => null }, json: async () => ({ message: `boom tim@gmail.com ${secret}` }) } : null) });
    const client = createResend({ key: secret, fetch: f.fetch, sleep: noSleep });
    let err = null;
    try { await client.status("tim@gmail.com", "fr"); } catch (e) { err = e; }
    eq("Erreur Resend : ni adresse e-mail ni clé dans le message (même dans le chemin)", [err instanceof ResendError, err?.kind, /@|re_SECRET|tim@gmail/.test(err?.message || "")], [true, "network", false]);
    const down = createResend({ key: "re_k_123456789", fetch: async () => { throw new Error("tim@gmail.com injoignable"); }, sleep: noSleep });
    let e2 = null;
    try { await down.status("tim@gmail.com", "fr"); } catch (e) { e2 = e; }
    eq("Réseau coupé : erreur « network » sans adresse dans le message", [e2?.kind, /@/.test(e2?.message || "")], ["network", false]);
    let n = 0, slept = 0;
    const f2 = fakeResend({ intercept: (m, p) => (p === "/segments" && m === "GET" && n++ === 0 ? { ok: false, status: 429, headers: { get: (k) => (String(k).toLowerCase() === "retry-after" ? "1" : null) }, json: async () => ({ message: "rate" }) } : null) });
    const c2 = createResend({ key: "re_k_123456789", fetch: f2.fetch, sleep: async () => { slept++; } });
    eq("Limite de débit (429) : une seconde tentative après l'attente demandée", [(await c2.segmentId()) !== null, slept, f2.st.calls.filter((x) => x.path === "/segments" && x.method === "GET").length], [true, 1, 2]);
    let nokey = null;
    try { await createResend({ key: "" }).status("tim@gmail.com", "fr"); } catch (e) { nokey = e; }
    eq("Sans clé : erreur « nokey », aucun appel", nokey?.kind, "nokey");
    const hdr = f.st.calls[0].headers;
    eq("Appels : clé en Bearer et nom de client explicite", [hdr.Authorization, hdr["User-Agent"]], [`Bearer ${secret}`, "basketlog-newsletter/1"]);
  }

  // --- Adresse du membre chez Whop
  {
    const rows = (list, page_info) => ({ ok: true, status: 200, json: async () => ({ data: list, ...(page_info ? { page_info } : {}) }) });
    let seen = null, calls = 0;
    const f = (list, status = 200) => async (url, init) => { calls++; seen = { url: String(url), auth: init?.headers?.Authorization }; return status === 200 ? rows(list) : { ok: false, status, json: async () => ({}) }; };
    // Whop range l'adresse dans la fiche du membre (GET /members, champ email), pas dans l'abonnement ni dans l'objet user
    const good = [{ id: "mber_1", user: { id: "user_AAA", username: "tim" }, email: " Tim@Gmail.com " }];
    eq("Whop : adresse lue dans la fiche membre, en minuscules, filtrée par compte et par entreprise, en un seul appel", [await memberEmail("user_AAA", { fetch: f(good), key: "k" }), new URL(seen.url).pathname, seen.url.includes("user_ids=user_AAA"), seen.url.includes("account_id=biz_"), seen.auth, calls], ["tim@gmail.com", "/api/v1/members", true, true, "Bearer k", 1]);
    eq("Whop : la fiche d'un autre compte n'est jamais prise, même renvoyée par erreur", await memberEmail("user_AAA", { fetch: f([{ user: { id: "user_BBB" }, email: "autre@x.fr" }, ...good]), key: "k" }), "tim@gmail.com");
    {
      // Filtre ignoré par Whop (page pleine de fiches d'autres comptes) : les pages suivantes sont lues jusqu'à la fiche du compte
      let n = 0;
      const pages = [rows([{ user: { id: "user_BBB" }, email: "b@x.fr" }], { has_next_page: true, end_cursor: "c1" }), rows(good, { has_next_page: false })];
      const g = async () => pages[n++];
      eq("Whop : filtre ignoré = pages suivantes lues jusqu'à la fiche du compte, jamais l'adresse d'un autre", [await memberEmail("user_AAA", { fetch: g, key: "k" }), n], ["tim@gmail.com", 2]);
    }
    const kind = async (fn) => { try { await fn(); return "aucune erreur"; } catch (e) { return e instanceof WhopEmailError ? e.kind : `autre : ${e.message}`; } };
    const detail = async (fn) => { try { await fn(); return null; } catch (e) { return e instanceof WhopEmailError ? e.detail || null : null; } };
    const none = [
      f([]), // aucune fiche membre
      f([{ user: { id: "user_BBB" }, email: "autre@x.fr" }]), // seulement la fiche d'un autre compte
      f([{ user: { id: "user_AAA" }, email: null }]), // fiche sans adresse (permission member:email:read manquante)
      f([{ user: { id: "user_AAA" }, email: "pas-une-adresse" }]), // adresse illisible
    ];
    eq("Whop : pas de fiche, fiche d'un autre, email vide ou illisible = « noemail »", await Promise.all(none.map((g) => kind(() => memberEmail("user_AAA", { fetch: g, key: "k" })))), ["noemail", "noemail", "noemail", "noemail"]);
    eq("Whop : le détail du contrôle dit ce qui manque, sans aucune adresse", await Promise.all(none.map((g) => detail(() => memberEmail("user_AAA", { fetch: g, key: "k" })))), [
      { matched: false, emailField: "absent", rows: 0 },
      { matched: false, emailField: "absent", rows: 1 },
      { matched: true, emailField: "null", rows: 1 },
      { matched: true, emailField: "invalide", rows: 1 },
    ]);
    eq("Whop : clé refusée = « scope », panne = « network », sans clé = « nokey »", [await kind(() => memberEmail("user_AAA", { fetch: f([], 403), key: "k" })), await kind(() => memberEmail("user_AAA", { fetch: f([], 500), key: "k" })), await kind(() => memberEmail("user_AAA", { fetch: async () => { throw new Error("réseau"); }, key: "k" })), await kind(() => memberEmail("user_AAA", { fetch: f(good), key: "" }))], ["scope", "network", "network", "nokey"]);
    eq("Whop : identifiant de compte invalide refusé avant tout appel", [await kind(() => memberEmail("../x?y=1", { fetch: f(good), key: "k" })), await kind(() => memberEmail("", { fetch: f(good), key: "k" }))], ["noemail", "noemail"]);
  }

  // --- Programmation de la semaine (tâche du dimanche, app/api/cron/newsletter) avec un faux Resend
  {
    const slot = sundaySlot(P("2026-11-15T12:11:00Z"));
    const args = (client, extra = {}) => ({ client, langs: ["fr"], slot, data: sample, from: "Basketlog <newsletter@basketlog-app.com>", replyTo: "contact@basketlog-app.com", ...extra });
    const quiet = async (fn) => { const w = console.warn, l = console.log; console.warn = () => {}; console.log = () => {}; try { return await fn(); } finally { console.warn = w; console.log = l; } };
    const boom = { ok: false, status: 500, headers: { get: () => null }, json: async () => ({ message: "boom" }) };
    {
      const { st, client } = mkClient();
      const r = await quiet(() => scheduleWeek(args(client)));
      eq("Programmation : personne d'inscrit = rien de créé chez Resend", [r.map((x) => [x.state, x.reason]), st.broadcasts.length], [[["ignorée", "personne n'est inscrit"]], 0]);
    }
    {
      const { st, client } = mkClient();
      await client.subscribe("tim@gmail.com", "fr");
      const r = await quiet(() => scheduleWeek(args(client)));
      const b = st.broadcasts[0];
      eq("Programmation : un mail par langue ouverte, programmé à 18 h à Paris (17 h UTC) avec l'objet du jour", [r.map((x) => [x.lang, x.name, x.state]), b.status, b.scheduled_at, b.subject], [[["fr", "Newsletter 2026-W46 fr", "programmée"]], "queued", "2026-11-15T17:00:00.000Z", "Basketlog · 2 matchs à confiance très élevée cette semaine"]);
      const again = await quiet(() => scheduleWeek(args(client)));
      eq("Programmation : à la reprise de 13 h 41, la semaine déjà programmée n'est pas programmée une seconde fois", [again.map((x) => x.state), st.broadcasts.length], [["déjà programmée"], 1]);
      const next = await quiet(() => scheduleWeek(args(client, { slot: sundaySlot(P("2026-11-22T12:11:00Z")) })));
      eq("Programmation : la semaine suivante est une nouvelle diffusion, à son propre dimanche", [next.map((x) => x.name), st.broadcasts.map((x) => x.scheduled_at)], [["Newsletter 2026-W47 fr"], ["2026-11-15T17:00:00.000Z", "2026-11-22T17:00:00.000Z"]]);
    }
    {
      const { st, client } = mkClient();
      await client.subscribe("tim@gmail.com", "fr");
      st.broadcasts.push({ id: "bro_old", name: "Newsletter 2026-W46 fr", status: "draft" });
      const r = await quiet(() => scheduleWeek(args(client)));
      eq("Programmation : un brouillon resté d'une tentative interrompue est remplacé, pas doublé", [r[0].state, st.broadcasts.map((x) => [x.id === "bro_old", x.status])], ["programmée", [[false, "queued"]]]);
    }
    {
      const { st, client } = mkClient({ intercept: (m, p) => (m === "POST" && /\/send$/.test(p) ? boom : null) });
      await client.subscribe("tim@gmail.com", "fr");
      const r = await quiet(() => scheduleWeek(args(client)));
      eq("Programmation : si Resend refuse la programmation, l'erreur est dite et aucun brouillon ne traîne", [r[0].state, typeof r[0].error, st.broadcasts.length], ["erreur", "string", 0]);
    }
    {
      let sends = 0;
      const { st, client } = mkClient({ intercept: (m, p) => (m === "POST" && /\/send$/.test(p) && ++sends === 2 ? boom : null) });
      await client.subscribe("tim@gmail.com", "fr");
      const r = await quiet(() => scheduleWeek(args(client, { langs: ["fr", "en"] })));
      eq("Programmation : une langue en erreur n'empêche pas l'autre", [r.map((x) => [x.lang, x.state]), st.broadcasts.map((x) => x.name)], [[["fr", "programmée"], ["en", "erreur"]], ["Newsletter 2026-W46 fr"]]);
    }
    {
      const { client } = mkClient({ intercept: (m, p) => (m === "GET" && p === "/broadcasts" ? boom : null) });
      let err = null;
      try { await quiet(() => scheduleWeek(args(client))); } catch (e) { err = e; }
      eq("Programmation : Resend injoignable à la lecture des diffusions = erreur levée, rien de programmé", err?.kind, "network");
    }
    {
      const { st, client } = mkClient();
      await client.subscribe("tim@gmail.com", "fr");
      const r = await quiet(() => scheduleWeek(args(client, { data: { at: slot.iso, week: "2026-W46", bilan: null, sure: [], favorites: [], record: null } })));
      eq("Programmation : rien à dire cette semaine = pas de mail", [r[0].state, r[0].reason, st.broadcasts.length], ["ignorée", "rien à dire cette semaine", 0]);
    }
    {
      // Le mail est préparé à 13 h 11 mais part à 18 h : un match qui commence entre les deux n'y figure pas.
      const started = { league: "NBA", href: "/app/match/999?d=20261115", date: "2026-11-15T12:30:00Z", home: team("MIA", "Heat"), away: team("BOS", "Celtics"), pHome: 0.95 };
      const { st, client } = mkClient();
      await client.subscribe("tim@gmail.com", "fr");
      const r = await quiet(() => scheduleWeek(args(client, { data: { ...sample, sure: [started, ...sample.sure] } })));
      const b = st.broadcasts[0];
      eq("Programmation : un match déjà commencé à 18 h n'est pas dans le mail programmé (ni la liste, ni l'objet) ; les matchs suivants y sont", [r[0].state, b.subject, b.html.includes("/app/match/999"), b.text.includes("Celtics"), b.html.includes("/app/match/401")], ["programmée", "Basketlog · 2 matchs à confiance très élevée cette semaine", false, false, true]);
    }
    {
      const started = { league: "NBA", href: "/app/match/999?d=20261115", date: "2026-11-15T12:30:00Z", home: team("MIA", "Heat"), away: team("BOS", "Celtics"), pHome: 0.95 };
      const { st, client } = mkClient();
      await client.subscribe("tim@gmail.com", "fr");
      const r = await quiet(() => scheduleWeek(args(client, { data: { at: slot.iso, week: "2026-W46", bilan: null, sure: [started], favorites: [], record: null } })));
      eq("Programmation : tous les matchs déjà commencés à 18 h et pas de bilan = rien à dire, pas de mail", [r[0].state, r[0].reason, st.broadcasts.length], ["ignorée", "rien à dire cette semaine", 0]);
    }
  }

  // --- Confirmation de l'adresse (comptes Basketlog e-mail + mot de passe) : lien signé, e-mail, limites d'envoi
  {
    const key = "k".repeat(64);
    const uid = "bl_8a5f0c1e-1111-4222-8333-944455556666";
    const NOW = Date.UTC(2026, 10, 10, 12);
    const tok = makeConfirm(key, { uid, email: "Tim@Exemple.fr", lang: "fr" }, NOW);
    const payload = Buffer.from(tok.split(".")[0], "base64url").toString();
    eq("Confirmation : jeton de forme attendue, sans l'adresse ni le début de l'adresse dedans", [CONFIRM_TOKEN_RE.test(tok), /tim|exemple/i.test(payload)], [true, false]);
    eq("Confirmation : jeton lu (compte, langue, empreinte de l'adresse insensible à la casse et aux espaces)", readConfirm(key, tok, NOW + 3600e3), { uid, lang: "fr", tag: emailTag(key, " tim@exemple.fr "), at: NOW });
    eq("Confirmation : valable 48 h pile, refusé à la milliseconde suivante", [readConfirm(key, tok, NOW + CONFIRM_TTL_MS) !== null, readConfirm(key, tok, NOW + CONFIRM_TTL_MS + 1)], [true, null]);
    eq("Confirmation : jeton daté du futur refusé (une minute de décalage d'horloge tolérée)", [readConfirm(key, tok, NOW - 30e3) !== null, readConfirm(key, tok, NOW - 120e3)], [true, null]);
    {
      const [data, sig] = tok.split(".");
      const flip = (c) => (c === "A" ? "B" : "A");
      const forged = Buffer.from(JSON.stringify({ ...JSON.parse(payload), u: "bl_00000000-0000-4000-8000-000000000000" })).toString("base64url");
      eq("Confirmation : jeton modifié (données ou signature) ou signé avec une autre clé refusé", [
        readConfirm(key, `${data.slice(0, 5)}${flip(data[5])}${data.slice(6)}.${sig}`, NOW),
        readConfirm(key, `${data}.${sig.slice(0, 5)}${flip(sig[5])}${sig.slice(6)}`, NOW),
        readConfirm(key, `${forged}.${sig}`, NOW),
        readConfirm("autre".repeat(13), tok, NOW),
      ], [null, null, null, null]);
      const asSwitch = signToken(key, "switch", JSON.parse(payload));
      const asSession = `${data}.${crypto.createHmac("sha256", key).update(data).digest("base64url")}`;
      eq("Confirmation : un jeton d'un autre usage (changement de formule) ou un cookie de session signé avec la même clé ne passe pas pour une confirmation", [readConfirm(key, asSwitch, NOW), readConfirm(key, asSession, NOW)], [null, null]);
    }
    eq("Confirmation : pas de jeton pour un compte Whop, une langue inconnue, sans adresse ni clé", [
      makeConfirm(key, { uid: "user_abc", email: "a@b.fr", lang: "fr" }, NOW), makeConfirm(key, { uid, email: "a@b.fr", lang: "de" }, NOW),
      makeConfirm(key, { uid, email: "  ", lang: "fr" }, NOW), makeConfirm("", { uid, email: "a@b.fr", lang: "fr" }, NOW),
    ], [null, null, null, null]);
    eq("Confirmation : valeurs absurdes refusées sans erreur", [readConfirm(key, "", NOW), readConfirm(key, null, NOW), readConfirm(key, "abc", NOW), readConfirm(key, "a.b", NOW), readConfirm(key, `${"A".repeat(5000)}.${"B".repeat(43)}`, NOW)], [null, null, null, null, null]);
    eq("Confirmation : lien dans la langue du membre, jeton dans le fragment (il ne part pas vers le serveur)", [confirmLink("https://basketlog-app.com/", "fr", "T"), confirmLink("https://basketlog-app.com", "en", "T"), confirmLink("https://basketlog-app.com", "es", "T")], ["https://basketlog-app.com/newsletter/confirmer#T", "https://basketlog-app.com/en/newsletter/confirmer#T", "https://basketlog-app.com/es/newsletter/confirmer#T"]);

    // E-mail de confirmation
    const link = confirmLink("https://basketlog-app.com", "fr", tok);
    const mails = { fr: confirmEmail({ lang: "fr", link }), en: confirmEmail({ lang: "en", link }), es: confirmEmail({ lang: "es", link }) };
    eq("E-mail de confirmation : objet et bouton dans la langue du compte", [mails.fr.subject, mails.en.subject, mails.es.subject, mails.fr.html.includes("Je confirme mon inscription"), mails.en.html.includes("Confirm my signup"), mails.es.html.includes("Confirmo mi suscripción")], ["Confirme ton inscription à la newsletter Basketlog", "Confirm your Basketlog newsletter signup", "Confirma tu suscripción a la newsletter de Basketlog", true, true, true]);
    eq("E-mail de confirmation : lien présent (texte et HTML), durée de 48 heures annoncée, rien n'est envoyé avant la confirmation", [mails.fr.text.includes(link), mails.fr.html.includes(link), mails.fr.text.includes("48 heures"), mails.en.text.includes("48 hours"), mails.es.text.includes("48 horas"), /rien ne t'est envoyé/.test(mails.fr.text)], [true, true, true, true, true, true]);
    eq("E-mail de confirmation : aucun vocabulaire de paris (FR, EN, ES)", [bets.fr.test(mails.fr.text), bets.en.test(mails.en.text), bets.es.test(mails.es.text)], [false, false, false]);
    eq("E-mail de confirmation : lien échappé dans le HTML, pas de script ni d'image distante", [confirmEmail({ lang: "fr", link: 'https://x.fr/#"><script>1</script>' }).html.includes("<script>"), /<script|<img/i.test(mails.fr.html)], [false, false]);

    // Demande d'envoi : limites, états, panne
    const mk2 = (o = {}) => {
      const n = new Map(), sent = [], asked = [];
      return {
        n, sent, asked,
        deps: {
          key, site: "https://basketlog-app.com", now: NOW,
          allowed: async (a, v, max) => { const k = `${a}:${v}`; n.set(k, (n.get(k) || 0) + 1); return n.get(k) <= max; },
          status: o.status || (async (e, l) => { asked.push([e, l]); return { known: false, subscribed: false, blocked: false }; }),
          send: o.send || (async (m) => { sent.push(m); return { id: "em_1" }; }),
        },
      };
    };
    const who = (i = 1, extra = {}) => ({ uid: `bl_8a5f0c1e-1111-4222-8333-${String(i).padStart(12, "0")}`, email: `Membre${i}@Exemple.fr`, lang: "fr", ip: `10.0.0.${i}`, ...extra });
    {
      const t = mk2();
      const r = await requestConfirmation(who(), t.deps);
      const m = t.sent[0];
      const sentLink = m?.text.match(/https:\/\/\S+/)?.[0] || "";
      const back = readConfirm(key, sentLink.split("#")[1], NOW);
      eq("Demande : e-mail envoyé à l'adresse du compte (en minuscules), avec un lien dont le jeton est celui du compte et de sa langue", [r, t.sent.length, m.to, m.subject, sentLink.startsWith("https://basketlog-app.com/newsletter/confirmer#"), back?.uid, back?.lang], [{ ok: true, pending: true }, 1, "membre1@exemple.fr", "Confirme ton inscription à la newsletter Basketlog", true, who().uid, "fr"]);
      eq("Demande : l'état est lu chez Resend avant d'envoyer (adresse minuscule, langue du membre)", t.asked, [["Membre1@Exemple.fr", "fr"]]);
    }
    {
      const t = mk2({ status: async () => ({ known: true, subscribed: true, blocked: false }) });
      const r = await requestConfirmation(who(), t.deps);
      eq("Demande : déjà inscrit = rien à envoyer, et le plafond du site n'est pas entamé", [r, t.sent.length, t.n.get("nl-confirm-global:tous") || 0], [{ ok: true, subscribed: true }, 0, 0]);
    }
    {
      const t = mk2({ status: async () => ({ known: true, subscribed: false, blocked: true }) });
      const r = await requestConfirmation(who(), t.deps);
      eq("Demande : adresse désinscrite de tous les envois = refusée, aucun e-mail, plafond du site intact", [r, t.sent.length, t.n.get("nl-confirm-global:tous") || 0], [{ ok: false, reason: "blocked" }, 0, 0]);
    }
    {
      const t = mk2();
      const rs = [];
      for (let i = 0; i < CONFIRM_LIMITS.perAccountHour + 2; i++) rs.push((await requestConfirmation(who(), t.deps)).ok);
      eq(`Demande : au plus ${CONFIRM_LIMITS.perAccountHour} e-mails par heure pour un même compte, les suivants refusés sans e-mail`, [rs, t.sent.length], [[true, true, true, false, false], CONFIRM_LIMITS.perAccountHour]);
    }
    {
      const t = mk2();
      const rs = [];
      for (let i = 1; i <= CONFIRM_LIMITS.perIpHour + 1; i++) rs.push((await requestConfirmation(who(i, { ip: "203.0.113.9" }), t.deps)).ok);
      eq(`Demande : au plus ${CONFIRM_LIMITS.perIpHour} e-mails par heure depuis une même adresse IP (comptes différents)`, [rs.filter(Boolean).length, rs[rs.length - 1], t.sent.length], [CONFIRM_LIMITS.perIpHour, false, CONFIRM_LIMITS.perIpHour]);
    }
    {
      const t = mk2();
      let last = null, okCount = 0;
      for (let i = 1; i <= CONFIRM_LIMITS.globalDay + 1; i++) { last = await requestConfirmation(who(i), t.deps); if (last.ok) okCount++; }
      eq(`Demande : plafond de ${CONFIRM_LIMITS.globalDay} e-mails de confirmation par jour pour tout le site (le plan Resend gratuit en permet 100 pour tous les usages)`, [okCount, last, t.sent.length], [CONFIRM_LIMITS.globalDay, { ok: false, reason: "busy" }, CONFIRM_LIMITS.globalDay]);
    }
    {
      const boom = new Error("Resend 500");
      const t = mk2({ send: async () => { throw boom; } });
      const r = await requestConfirmation(who(), t.deps);
      eq("Demande : e-mail non parti (Resend en panne) = « mail », l'erreur est rendue à l'appelant pour le journal", [r.ok, r.reason, r.error === boom], [false, "mail", true]);
      const t2 = mk2();
      eq("Demande : sans clé de signature, rien n'est envoyé", [await requestConfirmation(who(), { ...t2.deps, key: "" }), t2.sent.length], [{ ok: false, reason: "config" }, 0]);
      const t3 = mk2({ status: async () => { throw new ResendError("network", "panne"); } });
      let thrown = null;
      try { await requestConfirmation(who(), t3.deps); } catch (e) { thrown = e; }
      eq("Demande : lecture de l'état impossible chez Resend = erreur levée telle quelle, aucun e-mail", [thrown?.kind, t3.sent.length], ["network", 0]);
    }

    // Lien reçu : vérification
    {
      const id = "8a5f0c1e-1111-4222-8333-944455556666";
      let reads = 0;
      const fiche = (email) => async (x) => { reads++; return x === id ? (email === null ? null : { email, email_ok: false }) : null; };
      const check = (token, f, now = NOW + 3600e3) => checkConfirmation(token, { key, fiche: f, now });
      eq("Lien : jeton valable pour un compte qui existe encore avec la même adresse (la fiche est lue par son identifiant sans « bl_ »)", await check(tok, fiche("tim@exemple.fr")), { ok: true, uid, email: "tim@exemple.fr", lang: "fr" });
      eq("Lien : même adresse écrite autrement dans la fiche (casse, espaces) = valable", (await check(tok, fiche(" TIM@Exemple.FR "))).ok, true);
      eq("Lien : compte supprimé depuis = refusé", await check(tok, fiche(null)), { ok: false, reason: "invalid" });
      eq("Lien : l'adresse du compte n'est plus celle du jeton = refusé", await check(tok, fiche("autre@exemple.fr")), { ok: false, reason: "invalid" });
      reads = 0;
      eq("Lien : expiré, modifié ou absurde = refusé sans jamais lire la base", [await check(tok, fiche("tim@exemple.fr"), NOW + CONFIRM_TTL_MS + 1), await check(`${tok}x`, fiche("tim@exemple.fr")), await check("n'importe quoi", fiche("tim@exemple.fr")), reads], [{ ok: false, reason: "invalid" }, { ok: false, reason: "invalid" }, { ok: false, reason: "invalid" }, 0]);
      let thrown = null;
      try { await check(tok, async () => { throw new Error("base injoignable"); }); } catch (e) { thrown = e.message; }
      eq("Lien : base injoignable = erreur levée (la page dit « réessaie », elle ne dit pas « lien invalide »)", thrown, "base injoignable");
      // Un jeton ne vaut que pour son compte : celui d'un autre compte, même avec la bonne adresse, ne passe pas par la fiche du premier
      const other = makeConfirm(key, { uid: "bl_8a5f0c1e-1111-4222-8333-000000000002", email: "tim@exemple.fr", lang: "fr" }, NOW);
      eq("Lien : le jeton d'un autre compte n'ouvre pas ce compte (fiche introuvable pour lui)", await check(other, fiche("tim@exemple.fr")), { ok: false, reason: "invalid" });
    }
  }

  // --- Suppression d'un compte : retrait de la liste, sans jamais bloquer
  {
    const cfg = { ready: true };
    const client = (existed) => ({ forget: async () => ({ existed }) });
    const run = (o) => forgetNewsletter("user_AAA", { timeoutMs: 80, config: cfg, lookup: async () => "tim@gmail.com", ...o });
    const prev = console.warn; console.warn = () => {}; // les erreurs simulées ci-dessous ne polluent pas la sortie
    try {
      eq("Suppression du compte : newsletter non branchée = rien à faire", await forgetNewsletter("user_AAA", { config: { ready: false } }), "off");
      eq("Suppression du compte : adresse retirée de la liste, ou absente", [await run({ client: client(true) }), await run({ client: client(false) })], ["removed", "none"]);
      eq("Suppression du compte : Whop sans adresse lisible = rien à retirer (personne n'a pu s'inscrire)", await run({ client: client(true), lookup: async () => { throw new WhopEmailError("noemail", "x"); } }), "none");
      eq("Suppression du compte : Whop injoignable, ou Resend en erreur = signalé au membre (« failed »), sans lever d'erreur", [
        await run({ client: client(true), lookup: async () => { throw new WhopEmailError("network", "x"); } }),
        await run({ client: { forget: async () => { throw new ResendError("scope", "refusée"); } } }),
        await run({ client: { forget: async () => { throw new ResendError("network", "panne"); } } }),
      ], ["failed", "failed", "failed"]);
      eq("Suppression du compte : trop lent = « failed » à l'heure dite, la suppression n'attend pas", await run({ client: { forget: () => new Promise(() => {}) } }), "failed");
    } finally { console.warn = prev; }
  }
}
