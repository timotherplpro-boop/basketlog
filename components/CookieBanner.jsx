"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "../lib/consent";
import { useL } from "./LangProvider";

// Bannière cookies : « Refuser » et « Accepter » au même niveau, rien n'est déposé avant le choix.
export default function CookieBanner() {
  const L = useL();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!getConsent()) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener("bl-consent-open", reopen);
    return () => window.removeEventListener("bl-consent-open", reopen);
  }, []);
  if (!open) return null;
  const choose = (v) => { setConsent(v); setOpen(false); };
  return (
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label={L.t("Choix des cookies", "Cookie choice")}>
      <p>
        {L.en
          ? <><b>Cookies</b> — With your consent, Basketlog measures traffic (Amplitude) to improve the site. No ads, no data resale. Necessary cookies (subscriber login) don&apos;t require consent. </>
          : <><b>Cookies</b> — Avec ton accord, Basketlog mesure l&apos;audience (Amplitude) pour améliorer le site. Aucune publicité, aucune revente. Les cookies nécessaires (connexion abonné) ne demandent pas d&apos;accord. </>}
        <Link href={L.href("/cookies")}>{L.t("En savoir plus", "Learn more")}</Link>
      </p>
      <div className="cookie-actions">
        <button type="button" className="cookie-btn" onClick={() => choose(false)}>{L.t("Refuser", "Decline")}</button>
        <button type="button" className="cookie-btn" onClick={() => choose(true)}>{L.t("Accepter", "Accept")}</button>
      </div>
    </div>
  );
}
