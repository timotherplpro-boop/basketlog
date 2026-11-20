// Joueurs NBA par pays, pour les pages « Les Français en NBA » (/app/francais) et « Españoles y latinos en la NBA »
// (/app/espagnols) et leurs publications du jour sur Telegram et Bluesky.
// ESPN ne donne pas la nationalité : les listes sont tenues à la main (sélection nationale ou pays de naissance,
// vérifiés en novembre 2026). Un nom absent des statistiques de la saison (pas encore joué, plus en NBA) est ignoré :
// une liste un peu large ne montre jamais un joueur qui n'est pas là.
// Fichier sans appel réseau (testé dans tests/nationals.mjs) : les données viennent de lib/espn.js et lib/data.js.
import { slugify, nbaPath, playerPath } from "./slug.js";
import { mk, fmtTime, pctOf } from "./i18n.js";
import { SITE } from "./site.js";

export const FLAGS = { FR: "🇫🇷", ES: "🇪🇸", DO: "🇩🇴", PR: "🇵🇷", MX: "🇲🇽", NI: "🇳🇮" };
export const COUNTRY = {
  FR: ["France", "France", "Francia", "França"],
  ES: ["Espagne", "Spain", "España", "Espanha"],
  DO: ["République dominicaine", "Dominican Republic", "República Dominicana", "República Dominicana"],
  PR: ["Porto Rico", "Puerto Rico", "Puerto Rico", "Porto Rico"],
  MX: ["Mexique", "Mexico", "México", "México"],
  NI: ["Nicaragua", "Nicaragua", "Nicaragua", "Nicarágua"],
};
export const countryName = (cc, L) => L.t(...(COUNTRY[cc] || [cc, cc, cc, cc]));

export const GROUPS = {
  fr: {
    key: "fr",
    path: "/app/francais",
    lang: "fr", // langue du public visé (publication du jour)
    players: [
      ["Victor Wembanyama", "FR"], ["Rudy Gobert", "FR"], ["Alex Sarr", "FR"], ["Bilal Coulibaly", "FR"],
      ["Zaccharie Risacher", "FR"], ["Nolan Traoré", "FR"], ["Tidjane Salaün", "FR"], ["Moussa Diabaté", "FR"],
      ["Sidy Cissoko", "FR"], ["Joan Beringer", "FR"], ["Noa Essengue", "FR"], ["Ousmane Dieng", "FR"],
      ["Pacôme Dadiet", "FR"], ["Mohamed Diawara", "FR"], ["Rayan Rupert", "FR"], ["Noah Penda", "FR"],
      ["Maxime Raynaud", "FR"], ["Guerschon Yabusele", "FR"], ["Nicolas Batum", "FR"],
    ],
  },
  es: {
    key: "es",
    path: "/app/espagnols",
    lang: "es",
    players: [
      ["Santi Aldama", "ES"], ["Hugo González", "ES"], ["Aday Mara", "ES"], ["Sergio de Larrea", "ES"], ["Baba Miller", "ES"],
      ["Karl-Anthony Towns", "DO"], ["Al Horford", "DO"], ["David Jones García", "DO"],
      ["José Alvarado", "PR"], ["Yaxel Lendeborg", "PR"], ["Alex Morales", "PR"],
      ["Jaime Jaquez Jr.", "MX"], ["Karim López", "MX"],
      ["Norchad Omier", "NI"],
    ],
  },
};

// Lignes de la page : joueurs de la liste trouvés dans les stats de la saison, avec leur équipe, leur statut médical
// du jour et le prochain match de leur équipe (matchs à venir de lib/data.upcomingAnalyses, triés par date).
// stats : { [id]: { id, name, team, gp, ppg, reb, ast, head } } ; injuries : { [teamId]: [{ id, player, status }] }.
export function nationalRows(group, { stats, injuries = {}, upcoming = [], teamById }) {
  const bySlug = new Map();
  for (const p of Object.values(stats || {})) {
    const s = slugify(p.name);
    const prev = bySlug.get(s);
    if (!prev || (p.gp || 0) > (prev.gp || 0)) bySlug.set(s, p);
  }
  const rows = [];
  for (const [name, cc] of group.players) {
    const p = bySlug.get(slugify(name));
    if (!p || !p.team) continue;
    const team = teamById(p.team);
    if (!team) continue;
    const inj = (injuries[String(p.team)] || []).find((i) => (i.id && i.id === p.id) || slugify(i.player) === slugify(p.name)) || null;
    const g = upcoming.find((x) => x.home?.id === team.id || x.away?.id === team.id) || null;
    const next = g ? {
      id: g.id, d: g.d, date: g.date, live: !!g.live,
      home: g.home, away: g.away, isHome: g.home.id === team.id,
      opp: g.home.id === team.id ? g.away : g.home,
      p: g.pHome == null ? null : g.home.id === team.id ? g.pHome : 1 - g.pHome,
      path: nbaPath(g, g.d),
    } : null;
    // Nom de la liste (avec les accents : « Hugo González », « Nolan Traoré ») ; même adresse de fiche que le nom ESPN.
    rows.push({ name, cc, id: p.id, path: playerPath(p.name), head: p.head || null, team, gp: p.gp || 0, ppg: p.ppg, reb: p.reb, ast: p.ast, injury: inj ? { status: inj.status, out: /out/i.test(inj.status || "") } : null, next });
  }
  return rows;
}

