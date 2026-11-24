// Publications automatiques des pronostics du jour (Telegram et Bluesky), en français, anglais et espagnol.
// Ce fichier ne fait que les textes, sans aucun appel réseau (testé dans tests/unit.mjs). Les données du jour viennent
// de lib/social-day.js, l'envoi de lib/social-send.js, la tâche planifiée de app/api/cron/social.
// Chaque publication reprend ce que montre le site (favori, probabilité, niveau de confiance) avec le lien de la fiche
// du match dans la langue du message, et met le nom « Basketlog » en avant : chaque message public est une page de
// plus où Google lit le mot. Pas de vocabulaire de paris : Basketlog donne des probabilités.
import { mk, fmtDate, fmtTime, pctOf } from "./i18n.js";
import { SITE } from "./site.js";
import { nbaPath, elPath } from "./slug.js";

export const SOCIAL_LANGS = ["fr", "en", "es"];
// Même libellé que lib/sure.js (pas importé : ce fichier reste sans dépendance vers les données).
const VERY_HIGH = "Très élevée";
// Limite d'un message Bluesky, en graphèmes (un emoji compte pour un).
export const BSKY_MAX = 300;
// En dessous, le bilan « confiance très élevée » n'est pas cité (échantillon trop petit, comme sur le site).
export const RECORD_MIN = 20;

const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("fr", { granularity: "grapheme" }) : null;
export const graphemes = (s) => (seg ? [...seg.segment(String(s))].length : [...String(s)].length);
const utf8 = (s) => new TextEncoder().encode(s);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Match du jour au format commun. NBA : une analyse de lib/data (analyzeDay) ; EuroLeague : { g, a } de lib/euroleague.
const nameOf = (t) => t?.short || t?.name || "";
export function nbaPick(a, d) {
  const g = a.game;
  return { league: "NBA", href: nbaPath(g, d), date: g.date, home: nameOf(g.home), away: nameOf(g.away), pHome: a.pHome, conf: a.confidence };
}
export function elPick({ g, a }) {
  return { league: "EL", href: elPath(g), date: g.date, home: nameOf(g.home), away: nameOf(g.away), pHome: a.pHome, conf: a.confidence };
}

const favOf = (p) => (p.pHome >= 0.5 ? { team: p.home, p: p.pHome, other: p.away } : { team: p.away, p: 1 - p.pHome, other: p.home });
// Même ordre que les fiches du site : équipe visiteuse d'abord.
const matchup = (p, L) => (L.en ? `${p.away} vs ${p.home}` : `${p.away} – ${p.home}`);
const urlOf = (path, L) => `${SITE}${L.href(path)}`;
const colon = (L) => (L.fr ? " : " : ": ");
const byTime = (x, y) => new Date(x.date) - new Date(y.date);

// Ligne promo (accord de Tim le 20/11/2026) : essai Pro de 3 jours puis 9,99 par mois, taxes en sus (prix hors taxes
// depuis le 19/11, la taxe est ajoutée par Whop au paiement). Euros en français et espagnol, dollars en anglais.
export const PROMO_MARK = "🎁";
const proPath = "/pro";
const promoText = (L) => L.t(
  "Analyse complète : 3 jours à 1 €, puis Pro à 9,99 €/mois + taxes",
  "Full analysis: 3 days for €1, then Pro at €9.99/mo (+ tax)",
  "Análisis completo: 3 días por 1 €, luego Pro a 9,99 €/mes + impuestos",
  "Análise completa: 3 dias por 1 €, depois Pro a 9,99 €/mês + impostos"
);
function promoLineHtml(L) {
  const url = urlOf(proPath, L);
  return `${PROMO_MARK} ${esc(promoText(L))} 👉 <a href="${esc(url)}">${esc(url.replace(/^https?:\/\//, ""))}</a>`;
}
const byConfidence = (x, y) => favOf(y).p - favOf(x).p;

