"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useL } from "./LangProvider";
import { fmtDate } from "../lib/i18n";

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const when = (iso, L) => fmtDate(L, iso, { weekday: "short", day: "numeric", month: "short", hour: L.en ? "numeric" : "2-digit", minute: "2-digit" }) + (L.en ? " ET" : "");

export default function TeamSearch({ games }) {
  const L = useL();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const [focus, setFocus] = useState(false);
  // Texte d'aide fixe, comme Visifoot.
  const ph = L.t("Recherchez l'une des équipes (par exemple, les Lakers)", "Search for one of the teams (for example, the Lakers)", "Busca uno de los equipos (por ejemplo, los Lakers)");

  useEffect(() => {
    const close = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const results = useMemo(() => {
    const n = norm(q.trim());
    if (n.length < 2) return [];
    return games
      .filter((g) => [g.home, g.away].some((t) => [t.name, t.short, t.abbr].some((v) => norm(v).includes(n))))
      .slice(0, 6);
  }, [q, games]);

  return (
    <div className="search" ref={box}>
      <div className="search-field"><input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => { setOpen(true); setFocus(true); }}
        onBlur={() => setFocus(false)}
        placeholder={focus ? L.t("Tape le nom d'une équipe", "Type a team name", "Escribe el nombre de un equipo") : ph}
        aria-label={L.t("Rechercher une équipe NBA", "Search an NBA team", "Buscar un equipo de la NBA")}
        autoComplete="off"
      /></div>
      {open && q.trim().length >= 2 && (
        <div className="search-drop" role="listbox">
          {results.length ? (
            results.map((g) => (
              <Link key={g.id} href={L.href(`/app/match/${g.id}?d=${g.d}`)} className="search-row" role="option">
                <span className="search-teams">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.away.logo} alt="" width={26} height={26} />
                  <b>{g.away.short}</b>
                  <span className="vs">@</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.home.logo} alt="" width={26} height={26} />
                  <b>{g.home.short}</b>
                </span>
                <span className="search-when">{g.live ? L.t("● En direct", "● Live", "● En directo") : when(g.date, L)}</span>
              </Link>
            ))
          ) : (
            <div className="search-empty">{L.t(<>Aucun match à venir cette semaine pour « {q} ».</>, <>No upcoming games this week for “{q}”.</>, <>No hay partidos esta semana para «{q}».</>)} <Link href={L.href("/app")} style={{ color: "var(--orange-2)" }}>{L.t("Analyser un duel →", "Analyze a matchup →", "Analizar un duelo →")}</Link></div>
          )}
        </div>
      )}
    </div>
  );
}