// Joueurs dont l'équipe joue ce jour-là (date NBA « 20261120 »), regroupés par match, dans l'ordre des coups d'envoi.
export function tonightGames(rows, d) {
  const by = new Map();
  for (const r of rows) {
    if (!r.next || r.next.d !== d) continue;
    if (!by.has(r.next.id)) by.set(r.next.id, { ...r.next, teams: new Map() });
    const g = by.get(r.next.id);
    if (!g.teams.has(r.team.id)) g.teams.set(r.team.id, { team: r.team, p: r.next.p, opp: r.next.opp, players: [] });
    g.teams.get(r.team.id).players.push(r);
  }
  return [...by.values()].sort((a, b) => new Date(a.date) - new Date(b.date)).map((g) => ({ ...g, teams: [...g.teams.values()] }));
}

// Nom court pour les messages : « Wembanyama », « de Larrea », « Jaquez Jr. » → « Jaquez ».
export function shortName(name) {
  const parts = String(name || "").replace(/\s+(Jr\.?|Sr\.?|II|III|IV)$/i, "").split(/\s+/);
  if (parts.length <= 1) return parts[0] || "";
  const i = parts.findIndex((w, k) => k > 0 && /^(de|da|del|van|von|di)$/i.test(w));
  return i > 0 ? parts.slice(i).join(" ") : parts.slice(1).join(" ");
}

// ---------- Publications du jour (« 🇫🇷 Les Français en NBA cette nuit ») ----------
const seg = typeof Intl !== "undefined" && Intl.Segmenter ? new Intl.Segmenter("fr", { granularity: "grapheme" }) : null;
const graphemes = (s) => (seg ? [...seg.segment(String(s))].length : [...String(s)].length);
const utf8 = (s) => new TextEncoder().encode(s);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MAX = 300;

const urlOf = (path, L) => `${SITE}${L.href(path)}`;

// Une ligne par équipe : « Spurs (Wembanyama) vs Kings · 02:00 · Spurs 74 % » (chances de victoire de son équipe).
// Les joueurs déclarés absents ne sont pas cités ; une équipe sans joueur disponible n'a pas de ligne.
const available = (t) => t.players.filter((r) => !r.injury?.out);
function teamLine(t, g, L, withFlags) {
  const names = available(t).map((r) => `${withFlags ? `${FLAGS[r.cc] || ""} ` : ""}${shortName(r.name)}`.trim()).join(", ");
  const pr = t.p == null ? "" : ` · ${t.team.short} ${pctOf(t.p, L)}`;
  const vs = L.t("vs", "vs", "vs", "x");
  return `${t.team.short} (${names}) ${vs} ${t.opp.short} · ${fmtTime(L, g.date)}${pr}`;
}
const linesOf = (games, L, withFlags) => games.flatMap((g) => g.teams.filter((t) => available(t).length).map((t) => teamLine(t, g, L, withFlags)));

export function nationalHead(group, L) {
  return group.key === "fr"
    ? L.t(`🇫🇷 Les Français en NBA cette nuit (heure de Paris)`, `🇫🇷 French players in the NBA tonight (ET)`, `🇫🇷 Franceses en la NBA esta noche (hora de España)`, `🇫🇷 Franceses na NBA hoje (horário de Brasília)`)
    : L.t(`🇪🇸 Espagnols et Latinos en NBA cette nuit (heure de Paris)`, `🇪🇸 Spanish and Latino players in the NBA tonight (ET)`, `🇪🇸 Españoles y latinos en la NBA esta noche (hora de España)`, `🇪🇸 Espanhóis e latinos na NBA hoje (horário de Brasília)`);
}

