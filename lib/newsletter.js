// Newsletter du dimanche de Basketlog : le créneau d'envoi (dimanche 18 h, heure de Paris, été comme hiver), la semaine ISO
// et le texte du mail (HTML et texte brut) en français, anglais et espagnol.
// Ce fichier ne fait que du calcul, sans aucun appel réseau (testé dans tests/unit.mjs). Les données viennent du site :
// le bilan des 7 derniers jours et les matchs à confiance très élevée des 7 jours suivants (app/api/cron/newsletter).
// Règles : aucun texte écrit par une IA, aucun chiffre inventé, le bilan est toujours montré tel quel (bon ou mauvais),
// pas de vocabulaire de paris (Basketlog donne des probabilités). La liste d'envoi, le consentement et l'envoi
// sont dans lib/resend.js.
import { mk, fmtDate, fmtTime, pctOf } from "./i18n.js";
import { SITE } from "./site.js";
import { LEGAL } from "./legal.js";

export const ISSUE_LANGS = ["fr", "en", "es"];
export const SEND_HOUR = 18; // dimanche, heure de Paris
export const BILAN_MIN = 5; // en dessous, le bilan de la semaine n'est pas montré (trop peu de matchs)
export const PCT_MIN = 10; // en dessous, on dit « 4 sur 5 » sans pourcentage
export const RECORD_MIN = 20; // même seuil que le site pour citer le bilan « confiance très élevée » recalculé
export const MAX_SHOWN = 10; // matchs listés dans le mail ; les suivants sont résumés en une ligne
export const MAX_FAVORITES = 5;
export const PLACEHOLDER = "{{{RESEND_UNSUBSCRIBE_URL}}}"; // remplacé par Resend dans chaque mail de diffusion

// ---------- Créneau d'envoi : dimanche 18 h à Paris ----------
const TZ = "Europe/Paris";
const parisFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short" });
const WD = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const pad = (n) => String(n).padStart(2, "0");

// Date et heure à Paris à un instant donné (en millisecondes), jour de la semaine compris (0 = dimanche).
export function parisParts(ms) {
  const o = {};
  for (const { type, value } of parisFmt.formatToParts(new Date(ms))) o[type] = value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, min: +o.minute, s: +o.second, wd: WD[o.weekday] };
}

// Avance de l'heure de Paris sur UTC à cet instant, en millisecondes : 1 h l'hiver, 2 h l'été.
const offsetAt = (ms) => {
  const p = parisParts(ms);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - Math.floor(ms / 1000) * 1000;
};

// Instant UTC (en millisecondes) d'une heure locale de Paris. Deux passes : la seconde corrige le cas où le décalage
// change entre l'heure devinée et l'heure réelle (jour du changement d'heure).
export function parisToUtc(y, m, d, h = 0, min = 0) {
  const wall = Date.UTC(y, m - 1, d, h, min);
  let t = wall - offsetAt(wall);
  t = wall - offsetAt(t);
  return t;
}

// Semaine ISO d'une date (lundi = premier jour ; la semaine 1 contient le premier jeudi de janvier) : { year, week, label }.
// Le dimanche appartient à la semaine qui finit ce jour-là. label : « 2026-W46 ».
export function isoWeek(y, m, d) {
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7)); // le jeudi de cette semaine
  const year = date.getUTCFullYear();
  const week = Math.ceil(((date - Date.UTC(year, 0, 1)) / 86400000 + 1) / 7);
  return { year, week, label: `${year}-W${pad(week)}` };
}

