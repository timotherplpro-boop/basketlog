"use client";
import { openConsent } from "../lib/consent";
import { useL } from "./LangProvider";

export default function CookieSettingsButton({ className = "", children }) {
  const L = useL();
  return <button type="button" className={`linklike ${className}`} onClick={openConsent}>{children || L.t("Gérer mes cookies", "Cookie settings")}</button>;
}