function leaguesOf(picks, L) {
  const nba = picks.some((p) => p.league === "NBA");
  const el = picks.some((p) => p.league === "EL");
  return nba && el ? L.t("NBA et EuroLeague", "NBA and EuroLeague", "NBA y Euroliga", "NBA e Euroliga") : el ? L.t("EuroLeague", "EuroLeague", "Euroliga", "Euroliga") : "NBA";
}
const titleOf = (picks, L) => {
  const what = leaguesOf(picks, L);
  return L.t(`Pronostics ${what} de ce soir`, `Tonight's ${what} predictions`, `Pronósticos ${what} de esta noche`, `Palpites ${what} desta noite`);
};
// Jour de la publication (date NBA AAAAMMJJ, prise à midi à New York pour tomber sur le même jour partout).
export const dayIso = (d) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}T16:00:00Z`;
const dayOf = (d, L) => fmtDate(L, dayIso(d), { weekday: "long", day: "numeric", month: "long" }).replace(/^(\S+), /, L.es || L.pt ? "$1 " : "$1, ");
// Page qui liste les matchs du jour (NBA s'il y en a, sinon EuroLeague).
const listPath = (picks) => (picks.some((p) => p.league === "NBA") ? "/app/matchs" : "/app/euroleague");

// Bilan « confiance très élevée » (sureRecord().nba de lib/history) : recalculé match par match, dit comme tel.
function recordLine(record, L) {
  if (!record || !(record.n >= RECORD_MIN)) return "";
  const season = `${record.since - 1}-${String(record.since).slice(2)}`;
  const pct = pctOf(record.ok / record.n, L);
  const link = (t) => `<a href="${esc(urlOf("/app/bilan", L))}">${t}</a>`;
  return L.t(
    `📊 ${link("Bilan recalculé")} depuis ${season} : nos favoris en confiance très élevée ont gagné ${record.ok} matchs sur ${record.n} (${pct}).`,
    `📊 ${link("Recalculated record")} since ${season}: our very-high-confidence favorites won ${record.ok} of ${record.n} games (${pct}).`,
    `📊 ${link("Balance recalculado")} desde ${season}: nuestros favoritos con confianza muy alta ganaron ${record.ok} de ${record.n} partidos (${pct}).`, `📊 ${link("Desempenho recalculado")} desde ${season}: nossos favoritos com confiança muito alta venceram ${record.ok} de ${record.n} jogos (${pct}).`
  );
}

// Message Telegram (HTML, 4 096 caractères au plus) : matchs à confiance très élevée d'abord, puis les autres par heure.
export function telegramText(picks, lang, { d, record } = {}) {
  const L = mk(lang);
  const list = [...picks].sort(byTime);
  const sure = list.filter((p) => p.conf === VERY_HIGH);
  const rest = list.filter((p) => p.conf !== VERY_HIGH);
  const line = (p) => {
    const f = favOf(p);
    const tag = p.league === "EL" ? L.t("EuroLeague · ", "EuroLeague · ", "Euroliga · ", "Euroliga · ") : "";
    return `• ${tag}<a href="${esc(urlOf(p.href, L))}">${esc(matchup(p, L))}</a> · ${esc(fmtTime(L, p.date))}${colon(L)}<b>${esc(f.team)} ${pctOf(f.p, L)}</b>`;
  };
  const out = [`🏀 <b>Basketlog · ${esc(titleOf(list, L))}</b>`];
  if (d) out.push(`${esc(dayOf(d, L))} · ${L.t("heures de Paris", "times in ET", "hora de España", "horário de Brasília")}`);
  if (sure.length) out.push("", `🔒 <b>${L.t("Confiance très élevée", "Very high confidence", "Confianza muy alta", "Confiança muito alta")}</b>`, ...sure.map(line));
  if (rest.length) out.push("", `<b>${sure.length ? L.t("Les autres matchs", "Other games", "Los demás partidos", "Os outros jogos") : L.t("Les matchs", "The games", "Los partidos", "Os jogos")}</b>`, ...rest.map(line));
  const rec = recordLine(record, L);
  if (rec) out.push("", rec);
  out.push("", promoLineHtml(L));
  out.push("", `👉 <a href="${esc(urlOf(listPath(list), L))}">${L.t("Probabilités gratuites pour chaque match sur Basketlog", "Free win probabilities for every game on Basketlog", "Probabilidades gratis para cada partido en Basketlog", "Probabilidades grátis para cada jogo no Basketlog")}</a>`);
  return out.join("\n");
}

// Aperçu du lien dans le message Telegram : la page du jour, dans la langue du message.
export const telegramPreviewUrl = (picks, lang) => urlOf(listPath(picks), mk(lang));

// Message Bluesky (300 graphèmes) : favoris à confiance très élevée, puis les autres favoris du plus sûr au moins sûr,
// autant qu'il en tient, le lien de la page du jour et #NBA / #EuroLeague. Les liens et mots-dièse d'un message Bluesky
// ne sont cliquables qu'avec leurs « facets » (positions en octets UTF-8), calculées ici.
export function blueskyPost(picks, lang, { d } = {}) {
  const L = mk(lang);
  const list = [...picks].sort(byTime);
  const sure = list.filter((p) => p.conf === VERY_HIGH).sort(byConfidence);
  const rest = list.filter((p) => p.conf !== VERY_HIGH).sort(byConfidence);
  const url = urlOf(listPath(list), L);
  const shown = url.replace(/^https?:\/\//, "");
  const tags = ["NBA", "EuroLeague"].filter((t) => list.some((p) => (t === "NBA" ? p.league === "NBA" : p.league === "EL")));
  const head = `🏀 ${titleOf(list, L)}${d ? ` (${dayOf(d, L)})` : ""}`;
  const sureLines = sure.slice(0, 3).map((p) => { const f = favOf(p); return `🔒 ${f.team} ${pctOf(f.p, L)} vs ${f.other}`; });
  const foot = `${L.t("Probabilités gratuites sur Basketlog", "Free win probabilities on Basketlog", "Probabilidades gratis en Basketlog", "Probabilidades grátis no Basketlog")}${colon(L)}${shown}`;
  const tagLine = tags.map((t) => `#${t}`).join(" ");
  const proUrl = urlOf(proPath, L);
  const proShown = proUrl.replace(/^https?:\/\//, "");
  const promo = `${PROMO_MARK} ${promoText(L)} 👉 ${proShown}`;
  const build = (k, withPromo) => {
    const others = rest.slice(0, k).map((p) => { const f = favOf(p); return `${f.team} ${pctOf(f.p, L)}`; }).join(" · ");
    return [head, ...sureLines, others, foot, withPromo ? promo : "", tagLine].filter(Boolean).join("\n");
  };
  // La ligne promo passe si elle tient avec au moins les matchs « confiance très élevée » ; sinon, message d'avant.
  let text = null;
  for (const withPromo of [true, false]) {
    let k = rest.length;
    let t = build(k, withPromo);
    while (k > 0 && graphemes(t) > BSKY_MAX) t = build(--k, withPromo);
    if (graphemes(t) <= BSKY_MAX && (!withPromo || k > 0 || !rest.length)) { text = t; break; }
  }
  if (!text) text = [head, foot, tagLine].filter(Boolean).join("\n");

  // Positions en octets : le lien (dans le pied) et chaque mot-dièse (sur la dernière ligne).
  const facets = [];
  const at = (needle, from) => {
    const i = text.indexOf(needle, from);
    if (i < 0) return null;
    const byteStart = utf8(text.slice(0, i)).length;
    return { i, byteStart, byteEnd: byteStart + utf8(needle).length };
  };
  const link = at(shown, text.lastIndexOf(foot));
  if (link) facets.push({ index: { byteStart: link.byteStart, byteEnd: link.byteEnd }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] });
  const pIdx = text.indexOf(promo);
  const plink = pIdx >= 0 ? at(proShown, pIdx) : null;
  if (plink) facets.push({ index: { byteStart: plink.byteStart, byteEnd: plink.byteEnd }, features: [{ $type: "app.bsky.richtext.facet#link", uri: proUrl }] });
  let from = text.lastIndexOf(tagLine);
  for (const t of tags) {
    const h = at(`#${t}`, from);
    if (!h) continue;
    facets.push({ index: { byteStart: h.byteStart, byteEnd: h.byteEnd }, features: [{ $type: "app.bsky.richtext.facet#tag", tag: t }] });
    from = h.i + t.length + 1;
  }

  const n = list.length;
  return {
    text,
    facets,
    langs: [L.lang],
    url,
    // Carte d'aperçu du lien (titre et description de la page du jour).
    title: L.t("Pronostic NBA ce soir : matchs du jour et probabilités – Basketlog", "NBA predictions tonight: today's games and win probabilities – Basketlog", "Pronóstico NBA esta noche: partidos de hoy y probabilidades – Basketlog", "Palpite NBA hoje à noite: jogos de hoje e probabilidades – Basketlog"),
    description: L.t(
      `${n} match${n > 1 ? "s" : ""} analysé${n > 1 ? "s" : ""} : favori, probabilités de victoire et score projeté.`,
      `${n} game${n > 1 ? "s" : ""} analyzed: favorite, win probabilities and projected score.`,
      `${n} partido${n > 1 ? "s" : ""} analizado${n > 1 ? "s" : ""}: favorito, probabilidades de victoria y marcador proyectado.`, `${n} jogo${n > 1 ? "s" : ""} analisado${n > 1 ? "s" : ""}: favorito, probabilidades de vitória e placar projetado.`
    ),
  };
}

