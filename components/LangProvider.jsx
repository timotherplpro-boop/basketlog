"use client";
import { createContext, useContext, useMemo } from "react";
import { mk } from "../lib/i18n";

const Ctx = createContext({ lang: "fr", path: "/" });

export default function LangProvider({ lang, path = "/", children }) {
  const v = useMemo(() => ({ lang, path }), [lang, path]);
  return <Ctx.Provider value={v}>{children}</Ctx.Provider>;
}

export function useL() {
  const { lang } = useContext(Ctx);
  return useMemo(() => mk(lang), [lang]);
}

// Adresse de la page au premier rendu (posée par le middleware).
export function useInitialPath() {
  return useContext(Ctx).path;
}