export function nationalBluesky(group, games, lang) {
  const L = mk(lang);
  const url = urlOf(group.path, L);
  const shown = url.replace(/^https?:\/\//, "");
  const head = nationalHead(group, L);
  const foot = `${L.t("Horaires et stats : ", "Times and stats: ", "Horarios y estadísticas: ", "Horários e estatísticas: ")}${shown}`;
  const withFlags = group.key !== "fr";
  const lines = linesOf(games, L, withFlags);
  let body = [];
  for (const line of lines) {
    const next = [head, ...body, line, foot].join("\n");
    if (graphemes(next) > MAX - 8) break;
    body.push(line);
  }
  const more = lines.length - body.length;
  if (more > 0) body.push(L.t(`+ ${more} autre${more > 1 ? "s" : ""}`, `+ ${more} more`, `+ ${more} más`, `+ ${more} outros`));
  const text = [head, ...body, foot].join("\n");
  const i = text.lastIndexOf(shown);
  const byteStart = utf8(text.slice(0, i)).length;
  return {
    text,
    facets: [{ index: { byteStart, byteEnd: byteStart + utf8(shown).length }, features: [{ $type: "app.bsky.richtext.facet#link", uri: url }] }],
    langs: [L.lang],
    url,
    title: nationalTitle(group, L),
    description: nationalDescription(group, L),
  };
}

export function nationalTelegram(group, games, lang) {
  const L = mk(lang);
  const url = urlOf(group.path, L);
  const withFlags = group.key !== "fr";
  const lines = linesOf(games, L, withFlags).map((x) => `• ${esc(x)}`);
  return [esc(nationalHead(group, L)), ...lines, "", `👉 <a href="${esc(url)}">${L.t("Horaires, stats et chances de victoire sur Basketlog", "Times, stats and win probabilities on Basketlog", "Horarios, estadísticas y probabilidades en Basketlog", "Horários, estatísticas e chances no Basketlog")}</a>`].join("\n");
}

// Publication du jour pour la langue du groupe seulement (les Français en français, les Espagnols et Latinos en espagnol).
export function nationalPosts(group, games) {
  if (!linesOf(games, mk(group.lang), false).length) return null;
  const L = mk(group.lang);
  return { [group.lang]: { telegram: nationalTelegram(group, games, group.lang), telegramPreview: urlOf(group.path, L), bluesky: nationalBluesky(group, games, group.lang) } };
}

// ---------- Textes de la page (aussi repris par les aperçus de lien) ----------
export function nationalTitle(group, L, season = "") {
  const s = season ? ` ${season}` : "";
  return group.key === "fr"
    ? L.t(`Joueurs français en NBA ce soir : horaires, matchs et stats${s}`, `French players in the NBA${s}: tonight's games and stats`, `Jugadores franceses en la NBA hoy: horarios y estadísticas${s}`, `Jogadores franceses na NBA hoje: horários e estatísticas${s}`)
    : L.t(`Espagnols et Latinos en NBA ce soir : horaires et stats${s}`, `Spanish and Latino NBA players${s}: tonight's games and stats`, `Españoles y latinos en la NBA hoy: horarios y estadísticas${s}`, `Espanhóis e latinos na NBA hoje: horários e estatísticas${s}`);
}

export function nationalDescription(group, L) {
  return group.key === "fr"
    ? L.t("Tous les Français en NBA : qui joue cette nuit, à quelle heure (heure de Paris), contre qui, avec les chances de victoire de son équipe et les stats de la saison.", "Every French player in the NBA: who plays tonight, at what time, against whom, with his team's win probability and season stats.", "Todos los franceses de la NBA: quién juega hoy, a qué hora, contra quién, con la probabilidad de victoria de su equipo y sus estadísticas.", "Todos os franceses da NBA: quem joga hoje, que horas, contra quem, com a chance de vitória do time e as estatísticas.")
    : L.t("Santi Aldama, Hugo González, Karl-Anthony Towns, Jaime Jaquez Jr., Karim López… Les Espagnols et Latinos en NBA : qui joue ce soir, à quelle heure, et leurs stats.", "Santi Aldama, Hugo González, Karl-Anthony Towns, Jaime Jaquez Jr., Karim López… Spanish and Latino NBA players: who plays tonight, at what time, and their stats.", "Santi Aldama, Hugo González, Karl-Anthony Towns, Jaime Jaquez Jr., Karim López… Los españoles y latinos de la NBA: quién juega hoy, a qué hora (España y México) y sus estadísticas.", "Santi Aldama, Hugo González, Karl-Anthony Towns, Jaime Jaquez Jr., Karim López… Espanhóis e latinos na NBA: quem joga hoje, que horas e as estatísticas.");
}