// Prochain dimanche 18 h à Paris, aujourd'hui compris s'il n'est pas encore 18 h : { at (ms UTC), iso, local, week }.
// L'heure d'envoi est calculée ici et transmise telle quelle à Resend (scheduled_at) : l'envoi tombe à 18 h pile
// même quand Vercel lance la tâche avec du retard et quand l'heure d'été ou d'hiver change.
export function sundaySlot(now = Date.now(), hour = SEND_HOUR) {
  const ms = now instanceof Date ? now.getTime() : typeof now === "string" ? Date.parse(now) : now;
  const p = parisParts(ms);
  const ahead = p.wd === 0 ? (p.h < hour ? 0 : 7) : 7 - p.wd;
  const day = new Date(Date.UTC(p.y, p.m - 1, p.d + ahead));
  const y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
  const at = parisToUtc(y, m, d, hour, 0);
  return { at, iso: new Date(at).toISOString(), local: `${y}-${pad(m)}-${pad(d)}`, week: isoWeek(y, m, d) };
}

// Nom de la diffusion chez Resend : un par semaine et par langue, ce qui sert à ne jamais l'envoyer deux fois.
export const issueName = (week, lang) => `Newsletter ${week} ${lang}`;

// Fenêtre de programmation : la tâche du dimanche prépare le mail et le programme chez Resend seulement dans les 8 heures
// qui précèdent l'envoi (jamais une semaine à l'avance : le contenu serait périmé) et au moins 5 minutes avant (Resend refuse
// une heure trop proche). { slot, lead (ms avant l'envoi), open }.
export const WINDOW_MS = 8 * 3600e3;
export const MIN_LEAD_MS = 5 * 60e3;
export function runWindow(now = Date.now()) {
  const ms = now instanceof Date ? now.getTime() : now;
  const slot = sundaySlot(ms);
  const lead = slot.at - ms;
  return { slot, lead, open: lead >= MIN_LEAD_MS && lead <= WINDOW_MS };
}

// Bilan des 7 derniers jours à partir de deux listes de matchs terminés (déjà limitées à ces 7 jours) : les pronostics publiés
// avant les matchs priment et ne sont jamais mélangés avec le bilan recalculé ; celui-ci ne sert que lorsqu'aucun pronostic
// publié n'existe sur la période. Moins de BILAN_MIN matchs : pas de bilan (null). Chaque match : { ok, conf }.
const VERY_HIGH = "Très élevée"; // même niveau que lib/sure.js (favori à 88 % et plus)
export function weekBilan(published, recalculated) {
  const pub = Array.isArray(published) ? published : [];
  const list = pub.length ? pub : Array.isArray(recalculated) ? recalculated : [];
  if (list.length < BILAN_MIN) return null;
  const sure = list.filter((p) => p.conf === VERY_HIGH);
  return {
    n: list.length,
    ok: list.filter((p) => p.ok).length,
    sureN: sure.length,
    sureOk: sure.filter((p) => p.ok).length,
    source: pub.length ? "published" : "recalculated",
  };
}

