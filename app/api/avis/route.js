import { NextResponse } from "next/server";
import { addReview } from "../../../lib/reviews";

// Limite simple anti-spam par adresse IP (mémoire de l'instance).
const hits = new Map();

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Requête invalide / Invalid request." }, { status: 400 }); }

  // Champ piège invisible : rempli uniquement par les robots.
  if (body.site) return NextResponse.json({ ok: true });
  const t = (fr, en, es) => (body.lang === "en" ? en : body.lang === "es" ? es : fr);

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (recent.length >= 3) return NextResponse.json({ ok: false, error: t("Trop d'avis envoyés, réessaie plus tard.", "Too many reviews sent, please try again later.", "Has enviado demasiadas opiniones, inténtalo más tarde.") }, { status: 429 });

  const prenom = String(body.prenom || "").trim().slice(0, 40);
  const profil = String(body.profil || "").trim().slice(0, 60);
  const texte = String(body.texte || "").trim().slice(0, 500);
  const note = Math.round(Number(body.note));
  if (prenom.length < 2) return NextResponse.json({ ok: false, error: t("Indique ton prénom.", "Please enter your first name.", "Indica tu nombre.") }, { status: 400 });
  if (!(note >= 1 && note <= 5)) return NextResponse.json({ ok: false, error: t("Choisis une note de 1 à 5 étoiles.", "Pick a rating from 1 to 5 stars.", "Elige una nota de 1 a 5 estrellas.") }, { status: 400 });
  if (texte.length < 15) return NextResponse.json({ ok: false, error: t("Ton avis doit faire au moins 15 caractères.", "Your review must be at least 15 characters.", "Tu opinión debe tener al menos 15 caracteres.") }, { status: 400 });

  const r = await addReview({ prenom, profil, note, texte });
  if (!r.ok) return NextResponse.json({ ok: false, error: t("Impossible d'enregistrer ton avis pour le moment.", "Your review couldn't be saved right now.", "No se ha podido guardar tu opinión por ahora.") }, { status: 502 });
  recent.push(now);
  hits.set(ip, recent);
  return NextResponse.json({ ok: true });
}
