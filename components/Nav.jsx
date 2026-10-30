"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useProStatus } from "../lib/useProStatus";
import { track } from "../lib/analytics";
import { useL } from "./LangProvider";
import LangSelect from "./LangSelect";
import { InstallPlatforms } from "./InstallApp";

// Double chevron plein, aux mêmes proportions que celui de Visifoot.
const Chevrons = () => (
  <svg viewBox="0 0 24.5 18" aria-hidden><path d="M0 0h6.5l7 9-7 9H0l7-9zM10.5 0H17l7 9-7 9h-6.5l7-9z" fill="currentColor" /></svg>
);

// En-tête façon Visifoot : logo à gauche ; à droite la langue, « » CONNEXION » et la boîte blanche (iPhone, Android).
// Sur mobile : logo et menu burger, qui ouvre un panneau avec ces mêmes éléments et les liens du site.
export default function Nav() {
  const L = useL();
  const [open, setOpen] = useState(false);
  const pro = useProStatus();
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  // Toujours « » CONNEXION », comme sur Visifoot : on arrive dans l'espace membre (barre latérale),
  // directement si on est déjà connecté, sinon après la connexion Whop.
  const connected = !!pro?.connected;
  const space = L.href("/app");
  const account = {
    href: connected ? space : `/api/whop/login?next=${encodeURIComponent(space)}`,
    label: L.t("Connexion", "Login", "Iniciar sesión"),
    title: connected ? L.t("Tu es connecté : ouvrir ton espace", "You're logged in: open your space", "Has iniciado sesión: abrir tu espacio") : undefined,
  };
  const onAccount = () => !connected && track("Connexion Whop", { etape: "clic", source: "menu" });
  const menuLabel = open ? L.t("Fermer le menu", "Close menu", "Cerrar el menú") : L.t("Ouvrir le menu", "Open menu", "Abrir el menú");

  const links = [
    ["/app", L.t("Analyser un match", "Analyze a game", "Analizar un partido")],
    ["/app/matchs", L.t("Matchs du jour", "Today's games", "Partidos de hoy")],
    ["/app/classement", L.t("Classement NBA", "NBA standings", "Clasificación NBA")],
    ["/app/euroleague", L.t("EuroLeague", "EuroLeague", "Euroliga")],
    ["/app/bilan", L.t("Bilan du modèle", "Model track record", "Balance del modelo")],
    ["/pro", "Basketlog Pro"],
    ["/avis", L.t("Avis", "Reviews", "Opiniones")],
  ];

  return (
    <>
      <nav className="nav">
        <div className="nav-in">
          <Link href={L.href("/")} className="logo" onClick={() => setOpen(false)}>
            <span className="ball" aria-hidden /> Basketlog
          </Link>
          <div className="nav-right">
            <LangSelect className="nav-only" />
            <a href={account.href} className="nav-cta nav-only" onClick={onAccount} title={account.title}>
              <Chevrons />
              {account.label}
            </a>
            <InstallPlatforms box className="nav-only" />
            <button type="button" className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={menuLabel} aria-expanded={open}>
              <i /><i />
            </button>
          </div>
        </div>
      </nav>
      <div className={`mmenu ${open ? "open" : ""}`} onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
        <div className="mm-panel" onClick={(e) => e.target.closest("a") && setOpen(false)}>
          <div className="mm-top">
            <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
            <button type="button" className="mm-x" onClick={() => setOpen(false)} aria-label={L.t("Fermer le menu", "Close menu", "Cerrar el menú")}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M5 5l14 14M19 5L5 19" /></svg>
            </button>
          </div>
          <div className="mm-visi">
            <LangSelect />
            <a href={account.href} className="nav-cta" onClick={onAccount} title={account.title}><Chevrons />{account.label}</a>
            <InstallPlatforms source="menu" box />
          </div>
          <nav className="mm-links" aria-label={L.t("Pages du site", "Site pages", "Páginas del sitio")}>
            {links.map(([href, label]) => <Link key={href} href={L.href(href)}>{label}</Link>)}
            <Link href={`${L.href("/")}#faq`}>{L.t("Questions fréquentes", "FAQ", "Preguntas frecuentes")}</Link>
          </nav>
        </div>
      </div>
    </>
  );
}