// Image de la carte d'aperçu Bluesky : l'image de partage du site dans la langue du message.
export const ogImageUrl = (lang) => (lang === "fr" ? `${SITE}/opengraph-image` : `${SITE}/api/og?lang=${lang}`);

// Profil du compte Bluesky (posé par /api/cron/social?profile=1) : le nom de la marque, une présentation en trois
// langues avec l'adresse du site, et le logo du site. Bluesky limite le nom à 64 graphèmes et la présentation à 256.
// L'adresse est écrite avec https:// : sans protocole, l'application ne rend pas cliquable un domaine à trait d'union.
export const BSKY_NAME_MAX = 64;
export const BSKY_BIO_MAX = 256;
export const blueskyProfile = () => ({
  displayName: "Basketlog",
  description: [
    "🇫🇷 Probabilités de victoire gratuites pour chaque match NBA et EuroLeague",
    "🇺🇸 Free win probabilities for every NBA & EuroLeague game",
    "🇪🇸 Probabilidades de victoria gratis para cada partido de la NBA y la Euroliga",
    `🏀 ${SITE}`,
  ].join("\n"),
  avatarUrl: `${SITE}/icons/icon-512.png`,
});

// Toutes les publications du jour, par langue.
export function socialPosts(picks, { d, record } = {}) {
  const out = {};
  for (const lang of SOCIAL_LANGS) {
    out[lang] = {
      telegram: telegramText(picks, lang, { d, record }),
      telegramPreview: telegramPreviewUrl(picks, lang),
      bluesky: blueskyPost(picks, lang, { d }),
    };
  }
  return out;
}

