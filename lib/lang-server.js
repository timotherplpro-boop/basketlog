import { headers } from "next/headers";
import { mk, LANGS } from "./i18n";

// Langue de la requête (posée par le middleware : /en/... = anglais, /es/... = espagnol).
export async function getL() {
  const h = await headers();
  const v = h.get("x-bl-lang");
  return mk(LANGS.includes(v) ? v : "fr");
}

// Adresse demandée (avec le préfixe de langue le cas échéant), pour le sélecteur de langue dès le rendu serveur.
export async function getPath() {
  const h = await headers();
  const p = h.get("x-bl-path") || "/";
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
}
