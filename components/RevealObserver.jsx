"use client";
import { useEffect } from "react";

// Ajoute la classe "in" à chaque élément .reveal / .notif quand il entre à l'écran.
export default function RevealObserver() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal:not(.in), .notif:not(.in)");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return null;
}