// ── Récap du matin (« surprise de la nuit ») ─────────────────────────────────────────────────────────────────────
// Publié chaque matin (08 h 13 UTC) par /api/cron/social?recap=1 à partir des résultats de la veille : combien de
// favoris du modèle ont gagné, la plus grosse surprise (favori battu, s'il l'était à 60 % ou plus), sinon le plus gros
// écart, et le lien vers la page des résultats. Messages marqués « ☀️ » (le contrôle anti-doublon s'appuie dessus).
export const RECAP_MARK = "☀️";
export const UPSET_MIN = 0.6;
// rows : [{ away, home, awayScore, homeScore, pHome }] (noms courts, scores finaux, probabilité d'avant-match).
export function recapFacts(rows) {
  const list = (rows || []).filter((r) => r && r.homeScore != null && r.awayScore != null && r.homeScore !== r.awayScore && r.pHome != null);
  const games = list.map((r) => {
    const favHome = r.pHome >= 0.5;
    const homeWon = r.homeScore > r.awayScore;
    return { ...r, fav: favHome ? r.home : r.away, dog: favHome ? r.away : r.home, pf: favHome ? r.pHome : 1 - r.pHome, ok: favHome === homeWon };
  });
  const ok = games.filter((g) => g.ok).length;
  const upset = games.filter((g) => !g.ok && g.pf >= UPSET_MIN).sort((a, b) => b.pf - a.pf)[0] || null;
  const blowout = [...games].sort((a, b) => Math.abs(b.homeScore - b.awayScore) - Math.abs(a.homeScore - a.awayScore))[0] || null;
  return { n: games.length, ok, upset, blowout };
}
const scoreLine = (g) => `${g.away} ${g.awayScore}-${g.homeScore} ${g.home}`;

