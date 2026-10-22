"use client";
import { useEffect, useRef } from "react";

// Le contenu du téléphone défile au rythme de la page pendant que la section reste fixée.
export default function StickyStandings({ east, west }) {
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
      <div><b>{t.name}</b><small>{t.gp ? `${t.gp} match${t.gp > 1 ? "s" : ""} joué${t.gp > 1 ? "s" : ""}` : `Saison passée : ${t.prev || "–"}`}</small></div>
      <span className="rec">{t.wins}-{t.losses}</span>
      <span className="chev">›</span>
    </div>
  );

  return (
    <section className="sticky-sec" ref={sec}>
      {/* contenu fourni par la page via children-like props */}
      <StickyInner view={view} inner={inner} east={east} west={west} Row={Row} />
    </section>
  );
}

function StickyInner({ view, inner, east, west, Row }) {
  return (
    <div className="sticky-in">
      <div>
        <h2 className="t-sec reveal left">Des analyses<br />poussées pour<br />anticiper<br />chaque match.</h2>
        <p className="lead reveal left" style={{ "--d": "120ms" }}>Probabilités, scénarios et données clés pour comprendre le déroulement d&apos;un match avant même l&apos;entre-deux.</p>
        <a href="/app" className="btn-ball reveal left" style={{ "--d": "240ms" }}><span className="ball" /><span className="pill">Analyse prête</span></a>
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
                <div className="sc-title">Classement</div>
                <div className="sc-sub">Découvre les conférences en cours</div>
                <div className="sc-note">Le modèle suit chaque équipe : bilan, écart de points, forme et saison passée.</div>
                <div className="std-search">⌕ Rechercher une équipe…</div>
                <div className="std-h">🏆 CONFÉRENCE EST</div>
                {east.map((t, i) => <Row key={t.id} t={t} i={i} />)}
                <div className="std-h">🌄 CONFÉRENCE OUEST</div>
                {west.map((t, i) => <Row key={t.id} t={t} i={i} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
