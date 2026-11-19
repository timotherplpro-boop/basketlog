// Bot Discord « Basketlog » : commande /basketlog [équipe] qui répond avec les probabilités NBA du soir, ou le prochain
// match d'une équipe. Ce fichier ne fait que la vérification de signature, la recherche d'équipe et les messages
// (testé dans tests/discord.mjs) ; la route est app/api/discord, l'enregistrement de la commande app/api/discord/register.
// Vocabulaire : probabilités de victoire, jamais de mots de paris.
import crypto from "node:crypto";
import { TEAMS } from "./teams.js";
import { nbaPath } from "./slug.js";

// Discord signe chaque requête (Ed25519) : sans signature valide, on répond 401 (Discord l'exige pour valider l'URL).
const SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");
export function verifyDiscord(publicKeyHex, signatureHex, timestamp, rawBody) {
  try {
    if (!/^[0-9a-f]{64}$/i.test(publicKeyHex || "") || !/^[0-9a-f]{128}$/i.test(signatureHex || "") || !timestamp) return false;
    const key = crypto.createPublicKey({ key: Buffer.concat([SPKI_ED25519, Buffer.from(publicKeyHex, "hex")]), format: "der", type: "spki" });
    return crypto.verify(null, Buffer.from(timestamp + rawBody), key, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}

// Langue de la réponse selon la langue de Discord de la personne.
export const discordLang = (locale) => (/^fr/.test(locale || "") ? "fr" : /^es/.test(locale || "") ? "es" : /^pt/.test(locale || "") ? "pt" : "en");

const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
// Équipe la plus proche de ce que la personne a tapé (« lakers », « LAL », « los angeles l », « sixers »).
const ALIASES = { sixers: "76ers", wolves: "Timberwolves", blazers: "Trail Blazers", cavs: "Cavaliers", mavs: "Mavericks", dubs: "Warriors", nets: "Nets", knicks: "Knicks", okc: "Thunder", gsw: "Warriors" };
export function findTeam(q) {
  const s = norm(q);
  if (!s) return null;
  const alias = ALIASES[s];
  if (alias) return TEAMS.find((t) => t.short === alias) || null;
  return (
    TEAMS.find((t) => norm(t.short) === s || norm(t.abbr) === s || norm(t.name) === s) ||
    TEAMS.find((t) => norm(t.name).includes(s) || norm(t.short).startsWith(s)) ||
    null
  );
}
// Choix proposés pendant la saisie (25 au plus, exigence de Discord).
export function teamChoices(q) {
  const s = norm(q);
  return TEAMS.filter((t) => !s || norm(t.name).includes(s) || norm(t.abbr).startsWith(s))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 25)
    .map((t) => ({ name: t.name, value: t.short }));
}

const SITE_ = "https://basketlog-app.com";
const pre = (lang) => (lang === "fr" ? "" : `/${lang}`);
const link = (path, lang) => `${SITE_}${pre(lang)}${path}?utm_source=discord&utm_medium=bot`;
const pct = (p, lang) => `${Math.round(p * 100)}${lang === "en" ? "%" : " %"}`;
const ts = (iso) => `<t:${Math.floor(new Date(iso).getTime() / 1000)}:f>`;
const T = {
  fr: { tonight: "Probabilités NBA du soir", none: "Pas de match NBA à venir aujourd'hui.", next: (n) => `${n} : prochain match`, noTeam: "Équipe introuvable. Essaie par exemple « Lakers » ou « Celtics ».", noGame: (n) => `Pas de match des ${n} dans les 10 prochains jours.`, all: "Tous les matchs et l'analyse sur Basketlog", foot: "Basketlog · probabilités estimées, jamais une certitude", fav: "favori" },
  en: { tonight: "Tonight's NBA win probabilities", none: "No more NBA games today.", next: (n) => `${n}: next game`, noTeam: "Team not found. Try “Lakers” or “Celtics”.", noGame: (n) => `No ${n} game in the next 10 days.`, all: "All games and the full analysis on Basketlog", foot: "Basketlog · estimated probabilities, never a certainty", fav: "favorite" },
  es: { tonight: "Probabilidades NBA de esta noche", none: "No quedan partidos NBA hoy.", next: (n) => `${n}: próximo partido`, noTeam: "Equipo no encontrado. Prueba con «Lakers» o «Celtics».", noGame: (n) => `No hay partido de los ${n} en los próximos 10 días.`, all: "Todos los partidos y el análisis en Basketlog", foot: "Basketlog · probabilidades estimadas, nunca una certeza", fav: "favorito" },
  pt: { tonight: "Probabilidades NBA de hoje", none: "Não há mais jogos da NBA hoje.", next: (n) => `${n}: próximo jogo`, noTeam: "Time não encontrado. Tente «Lakers» ou «Celtics».", noGame: (n) => `Nenhum jogo do ${n} nos próximos 10 dias.`, all: "Todos os jogos e a análise no Basketlog", foot: "Basketlog · probabilidades estimadas, nunca uma certeza", fav: "favorito" },
};
const ORANGE = 0xff7a1a;

// games : [{ id, d, date, home{short,name}, away{...}, pHome }] (ordre de l'heure). Message des matchs du soir.
export function tonightMessage(games, lang) {
  const t = T[lang] || T.en;
  if (!games.length) return { content: t.none, embeds: [] };
  const lines = games.slice(0, 15).map((g) => {
    const fh = g.pHome >= 0.5;
    const f = fh ? g.home : g.away, p = fh ? g.pHome : 1 - g.pHome;
    return `${ts(g.date)} · [${g.away.short} @ ${g.home.short}](${link(nbaPath(g, g.d), lang)}) · **${f.short} ${pct(p, lang)}**`;
  });
  return { embeds: [{ title: t.tonight, url: link("/app/matchs", lang), color: ORANGE, description: `${lines.join("\n")}\n\n[${t.all}](${link("/app/matchs", lang)})`, footer: { text: t.foot } }] };
}

// Prochain match d'une équipe.
export function teamMessage(team, game, lang) {
  const t = T[lang] || T.en;
  if (!team) return { content: t.noTeam, embeds: [] };
  if (!game) return { content: t.noGame(team.short), embeds: [] };
  const home = String(game.home.id) === String(team.id);
  const p = home ? game.pHome : 1 - game.pHome;
  const opp = home ? game.away : game.home;
  return {
    embeds: [{
      title: `${game.away.short} @ ${game.home.short}`,
      url: link(nbaPath(game, game.d), lang),
      color: ORANGE,
      description: `${ts(game.date)}\n**${team.short} ${pct(p, lang)}** · ${opp.short} ${pct(1 - p, lang)}\n\n[${t.all}](${link(`/app/equipe/${team.id}`, lang)})`,
      author: { name: t.next(team.short) },
      footer: { text: t.foot },
    }],
  };
}

// Définition de la commande (enregistrée par app/api/discord/register).
export const DISCORD_COMMANDS = [{
  name: "basketlog",
  type: 1,
  description: "NBA win probabilities: tonight's games, or a team's next game",
  description_localizations: { fr: "Probabilités NBA : les matchs du soir, ou le prochain match d'une équipe", "es-ES": "Probabilidades NBA: los partidos de hoy o el próximo de un equipo", "es-419": "Probabilidades NBA: los partidos de hoy o el próximo de un equipo", "pt-BR": "Probabilidades NBA: os jogos de hoje ou o próximo jogo de um time" },
  options: [{
    type: 3, name: "team", required: false, autocomplete: true,
    name_localizations: { fr: "equipe", "es-ES": "equipo", "es-419": "equipo", "pt-BR": "time" },
    description: "Team (e.g. Lakers). Leave empty for tonight's games",
    description_localizations: { fr: "Équipe (ex. Lakers). Vide : les matchs du soir", "es-ES": "Equipo (ej. Lakers). Vacío: los partidos de hoy", "es-419": "Equipo (ej. Lakers). Vacío: los partidos de hoy", "pt-BR": "Time (ex. Lakers). Vazio: os jogos de hoje" },
  }],
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}];