function recapLines(f, L) {
  const head = `${RECAP_MARK} ${L.t(`Nuit NBA : nos favoris ont gagné ${f.ok} match${f.ok > 1 ? "s" : ""} sur ${f.n}.`, `NBA last night: our favorites won ${f.ok} of ${f.n} games.`, `Noche NBA: nuestros favoritos ganaron ${f.ok} de ${f.n} partidos.`, `Noite de NBA: nossos favoritos venceram ${f.ok} de ${f.n} jogos.`)}`;
  let mid = "";
  if (f.upset) {
    const u = f.upset;
    mid = L.t(`😱 Surprise de la nuit : ${scoreLine(u)}. Les ${u.fav} étaient favoris à ${pctOf(u.pf, L)}.`, `😱 Upset of the night: ${scoreLine(u)}. The ${u.fav} were ${pctOf(u.pf, L)} favorites.`, `😱 Sorpresa de la noche: ${scoreLine(u)}. Los ${u.fav} eran favoritos al ${pctOf(u.pf, L)}.`, `😱 Zebra da noite: ${scoreLine(u)}. O ${u.fav} era favorito com ${pctOf(u.pf, L)}.`);
  } else if (f.ok === f.n) {
    mid = L.t("✅ Sans-faute : tous nos favoris ont gagné.", "✅ Clean sweep: every favorite won.", "✅ Pleno: ganaron todos nuestros favoritos.", "✅ Gabarito: todos os nossos favoritos venceram.");
  } else if (f.blowout) {
    mid = L.t(`💥 Plus gros écart : ${scoreLine(f.blowout)}.`, `💥 Biggest blowout: ${scoreLine(f.blowout)}.`, `💥 Mayor paliza: ${scoreLine(f.blowout)}.`, `💥 Maior goleada: ${scoreLine(f.blowout)}.`);
  }
  const ask = f.upset ? L.t("Vous l'aviez vue venir ? 👇", "Did you see it coming? 👇", "¿La viste venir? 👇", "Você viu essa chegando? 👇") : "";
  return { head, mid, ask };
}

// Message Bluesky du récap (texte, liens cliquables par « facets », carte d'aperçu de la page des résultats).
export function recapBluesky(f, lang) {
  const L = mk(lang);
  const url = urlOf("/app/resultats", L);
  const shown = url.replace(/^https?:\/\//, "");
  const { head, mid, ask } = recapLines(f, L);
  const foot = `${L.t("Tous les résultats", "Every score", "Todos los resultados", "Todos os resultados")}${colon(L)}${shown}`;
  const text = [head, mid, ask, foot, "#NBA"].filter(Boolean).join("\n");
  const facets = [];
  const at = (needle, from = 0) => {
    const i = text.indexOf(needle, from);
    if (i < 0) return null;
    const byteStart = utf8(text.slice(0, i)).length;
    return { byteStart, byteEnd: byteStart + utf8(needle).length };
  };
  const link = at(shown, text.lastIndexOf(foot));
  if (link) facets.push({ index: link, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] });
  const tag = at("#NBA", text.lastIndexOf("#NBA"));
  if (tag) facets.push({ index: tag, features: [{ $type: "app.bsky.richtext.facet#tag", tag: "NBA" }] });
  return {
    text, facets, langs: [L.lang], url,
    title: L.t("Résultats NBA de la nuit : tous les scores et nos pronostics – Basketlog", "NBA scores last night: every result and our predictions – Basketlog", "Resultados NBA de anoche: todos los marcadores y nuestros pronósticos – Basketlog", "Resultados da NBA ontem: todos os placares e nossos palpites – Basketlog"),
    description: L.t("Le score de chaque match et le favori du modèle avant le coup d'envoi : réussi ou manqué.", "Every final score and the model's pre-game favorite: right or wrong.", "El marcador de cada partido y el favorito del modelo antes del inicio: acierto o fallo.", "O placar de cada jogo e o favorito do modelo antes do início: acerto ou erro."),
  };
}

