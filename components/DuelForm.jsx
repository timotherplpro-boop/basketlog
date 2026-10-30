"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useL } from "./LangProvider";
import { track } from "../lib/analytics";
import AnalysisProgress, { useAnalysisRun, pctLabel } from "./AnalysisProgress";

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
              <small>{t.conf === "E" ? L.t("Est", "East", "Este") : L.t("Ouest", "West", "Oeste")}</small>
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
  const run = useAnalysisRun();
  const running = run.running;
  useEffect(() => {
    if (running) document.querySelector(".panel.an-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [running]);

  // Comme Visifoot : l'analyse prend quelques secondes (étapes du modèle), pendant que le serveur vérifie
  // la limite du jour et l'enregistre ; on ouvre ensuite la fiche du match.
  const go = (e) => {
    e.preventDefault();
    if (!home || !away || run.running) return;
    track("Analyse lancée", { source: "formulaire", domicile: home.abbr, exterieur: away.abbr });
    const fallback = `/app/duel?home=${home.id}&away=${away.id}`;
    run.start(
      () => fetch("/api/pro/analyse", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ home: home.id, away: away.id }) }).then((r) => r.json()),
      (r) => {
        if (r?.used != null) window.dispatchEvent(new CustomEvent("bl-views", { detail: { used: r.used } }));
        router.push(L.href(r?.path || fallback));
      }
    );
  };

  return (
    <>
    <form className="panel" onSubmit={go}>
      <div className="panel-label">{L.t("MATCH À ANALYSER", "GAME TO ANALYZE", "PARTIDO A ANALIZAR")}</div>
      <div className="pick-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {home ? <img key={home.id} src={home.logo} alt={home.name} /> : <span className="ph" />}
        <span className="vs-dot">VS</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {away ? <img key={away.id} src={away.logo} alt={away.name} /> : <span className="ph" />}
      </div>
      <Combo teams={teams} value={home} onChange={setHome} exclude={away?.id} L={L} placeholder={L.t("Cherche une équipe (ex : Lakers, Celtics)", "Search a team (e.g. Lakers, Celtics)", "Busca un equipo (p. ej., Lakers, Celtics)")} />
      <div className="vs-sep">vs</div>
      <Combo teams={teams} value={away} onChange={setAway} exclude={home?.id} L={L} placeholder={L.t("Cherche une équipe (ex : Knicks, Warriors)", "Search a team (e.g. Knicks, Warriors)", "Busca un equipo (p. ej., Knicks, Warriors)")} />
      <p className="home-hint">{L.t("S'ils se jouent dans les 3 prochaines semaines, tu tombes sur le vrai match. Sinon, la 1re équipe reçoit.", "If they meet in the next 3 weeks, you land on the real game. Otherwise, the first team plays at home.", "Si se enfrentan en las próximas 3 semanas, verás el partido real. Si no, el primer equipo juega en casa.")}</p>
      <button className={`btn-solid ${run.running ? "an-busy" : ""}`} disabled={!home || !away || run.running}>
        {run.running ? <><span className="an-spin" aria-hidden />{L.t("Analyse en cours…", "Analysis in progress…", "Análisis en curso…")} {pctLabel(run.p, L)}</> : L.t("Analyser le match", "Analyze the game", "Analizar el partido")}
      </button>
    </form>
    {run.running && <div className="panel an-card"><AnalysisProgress p={run.p} league="NBA" /></div>}
    </>
  );
}
