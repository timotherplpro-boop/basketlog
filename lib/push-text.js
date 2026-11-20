// Texte de la notification quotidienne (web push, 20/11/2026) : nombre de matchs du soir et équipe la plus probable,
// avec un lien vers la liste des matchs. Données : les mêmes que les publications du jour (lib/social-day.js).
// Vocabulaire : probabilités et favoris, jamais de vocabulaire de paris ; jamais « IA ».
import { mk, pctOf } from "./i18n.js";

export const PUSH_LANGS = ["fr", "en", "es", "pt"];
export const PUSH_TAG = "bl-jour";

const favOf = (p) => (p.pHome >= 0.5 ? { team: p.home, p: p.pHome } : { team: p.away, p: 1 - p.pHome });

// picks : [{ league: "NBA" | "EL", home, away, pHome }] (lib/social.js, nbaPick / elPick). null s'il n'y a aucun match.
export function pushMessage(picks, lang = "fr") {
  const list = (picks || []).filter((p) => p && Number.isFinite(p.pHome));
  if (!list.length) return null;
  const L = mk(PUSH_LANGS.includes(lang) ? lang : "fr");
  const nba = list.filter((p) => p.league === "NBA").length;
  const el = list.length - nba;
  const best = list.map(favOf).sort((x, y) => y.p - x.p)[0];
  const pct = pctOf(best.p, L);
  const s = (n) => (n > 1 ? "s" : "");

  const games = nba && el
    ? L.t(`${nba} match${nba > 1 ? "s" : ""} NBA et ${el} d'EuroLeague`, `${nba} NBA game${s(nba)} and ${el} EuroLeague`, `${nba} partido${s(nba)} de la NBA y ${el} de la Euroliga`, `${nba} jogo${s(nba)} da NBA e ${el} da Euroliga`)
    : nba
      ? L.t(`${nba} match${nba > 1 ? "s" : ""} NBA`, `${nba} NBA game${s(nba)}`, `${nba} partido${s(nba)} de la NBA`, `${nba} jogo${s(nba)} da NBA`)
      : L.t(`${el} match${el > 1 ? "s" : ""} d'EuroLeague`, `${el} EuroLeague game${s(el)}`, `${el} partido${s(el)} de la Euroliga`, `${el} jogo${s(el)} da Euroliga`);

  return {
    title: nba
      ? L.t("🏀 Les matchs de cette nuit", "🏀 Tonight's games", "🏀 Los partidos de esta noche", "🏀 Os jogos desta noite")
      : L.t("🏀 Les matchs de ce soir", "🏀 Tonight's games", "🏀 Los partidos de esta noche", "🏀 Os jogos desta noite"),
    body: L.t(
      `${games}. Plus gros favori : ${best.team} (${pct}). Toutes les probabilités →`,
      `${games} tonight. Biggest favorite: ${best.team} (${pct}). See every win probability →`,
      `${games}. Mayor favorito: ${best.team} (${pct}). Todas las probabilidades →`,
      `${games}. Maior favorito: ${best.team} (${pct}). Todas as probabilidades →`
    ),
    url: `${L.href("/app/matchs")}?utm_source=push&utm_medium=notification`,
    tag: PUSH_TAG,
  };
}

// Adresses d'envoi acceptées : seulement les services de notification des navigateurs (le serveur y envoie des requêtes).
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /^updates\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/, /^[a-z0-9-]+\.notify\.windows\.com$/];
const B64URL = /^[A-Za-z0-9_-]+=*$/;

// Abonnement envoyé par le navigateur (PushSubscription.toJSON()) : { endpoint, keys: { p256dh, auth } } propre, ou null.
export function cleanSubscription(sub) {
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (endpoint.length < 20 || endpoint.length > 1000) return null;
  let u;
  try { u = new URL(endpoint); } catch { return null; }
  if (u.protocol !== "https:" || u.port || u.username || u.password || !PUSH_HOSTS.some((r) => r.test(u.hostname))) return null;
  if (typeof p256dh !== "string" || p256dh.length < 20 || p256dh.length > 200 || !B64URL.test(p256dh)) return null;
  if (typeof auth !== "string" || auth.length < 8 || auth.length > 100 || !B64URL.test(auth)) return null;
  return { endpoint, keys: { p256dh, auth } };
}
