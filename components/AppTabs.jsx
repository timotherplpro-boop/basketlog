import Link from "next/link";

export default function AppTabs({ active }) {
  const tabs = [
    ["analyse", "/app", "Analyse de match"],
    ["matchs", "/app/matchs", "Matchs du jour"],
    ["classement", "/app/classement", "Classement NBA"],
    ["euroleague", "/app/euroleague", "EuroLeague"],
    ["bilan", "/app/bilan", "Bilan"],
  ];
  return (
    <div className="app-tabs">
      {tabs.map(([k, href, label]) => (
        <Link key={k} href={href} className={active === k ? "on" : ""}>{label}</Link>
      ))}
    </div>
  );
}
