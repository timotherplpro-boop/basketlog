"use client";
import { useEffect } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Fenêtre modale accessible : Tab et Maj+Tab restent dans la fenêtre, Échap la ferme (si onClose est fourni),
// et le focus va dans la fenêtre à l'ouverture puis revient à l'élément d'origine à la fermeture.
export function useFocusTrap(ref, active, onClose) {
  useEffect(() => {
    if (!active) return;
    const prev = document.activeElement;
    const t = setTimeout(() => {
      const box = ref.current;
      if (box && !box.contains(document.activeElement)) (box.querySelector("[autofocus]") || box).focus?.({ preventScroll: true });
    }, 60);
    const onKey = (e) => {
      if (e.key === "Escape" && onClose) { onClose(); return; }
      const box = ref.current;
      if (e.key !== "Tab" || !box) return;
      const items = [...box.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) { e.preventDefault(); return; }
      const first = items[0], last = items[items.length - 1];
      const inside = box.contains(document.activeElement);
      if (e.shiftKey && (!inside || document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (!inside || document.activeElement === last)) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      prev?.focus?.({ preventScroll: true });
    };
  }, [ref, active, onClose]);
}
