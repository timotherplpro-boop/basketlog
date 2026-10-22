"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function Nav() {
  const [open, setOpen] = useState(false);
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
            <Link href="/app" className="nav-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5l7 7-7 7M12 5l7 7-7 7" /></svg>
              ANALYSER
            </Link>
            <div className="nav-box">
              <Link href="/app/matchs">Matchs du jour</Link>
              <Link href="/app/classement">Classement</Link>
            </div>
            <button className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open}>
              <i /><i />
            </button>
          </div>
        </div>
      </nav>
      <div className={`mmenu ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <Link href="/app">Analyser un match</Link>
        <Link href="/app/matchs">Matchs du jour</Link>
        <Link href="/app/classement">Classement</Link>
        <Link href="/#faq">FAQ</Link>
      </div>
    </>
  );
}
