"use client";
import { useEffect, useRef } from "react";
import { useL } from "./LangProvider";

// Le contenu du téléphone défile au rythme de la page pendant que la section reste fixée.
export default function StickyStandings({ east, west }) {
  const L = useL();
  const sec = useRef(null);
  const inner = useRef(null);
  const view = useRef(null);

  useEffect(() => {
    const s = sec.current, el = inner.current, v = view.current;
    if (!s || !el || !v) return;
    let raf;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (window.innerWidth <= 860) { el.style.transform = ""; return; }
        const r = s.getBoundingClientRect();
        const total = s.offsetHeight - window.innerHeight;
        const p = Math.min(1, Math.max(0, -r.top / Math.max(1, total)));
        const max = Math.max(0, el.scrollHeight - v.clientHeight + 20);
        el.style.transform = `translateY(${-p * max}px)`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  const Row = ({ t, i }) => (
    <div className="std-row">
      <span className="rk">{i + 1}</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={t.logo} alt="" loading="lazy" />
      <div><b>{t.name}</b><small>{L.t(
        t.gp ? `${t.gp} match${t.gp > 1 ? "s" : ""} joué${t.gp > 1 ? "s" : ""}` : `Saison passée : ${t.prev || "–"}`,
        t.gp ? `${t.gp} game${t.gp > 1 ? "s" : ""} played` : `Last season: ${t.prev || "–"}`,
        t.gp ? `${t.gp} partido${t.gp > 1 ? "s" : ""} jugado${t.gp > 1 ? "s" : ""}` : `Temporada pasada: ${t.prev || "–"}`
      )}</small></div>
      <span className="rec">{t.wins}-{t.losses}</span>
      <span className="chev">›</span>
    </div>
  );

  return (
    <section className="sticky-sec" ref={sec}>
      {/* contenu fourni par la page via children-like props */}
      <StickyInner view={view} inner={inner} east={east} west={west} Row={Row} L={L} />
    </section>
  );
}

function StickyInner({ view, inner, east, west, Row, L }) {
  return (
    <div className="sticky-in">
      <div>
        {L.t(
          <h2 className="t-sec reveal left">Des analyses<br />poussées pour<br />anticiper<br />chaque match.</h2>,
          <h2 className="t-sec reveal left">In-depth<br />analysis to<br />anticipate<br />every game.</h2>,
          <h2 className="t-sec reveal left">Análisis<br />a fondo para<br />anticipar<br />cada partido.</h2>
        )}
        <p className="lead reveal left" style={{ "--d": "120ms" }}>{L.t("Probabilités, scénarios et données clés pour comprendre le déroulement d'un match avant même l'entre-deux.", "Probabilities, scenarios and key data to understand how a game will unfold before the opening tip.", "Probabilidades, escenarios y datos clave para entender cómo se desarrollará un partido antes incluso del salto inicial.")}</p>
        <a href={L.href("/app")} className="btn-ball reveal left" style={{ "--d": "240ms" }}><span className="ball" /><span className="pill">{L.t("Analyse prête", "Analysis ready", "Análisis listo")}</span></a>
      </div>
      <div className="sticky-phone reveal right">
        <div className="phone">
          <div className="screen" ref={view}>
            <div className="notch" />
            <div className="std-scroll" ref={inner}>
              <div className="app-top" style={{ paddingTop: 54 }}>
                <span className="logo"><span className="ball" /> Basketlog</span>
                <span className="app-burger" aria-hidden><i /><i /><i /></span>
              </div>
              <div className="screen-body">
                <div className="sc-title">{L.t("Classement", "Standings", "Clasificación")}</div>
                <div className="sc-sub">{L.t("Découvre les conférences en cours", "Explore the current conferences", "Descubre las conferencias en curso")}</div>
                <div className="sc-note">{L.t("Le modèle suit chaque équipe : bilan, écart de points, forme et saison passée.", "The model tracks every team: record, point differential, form and last season.", "El modelo sigue a cada equipo: balance, diferencia de puntos, forma y temporada pasada.")}</div>
                <div className="std-search">⌕ {L.t("Rechercher une équipe…", "Search a team…", "Buscar un equipo…")}</div>
                <div className="std-h">🏆 {L.t("CONFÉRENCE EST", "EASTERN CONFERENCE", "CONFERENCIA ESTE")}</div>
                {east.map((t, i) => <Row key={t.id} t={t} i={i} />)}
                <div className="std-h">🌄 {L.t("CONFÉRENCE OUEST", "WESTERN CONFERENCE", "CONFERENCIA OESTE")}</div>
                {west.map((t, i) => <Row key={t.id} t={t} i={i} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