// Message Telegram (HTML) du récap.
export function recapTelegram(f, lang) {
  const L = mk(lang);
  const url = urlOf("/app/resultats", L);
  const { head, mid, ask } = recapLines(f, L);
  return [esc(head), esc(mid), esc(ask), "", `👉 <a href="${esc(url)}">${L.t("Tous les résultats de la nuit sur Basketlog", "Every score from last night on Basketlog", "Todos los resultados de anoche en Basketlog", "Todos os resultados de ontem no Basketlog")}</a>`].filter((x, i) => x !== "" || i === 3).join("\n");
}

export function recapPosts(f) {
  const out = {};
  for (const lang of SOCIAL_LANGS) out[lang] = { telegram: recapTelegram(f, lang), telegramPreview: urlOf("/app/resultats", mk(lang)), bluesky: recapBluesky(f, lang) };
  return out;
}

// Post de lancement de l'offre (validé mot pour mot par Tim le 20/11/2026), publié une fois par
// /api/cron/social?promo=1 (compte admin). Marqué « 🎁 » pour le contrôle anti-doublon.
const LAUNCH = {
  en: ["Friday night NBA 🏀 Want more than who wins? Basketlog Pro breaks down every game: exact win %, projected score, key factors, every scenario, injury report.", "3 days for €1, then €9.99/mo (+ tax). Cancel anytime."],
  fr: ["Vendredi soir NBA 🏀 Tu veux plus que le vainqueur ? Basketlog Pro décortique chaque match : probabilités exactes, score projeté, facteurs clés, tous les scénarios, infirmerie.", "3 jours à 1 €, puis 9,99 €/mois + taxes. Résiliable à tout moment."],
  es: ["Viernes de NBA 🏀 ¿Quieres más que el ganador? Basketlog Pro analiza cada partido: probabilidades exactas, marcador proyectado, factores clave, todos los escenarios, lesiones.", "3 días por 1 €, luego 9,99 €/mes + impuestos. Cancela cuando quieras."],
};
export function launchPosts() {
  const out = {};
  for (const lang of Object.keys(LAUNCH)) {
    const L = mk(lang);
    const url = urlOf(proPath, L);
    const shown = url.replace(/^https?:\/\//, "");
    const [a, b] = LAUNCH[lang];
    const text = `${a}\n${b}\n👉 ${shown}`;
    const i = text.lastIndexOf(shown);
    const byteStart = utf8(text.slice(0, i)).length;
    out[lang] = {
      telegram: `${esc(a)}\n${esc(b)}\n👉 <a href="${esc(url)}">${esc(shown)}</a>`,
      telegramPreview: url,
      bluesky: {
        text,
        facets: [{ index: { byteStart, byteEnd: byteStart + utf8(shown).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] }],
        langs: [L.lang],
        url,
        title: L.t("Basketlog Pro : 3 jours à 1 €", "Basketlog Pro: 3 days for €1", "Basketlog Pro: 3 días por 1 €", "Basketlog Pro: 3 dias por 1 €"),
        description: b,
      },
    };
  }
  return out;
}

// ---------- Power ranking de la semaine (le lundi, ?power=1) ----------
// rows : lignes de lib/data.powerRankings() (équipe, évolution sur 7 jours). Marque « 📊 » contre les doublons.
export const POWER_MARK = "📊";
const ordinal = (n, L) => L.t(`${n}e`, `${n}${n % 10 === 1 && n % 100 !== 11 ? "st" : n % 10 === 2 && n % 100 !== 12 ? "nd" : n % 10 === 3 && n % 100 !== 13 ? "rd" : "th"}`, `${n}.º`, `${n}º`);
const arrow = (m) => (m > 0 ? ` ▲${m}` : m < 0 ? ` ▼${-m}` : "");

export function powerFacts(rows) {
  const ranked = (rows || []).map((r, i) => ({ short: r.team?.short, move: r.move, rank: i + 1 })).filter((r) => r.short);
  const moved = ranked.filter((r) => r.move != null);
  const up = [...moved].sort((a, b) => b.move - a.move || a.rank - b.rank)[0];
  const down = [...moved].sort((a, b) => a.move - b.move || a.rank - b.rank)[0];
  return { top: ranked.slice(0, 5), up: up && up.move > 0 ? up : null, down: down && down.move < 0 ? down : null };
}

function powerLines(f, L, n = 5) {
  const head = `${POWER_MARK} ${L.t("Power ranking NBA de la semaine (modèle Basketlog)", "NBA power rankings this week (Basketlog model)", "Power ranking NBA de la semana (modelo Basketlog)", "Power ranking NBA da semana (modelo Basketlog)")}`;
  const top = f.top.slice(0, n).map((r) => `${r.rank}. ${r.short}${arrow(r.move)}`).join(" · ");
  const up = f.up ? `📈 ${L.t("Plus forte hausse", "Biggest riser", "Mayor subida", "Maior alta")}${colon(L)}${f.up.short}${arrow(f.up.move)} (${ordinal(f.up.rank, L)})` : null;
  const down = f.down ? `📉 ${L.t("Plus forte baisse", "Biggest faller", "Mayor caída", "Maior queda")}${colon(L)}${f.down.short}${arrow(f.down.move)} (${ordinal(f.down.rank, L)})` : null;
  return { head, top, up, down };
}

export function powerBluesky(f, lang) {
  const L = mk(lang);
  const url = urlOf("/app/power-rankings", L);
  const shown = url.replace(/^https?:\/\//, "");
  const foot = `${L.t("Le classement complet", "Full rankings", "Clasificación completa", "Ranking completo")}${colon(L)}${shown}`;
  let text = "";
  for (const n of [5, 4, 3]) {
    const { head, top, up, down } = powerLines(f, L, n);
    text = [head, top, up, down, foot, "#NBA"].filter(Boolean).join("\n");
    if (graphemes(text) <= BSKY_MAX) break;
  }
  const at = (needle, from) => {
    const i = text.indexOf(needle, from);
    if (i < 0) return null;
    const byteStart = utf8(text.slice(0, i)).length;
    return { byteStart, byteEnd: byteStart + utf8(needle).length };
  };
  const facets = [];
  const link = at(shown, text.lastIndexOf(foot));
  if (link) facets.push({ index: link, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] });
  const tag = at("#NBA", text.lastIndexOf("#NBA"));
  if (tag) facets.push({ index: tag, features: [{ $type: "app.bsky.richtext.facet#tag", tag: "NBA" }] });
  return {
    text, facets, langs: [L.lang], url,
    title: L.t("Power ranking NBA : les 30 équipes classées par le modèle – Basketlog", "NBA power rankings: all 30 teams ranked by our model – Basketlog", "Power ranking NBA: los 30 equipos según nuestro modelo – Basketlog", "Power ranking NBA: os 30 times segundo nosso modelo – Basketlog"),
    description: L.t("Les 30 équipes NBA classées par leur vraie force selon le modèle Basketlog, avec l'évolution sur 7 jours.", "All 30 NBA teams ranked by true strength according to the Basketlog model, with the 7-day change.", "Los 30 equipos de la NBA según su fuerza real en el modelo de Basketlog, con el cambio en 7 días.", "Os 30 times da NBA pela força real segundo o modelo do Basketlog, com a variação em 7 dias."),
  };
}

export function powerTelegram(f, lang) {
  const L = mk(lang);
  const url = urlOf("/app/power-rankings", L);
  const { head, top, up, down } = powerLines(f, L, 5);
  return [...[head, top, up, down].filter(Boolean).map(esc), "", `👉 <a href="${esc(url)}">${L.t("Les 30 équipes sur Basketlog", "All 30 teams on Basketlog", "Los 30 equipos en Basketlog", "Os 30 times no Basketlog")}</a>`].join("\n");
}

export function powerPosts(rows) {
  const f = powerFacts(rows);
  if (f.top.length < 5) return null;
  const out = {};
  for (const lang of SOCIAL_LANGS) out[lang] = { telegram: powerTelegram(f, lang), telegramPreview: urlOf("/app/power-rankings", mk(lang)), bluesky: powerBluesky(f, lang) };
  return out;
}
