// Traduction automatique des avis : chaque visiteur les lit dans sa langue (français, anglais, espagnol).
// Les abonnés écrivent leur avis dans la langue de leur choix. Ce module repère la langue d'un texte, puis le fait
// traduire par MyMemory (api.mymemory.translated.net) : service gratuit, sans clé, sans IA payante.
// Il ne dépend pas de Next, pour pouvoir être testé seul (tests/unit.mjs). Le cache est branché dans lib/reviews.js.
import { LANGS } from "./i18n.js"; // extension explicite : le fichier se charge aussi tel quel sous Node (tests)

const ENDPOINT = "https://api.mymemory.translated.net/get";
// Adresse de contact transmise à MyMemory : elle relève la limite gratuite de 5 000 à 50 000 caractères par jour.
const CONTACT = process.env.TRANSLATE_CONTACT_EMAIL || "contact@basketlog-app.com";
const MAX_BYTES = 450; // MyMemory refuse plus de 500 octets par requête
const TIMEOUT = 4000;

// --- Détection de la langue (français, anglais, espagnol) -------------------------------------------------------
// Mots courants propres à chaque langue (les mots communs à deux langues, comme « de », « la », « en », « es »,
// « me », « mis » ou « has », sont volontairement absents), plus quelques signes : ñ ¿ ¡, élisions l'/d'/j', it's/don't.
const W = (s) => new Set(s.split(/\s+/));
const WORDS = {
  fr: W("le les des du et est sont pour avec pas qui dans sur très je il elle nous vous ils elles mon ma ton ta tes au aux ce cet cette ces mais ou où comme tout tous fait faire être avoir ont été vraiment grâce depuis aussi même donc trop chaque jamais toujours quand peu beaucoup merci enfin vos votre notre leur leurs une"),
  es: W("el los las una unos unas del para con pero muy sus su como más esta este esto estos estas está están hay han hemos hace hacer ser estar tiene tienen también tambien todo todos toda todas gracias excelente mucho mucha muchas partidos partido análisis analisis aplicación aplicacion pronósticos pronosticos opinión opinion lo ya sin sobre porque cuando siempre nunca mejor"),
  en: W("the and is are was were for with not that this it its in of to my your you i very really great analysis have been but at by from they we she be so can will just all more than what how love best good amazing accurate helpful use using used predictions before every game games team"),
};
const cap = (n, max) => Math.min(n, max);
const count = (s, re) => (s.match(re) || []).length;

