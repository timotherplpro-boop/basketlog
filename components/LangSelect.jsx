"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useL, useInitialPath } from "./LangProvider";
import { LANGS, LANG_NAMES, switchPath } from "../lib/i18n";

// Menu déroulant de langue, façon Visifoot : boîte grise « Français ⌄ » avec un vrai <select> invisible par-dessus.
export default function LangSelect({ className = "" }) {
  const L = useL();
  const initial = useInitialPath();
  const nav = usePathname();
  const [path, setPath] = useState(initial);
  useEffect(() => { setPath(location.pathname + location.search); }, [nav]);
  return (
    <label className={`lang-select ${className}`}>
      <span>{LANG_NAMES[L.lang]}</span>
      <svg viewBox="0 0 12 12" aria-hidden><path d="M3 4.6l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <select
        aria-label={L.t("Langue", "Language", "Idioma")}
        value={L.lang}
        onChange={(e) => { if (e.target.value !== L.lang) location.href = switchPath(path, e.target.value); }}
      >
        {LANGS.map((l) => <option key={l} value={l}>{LANG_NAMES[l]}</option>)}
      </select>
    </label>
  );
}
