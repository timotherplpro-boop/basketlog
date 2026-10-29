"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useL, useInitialPath } from "./LangProvider";
import { LANGS, switchPath } from "../lib/i18n";

// FR · EN · ES (pied de page) : la même page dans les autres langues, en liens simples lisibles par les moteurs.
export default function LangSwitch({ className = "lang-switch" }) {
  const L = useL();
  const initial = useInitialPath();
  const nav = usePathname();
  const [path, setPath] = useState(initial);
  // Après une navigation côté client, on relit l'adresse affichée par le navigateur.
  useEffect(() => { setPath(location.pathname + location.search); }, [nav]);
  return (
    <span className={className}>
      {LANGS.map((l, i) => (
        <span key={l} className="ls-item">
          {i > 0 && <span aria-hidden>·</span>}
          <a href={switchPath(path, l)} hrefLang={l} aria-current={L.lang === l ? "true" : undefined} className={L.lang === l ? "on" : ""}>{l.toUpperCase()}</a>
        </span>
      ))}
    </span>
  );
}