// ---------- Textes ----------
const S = {
  fr: {
    tagline: "La newsletter du dimanche",
    bilanTitle: "Le bilan des 7 derniers jours",
    bilanLead: "Le favori de Basketlog a gagné",
    bilanCount: (ok, n) => `${ok} match${ok > 1 ? "s" : ""} sur ${n}`,
    sureLine: (ok, n, pct) => `Confiance très élevée : ${ok} sur ${n}${pct ? ` (${pct})` : ""}.`,
    noteLive: "Chaque pronostic est enregistré avant le coup d'envoi, puis comparé au score final.",
    noteRecalc: "Bilan recalculé match par match, avec les seuls résultats connus avant chaque rencontre.",
    bilanLink: "Voir le bilan complet",
    sureTitle: "À suivre cette semaine : confiance très élevée",
    sureIntro: (tz) => `Les matchs avec un favori à 88 % et plus, NBA et EuroLeague (${tz}).`,
    favTitle: "Les favoris les plus nets de la semaine",
    favIntro: (tz) => `Aucun match à confiance très élevée n'est annoncé pour l'instant. Voici les favoris les plus nets des 7 prochains jours (${tz}).`,
    favorite: "favori",
    euroleague: "EuroLeague",
    more: (k) => `+ ${k} autre${k > 1 ? "s" : ""} match${k > 1 ? "s" : ""} à confiance très élevée dans l'appli`,
    record: (season, ok, n, pct) => `Bilan recalculé depuis ${season} : nos favoris en confiance très élevée ont gagné ${ok} matchs sur ${n} (${pct}).`,
    cta: "Ouvrir Basketlog",
    ctaNote: "Les probabilités de chaque match sont gratuites sur le site.",
    why: "Tu reçois cet e-mail parce que tu as demandé la newsletter dans ton compte Basketlog.",
    unsub: "Se désinscrire",
    manage: "Gérer dans Mon compte",
    privacy: "Confidentialité",
    status: "entrepreneur individuel",
    publisher: (name, status, siren, address) => `Basketlog est édité par ${name}, ${status} (SIREN ${siren}), ${address}.`,
    disclaimer: `Basketlog donne des probabilités calculées par un modèle statistique, sans garantie de résultat. Les jeux d'argent comportent des risques : appelle le ${LEGAL.jeu.tel} (${LEGAL.jeu.nom}, appel non surtaxé).`,
    subject: (n) => (n ? `Basketlog · ${n} match${n > 1 ? "s" : ""} à confiance très élevée cette semaine` : "Basketlog · le bilan de la semaine et les matchs à suivre"),
    preBilan: (ok, n) => `Le favori de Basketlog a gagné ${ok} match${ok > 1 ? "s" : ""} sur ${n} ces 7 derniers jours. Et les matchs à suivre cette semaine.`,
    preNone: "Les matchs à suivre cette semaine, avec leur probabilité.",
  },
  en: {
    tagline: "The Sunday newsletter",
    bilanTitle: "The last 7 days",
    bilanLead: "Basketlog's favorite won",
    bilanCount: (ok, n) => `${ok} of ${n} games`,
    sureLine: (ok, n, pct) => `Very high confidence: ${ok} of ${n}${pct ? ` (${pct})` : ""}.`,
    noteLive: "Every prediction is saved before tip-off, then compared with the final score.",
    noteRecalc: "Record recalculated game by game, using only results known before each game.",
    bilanLink: "See the full record",
    sureTitle: "This week's games to watch: very high confidence",
    sureIntro: (tz) => `Games with a favorite at 88% or more, NBA and EuroLeague (${tz}).`,
    favTitle: "The clearest favorites this week",
    favIntro: (tz) => `No very-high-confidence game is listed yet. Here are the clearest favorites for the next 7 days (${tz}).`,
    favorite: "favorite",
    euroleague: "EuroLeague",
    more: (k) => `+ ${k} more very-high-confidence game${k > 1 ? "s" : ""} in the app`,
    record: (season, ok, n, pct) => `Record recalculated since ${season}: our very-high-confidence favorites won ${ok} of ${n} games (${pct}).`,
    cta: "Open Basketlog",
    ctaNote: "Win probabilities for every game are free on the site.",
    why: "You are receiving this email because you asked for the newsletter in your Basketlog account.",
    unsub: "Unsubscribe",
    manage: "Manage in My account",
    privacy: "Privacy",
    status: "sole proprietor (French micro-entreprise)",
    publisher: (name, status, siren, address) => `Basketlog is published by ${name}, ${status}, ${address}. SIREN ${siren}.`,
    disclaimer: `Basketlog provides probabilities calculated by a statistical model, with no guarantee of results. Gambling involves risks such as debt and addiction. If you need help in France, call ${LEGAL.jeu.tel} (${LEGAL.jeu.nom}).`,
    subject: (n) => (n ? `Basketlog · ${n} very-high-confidence game${n > 1 ? "s" : ""} this week` : "Basketlog · the weekly record and games to watch"),
    preBilan: (ok, n) => `Basketlog's favorite won ${ok} of ${n} games over the last 7 days. And the games to watch this week.`,
    preNone: "The games to watch this week, with their win probability.",
  },
  es: {
    tagline: "La newsletter del domingo",
    bilanTitle: "El balance de los últimos 7 días",
    bilanLead: "El favorito de Basketlog ganó",
    bilanCount: (ok, n) => `${ok} de ${n} partidos`,
    sureLine: (ok, n, pct) => `Confianza muy alta: ${ok} de ${n}${pct ? ` (${pct})` : ""}.`,
    noteLive: "Cada pronóstico se guarda antes del salto inicial y luego se compara con el marcador final.",
    noteRecalc: "Balance recalculado partido a partido, solo con los resultados conocidos antes de cada encuentro.",
    bilanLink: "Ver el balance completo",
    sureTitle: "Para seguir esta semana: confianza muy alta",
    sureIntro: (tz) => `Partidos con un favorito al 88 % o más, NBA y Euroliga (${tz}).`,
    favTitle: "Los favoritos más claros de la semana",
    favIntro: (tz) => `Todavía no hay ningún partido de confianza muy alta. Estos son los favoritos más claros de los próximos 7 días (${tz}).`,
    favorite: "favorito",
    euroleague: "Euroliga",
    more: (k) => `+ ${k} partido${k > 1 ? "s" : ""} más de confianza muy alta en la app`,
    record: (season, ok, n, pct) => `Balance recalculado desde ${season}: nuestros favoritos con confianza muy alta ganaron ${ok} de ${n} partidos (${pct}).`,
    cta: "Abrir Basketlog",
    ctaNote: "Las probabilidades de cada partido son gratis en la web.",
    why: "Recibes este correo porque pediste la newsletter en tu cuenta de Basketlog.",
    unsub: "Darme de baja",
    manage: "Gestionar en Mi cuenta",
    privacy: "Privacidad",
    status: "empresario individual (micro-entreprise francesa)",
    publisher: (name, status, siren, address) => `Basketlog está editado por ${name}, ${status}, ${address}. SIREN ${siren}.`,
    disclaimer: `Basketlog ofrece probabilidades calculadas por un modelo estadístico, sin garantía de resultados. El juego conlleva riesgos como el endeudamiento o la adicción. En España puedes pedir ayuda en jugarbien.es; en Francia, en el ${LEGAL.jeu.tel} (${LEGAL.jeu.nom}).`,
    subject: (n) => (n ? `Basketlog · ${n} partido${n > 1 ? "s" : ""} de confianza muy alta esta semana` : "Basketlog · el balance semanal y los partidos a seguir"),
    preBilan: (ok, n) => `El favorito de Basketlog ganó ${ok} de ${n} partidos en los últimos 7 días. Y los partidos a seguir esta semana.`,
    preNone: "Los partidos a seguir esta semana, con su probabilidad.",
  },
};

