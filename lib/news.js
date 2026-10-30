// Actualités en temps réel des équipes NBA (articles ESPN), rafraîchies toutes les 5 minutes.
// On écarte les vidéos et les articles généraux qui citent toute la ligue.
const BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news";

export async function teamNews(team, limit = 3) {
  if (!team?.id) return [];
  try {
    const res = await fetch(`${BASE}?team=${encodeURIComponent(team.id)}&limit=25`, {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3500),
    });
    if (!res.ok) return [];
    const j = await res.json();
    return (j.articles || [])
      .filter((a) => a.type !== "Media" && a.headline && a.links?.web?.href)
      .map((a) => ({ a, teams: (a.categories || []).filter((c) => c.type === "team") }))
      .filter(({ teams }) => teams.length <= 4 && teams.some((c) => String(c.teamId) === String(team.id)))
      .sort((x, y) => new Date(y.a.published || 0) - new Date(x.a.published || 0))
      .slice(0, limit)
      .map(({ a }) => ({
        title: a.headline,
        desc: a.description || "",
        at: a.published || a.lastModified || null,
        url: a.links.web.href,
        img: a.images?.[0]?.url || null,
      }));
  } catch {
    return [];
  }
}

// « il y a 3 h » / « 3h ago » / « hace 3 h »
export function ago(iso, L, now = Date.now()) {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return "";
  const m = Math.max(1, Math.round((now - t) / 60000));
  const rtf = new Intl.RelativeTimeFormat(L.locale, { numeric: "auto", style: "short" });
  if (m < 60) return rtf.format(-m, "minute");
  const h = Math.round(m / 60);
  if (h < 48) return rtf.format(-h, "hour");
  return rtf.format(-Math.round(h / 24), "day");
}
