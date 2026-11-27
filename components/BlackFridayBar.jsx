"use client";
import Link from "next/link";
import { useState } from "react";
import { bfBar } from "../lib/black-friday";

// Bandeau Black Friday, au-dessus de celui du jeu de Noël (qui reste) sur les pages françaises, anglaises, espagnoles et
// portugaises, jusqu'au lundi 30/11/2026 23:59:59 (Paris). Affiché par app/layout.jsx seulement si Whop confirme le code
// BLACKFRIDAY (même vérification que /api/promo) et tant que l'offre court. La croix le masque 3 jours : cookie bl_bfbar, lu par le layout.
// Même structure et mêmes classes que ContestBar (40 px de haut, une ligne : le texte long passe en court sur téléphone).
export default function BlackFridayBar({ lang = "fr", href = "/pro?code=BLACKFRIDAY" }) {
  const [on, setOn] = useState(true);
  if (!on) return null;
  const T = bfBar(lang);
  const close = () => {
    try { document.cookie = "bl_bfbar=1; Max-Age=259200; Path=/; SameSite=Lax"; } catch {}
    setOn(false);
  };
  return (
    <div className="contest-bar bf-bar">
      <Link href={href} className="contest-bar-link">
        <span className="contest-bar-gift" aria-hidden="true">🖤</span>
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
