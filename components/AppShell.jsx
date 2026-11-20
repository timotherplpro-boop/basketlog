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
import NewsletterInvite from "./NewsletterInvite";

// Mêmes pictogrammes que Visifoot (jeu d'icônes Lucide, licence ISC).
const I = {
  chart: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  trophy: <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></>,
  history: <><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>,
  card: <><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M2 10h20" /></>,
  bars: <><path d="M3 3v16a2 2 0 0 0 2 2h16" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></>,
  user: <><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>,
  mail: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  money: <><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>,
  sliders: <><path d="M21 4h-7" /><path d="M10 4H3" /><path d="M21 12h-9" /><path d="M8 12H3" /><path d="M21 20h-5" /><path d="M12 20H3" /><path d="M14 2v4" /><path d="M8 10v4" /><path d="M16 18v4" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></>,
};
const Icon = ({ name }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{I[name]}</svg>
);

const FLAG = { fr: "🇫🇷", en: "🇺🇸", es: "🇪🇸", pt: "🇧🇷" };

export default function AppShell({ session, ai = false, children }) {
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
  // Compte gratuit qui n'a pas encore utilisé son analyse complète offerte (20/11/2026) : « 0 / 1 ».
  const welcome = tier === "compte" && !!pro?.welcome && !used && !(pro?.role || session?.role);
  const limit = welcome ? 1 : pro ? pro.perDay : tier === "starter" ? 1 : tier === "compte" ? 0 : null; // null = illimité
  const unlimited = limit == null;
  const full = !unlimited && used >= limit; // compte gratuit : « 0 / 0 » et « Limite atteinte », comme Visifoot
  const role = pro ? pro.role || null : session?.role || null; // admin ou créateur invité : accès complet
  const plan = role === "admin" ? "Admin"
    : role === "createur" ? L.t("Accès créateur", "Creator access", "Acceso de creador", "Acesso de criador")
    : { compte: L.t("Gratuit", "Free", "Gratis", "Grátis"), starter: "Starter", pro: "Pro", lifetime: "Lifetime" }[tier] || L.t("Gratuit", "Free", "Gratis", "Grátis");

  // Mêmes rubriques que Visifoot : Matchs, Compétitions, Historique, Pricing. Les matchs du jour et le bilan
  // restent accessibles par les onglets en haut des pages.
  const items = [
    ["/app", "chart", L.t("Matchs", "Games", "Partidos", "Jogos"), p === "/app" || p.startsWith("/app/duel") || p.startsWith("/app/match/") || p.startsWith("/nba/") || p.startsWith("/app/matchs")],
    ["/app/competitions", "trophy", L.t("Compétitions", "Competitions", "Competiciones", "Competições"), ["/app/competitions", "/app/classement", "/app/euroleague", "/app/equipe"].some((x) => p.startsWith(x))],
    ["/app/historique", "history", L.t("Historique", "History", "Historial", "Histórico"), p.startsWith("/app/historique")],
  ];

  return (
    <div className={`shell ${open ? "sb-open" : ""}`}>
      <header className="sb-top">
        <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
        <button type="button" className={`burger ${open ? "open" : ""}`} onClick={() => setOpen(!open)} aria-label={open ? L.t("Fermer le menu", "Close menu", "Cerrar el menú", "Fechar o menu") : L.t("Ouvrir le menu", "Open menu", "Abrir el menú", "Abrir o menu")} aria-expanded={open}>
          <i /><i />
        </button>
      </header>
      <div className="sb-scrim" onClick={() => setOpen(false)} aria-hidden />

      <aside className="sb" aria-label={L.t("Espace membre", "Member area", "Área de miembros", "Área de membros")}>
        <div className="sb-brand">
          <Link href={L.href("/")} className="logo"><span className="ball" aria-hidden /> Basketlog</Link>
          <small>{ai ? L.t("Analyse IA de matchs", "AI match analysis", "Análisis IA de partidos", "Análise de jogos com IA") : L.t("Analyse de matchs", "Match analysis", "Análisis de partidos", "Análise de jogos")}</small>
        </div>

        <nav className="sb-nav" aria-label={L.t("Analyse", "Analysis", "Análisis", "Análises")}>
          <div className="sb-label">{L.t("ANALYSE", "ANALYSIS", "ANÁLISIS", "ANÁLISES")}</div>
          {items.map(([href, icon, label, on]) => (
            <Link key={href} href={L.href(href)} className={`sb-item ${on ? "on" : ""}`} aria-current={on ? "page" : undefined}>
              <Icon name={icon} />{label}
            </Link>
          ))}
          <Link href={L.href("/pro")} className={`sb-item boxed ${p.startsWith("/pro") ? "on" : ""}`}>
            <Icon name="card" />Pricing<span className="sb-badge">Pro</span>
          </Link>
          {role === "admin" && (
            <Link href={L.href("/app/admin")} className={`sb-item ${p.startsWith("/app/admin") ? "on" : ""}`} aria-current={p.startsWith("/app/admin") ? "page" : undefined}>
              <Icon name="user" />Admin
            </Link>
          )}
          {role === "createur" && (
            <Link href={L.href("/app/gains")} className={`sb-item ${p.startsWith("/app/gains") ? "on" : ""}`} aria-current={p.startsWith("/app/gains") ? "page" : undefined}>
              <Icon name="money" />{L.t("Mes gains", "My earnings", "Mis ganancias", "Meus ganhos")}
            </Link>
          )}
        </nav>

        <div className="sb-quota">
          <div className="sb-q-head"><Icon name="bars" />{L.t("Analyses du jour", "Today's analyses", "Análisis de hoy", "Análises de hoje")}</div>
          <b className={full ? "full" : unlimited ? "free" : ""}>{unlimited ? L.t("Illimitées", "Unlimited", "Ilimitados", "Ilimitadas") : `${Math.min(used, limit)} / ${limit}`}</b>
          <div className={`sb-bar ${full ? "full" : ""}`}><i style={{ width: unlimited || full ? "100%" : `${Math.min(used / limit, 1) * 100}%` }} /></div>
          {full ? (
            <Link href={L.href("/pro")} className="sb-q-note warn">
              {tier === "compte" && !role
                ? L.t("Analyse offerte utilisée • Essai Pro 3 jours", "Free analysis used • 3-day Pro trial", "Análisis de regalo usado • Prueba Pro 3 días", "Análise de presente usada • Teste Pro 3 dias")
                : <>{L.t("Limite atteinte", "Limit reached", "Límite alcanzado", "Limite atingido")} • {L.t("Upgrade pour plus", "Upgrade for more", "Mejora tu plan para más", "Melhore seu plano para ter mais")}</>}
            </Link>
          ) : welcome ? (
            <Link href={L.href("/app/matchs")} className="sb-q-note">🎁 {L.t("1 analyse complète offerte : choisis ton match", "1 free full analysis: pick your game", "1 análisis completo de regalo: elige tu partido", "1 análise completa de presente: escolha seu jogo")}</Link>
          ) : unlimited ? (
            <span className="sb-q-note">{role ? L.t("Accès complet : aucune limite", "Full access: no limit", "Acceso completo: sin límite", "Acesso completo: sem limite") : L.t(`Formule ${plan} : aucune limite`, `${plan} plan: no limit`, `Plan ${plan}: sin límite`, `Plano ${plan}: sem limite`)}</span>
          ) : (
            <span className="sb-q-note">{L.t(`${limit - used} analyse${limit - used > 1 ? "s" : ""} réduite${limit - used > 1 ? "s" : ""} restante${limit - used > 1 ? "s" : ""}`, `${limit - used} reduced analys${limit - used > 1 ? "es" : "is"} left`, `${limit - used} análisis reducido${limit - used > 1 ? "s" : ""} restante${limit - used > 1 ? "s" : ""}`, `${limit - used} análise${limit - used > 1 ? "s" : ""} reduzida${limit - used > 1 ? "s" : ""} restante${limit - used > 1 ? "s" : ""}`)}</span>
          )}
        </div>

        <div className="sb-foot">
          <div className="sb-user">
            <Icon name="user" />
            <div><b>{name || L.t("Mon compte", "My account", "Mi cuenta", "Minha conta")}</b><small>{plan}</small></div>
          </div>
          <Link href={L.href("/app/compte")} className={`sb-link ${p.startsWith("/app/compte") ? "on" : ""}`} aria-current={p.startsWith("/app/compte") ? "page" : undefined}><Icon name="sliders" />{L.t("Mon compte et abonnement", "My account and subscription", "Mi cuenta y suscripción", "Minha conta e assinatura")}</Link>
          <a href={`/api/pro/logout?next=${encodeURIComponent(L.href("/"))}`} className="sb-link big"><Icon name="logout" />{L.t("Déconnexion", "Log out", "Cerrar sesión", "Sair")}</a>
          <a href="mailto:contact@basketlog-app.com" className="sb-link"><Icon name="mail" />Support</a>
          <div className="sb-link sb-lang"><Icon name="globe" /><span aria-hidden>{FLAG[L.lang]}</span><LangSelect className="plain" /></div>
        </div>
      </aside>

      <div className="shell-main">
        <NewsletterInvite uid={pro?.uid || null} hidden={p.startsWith("/app/compte")} />
        {children}
      </div>
    </div>
  );
}
