"use client";
// Espace membre façon Visifoot : barre latérale (analyse, matchs, compétitions, historique, bilan, formules),
// compteur d'analyses du jour, compte connecté, déconnexion, support et langue. Sur mobile, la barre s'ouvre en tiroir.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useL, useInitialPath } from "./LangProvider";
import { useProStatus } from "../lib/useProStatus";
import { stripLang } from "../lib/i18n";
import LangSelect from "./LangSelect";

const I = {
  chart: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  calendar: <><rect x="3" y="4.5" width="18" height="16" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 4M17 6h2.5A2.5 2.5 0 0 1 17 10M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3 3.5V8h4.5M12 7.5V12l3 2" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6 15h4" /></>,
  bars: <path d="M5 20v-6M10 20V9M15 20v-9M20 20V5" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" /></>,
  logout: <path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5M15.5 16.5 20 12l-4.5-4.5M20 12H9.5" />,
  mail: <><rect x="2.5" y="4.5" width="19" height="15" rx="2.5" /><path d="m3.5 6.5 8.5 6.5 8.5-6.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[name]}</svg>
);

const FLAG = { fr: "🇫🇷", en: "🇺🇸", es: "🇪🇸" };

export default function AppShell({ session, children }) {
  const L = useL();
  const pro = useProStatus();
  const pathname = usePathname();
  const initial = useInitialPath();
  const [here, setHere] = useState(initial);
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(session?.used ?? 0); // analyses lancées aujourd'hui (compté par le serveur)

  useEffect(() => { setHere(location.pathname + location.search); setOpen(false); }, [pathname]);
  useEffect(() => { if (session?.used != null) setUsed(session.used); }, [session?.used]);
  useEffect(() => { if (pro?.used != null) setUsed((u) => Math.max(u, pro.used)); }, [pro?.used]);
  useEffect(() => {
    const on = (e) => { if (e.detail?.used != null) setUsed(e.detail.used); };
    window.addEventListener("bl-views", on);
    return () => window.removeEventListener("bl-views", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  const p = stripLang(here.split("?")[0]) || "/";
  const tier = pro?.tier && pro.tier !== "gratuit" ? pro.tier : session?.tier || "compte";
  const name = pro?.name || session?.name || "";
  const limit = pro ? pro.perDay : tier === "starter" ? 5 : tier === "compte" ? 1 : null; // null = illimité
  const unlimited = limit == null;
  const full = !unlimited && used >= limit;
  const plan = { compte: L.t("Gratuit", "Free", "Gratis"), starter: "Starter", pro: "Pro", lifetime: "Lifetime" }[tier] || L.t("Gratuit", "Free", "Gratis");

  const items = [
    ["/app", "chart", L.t("Analyse de match", "Game analysis", "Análisis de partido"), p === "/app" || p.startsWith("/app/duel") || p.startsWith("/app/match/")],
    ["/app/matchs", "calendar", L.t("Matchs du jour", "Today's games", "Partidos de hoy"), p.startsWith("/app/matchs")],
    ["/app/competitions", "trophy", L.t("Compétitions", "Competitions", "Competiciones"), ["/app/competitions", "/app/classement", "/app/euroleague", "/app/equipe"].some((x) => p.startsWith(x))],
    ["/app/historique", "history", L.t("Historique", "History", "Historial"), p.startsWith("/app/historique")],
    ["/app/bilan", "target", L.t("Bilan du modèle", "Track record", "Balance del modelo"), p.startsWith("/app/bilan")],
  ];

  return (
    <div className={`shell ${open ? "sb-open" : ""}`}>
      <header className="sb-top">
        <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
        <button type="button" className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? L.t("Fermer le menu", "Close menu", "Cerrar el menú") : L.t("Ouvrir le menu", "Open menu", "Abrir el menú")} aria-expanded={open}>
          <i /><i />
        </button>
      </header>
      <div className="sb-scrim" onClick={() => setOpen(false)} aria-hidden />

      <aside className="sb" aria-label={L.t("Espace membre", "Member area", "Área de miembros")}>
        <div className="sb-brand">
          <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
          <small>{L.t("Analyse de matchs de basket", "Basketball game analysis", "Análisis de baloncesto")}</small>
        </div>

        <nav className="sb-nav" aria-label={L.t("Analyse", "Analysis", "Análisis")}>
          <div className="sb-label">{L.t("ANALYSE", "ANALYSIS", "ANÁLISIS")}</div>
          {items.map(([href, icon, label, on]) => (
            <Link key={href} href={L.href(href)} className={`sb-item ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
              <Icon name={icon} />{label}
            </Link>
          ))}
          <Link href={L.href("/pro")} className={`sb-item boxed ${p.startsWith("/pro") ? "on" : ""}`}>
            <Icon name="card" />{L.t("Formules", "Pricing", "Planes")}<span className="sb-badge">Pro</span>
          </Link>
        </nav>

        <div className="sb-quota">
          <div className="sb-q-head"><Icon name="bars" />{L.t("Analyses du jour", "Today's analyses", "Análisis de hoy")}</div>
          <b className={full ? "full" : unlimited ? "free" : ""}>{unlimited ? L.t("Illimitées", "Unlimited", "Ilimitados") : `${Math.min(used, limit)} / ${limit}`}</b>
          <div className={`sb-bar ${full ? "full" : ""}`}><i style={{ width: unlimited ? "100%" : `${limit ? Math.min(used / limit, 1) * 100 : 100}%` }} /></div>
          {full ? (
            <Link href={L.href("/pro")} className="sb-q-note warn">
              {L.t("Limite atteinte", "Limit reached", "Límite alcanzado")} • {tier === "starter" ? L.t("Illimité avec Pro", "Unlimited with Pro", "Ilimitado con Pro") : L.t("Plus d'analyses avec Starter", "More analyses with Starter", "Más análisis con Starter")}
            </Link>
          ) : unlimited ? (
            <span className="sb-q-note">{L.t(`Formule ${plan} : aucune limite`, `${plan} plan: no limit`, `Plan ${plan}: sin límite`)}</span>
          ) : (
            <span className="sb-q-note">{L.t(`${limit - used} analyse${limit - used > 1 ? "s" : ""} complète${limit - used > 1 ? "s" : ""} restante${limit - used > 1 ? "s" : ""}`, `${limit - used} full analys${limit - used > 1 ? "es" : "is"} left`, `${limit - used} análisis completo${limit - used > 1 ? "s" : ""} restante${limit - used > 1 ? "s" : ""}`)}</span>
          )}
        </div>

        <div className="sb-foot">
          <div className="sb-user">
            <Icon name="user" />
            <div><b>{name || L.t("Mon compte", "My account", "Mi cuenta")}</b><small>{plan}</small></div>
          </div>
          <a href={`/api/pro/logout?next=${encodeURIComponent(L.href("/"))}`} className="sb-link big"><Icon name="logout" />{L.t("Déconnexion", "Log out", "Cerrar sesión")}</a>
          <a href="mailto:contact@basketlog-app.com" className="sb-link"><Icon name="mail" />Support</a>
          <div className="sb-link sb-lang"><Icon name="globe" /><span aria-hidden>{FLAG[L.lang]}</span><LangSelect className="plain" /></div>
        </div>
      </aside>

      <div className="shell-main">{children}</div>
    </div>
  );
}
