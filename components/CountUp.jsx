"use client";
import { useEffect, useRef, useState } from "react";

// Compteur animé façon "machine à sous" déclenché quand il devient visible.
export default function CountUp({ value, suffix = "", duration = 1400 }) {
  const [v, setV] = useState(value);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(value); return; }
    let raf;
    const r = el.getBoundingClientRect();
    if (r.top > window.innerHeight) setV(0); // pas encore visible : on part de 0
    else return;
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
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { run(); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [value, duration]);

  return <span ref={ref}>{v}{suffix}</span>;
}
