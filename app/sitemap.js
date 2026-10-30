import { TEAMS } from "../lib/teams";
import { SITE } from "../lib/site";
import { upcomingGames } from "../lib/data";
import { nbaToday, shiftDate, getScoreboardRange, nbaDateOf } from "../lib/espn";
import { elContext } from "../lib/euroleague";

export const revalidate = 3600; // régénéré chaque heure, avec les matchs à venir

const u = (path, priority, changeFrequency, lastModified = new Date()) => ({ path, lastModified, changeFrequency, priority });

// Chaque page existe en français (adresse actuelle), en anglais (/en) et en espagnol (/es), liées par hreflang.
const both = ({ path, ...rest }) => {
  const fr = `${SITE}${path}`;
  const en = `${SITE}/en${path}`;
  const es = `${SITE}/es${path}`;
  const alternates = { languages: { fr, en, es, "x-default": fr } };
  const p2 = Math.round(rest.priority * 0.9 * 100) / 100;
  return [{ url: fr, ...rest, alternates }, { url: en, ...rest, priority: p2, alternates }, { url: es, ...rest, priority: p2, alternates }];
};

export default async function sitemap() {
  const pages = [
    u("", 1, "daily"), u("/app/matchs", 0.9, "hourly"), u("/app", 0.8, "daily"), u("/app/classement", 0.8, "daily"),
    u("/app/euroleague", 0.8, "daily"), u("/app/competitions", 0.7, "daily"), u("/app/bilan", 0.8, "daily"), u("/methode", 0.7, "monthly"), u("/pro", 0.6, "weekly"), u("/avis", 0.5, "weekly"),
    u("/mentions-legales", 0.2, "yearly"), u("/cgu", 0.2, "yearly"), u("/cgv", 0.2, "yearly"), u("/confidentialite", 0.2, "yearly"), u("/cookies", 0.2, "yearly"),
  ];
  const teams = TEAMS.map((t) => u(`/app/equipe/${t.id}`, 0.6, "daily"));

  // Matchs NBA : les 7 prochains jours et les 3 derniers (fiches avec score final).
  let nba = [];
  try {
    const up = await upcomingGames(7);
    const today = nbaToday();
    const past = (await getScoreboardRange(shiftDate(today, -3), shiftDate(today, -1))).filter((g) => g.state === "post");
    nba = [
      ...up.map((g) => u(`/app/match/${g.id}?d=${g.d}`, 0.7, "hourly")),
      ...past.map((g) => u(`/app/match/${g.id}?d=${nbaDateOf(g.date)}`, 0.4, "weekly")),
    ];
  } catch {}

  // EuroLeague : clubs et matchs des 10 prochains jours.
  let el = [];
  try {
    const { cur, games } = await elContext();
    const now = Date.now();
    el = [
      ...Object.keys(cur).map((code) => u(`/app/euroleague/equipe/${code}`, 0.5, "daily")),
      ...games.filter((g) => !g.played && new Date(g.date).getTime() > now - 3 * 3600e3 && new Date(g.date).getTime() < now + 10 * 864e5)
        .map((g) => u(`/app/euroleague/match/${g.id}`, 0.6, "hourly")),
    ];
  } catch {}

  return [...pages, ...teams, ...nba, ...el].flatMap(both);
}
