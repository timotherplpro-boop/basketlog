"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useL } from "./LangProvider";

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Combo({ teams, value, onChange, placeholder, exclude, L }) {
  const [q, setQ] = useState(value ? value.name : "");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef(null);

  useEffect(() => { setQ(value ? value.name : ""); }, [value]);
  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const list = useMemo(() => {
    const n = norm(q.trim());
    const base = teams.filter((t) => t.id !== exclude);
    if (!n || (value && q === value.name)) return base;
    return base.filter((t) => [t.name, t.short, t.abbr].some((v) => norm(v).includes(n)));
  }, [q, teams, exclude, value]);

  const pick = (t) => { onChange(t); setQ(t.name); setOpen(false); };

  return (
    <div className={`combo ${value ? "filled" : ""}`} ref={box}>
      {value ? (/* eslint-disable-next-line @next/next/no-img-element */ <img className="cimg" src={value.logo} alt="" />) : <span className="cimg ph" />}
      <input
        value={q}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setHi(0); }}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); if (value) onChange(null); }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          if (e.key === "Enter" && list[hi]) { e.preventDefault(); pick(list[hi]); }
          if (e.key === "Escape") setOpen(false);
        }}
        aria-label={placeholder}
        autoComplete="off"
      />
      {open && list.length > 0 && (
        <div className="combo-list" role="listbox">
          {list.map((t, i) => (
            <button type="button" key={t.id} className={i === hi ? "hi" : ""} onMouseEnter={() => setHi(i)} onClick={() => pick(t)} role="option" aria-selected={i === hi}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.logo} alt="" />
              {t.name}
              <small>{t.conf === "E" ? L.t("Est", "East") : L.t("Ouest", "West")}</small>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DuelForm({ teams, initialHome }) {
  const L = useL();
  const router = useRouter();
  const [home, setHome] = useState(initialHome || null);
  const [away, setAway] = useState(null);
  const [busy, setBusy] = useState(false);

  const go = (e) => {
    e.preventDefault();
    if (!home || !away) return;
    setBusy(true);
    router.push(L.href(`/app/duel?home=${home.id}&away=${away.id}`));
  };

  return (
    <form className="panel" onSubmit={go}>
      <div className="panel-label">{L.t("MATCH À ANALYSER", "GAME TO ANALYZE")}</div>
      <div className="pick-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {home ? <img key={home.id} src={home.logo} alt={home.name} /> : <span className="ph" />}
        <span className="vs-dot">VS</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {away ? <img key={away.id} src={away.logo} alt={away.name} /> : <span className="ph" />}
      </div>
      <Combo teams={teams} value={home} onChange={setHome} exclude={away?.id} L={L} placeholder={L.t("Cherche une équipe (ex : Lakers, Celtics)", "Search a team (e.g. Lakers, Celtics)")} />
      <div className="vs-sep">vs</div>
      <Combo teams={teams} value={away} onChange={setAway} exclude={home?.id} L={L} placeholder={L.t("Cherche une équipe (ex : Knicks, Warriors)", "Search a team (e.g. Knicks, Warriors)")} />
      <p className="home-hint">{L.t("S'ils se jouent dans les 3 prochaines semaines, tu tombes sur le vrai match. Sinon, la 1re équipe reçoit.", "If they meet in the next 3 weeks, you land on the real game. Otherwise, the first team plays at home.")}</p>
      <button className="btn-solid" disabled={!home || !away || busy}>{busy ? L.t("Analyse en cours…", "Analyzing…") : L.t("Analyser le match", "Analyze the game")}</button>
    </form>
  );
}
