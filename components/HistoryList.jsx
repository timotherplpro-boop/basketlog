import Link from "next/link";
import { fmtDate } from "../lib/i18n";

// Historique des analyses lancées avec le compte (enregistré par le serveur), groupé par jour.
export default function HistoryList({ list, L }) {
  const day = (iso) => fmtDate(L, iso, { weekday: "long", day: "numeric", month: "long" });
  const groups = [];
  for (const e of list) {
    const k = day(e.at);
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.items.push(e); else groups.push({ k, items: [e] });
  }
  return (
    <div className="panel hist">
      <div className="hist-head">
        <div className="panel-label">{L.t(`${list.length} ANALYSE${list.length > 1 ? "S" : ""}`, `${list.length} ANALYS${list.length > 1 ? "ES" : "IS"}`, `${list.length} ANÁLISIS`)}</div>
      </div>
      {groups.map((g) => (
        <div key={g.k}>
          <div className="up-day">{g.k}</div>
          {g.items.map((e) => {
            const i = e.info || {};
            return (
              <Link key={`${e.day}-${e.key}`} href={L.href(i.path || "/app")} className="hist-row">
                <span className="hist-teams">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.away?.logo ? <img src={i.away.logo} alt="" /> : <span className="ph" />}
                  <b>{i.away?.short || "?"}</b>
                  <em>@</em>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {i.home?.logo ? <img src={i.home.logo} alt="" /> : <span className="ph" />}
                  <b>{i.home?.short || "?"}</b>
                </span>
                <span className="hist-meta">
                  <span className="tag">{i.league === "EL" ? L.t("EuroLeague", "EuroLeague", "Euroliga") : "NBA"}</span>
                  <span>{i.date ? fmtDate(L, i.date, { weekday: "short", day: "numeric", month: "short" }) : L.t("match hypothétique", "hypothetical game", "partido hipotético")}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
