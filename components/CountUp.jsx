"use client";
import { useEffect, useRef, useState } from "react";

// Compteur animé déclenché quand il devient visible. Le rendu serveur affiche la vraie valeur
// (utile sans JavaScript), puis le compteur repart de 0 et défile jusqu'à elle.
export default function CountUp({ value, suffix = "", duration = 1400, delay = 0 }) {
  const [v, setV] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setV(0);
    let raf, timer;
    const run = () => {
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        setV(Math.round(value * e));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver(
      ([en]) => {
        if (en.isIntersecting) {
          timer = setTimeout(run, delay);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, duration, delay]);

  return <span ref={ref} className="countup">{v}{suffix}</span>;
}
