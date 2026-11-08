// Données du jour pour les publications automatiques (textes : lib/social.js) : matchs NBA du jour pas encore
// commencés, matchs EuroLeague des 18 prochaines heures et bilan « confiance très élevée ». Les chiffres sont ceux
// des fiches du site au moment de la publication.
import { analyzeDay } from "./data";
import { nbaToday } from "./espn";
import { elUpcoming } from "./euroleague";
import { sureRecordSoon } from "./sure";
import { nbaPick, elPick, socialPosts } from "./social";

const within = (p, ms) => Promise.race([Promise.resolve(p).catch(() => null), new Promise((r) => setTimeout(() => r(null), ms))]);

export async function socialDay() {
  const d = nbaToday();
  const now = Date.now();
  const errors = [];
  const [day, el, rec] = await Promise.all([
    analyzeDay(d).catch((e) => { errors.push(`NBA : ${e.message}`); return null; }),
    within(elUpcoming(2), 9000),
    sureRecordSoon(6000),
  ]);
  const nba = (day?.analyses || [])
    .filter((a) => !a.game.hypothetical && !a.game.postponed && a.game.state === "pre")
    .map((a) => nbaPick(a, d));
  const euro = (el?.list || [])
    .filter(({ g, a }) => {
      const t = new Date(g.date).getTime();
      return a?.game?.state === "pre" && t > now && t < now + 18 * 3600e3;
    })
    .map(elPick);
  const picks = [...nba, ...euro];
  return { d, picks, record: rec?.nba || null, posts: picks.length ? socialPosts(picks, { d, record: rec?.nba || null }) : null, errors };
}
