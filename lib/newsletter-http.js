// Morceaux communs aux routes de la newsletter côté membre : /api/compte/newsletter (état, inscription, désinscription)
// et /api/newsletter/confirmer (lien « Confirme ton inscription » reçu par e-mail). Réponses JSON, messages dans les trois langues
// et traduction d'une panne de Whop, de la base ou de Resend en réponse d'erreur (le détail technique reste dans les journaux).
import { NextResponse } from "next/server";
import { COOKIE, cookieOptions } from "./pro";
import { mk } from "./i18n";
import { WhopEmailError } from "./whop-email";

export const json = (body, status = 200, cookie = null) => {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (cookie) res.cookies.set(COOKIE, cookie, cookieOptions);
  return res;
};
export const err = (error, status = 400, extra = {}) => json({ ok: false, error, ...extra }, status);

export function messages(lang) {
  const { t } = mk(lang);
  return {
    login: t("Connecte-toi pour gérer ta newsletter.", "Log in to manage your newsletter.", "Inicia sesión para gestionar tu newsletter."),
    refused: t("Requête refusée.", "Request refused.", "Solicitud rechazada."),
    many: t("Trop de demandes, réessaie dans quelques minutes.", "Too many requests, please try again in a few minutes.", "Demasiadas solicitudes, inténtalo de nuevo en unos minutos."),
    busy: t("Beaucoup de demandes de confirmation aujourd'hui : réessaie demain, ou écris-nous à contact@basketlog-app.com.", "Lots of confirmation requests today: please try again tomorrow, or write to us at contact@basketlog-app.com.", "Hay muchas solicitudes de confirmación hoy: inténtalo de nuevo mañana o escríbenos a contact@basketlog-app.com."),
    preview: t("Tu es en mode aperçu : quitte l'aperçu pour modifier ton compte.", "You're in preview mode: leave the preview to change your account.", "Estás en modo vista previa: sal de la vista previa para modificar tu cuenta."),
    notReady: t("La newsletter n'est pas encore ouverte.", "The newsletter isn't open yet.", "La newsletter todavía no está abierta."),
    noEmail: t("On n'arrive pas à lire ton adresse e-mail chez Whop pour le moment. Écris-nous à contact@basketlog-app.com et on s'en occupe.", "We can't read your email address at Whop right now. Write to us at contact@basketlog-app.com and we'll sort it out.", "No conseguimos leer tu correo en Whop por ahora. Escríbenos a contact@basketlog-app.com y lo solucionamos."),
    mailFail: t("L'e-mail de confirmation n'a pas pu être envoyé pour le moment. Réessaie dans un instant.", "The confirmation email couldn't be sent right now. Please try again in a moment.", "No se ha podido enviar el correo de confirmación por ahora. Inténtalo de nuevo en un instante."),
    linkInvalid: t("Ce lien n'est plus valable : il a expiré (il marche 48 heures) ou ne correspond plus à ton compte.", "This link is no longer valid: it has expired (it works for 48 hours) or no longer matches your account.", "Este enlace ya no es válido: ha caducado (funciona durante 48 horas) o ya no corresponde a tu cuenta."),
    down: t("Le service d'envoi ne répond pas pour le moment, réessaie dans un instant.", "The email service isn't responding right now, please try again in a moment.", "El servicio de correo no responde por ahora, inténtalo de nuevo en un instante."),
    blocked: t("Cette adresse s'est désinscrite de tous nos envois. Écris-nous à contact@basketlog-app.com pour la réactiver.", "This address has unsubscribed from all our emails. Write to us at contact@basketlog-app.com to turn it back on.", "Esta dirección se ha dado de baja de todos nuestros envíos. Escríbenos a contact@basketlog-app.com para reactivarla."),
    unconfirmed: t("Ta demande n'a pas pu être confirmée. Réessaie dans un instant.", "Your request couldn't be confirmed. Please try again in a moment.", "No se ha podido confirmar tu solicitud. Inténtalo de nuevo en un instante."),
    unknown: t("Action inconnue.", "Unknown action.", "Acción desconocida."),
  };
}

// Réponse d'erreur pour un souci chez Whop ou Resend (le détail technique reste dans les journaux du serveur).
export function fail(M, e, extra = {}) {
  console.warn(`[newsletter] ${e?.name === "WhopEmailError" ? "adresse" : e?.kind ? "Resend" : "base"} : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
  switch (e?.kind) {
    case "noemail":
    case "scope":
    case "nokey": return err(e instanceof WhopEmailError ? M.noEmail : M.notReady, e instanceof WhopEmailError ? 502 : 503, extra);
    case "blocked": return err(M.blocked, 409, extra);
    case "unconfirmed": return err(M.unconfirmed, 502, extra);
    default: return err(M.down, 503, extra);
  }
}
