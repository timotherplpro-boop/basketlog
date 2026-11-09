"use client";
// Bouton qui ouvre la fenêtre « Créer un compte / Se connecter » (utilisable dans les pages rendues par le serveur).
import { openAuth } from "../lib/auth-client";

export default function AuthButton({ mode = "inscription", source = "page", next = null, className = "", children }) {
  return (
    <button type="button" className={className} onClick={() => openAuth({ mode, source, ...(next ? { next } : {}) })}>
      {children}
    </button>
  );
}
