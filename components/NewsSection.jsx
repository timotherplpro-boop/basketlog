// Actualités en temps réel des deux équipes (articles ESPN, mis à jour toutes les 5 minutes), dans l'analyse complète.
import { TeamLogo } from "./ui";
import { teamNews, ago } from "../lib/news";

export default async function NewsSection({ a, L }) {
  const g = a.game;
  const [hn, an] = await Promise.all([teamNews(g.home), teamNews(g.away)]);
  const now = Date.now();
  return (
    <div className="card block news">
      <h2>📰 {L.t("Actualités en temps réel", "Real-time news", "Noticias en tiempo real")}</h2>
      <div className="team-rec" style={{ marginBottom: 12 }}>{L.t("Mises à jour toutes les 5 minutes · articles ESPN en anglais", "Updated every 5 minutes · ESPN articles", "Actualizadas cada 5 minutos · artículos de ESPN en inglés")}</div>
      <div className="grid2 news-grid">
        {[[g.away, an], [g.home, hn]].map(([t, list]) => (
          <div key={t.id} className="news-team">
            <div className="news-head"><TeamLogo team={t} size={22} /> {t.name}</div>
            {list.length ? (
              <ul>
                {list.map((n) => (
                  <li key={n.url}>
                    <a href={n.url} target="_blank" rel="noopener noreferrer">{n.title}</a>
                    <small>ESPN{n.at ? ` · ${ago(n.at, L, now)}` : ""}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="team-rec">{L.t(`Pas d'actualité récente pour ${t.short}.`, `No recent news for ${t.short}.`, `No hay noticias recientes de ${t.short}.`)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