// ---------- Mise en forme ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const nameOf = (t) => t?.short || t?.name || t?.abbr || "";
const FONT = "Inter, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";
const INK = "#111827", TEXT = "#374151", MUTED = "#6b7280", NAVY = "#0a0f1f", ORANGE = "#ff7a1a", DEEP = "#c2410c", LINE = "#e5e7eb", PAPER = "#f3f4f6";

// Favori d'un match : l'équipe, sa probabilité (entre 0,5 et 1) et l'autre équipe.
const favOf = (p) => (p.pHome >= 0.5 ? { team: nameOf(p.home), p: p.pHome } : { team: nameOf(p.away), p: 1 - p.pHome });
const clearest = (p) => Math.max(p.pHome, 1 - p.pHome);

// Le mail, en HTML et en texte brut.
//   data.at         instant d'envoi (ISO) : sert à la date en tête du mail
//   data.week       semaine ISO « 2026-W46 » : repère de campagne dans les liens
//   data.bilan      { n, ok, sureN, sureOk, source: "published" | "recalculated" } ou null
//   data.sure       matchs à confiance très élevée à venir, par heure : { league, href, date, home, away, pHome }
//   data.favorites  repli quand il n'y en a pas : les favoris les plus nets (même forme)
//   data.record     { n, ok, since } : bilan « confiance très élevée » recalculé, cité à partir de RECORD_MIN matchs
//   data.unsubscribeUrl  lien de désinscription (par défaut la balise de Resend)
// Renvoie { subject, preheader, html, text, empty } ; empty : il n'y a rien à dire cette semaine (pas de mail).
export function buildIssue(data = {}, lang = "fr") {
  const L = mk(lang);
  const s = S[L.lang];
  const colon = L.lang === "fr" ? " : " : ": "; // l'espace avant les deux-points est une règle du français seulement
  const campaign = data.week || "newsletter";
  const unsub = data.unsubscribeUrl || PLACEHOLDER;
  const sendIso = data.at || new Date().toISOString();
  const bilan = data.bilan && data.bilan.n >= BILAN_MIN ? data.bilan : null;
  const sureAll = Array.isArray(data.sure) ? data.sure : [];
  const sure = sureAll.slice(0, MAX_SHOWN);
  const more = Math.max(0, sureAll.length - sure.length);
  const favorites = !sureAll.length && Array.isArray(data.favorites) ? data.favorites.slice(0, MAX_FAVORITES) : [];
  const listed = sure.length ? sure : favorites;
  const record = data.record && data.record.n >= RECORD_MIN ? data.record : null;
  const empty = !bilan && !listed.length;

  // Liens du site, dans la langue du mail, avec un repère de campagne (aucun suivi chez Resend : le site mesure les visites).
  const link = (path) => {
    const abs = `${SITE}${L.href(path)}`;
    return `${abs}${abs.includes("?") ? "&" : "?"}utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}`;
  };
  const plain = (path) => `${SITE}${L.href(path)}`;

  const subject = s.subject(sureAll.length);
  const preheader = bilan ? s.preBilan(bilan.ok, bilan.n) : s.preNone;
  const dateLine = cap(fmtDate(L, sendIso, { weekday: "long", day: "numeric", month: "long" }));
  const matchup = (p) => (L.en ? `${nameOf(p.away)} vs ${nameOf(p.home)}` : `${nameOf(p.away)} – ${nameOf(p.home)}`);
  const lineOf = (p) => {
    const f = favOf(p);
    return { time: fmtTime(L, p.date), tag: p.league === "EL" ? s.euroleague : "", match: matchup(p), fav: `${f.team} ${pctOf(f.p, L)}`, url: link(p.href) };
  };
  // Matchs regroupés par jour (dans le fuseau de la langue, comme sur le site).
  const days = [];
  for (const p of listed) {
    const key = fmtDate(L, p.date, { year: "numeric", month: "2-digit", day: "2-digit" });
    let day = days.find((x) => x.key === key);
    if (!day) days.push((day = { key, label: cap(fmtDate(L, p.date, { weekday: "long", day: "numeric", month: "long" })), rows: [] }));
    day.rows.push(lineOf(p));
  }
  const bilanPct = bilan && bilan.n >= PCT_MIN ? pctOf(bilan.ok / bilan.n, L) : "";
  const surePct = bilan && bilan.sureN >= PCT_MIN ? pctOf(bilan.sureOk / bilan.sureN, L) : "";
  const season = record ? `${record.since - 1}-${String(record.since).slice(2)}` : "";
  const recordText = record ? s.record(season, record.ok, record.n, pctOf(record.ok / record.n, L)) : "";
  const address = L.lang === "es" ? LEGAL.editeur.adresse.replace(/, France$/, ", Francia") : LEGAL.editeur.adresse;
  const identity = s.publisher(LEGAL.editeur.nom, s.status, LEGAL.editeur.siren, address);
  const bilanNote = bilan?.source === "recalculated" ? s.noteRecalc : s.noteLive;
  const listTitle = sure.length ? s.sureTitle : s.favTitle;
  const listIntro = sure.length ? s.sureIntro(L.tzLabel) : s.favIntro(L.tzLabel);

  // ----- HTML (tableaux, styles en ligne : c'est ce que lisent tous les clients de messagerie)
  const h2 = (t) => `<h2 style="margin:0;padding-bottom:10px;font-family:${FONT};font-size:19px;line-height:1.3;font-weight:800;color:${NAVY};">${esc(t)}</h2>`;
  const para = (inner, extra = "") => `<p style="margin:0;padding-bottom:12px;font-family:${FONT};font-size:15px;line-height:1.6;color:${TEXT};${extra}">${inner}</p>`;
  const block = (inner) => `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding-top:26px;padding-bottom:10px;padding-left:28px;padding-right:28px;">${inner}</td></tr>`;
  const rule = `<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding-left:28px;padding-right:28px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td height="1" style="height:1px;font-size:1px;line-height:1px;border-top:1px solid ${LINE};">&nbsp;</td></tr></table></td></tr>`;
  const small = (inner) => `<p style="margin:0;padding-bottom:8px;font-family:${FONT};font-size:12px;line-height:1.55;color:${MUTED};">${inner}</p>`;
  const anchor = (url, label, color = DEEP) => `<a href="${esc(url)}" style="color:${color};text-decoration:underline;">${esc(label)}</a>`;

  let body = "";
  if (bilan) {
    const lead = `${esc(s.bilanLead)} <b style="color:${INK};">${esc(s.bilanCount(bilan.ok, bilan.n))}</b>${bilanPct ? ` (${esc(bilanPct)})` : ""}.`;
    const sureNote = bilan.sureN > 0 ? para(esc(s.sureLine(bilan.sureOk, bilan.sureN, surePct))) : "";
    body += block(
      h2(s.bilanTitle) + para(lead, "font-size:16px;") + sureNote +
      small(esc(bilanNote)) + para(anchor(link("/app/bilan"), `${s.bilanLink} →`), "font-size:14px;")
    );
  }
  if (listed.length) {
    const head = days.map((d) => {
      const rows = d.rows.map((r) => `<tr>
<td width="58" valign="top" style="width:58px;padding-top:8px;padding-bottom:8px;border-bottom:1px solid ${PAPER};font-family:${MONO};font-size:13px;line-height:1.5;color:${MUTED};white-space:nowrap;">${esc(r.time)}</td>
<td valign="top" style="padding-top:8px;padding-bottom:8px;padding-right:10px;border-bottom:1px solid ${PAPER};font-family:${FONT};font-size:15px;line-height:1.45;color:${INK};">${r.tag ? `<span style="font-size:12px;color:${MUTED};">${esc(r.tag)} · </span>` : ""}<a href="${esc(r.url)}" style="color:${INK};text-decoration:underline;">${esc(r.match)}</a></td>
<td valign="top" align="right" style="padding-top:8px;padding-bottom:8px;border-bottom:1px solid ${PAPER};font-family:${FONT};font-size:14px;line-height:1.45;color:${TEXT};">${esc(s.favorite)}&nbsp;<b style="color:${DEEP};white-space:nowrap;">${esc(r.fav)}</b></td>
</tr>`).join("\n");
      return `<tr><td colspan="3" style="padding-top:14px;padding-bottom:2px;font-family:${FONT};font-size:12px;line-height:1.4;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:${DEEP};">${esc(d.label)}</td></tr>\n${rows}`;
    }).join("\n");
    const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">\n${head}\n</table>`;
    const moreLine = more ? para(anchor(link("/app/matchs"), s.more(more)), "padding-top:12px;font-size:14px;") : "";
    const recordLine = sure.length && recordText ? small(`${esc(recordText)} ${anchor(link("/app/bilan"), `${s.bilanLink} →`, MUTED)}`) : "";
    body += (bilan ? rule : "") + block(h2(listTitle) + para(esc(listIntro), "font-size:14px;color:" + MUTED + ";") + table + moreLine + (recordLine ? `<div style="padding-top:12px;">${recordLine}</div>` : ""));
  }
  const cta = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${DEEP}" style="background-color:${DEEP};border-radius:10px;"><a href="${esc(link("/app/matchs"))}" style="display:inline-block;padding-top:13px;padding-bottom:13px;padding-left:26px;padding-right:26px;font-family:${FONT};font-size:16px;font-weight:700;line-height:1.2;color:#ffffff;text-decoration:none;">${esc(s.cta)}</a></td></tr></table>`;
  body += rule + block(`${cta}<p style="margin:0;padding-top:12px;padding-bottom:8px;font-family:${FONT};font-size:13px;line-height:1.5;color:${MUTED};">${esc(s.ctaNote)}</p>`);

  const footer = `<tr><td bgcolor="${PAPER}" style="background-color:${PAPER};padding-top:22px;padding-bottom:8px;padding-left:28px;padding-right:28px;">
${small(esc(s.why))}
${small(`<a href="${esc(unsub)}" style="color:${MUTED};text-decoration:underline;">${esc(s.unsub)}</a> · ${anchor(plain("/app/compte"), s.manage, MUTED)} · ${anchor(plain("/confidentialite"), s.privacy, MUTED)}`)}
${small(esc(identity))}
${small(esc(`${s.disclaimer}`))}
</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="${L.lang}" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAPER}" style="background-color:${PAPER};">
<tr><td align="center" style="padding-top:24px;padding-bottom:24px;padding-left:12px;padding-right:12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td bgcolor="${NAVY}" style="background-color:${NAVY};padding-top:22px;padding-bottom:20px;padding-left:28px;padding-right:28px;border-bottom:4px solid ${ORANGE};">
<p style="margin:0;font-family:${FONT};font-size:26px;line-height:1.2;font-weight:800;color:${ORANGE};">Basketlog</p>
<p style="margin:0;padding-top:6px;font-family:${FONT};font-size:14px;line-height:1.4;color:#ffffff;">${esc(s.tagline)} · ${esc(dateLine)}</p>
</td></tr>
${body}
${footer}
</table>
</td></tr>
</table>
</body>
</html>`;

  // ----- Texte brut (même contenu, un lien par ligne)
  const t = [`BASKETLOG · ${s.tagline}`, dateLine, ""];
  if (bilan) {
    t.push(s.bilanTitle.toUpperCase(), `${s.bilanLead} ${s.bilanCount(bilan.ok, bilan.n)}${bilanPct ? ` (${bilanPct})` : ""}.`);
    if (bilan.sureN > 0) t.push(s.sureLine(bilan.sureOk, bilan.sureN, surePct));
    t.push(bilanNote, `${s.bilanLink}${colon}${link("/app/bilan")}`, "");
  }
  if (listed.length) {
    t.push(listTitle.toUpperCase(), listIntro);
    for (const d of days) {
      t.push("", d.label);
      for (const r of d.rows) t.push(`- ${r.time} · ${r.tag ? `${r.tag} · ` : ""}${r.match} · ${s.favorite}${colon}${r.fav}`, `  ${r.url}`);
    }
    if (more) t.push("", `${s.more(more)}${colon}${link("/app/matchs")}`);
    if (sure.length && recordText) t.push("", recordText);
    t.push("");
  }
  t.push(`${s.cta}${colon}${link("/app/matchs")}`, s.ctaNote, "", "--", s.why, `${s.unsub}${colon}${unsub}`, `${s.manage}${colon}${plain("/app/compte")}`, `${s.privacy}${colon}${plain("/confidentialite")}`, identity, s.disclaimer);

  return { subject, preheader, html, text: t.join("\n"), empty };
}

// Favoris les plus nets d'une liste de matchs à venir (repli quand aucun match n'est à confiance très élevée) :
// même forme que les matchs à confiance très élevée de lib/sure.js.
export function clearestFavorites(upcoming, n = MAX_FAVORITES) {
  return (upcoming || [])
    .filter((g) => !g.live && g.home && g.away && Number.isFinite(g.pHome))
    .sort((x, y) => clearest(y) - clearest(x))
    .slice(0, n)
    .map((g) => ({ league: "NBA", href: `/app/match/${g.id}?d=${g.d}`, date: g.date, home: g.home, away: g.away, pHome: g.pHome }))
    .sort((x, y) => new Date(x.date) - new Date(y.date));
}
