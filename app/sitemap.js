import { TEAMS } from "../lib/teams";
import { SITE } from "../lib/site";

export default function sitemap() {
  const now = new Date();
  const pages = [
    ["", 1, "daily"], ["/app", 0.9, "daily"], ["/app/matchs", 0.9, "hourly"], ["/app/classement", 0.8, "daily"],
    ["/app/euroleague", 0.8, "daily"], ["/app/bilan", 0.8, "daily"], ["/avis", 0.5, "weekly"],
  ].map(([p, priority, changeFrequency]) => ({ url: `${SITE}${p}`, lastModified: now, changeFrequency, priority }));
  const teams = TEAMS.map((t) => ({ url: `${SITE}/app/equipe/${t.id}`, lastModified: now, changeFrequency: "daily", priority: 0.6 }));
  return [...pages, ...teams];
}
