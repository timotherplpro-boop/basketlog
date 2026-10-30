"use client";
import { usePathname } from "next/navigation";
import { stripLang } from "../lib/i18n";

// Pages de l'espace membre : là, la barre latérale (AppShell) remplace l'en-tête et le pied de page du site.
export const inMemberArea = (path) => {
  const p = stripLang((path || "/").split("?")[0]) || "/";
  return p === "/app" || p.startsWith("/app/") || p === "/pro";
};

export default function SiteChrome({ member, children }) {
  const path = usePathname();
  return member && inMemberArea(path) ? null : children;
}
