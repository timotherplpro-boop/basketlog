"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useL, useInitialPath } from "./LangProvider";
import { switchPath } from "../lib/i18n";

// FR | EN : la même page dans l'autre langue.
export default function LangSwitch({ className = "lang-switch" }) {
  const L = useL();
  const initial = useInitialPath();
  const nav = usePathname();
  const [path, setPath] = useState(initial);
  // Après une navigation côté client, on relit l'adresse affichée par le navigateur.
  useEffect(() => { setPath(location.pathname + location.search); }, [nav]);
  return (
    <span className={className}>
      <a href={switchPath(path, "fr")} hrefLang="fr" aria-current={!L.en ? "true" : undefined} className={!L.en ? "on" : ""}>FR</a>
      <span aria-hidden>·</span>
      <a href={switchPath(path, "en")} hrefLang="en" aria-current={L.en ? "true" : undefined} className={L.en ? "on" : ""}>EN</a>
    </span>
  );
}