export function detectLang(text) {
  const s = String(text || "").toLowerCase();
  if (s.replace(/[^\p{L}]/gu, "").length < 8) return null; // trop court pour trancher
  const score = { fr: 0, en: 0, es: 0 };
  for (const w of s.match(/\p{L}+/gu) || []) for (const l of LANGS) if (WORDS[l].has(w)) score[l]++;
  score.es += 3 * cap(count(s, /[ñ¿¡]/g), 1) + cap(count(s, /[áíóú]/g), 2);
  score.fr += cap(count(s, /[çœùèêâîôûëï]/g), 2) + cap(count(s, /(?:^|[^\p{L}])(?:l|d|j|n|c|qu|s)['’]\p{L}/gu), 3);
  score.en += cap(count(s, /\p{L}['’](?:s|t|re|ve|ll|m)(?![\p{L}])/gu), 3);
  const [best, second] = Object.entries(score).sort((a, b) => b[1] - a[1]);
  return best[1] > second[1] && best[1] >= 1 ? best[0] : null;
}

// --- Découpage : MyMemory limite chaque requête à 500 octets ------------------------------------------------------
const bytes = (s) => new TextEncoder().encode(s).length;

function hardCut(word, max) {
  const out = [];
  let cur = "";
  for (const ch of word) {
    if (bytes(cur + ch) > max) { out.push(cur); cur = ""; }
    cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function chunkText(text, max = MAX_BYTES) {
  const sentences = String(text || "").replace(/\r\n?/g, "\n").split(/(?<=[.!?…])\s+|\n+/u).map((x) => x.trim()).filter(Boolean);
  const out = [];
  let cur = "";
  const flush = () => { if (cur) { out.push(cur); cur = ""; } };
  const add = (piece) => {
    if (cur && bytes(`${cur} ${piece}`) > max) flush();
    cur = cur ? `${cur} ${piece}` : piece;
  };
  for (const sentence of sentences) {
    if (bytes(sentence) <= max) { add(sentence); continue; }
    for (const word of sentence.split(/\s+/)) for (const piece of bytes(word) > max ? hardCut(word, max) : [word]) add(piece);
  }
  flush();
  return out;
}

// --- Appel à MyMemory ----------------------------------------------------------------------------------------------
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
  .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

async function translateChunk(q, from, to, fetchImpl) {
  const url = `${ENDPOINT}?${new URLSearchParams({ q, langpair: `${from}|${to}`, de: CONTACT })}`;
  const res = await fetchImpl(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TIMEOUT) });
  if (!res.ok) throw new Error(`MyMemory ${res.status}`);
  const j = await res.json();
  const out = decode(String(j?.responseData?.translatedText || "")).trim();
  if (Number(j?.responseStatus) !== 200 || j?.quotaFinished || !out || /^MYMEMORY WARNING/i.test(out)) {
    throw new Error(`MyMemory : ${j?.responseStatus ?? "réponse vide"}`);
  }
  // Garde-fou : une traduction hors de proportion avec l'original est écartée.
  if (q.length > 12 && (out.length > q.length * 3 || out.length < q.length * 0.25)) throw new Error("MyMemory : traduction incohérente");
  return out;
}

// Traduit un texte (plusieurs morceaux si besoin). Lève une erreur en cas d'échec : l'appelant garde alors l'original.
export async function translateRaw(text, from, to, fetchImpl = fetch) {
  const parts = [];
  for (const q of chunkText(text)) parts.push(await translateChunk(q, from, to, fetchImpl));
  const out = parts.join(" ").trim();
  if (!out) throw new Error("traduction vide");
  return out;
}

// --- Avis dans la langue du visiteur -------------------------------------------------------------------------------
const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

// Un avis dans une autre langue que celle de la page : texte (et mention « Qui es-tu ? ») traduits, original conservé
// dans orig pour pouvoir l'afficher. Le prénom n'est jamais traduit. Sans traduction possible, l'avis reste tel quel.
async function localizeOne(r, lang, translate) {
  const from = detectLang(r.texte);
  if (!from || from === lang) return r;
  const texte = await translate(r.texte, from, lang);
  if (!texte || norm(texte) === norm(r.texte)) return r;
  let profil = r.profil || null;
  if (profil) {
    const pf = detectLang(profil) || from;
    if (pf !== lang) {
      try {
        const p = await translate(profil, pf, lang);
        if (p) profil = p;
      } catch { /* mention laissée telle quelle */ }
    }
  }
  return { ...r, texte, profil, translated: true, orig: { texte: r.texte, profil: r.profil || null, lang: from } };
}

// translate(texte, from, to) : fonction fournie par l'appelant (avec cache) ; elle lève une erreur en cas d'échec.
// Quelques traductions à la fois et un temps limité : les avis non traduits à temps s'affichent d'abord en version
// d'origine, puis traduits à la visite suivante (les traductions réussies sont mises en cache).
export async function localizeReviews(list, lang, translate, { budgetMs = 6000, parallel = 4 } = {}) {
  if (!LANGS.includes(lang) || !Array.isArray(list) || !list.length) return list;
  const deadline = Date.now() + budgetMs;
  const out = [...list];
  let next = 0;
  async function worker() {
    while (next < list.length && Date.now() < deadline) {
      const i = next++;
      try { out[i] = await localizeOne(list[i], lang, translate); } catch { out[i] = list[i]; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(parallel, list.length) }, worker));
  return out;
}
