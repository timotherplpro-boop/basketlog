"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pro = useProStatus();
  const [here, setHere] = useState("/");
  useEffect(() => { setHere(location.pathname + location.search); }, [open]);
  const connected = !!pro?.connected;
  const account = connected
    ? { href: "/pro", label: "Mon compte" }
    : { href: `/api/whop/login?next=${encodeURIComponent(here)}`, label: "Connexion" };
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <Link href="/" className="logo" onClick={() => setOpen(false)}>
            <span className="ball" aria-hidden /> Basketlog
          </Link>
          <div className="nav-right">
            <a href={account.href} className="nav-login" aria-label={account.label} onClick={() => !connected && track("Connexion Whop", { etape: "clic", source: "menu" })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
              <span>{account.label}</span>
            </a>
            <Link href="/app" className="nav-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5l7 7-7 7M12 5l7 7-7 7" /></svg>
              ANALYSER
            </Link>
            <div className="nav-box">
              <Link href="/app/matchs">Matchs du jour</Link>
              <Link href="/app/classement">Classement</Link>
              <Link href="/app/euroleague">EuroLeague</Link>
              <Link href="/app/bilan">Bilan</Link>
              <Link href="/pro" className="nav-pro">Pro</Link>
            </div>
            <button className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open}>
              <i /><i />
            </button>
          </div>
        </div>
      </nav>
      <div className={`mmenu ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <button className="mclose" aria-label="Fermer le menu">×</button>
        <a href={account.href}>{account.label}</a>
        <Link href="/app">Analyser un match</Link>
        <Link href="/app/matchs">Matchs du jour</Link>
        <Link href="/app/classement">Classement NBA</Link>
        <Link href="/app/euroleague">EuroLeague</Link>
        <Link href="/app/bilan">Bilan du modèle</Link>
        <Link href="/pro">Basketlog Pro</Link>
        <Link href="/avis">Avis</Link>
        <Link href="/#faq">FAQ</Link>
      </div>
    </>
  );
}
