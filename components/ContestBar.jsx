"use client";
import Link from "next/link";
import { useState } from "react";

// Bandeau du jeu de Noël, au-dessus de la barre de navigation des pages françaises (affiché par app/layout.jsx tant que les
// inscriptions sont ouvertes). La croix le masque 30 jours : cookie bl_cbar, lu par le layout pour ne plus l'afficher.
export default function ContestBar() {
  const [on, setOn] = useState(true);
  if (!on) return null;
  const close = () => {
    try { document.cookie = "bl_cbar=1; Max-Age=2592000; Path=/; SameSite=Lax"; } catch {}
    setOn(false);
  };
  return (
    <div className="contest-bar">
      <Link href="/concours" className="contest-bar-link">
        <span aria-hidden="true">🎁 </span><b>Jeu de Noël</b> : 1 PS5 + 1 maillot <span className="contest-bar-long">de Victor </span>Wembanyama à gagner<span className="contest-bar-long"> · gratuit, tirage le 20 décembre</span> →
      </Link>
      <button type="button" className="contest-bar-x" aria-label="Masquer le bandeau du jeu de Noël" onClick={close}>×</button>
    </div>
  );
}
