import { NextResponse } from "next/server";
import { addReview } from "../../../lib/reviews";
import { COOKIE, currentSession, whopTier } from "../../../lib/pro";
import { getRole } from "../../../lib/roles";

export const dynamic = "force-dynamic";

// Avis ouverts à tous, avec ou sans compte, toujours relus avant publication.
// Avec un compte : un seul avis par compte, et la formule du moment donne la mention « Abonné vérifié » (formule
// payante) ou « Membre vérifié » (compte gratuit). Sans compte : avis affiché sans mention de vérification.
const FORMULES = new Set(["compte", "starter", "pro", "lifetime"]);

// Limite simple anti-spam par adresse IP (mémoire de l'instance).
const hits = new Map();

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: "Requête invalide / Invalid request." }, { status: 400 }); }

  // Champ piège invisible : rempli uniquement par les robots.
  if (body.site) return NextResponse.json({ ok: true });
  const t = (fr, en, es) => (body.lang === "en" ? en : body.lang === "es" ? es : fr);

  // Formulaire envoyé moins de 3 secondes après son ouverture : robot, ignoré sans le dire.
  if (Number.isFinite(body.elapsed) && body.elapsed < 3000) return NextResponse.json({ ok: true });

  const { session } = await currentSession(req.cookies.get(COOKIE)?.value);
  let uid = null;
  let formule = null;
  if (session?.uid) {
    // Admins et créateurs partenaires (accès offert) : pas d'avis, ce ne seraient pas des avis de clients.
    const role = await getRole(session.uid).catch(() => session.role || (session.admin ? "admin" : null));
    if (role) {
      return NextResponse.json({ ok: false, error: t("Les comptes admin et créateurs ne peuvent pas donner d'avis.", "Admin and creator accounts can't leave reviews.", "Las cuentas de administrador y de creador no pueden dar su opinión.") }, { status: 403 });
    }
    uid = session.uid;
    // Formule réelle chez Whop au moment de l'avis ; Whop injoignable : dernière formule connue de la session.
    formule = [session.paid, session.tier].find((x) => FORMULES.has(x)) || "compte";
    try { formule = await whopTier(session.uid); } catch {}
  }

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "?";
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((x) => now - x < 3600e3);
  if (recent.length >= 3) return NextResponse.json({ ok: false, error: t("Trop d'avis envoyés, réessaie plus tard.", "Too many reviews sent, please try again later.", "Has enviado demasiadas opiniones, inténtalo más tarde.") }, { status: 429 });

  const prenom = String(body.prenom || "").trim().slice(0, 40);
  const profil = String(body.profil || "").trim().slice(0, 60);
  const texte = String(body.texte || "").trim().slice(0, 500);
  const note = Math.round(Number(body.note));
  if (prenom.length < 2) return NextResponse.json({ ok: false, error: t("Indique ton prénom.", "Please enter your first name.", "Indica tu nombre.") }, { status: 400 });
  if (!(note >= 1 && note <= 5)) return NextResponse.json({ ok: false, error: t("Choisis une note de 1 à 5 étoiles.", "Pick a rating from 1 to 5 stars.", "Elige una nota de 1 a 5 estrellas.") }, { status: 400 });
  if (texte.length < 15) return NextResponse.json({ ok: false, error: t("Ton avis doit faire au moins 15 caractères.", "Your review must be at least 15 characters.", "Tu opinión debe tener al menos 15 caracteres.") }, { status: 400 });

  const r = await addReview({ uid, formule: uid ? (FORMULES.has(formule) ? formule : "compte") : null, prenom, profil, note, texte });
  if (!r.ok && r.reason === "deja") {
    return NextResponse.json({ ok: false, error: t("Tu as déjà donné ton avis : un seul avis par compte. Merci !", "You've already left a review: one review per account. Thanks!", "Ya has dado tu opinión: una sola opinión por cuenta. ¡Gracias!") }, { status: 409 });
  }
  if (!r.ok) return NextResponse.json({ ok: false, error: t("Impossible d'enregistrer ton avis pour le moment.", "Your review couldn't be saved right now.", "No se ha podido guardar tu opinión por ahora.") }, { status: 502 });
  recent.push(now);
  hits.set(ip, recent);
  return NextResponse.json({ ok: true });
}
