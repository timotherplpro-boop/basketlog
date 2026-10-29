"use client";
import Link from "next/link";
import { useL } from "./LangProvider";

export default function AppTabs({ active }) {
  const L = useL();
  const tabs = [
    ["analyse", "/app", L.t("Analyse de match", "Match analysis", "Análisis de partido")],
    ["matchs", "/app/matchs", L.t("Matchs du jour", "Today's games", "Partidos de hoy")],
    ["classement", "/app/classement", L.t("Classement NBA", "NBA standings", "Clasificación NBA")],
    ["euroleague", "/app/euroleague", L.t("EuroLeague", "EuroLeague", "Euroliga")],
    ["bilan", "/app/bilan", L.t("Bilan", "Track record", "Balance")],
  ];
  return (
    <div className="app-tabs">
      {tabs.map(([k, href, label]) => (
        <Link key={k} href={L.href(href)} className={active === k ? "on" : ""}>{label}</Link>
      ))}
    </div>
  );
}
