"use client";
import { openConsent } from "../lib/consent";

export default function CookieSettingsButton({ className = "", children = "Gérer mes cookies" }) {
  return <button type="button" className={`linklike ${className}`} onClick={openConsent}>{children}</button>;
}
