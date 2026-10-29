import { headers } from "next/headers";
import { mk } from "./i18n";

// Langue de la requête (posée par le middleware : /en/... = anglais).
export async function getL() {
  const h = await headers();
  return mk(h.get("x-bl-lang") === "en" ? "en" : "fr");
}

// Adresse demandée (avec /en le cas échéant), pour le lien vers l'autre langue dès le rendu serveur.
export async function getPath() {
  const h = await headers();
  const p = h.get("x-bl-path") || "/";
  return p.startsWith("/") && !p.startsWith("//") ? p : "/";
}
