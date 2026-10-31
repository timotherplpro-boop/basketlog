"use client";
import { useEffect, useRef, useState } from "react";

// Nombre qui défile chiffre par chiffre comme un compteur mécanique, déclenché à l'apparition.
export default function SlotNumber({ value, suffix = "" }) {
  const digits = String(Math.max(0, Math.round(value))).split("");
  const ref = useRef(null);
  const [go, setGo] = useState(true); // rendu serveur : valeur finale visible

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setGo(false);
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { requestAnimationFrame(() => setGo(true)); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <span className="slot" ref={ref} role="img" aria-label={`${value}${suffix}`}>
      {digits.map((d, i) => (
        <span className="col" key={i} aria-hidden>
          <span style={{ transform: `translateY(-${go ? (+d + 10) : 0}em)`, transitionDelay: `${i * 120}ms` }}>
            {[...Array(20)].map((_, k) => <i key={k}>{k % 10}</i>)}
          </span>
        </span>
      ))}
      <span aria-hidden>{suffix}</span>
    </span>
  );
}
