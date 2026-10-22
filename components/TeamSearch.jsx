"use client";
import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";

const norm = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function when(iso) {
  try {
    return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export default function TeamSearch({ games }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const box = useRef(null);

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
      <svg className="search-ic" viewBox="0 0 24 24" aria-hidden><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
      <input
        type="search"
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Recherche une équipe (ex : Lakers, Celtics…)"
        aria-label="Rechercher une équipe NBA"
        autoComplete="off"
      />
      {open && q.trim().length >= 2 && (
        <div className="search-drop" role="listbox">
          {results.length ? (
            results.map((g) => (
              <Link key={g.id} href={`/app/match/${g.id}?d=${g.d}`} className="search-row" role="option">
                <span className="search-teams">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.away.logo} alt="" width={26} height={26} />
                  <b>{g.away.short}</b>
                  <span className="at">@</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={g.home.logo} alt="" width={26} height={26} />
                  <b>{g.home.short}</b>
                </span>
                <span className="search-when">{g.live ? "● En direct" : when(g.date)}</span>
              </Link>
            ))
          ) : (
            <div className="search-empty">Aucun match à venir cette semaine pour « {q} ».</div>
          )}
        </div>
      )}
    </div>
  );
}
