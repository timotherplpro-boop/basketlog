"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { useL, useInitialPath } from "./LangProvider";
import LangSwitch from "./LangSwitch";

export default function Nav() {
  const L = useL();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  const pro = useProStatus();
  const initialPath = useInitialPath();
  const [here, setHere] = useState(initialPath);
  useEffect(() => { setHere(location.pathname + location.search); }, [open]);
  const connected = !!pro?.connected;
  const account = connected
    ? { href: L.href("/pro"), label: L.t("Mon compte", "My account") }
    : { href: `/api/whop/login?next=${encodeURIComponent(here)}`, label: L.t("Connexion", "Log in") };

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <Link href={L.href("/")} className="logo" onClick={() => setOpen(false)}>
            <span className="ball" aria-hidden /> Basketlog
          </Link>
          <div className="nav-right">
            <LangSwitch className="nav-lang" />
            <a href={account.href} className="nav-login" aria-label={account.label} onClick={() => !connected && track("Connexion Whop", { etape: "clic", source: "menu" })}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
              <span>{account.label}</span>
            </a>
            <Link href={L.href("/app")} className="nav-cta">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 5l7 7-7 7M12 5l7 7-7 7" /></svg>
              {L.t("ANALYSER", "ANALYZE")}
            </Link>
            <div className="nav-box">
              <Link href={L.href("/app/matchs")}>{L.t("Matchs du jour", "Today's games")}</Link>
              <Link href={L.href("/app/classement")}>{L.t("Classement", "Standings")}</Link>
              <Link href={L.href("/app/euroleague")}>EuroLeague</Link>
              <Link href={L.href("/app/bilan")}>{L.t("Bilan", "Record")}</Link>
              <Link href={L.href("/pro")} className="nav-pro">Pro</Link>
            </div>
            <button className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? L.t("Fermer le menu", "Close menu") : L.t("Ouvrir le menu", "Open menu")} aria-expanded={open}>
              <i /><i />
            </button>
          </div>
        </div>
      </nav>
      <div className={`mmenu ${open ? "open" : ""}`} onClick={() => setOpen(false)}>
        <button className="mclose" aria-label={L.t("Fermer le menu", "Close menu")}>×</button>
        <a href={account.href}>{account.label}</a>
        <Link href={L.href("/app")}>{L.t("Analyser un match", "Analyze a game")}</Link>
        <Link href={L.href("/app/matchs")}>{L.t("Matchs du jour", "Today's games")}</Link>
        <Link href={L.href("/app/classement")}>{L.t("Classement NBA", "NBA standings")}</Link>
        <Link href={L.href("/app/euroleague")}>EuroLeague</Link>
        <Link href={L.href("/app/bilan")}>{L.t("Bilan du modèle", "Model track record")}</Link>
        <Link href={L.href("/pro")}>Basketlog Pro</Link>
        <Link href={L.href("/avis")}>{L.t("Avis", "Reviews")}</Link>
        <Link href={`${L.href("/")}#faq`}>FAQ</Link>
        <LangSwitch className="mmenu-lang" />
      </div>
    </>
  );
}
