"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useL } from "./LangProvider";
import { fmtDate } from "../lib/i18n";

const KEY = "bl_history";

// Historique des analyses consultées (stockage local du navigateur), groupé par jour de consultation.
export default function HistoryList() {
  const L = useL();
  const [list, setList] = useState(null);
  useEffect(() => {
    try { setList(JSON.parse(localStorage.getItem(KEY) || "[]")); } catch { setList([]); }
  }, []);

  if (list === null) return <div className="panel hist-wait" aria-busy="true" />;

  if (!list.length) {
    return (
      <div className="panel hist-empty">
        <b>{L.t("Aucune analyse pour l'instant", "No analyses yet", "Todavía no hay análisis")}</b>
        <p>{L.t("Ouvre l'analyse complète d'un match : elle apparaîtra ici pour que tu la retrouves facilement.", "Open a game's full analysis: it will show up here so you can find it again easily.", "Abre el análisis completo de un partido: aparecerá aquí para que lo encuentres fácilmente.")}</p>
        <Link href={L.href("/app")} className="btn-solid">{L.t("Analyser un match", "Analyze a game", "Analizar un partido")}</Link>
        <Link href={L.href("/app/matchs")} className="comp-more">{L.t("Voir les matchs du jour", "See today's games", "Ver los partidos de hoy")} →</Link>
      </div>
    );
  }

  const day = (t) => fmtDate(L, new Date(t).toISOString(), { weekday: "long", day: "numeric", month: "long" });
  const groups = [];
  for (const e of list) {
    const k = day(e.at);
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.items.push(e); else groups.push({ k, items: [e] });
  }
  const clear = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setList([]);
  };

  return (
    <div className="panel hist">
      <div className="hist-head">
        <div className="panel-label">{L.t(`${list.length} ANALYSE${list.length > 1 ? "S" : ""}`, `${list.length} ANALYS${list.length > 1 ? "ES" : "IS"}`, `${list.length} ANÁLISIS`)}</div>
        <button type="button" className="linklike" onClick={clear}>{L.t("Effacer l'historique", "Clear history", "Borrar el historial")}</button>
      </div>
      {groups.map((g) => (
        <div key={g.k}>
          <div className="up-day">{g.k}</div>
          {g.items.map((e) => (
            <Link key={e.id} href={L.href(e.path)} className="hist-row">
              <span className="hist-teams">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.away?.logo ? <img src={e.away.logo} alt="" /> : <span className="ph" />}
                <b>{e.away?.short}</b>
                <em>@</em>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {e.home?.logo ? <img src={e.home.logo} alt="" /> : <span className="ph" />}
                <b>{e.home?.short}</b>
              </span>
              <span className="hist-meta">
                <span className="tag">{e.league === "NBA" ? "NBA" : L.t("EuroLeague", "EuroLeague", "Euroliga")}</span>
                {e.date && <span>{fmtDate(L, e.date, { weekday: "short", day: "numeric", month: "short" })}</span>}
              </span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
