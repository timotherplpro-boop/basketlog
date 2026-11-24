"use client";
// Monnaie d'affichage côté navigateur : lue dans le cookie bl_cur posé par le middleware (même règle que le serveur) ;
// avant lecture, la langue décide (anglais = dollars), comme pour les robots.
import { useEffect, useState } from "react";

export function useCurrency(L) {
  const [cur, setCur] = useState(L?.en ? "USD" : "EUR");
  useEffect(() => {
    const m = document.cookie.match(/(?:^|;\s*)bl_cur=(EUR|USD)/);
    if (m) setCur(m[1]);
  }, []);
  return cur;
}
