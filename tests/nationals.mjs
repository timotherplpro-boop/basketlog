// Pages « Les Français en NBA » / « Españoles y latinos », power ranking du lundi et données ouvertes (CSV).
import { GROUPS, nationalRows, tonightGames, nationalPosts, shortName } from "../lib/nationals.js";
import { powerFacts, powerPosts, graphemes, BSKY_MAX, POWER_MARK } from "../lib/social.js";
import { picksCsv, csvFileOf, csvName, CSV_HEAD } from "../lib/picks-csv.js";

const linked = (b) => {
  const link = b.facets.find((x) => x.features[0].$type.endsWith("#link"));
  const bytes = new TextEncoder().encode(b.text);
  return link ? new TextDecoder().decode(bytes.slice(link.index.byteStart, link.index.byteEnd)) : "";
};

export async function nationalsTests({ ok, ko, eq }) {
  console.log("Joueurs par pays, power ranking, CSV");
  const T = (id, short) => ({ id, short, name: short, logo: null });
  const teams = { 24: T("24", "Spurs"), 27: T("27", "Wizards"), 16: T("16", "Timberwolves"), 6: T("6", "Mavericks"), 18: T("18", "Knicks"), 23: T("23", "Kings"), 8: T("8", "Pistons"), 2: T("2", "Celtics"), 15: T("15", "Bucks"), 11: T("11", "Pacers") };
  const teamById = (id) => teams[id] || null;
  const stats = {
    1: { id: "1", name: "Victor Wembanyama", team: "24", gp: 14, ppg: 26.1 },
    2: { id: "2", name: "Alex Sarr", team: "27", gp: 14, ppg: 15.2 },
    3: { id: "3", name: "Bilal Coulibaly", team: "27", gp: 12, ppg: 10.1 },
    4: { id: "4", name: "Rudy Gobert", team: "16", gp: 15, ppg: 11 },
    5: { id: "5", name: "Hugo Gonzalez", team: "2", gp: 10, ppg: 5 },
    6: { id: "6", name: "Karl-Anthony Towns", team: "18", gp: 15, ppg: 22 },
    7: { id: "7", name: "Some Player", team: "18", gp: 15, ppg: 30 },
  };
  const d = "20261120";
  const g = (id, h, a, date, pHome, dd = d) => ({ id, d: dd, date, home: teams[h], away: teams[a], pHome, live: false });
  const upcoming = [g("b", "8", "27", "2026-11-21T00:00:00Z", 0.69), g("c", "18", "2", "2026-11-21T00:30:00Z", 0.55), g("a", "24", "23", "2026-11-21T01:00:00Z", 0.74), g("e", "16", "6", "2026-11-22T01:00:00Z", 0.5, "20261121")];
  const injuries = { 27: [{ id: "3", player: "Bilal Coulibaly", status: "Out" }] };

  const fr = nationalRows(GROUPS.fr, { stats, injuries, upcoming, teamById });
  eq("français : seuls les joueurs de la liste présents cette saison", fr.map((r) => r.name).join(","), "Victor Wembanyama,Rudy Gobert,Alex Sarr,Bilal Coulibaly");
  eq("français : chances de l'équipe à l'extérieur", Math.round(fr.find((r) => r.name === "Alex Sarr").next.p * 100), 31);
  eq("français : absent repéré", fr.find((r) => r.name === "Bilal Coulibaly").injury.out, true);
  const es = nationalRows(GROUPS.es, { stats, injuries, upcoming, teamById });
  eq("espagnols : nom avec accent de la liste", es.find((r) => r.cc === "ES")?.name, "Hugo González");
  eq("espagnols : adresse de la fiche joueur", es.find((r) => r.cc === "ES")?.path, "/nba/player/hugo-gonzalez");

  const tg = tonightGames(fr, d);
  eq("ce soir : matchs dans l'ordre des coups d'envoi", tg.map((x) => x.id).join(","), "b,a");
  const pf = nationalPosts(GROUPS.fr, tg).fr.bluesky;
  if (!/Coulibaly/.test(pf.text) && /Sarr/.test(pf.text)) ok("post français : absent non cité"); else ko("post français : absent non cité", pf.text);
  if (graphemes(pf.text) <= BSKY_MAX && pf.text.startsWith("🇫🇷")) ok("post français : longueur et marque"); else ko("post français : longueur et marque", pf.text);
  eq("post français : lien cliquable", linked(pf), "basketlog-app.com/app/francais");
  const pe = nationalPosts(GROUPS.es, tonightGames(es, d)).es.bluesky;
  eq("post espagnol : lien vers /es", linked(pe), "basketlog-app.com/es/app/espagnols");
  if (/🇩🇴 Towns/.test(pe.text) && /🇪🇸 González/.test(pe.text)) ok("post espagnol : drapeaux"); else ko("post espagnol : drapeaux", pe.text);
  eq("post : rien si aucun joueur ce soir", nationalPosts(GROUPS.fr, tonightGames(fr, "20261125")), null);
  // Beaucoup de joueurs : le message tient dans la limite avec « + N autres ».
  const many = Array.from({ length: 14 }, (_, i) => ({ id: `m${i}`, d, date: `2026-11-21T0${i % 4}:00:00Z`, teams: [{ team: T(`t${i}`, `Équipe${i}`), p: 0.5, opp: T(`o${i}`, `Adversaire${i}`), players: [{ name: `Prénom Joueur${i}`, cc: "FR" }] }] }));
  const pm = nationalPosts(GROUPS.fr, many).fr.bluesky;
  if (graphemes(pm.text) <= BSKY_MAX && /\+ \d+ autres/.test(pm.text)) ok("post français : coupé proprement"); else ko("post français : coupé proprement", `${graphemes(pm.text)} ${pm.text}`);
  eq("nom court", ["Jaime Jaquez Jr.", "Sergio de Larrea", "David Jones García", "Victor Wembanyama"].map(shortName).join("/"), "Jaquez/de Larrea/Jones García/Wembanyama");
  for (const r of [...pf.text.split("\n"), ...pe.text.split("\n")]) if (/paris |bet|apuesta|cote/i.test(r)) ko("posts joueurs : vocabulaire", r);

  // Power ranking du lundi.
  const rows = ["Spurs", "Celtics", "Pistons", "Rockets", "Thunder", "Knicks", "Lakers"].map((s, i) => ({ team: { short: s }, move: [1, 0, -1, 2, -2, -5, 6][i] }));
  const f = powerFacts(rows);
  eq("power : plus forte hausse", f.up && `${f.up.short}${f.up.move}@${f.up.rank}`, "Lakers6@7");
  eq("power : plus forte baisse", f.down && `${f.down.short}${f.down.move}@${f.down.rank}`, "Knicks-5@6");
  const pp = powerPosts(rows);
  for (const lang of ["fr", "en", "es"]) {
    const b = pp[lang].bluesky;
    if (graphemes(b.text) <= BSKY_MAX && b.text.startsWith(POWER_MARK)) ok(`power ${lang} : longueur et marque`); else ko(`power ${lang} : longueur et marque`, b.text);
    eq(`power ${lang} : lien cliquable`, linked(b), b.url.replace(/^https?:\/\//, ""));
    if (/odds|cote|apuesta|bet/i.test(b.text)) ko(`power ${lang} : vocabulaire`, b.text); else ok(`power ${lang} : vocabulaire`);
  }
  eq("power : pas de post sans classement", powerPosts([]), null);
  eq("power : pas de ligne vide sans évolution", powerPosts(rows.map((r) => ({ ...r, move: null }))).fr.telegram.includes("\n\n\n"), false);

  // Données ouvertes.
  eq("csv : nom de fichier", csvName(2027), "nba-predictions-2026-27.csv");
  eq("csv : saison lue", csvFileOf("nba-predictions-2026-27.csv"), 2027);
  eq("csv : nom invalide", csvFileOf("nba-predictions-2026-28.csv"), null);
  const csv = picksCsv([
    { id: "2", d: "20261102", date: "2026-11-03T00:00:00Z", home: { short: "Lakers", name: "Los Angeles Lakers", score: 100 }, away: { short: "Kings", name: "Sacramento Kings", score: 90 }, pHome: 0.8, pred: [112, 104], ok: true },
    { id: "1", d: "20261101", date: "2026-11-02T00:00:00Z", home: { short: "Knicks", name: "New York, Knicks", score: 99 }, away: { short: "Celtics", name: "Boston Celtics", score: 101 }, pHome: 0.55, pred: [110, 108], ok: false },
  ]);
  const lines = csv.trim().split("\n");
  eq("csv : en-tête", lines[0], CSV_HEAD.join(","));
  eq("csv : tri par date et virgule protégée", lines[1].split(",").slice(0, 4).join(","), '2026-11-01,1,Boston Celtics,"New York');
  eq("csv : favori et probabilité", lines[2].split(",").slice(6, 9).join(","), "0.800,Los Angeles Lakers,0.800");
  if (lines[2].endsWith("/en/nba/kings-vs-lakers-2026-11-02")) ok("csv : lien de la fiche"); else ko("csv : lien de la fiche", lines[2]);
}
