"use client";
import Link from "next/link";
import { useState } from "react";

// Bandeau du jeu de Noël, au-dessus de la barre de navigation des pages françaises, anglaises et espagnoles (affiché par
// app/layout.jsx tant que les inscriptions sont ouvertes). La croix le masque 30 jours : cookie bl_cbar, lu par le layout.
const TXT = {
  fr: { title: "Jeu de Noël", full: "1 PS5 + 1 maillot de Victor Wembanyama à gagner · réservé aux abonnés Pro, tirage le 20 décembre", short: "PS5 + maillot Wemby à gagner", close: "Masquer le bandeau du jeu de Noël" },
  en: { title: "Christmas giveaway", full: "win a PS5 + a Victor Wembanyama jersey · for Pro subscribers, drawing on December 20", short: "win a PS5 + Wemby jersey", close: "Hide the Christmas giveaway banner" },
  es: { title: "Sorteo de Navidad", full: "gana una PS5 + una camiseta de Victor Wembanyama · para suscriptores Pro, sorteo el 20 de diciembre", short: "PS5 + camiseta de Wemby", close: "Ocultar el banner del sorteo de Navidad" },
};

export default function ContestBar({ lang = "fr", href = "/concours" }) {
  const [on, setOn] = useState(true);
  if (!on) return null;
  const T = TXT[lang] || TXT.fr;
  const close = () => {
    try { document.cookie = "bl_cbar=1; Max-Age=2592000; Path=/; SameSite=Lax"; } catch {}
    setOn(false);
  };
  return (
    <div className="contest-bar">
      <Link href={href} className="contest-bar-link">
        <span className="contest-bar-gift" aria-hidden="true">🎁</span>
        <b>{T.title}</b>
        <span className="contest-bar-sep">{lang === "fr" ? " : " : ": "}</span>
        <span className="contest-bar-full">{T.full}</span>
        <span className="contest-bar-short">{T.short}</span>
        <span className="contest-bar-go" aria-hidden="true">→</span>
      </Link>
      <button type="button" className="contest-bar-x" aria-label={T.close} onClick={close}>×</button>
    </div>
  );
}
