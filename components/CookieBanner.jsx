"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "../lib/consent";

// Bannière cookies : « Refuser » et « Accepter » au même niveau, rien n'est déposé avant le choix.
export default function CookieBanner() {
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
    <div className="cookie-banner" role="dialog" aria-live="polite" aria-label="Choix des cookies">
      <p>
        <b>Cookies</b> — Avec ton accord, Basketlog mesure l&apos;audience (Amplitude) pour améliorer le site. Aucune publicité, aucune revente.
        Les cookies nécessaires (connexion abonné) ne demandent pas d&apos;accord. <Link href="/cookies">En savoir plus</Link>
      </p>
      <div className="cookie-actions">
        <button type="button" className="cookie-btn" onClick={() => choose(false)}>Refuser</button>
        <button type="button" className="cookie-btn" onClick={() => choose(true)}>Accepter</button>
      </div>
    </div>
  );
}
