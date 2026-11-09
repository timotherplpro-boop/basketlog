import { NextResponse } from "next/server";
import { SITE } from "../../../lib/site";
import { mk } from "../../../lib/i18n";
import { COOKIE, accountSession, cookieOptions, encodeSession, freshAccountSession } from "../../../lib/pro";
import { MAX_PASSWORD, fakeVerify, hashPassword, passwordProblem, verifyPassword } from "../../../lib/password";
import { CONTACT, mailReady, resetEmail, sendMail } from "../../../lib/mail";
import {
  RESET_MINUTES, RESET_TOKEN_RE, clientIp, newResetToken, normEmail, sameOrigin, tokenHash,
} from "../../../lib/auth-utils";
import {
  allowed, compteParEmail, comptesConfigured, comptesNotInstalled, compteVu, creerReinit, inscrire, reinitValide, utiliserReinit,
} from "../../../lib/comptes";

export const dynamic = "force-dynamic";
export const maxDuration = 20;

// Comptes Basketlog, comme l'inscription de Visifoot : e-mail + mot de passe (6 caractères au moins), ou « Continuer avec
// Google » (redirection, app/api/auth/google). Actions (POST, JSON) :
//   inscription { email, mdp }  ·  connexion { email, mdp }  ·  oubli { email }  ·  reinit { jeton, mdp }
//   verifier { jeton } : le lien « mot de passe oublié » est-il encore valable ?
// Le jeton du lien voyage dans le fragment de l'adresse (#…) et dans le corps des requêtes, jamais dans une adresse
// envoyée au serveur : il n'apparaît donc pas dans les journaux.
// Le mot de passe n'est jamais gardé : la base reçoit son empreinte scrypt (lib/password.js). Les essais sont limités par
// adresse e-mail et par adresse IP (empreintes seulement, lib/comptes.js). Une connexion réussie pose le cookie de session
// signé « bl_pro » (le même que la connexion Whop), avec l'identifiant « bl_<id> » du compte.

function messages(lang) {
  const { t } = mk(lang);
  return {
    refused: t("Requête refusée.", "Request refused.", "Solicitud rechazada."),
    notReady: t("Les comptes Basketlog ouvrent dans quelques instants. Réessaie un peu plus tard.", "Basketlog accounts open in a few moments. Please try again a little later.", "Las cuentas de Basketlog abren en unos instantes. Vuelve a intentarlo un poco más tarde."),
    dbDown: t("Le service est momentanément indisponible, réessaie dans un instant.", "The service is temporarily unavailable, please try again in a moment.", "El servicio no está disponible por el momento, inténtalo de nuevo en un instante."),
    many: t("Trop d'essais. Attends quelques minutes avant de réessayer.", "Too many attempts. Wait a few minutes before trying again.", "Demasiados intentos. Espera unos minutos antes de volver a intentarlo."),
    email: t("Entre une adresse e-mail valide.", "Enter a valid email address.", "Introduce una dirección de correo válida."),
    short: t("Ton mot de passe doit faire au moins 6 caractères.", "Your password must be at least 6 characters.", "Tu contraseña debe tener al menos 6 caracteres."),
    long: t(`Ton mot de passe ne doit pas dépasser ${MAX_PASSWORD} caractères.`, `Your password can't be longer than ${MAX_PASSWORD} characters.`, `Tu contraseña no puede superar los ${MAX_PASSWORD} caracteres.`),
    exists: t("Cette adresse a déjà un compte. Connecte-toi.", "This email already has an account. Log in instead.", "Este correo ya tiene una cuenta. Inicia sesión."),
    existsGoogle: t("Cette adresse a déjà un compte créé avec Google : clique sur « Continuer avec Google ».", "This email already has an account created with Google: click “Continue with Google”.", "Este correo ya tiene una cuenta creada con Google: haz clic en «Continuar con Google»."),
    wrong: t("E-mail ou mot de passe incorrect.", "Incorrect email or password.", "Correo o contraseña incorrectos."),
    useGoogle: t("Ce compte se connecte avec Google : clique sur « Continuer avec Google ». Tu peux aussi choisir un mot de passe avec « Mot de passe oublié ? ».", "This account logs in with Google: click “Continue with Google”. You can also set a password with “Forgot password?”.", "Esta cuenta inicia sesión con Google: haz clic en «Continuar con Google». También puedes elegir una contraseña con «¿Has olvidado tu contraseña?»."),
    mailOff: t(`L'envoi d'e-mails n'est pas encore activé sur Basketlog : écris-nous à ${CONTACT} depuis ton adresse, on t'aide tout de suite.`, `Basketlog can't send emails yet: write to us at ${CONTACT} from your address and we'll help you right away.`, `Basketlog todavía no puede enviar correos: escríbenos a ${CONTACT} desde tu dirección y te ayudamos enseguida.`),
    mailFail: t("L'envoi de l'e-mail a échoué. Réessaie dans un instant.", "Sending the email failed. Please try again in a moment.", "El envío del correo ha fallado. Inténtalo de nuevo en un instante."),
    sent: t("Si un compte existe avec cette adresse, tu vas recevoir un e-mail avec un lien pour choisir un nouveau mot de passe (pense à regarder dans les spams).", "If an account exists with this email, you'll receive an email with a link to choose a new password (check your spam folder too).", "Si existe una cuenta con este correo, recibirás un correo con un enlace para elegir una nueva contraseña (revisa también la carpeta de spam)."),
    linkInvalid: t("Ce lien n'est plus valable : il a déjà servi ou il a expiré. Demande un nouveau lien.", "This link is no longer valid: it has already been used or has expired. Ask for a new link.", "Este enlace ya no es válido: ya se ha usado o ha caducado. Pide un enlace nuevo."),
    unknown: t("Action inconnue.", "Unknown action.", "Acción desconocida."),
  };
}

const json = (body, status = 200, session = null) => {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (session) {
    const value = encodeSession(session);
    if (value) res.cookies.set(COOKIE, value, cookieOptions);
  }
  return res;
};
const err = (error, status = 400, extra = {}) => json({ ok: false, error, ...extra }, status);
const langOf = (v) => (v === "en" || v === "es" ? v : "fr");

// Erreur de la base : script pas encore lancé (503 « bientôt »), sinon base injoignable.
function dbFail(M, e, where) {
  console.warn(`[comptes] ${where} : ${String(e?.message || e).slice(0, 200)}`);
  return comptesNotInstalled(e) ? err(M.notReady, 503) : err(M.dbDown, 503);
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return err("Requête invalide / Invalid request.", 400); }
  if (!body || typeof body !== "object") return err("Requête invalide / Invalid request.", 400);
  const lang = langOf(body.lang);
  const M = messages(lang);
  if (!sameOrigin(req.headers)) return err(M.refused, 403);
  if (!comptesConfigured()) return err(M.notReady, 503);
  const ip = clientIp(req.headers);

  switch (body.action) {
    case "inscription": {
      if (body.site) return err(M.refused, 400); // champ invisible rempli : robot
      const email = normEmail(body.email);
      if (!email) return err(M.email, 400, { field: "email" });
      const pb = passwordProblem(body.mdp);
      if (pb) return err(pb === "court" ? M.short : M.long, 400, { field: "mdp" });
      if (!(await allowed("inscription-ip", ip, 10, 60)) || !(await allowed("inscription", email, 5, 60))) return err(M.many, 429);
      let r;
      try {
        r = await inscrire(email, await hashPassword(body.mdp), lang, false);
      } catch (e) {
        return dbFail(M, e, "inscription");
      }
      if (!r?.ok) {
        if (r?.reason === "existe") return err(r.google ? M.existsGoogle : M.exists, 409, { field: "email", existe: true, google: !!r.google });
        return err(M.email, 400, { field: "email" });
      }
      console.log("[comptes] nouveau compte (e-mail)");
      return json({ ok: true, nouveau: true }, 200, accountSession({ id: r.id, email: r.email, nom: null, whop_uid: null, sv: r.sv }));
    }

    case "connexion": {
      const email = normEmail(body.email);
      const mdp = typeof body.mdp === "string" ? body.mdp : "";
      if (!email || !mdp) return err(M.wrong, 401);
      if (!(await allowed("connexion-ip", ip, 40, 15)) || !(await allowed("connexion", email, 10, 15))) return err(M.many, 429);
      let c;
      try {
        c = await compteParEmail(email);
      } catch (e) {
        return dbFail(M, e, "connexion");
      }
      if (!c?.id) {
        await fakeVerify(mdp);
        return err(M.wrong, 401);
      }
      if (!c.mdp) {
        await fakeVerify(mdp);
        return c.google ? err(M.useGoogle, 401, { google: true }) : err(M.wrong, 401);
      }
      if (!(await verifyPassword(mdp, c.mdp))) return err(M.wrong, 401);
      await compteVu(c.id);
      return json({ ok: true }, 200, await freshAccountSession(c));
    }

    case "oubli": {
      const email = normEmail(body.email);
      if (!email) return err(M.email, 400, { field: "email" });
      if (!(await allowed("oubli-ip", ip, 10, 60))) return err(M.many, 429);
      if (!mailReady()) return err(M.mailOff, 503, { contact: CONTACT });
      // Au-delà de 3 demandes par heure pour une même adresse : même réponse, sans nouvel e-mail.
      if (!(await allowed("oubli", email, 3, 60))) return json({ ok: true, message: M.sent });
      const token = newResetToken();
      let r;
      try {
        r = await creerReinit(email, tokenHash(token), RESET_MINUTES);
      } catch (e) {
        return dbFail(M, e, "mot de passe oublié");
      }
      if (r?.email) {
        const l = r.langue === "en" || r.langue === "es" ? r.langue : lang;
        const link = `${SITE}${l === "fr" ? "" : `/${l}`}/reinitialiser#${token}`;
        try {
          await sendMail({ to: r.email, ...resetEmail({ lang: l, link, name: r.nom || null, minutes: RESET_MINUTES }) });
          console.log("[comptes] lien « mot de passe oublié » envoyé");
        } catch (e) {
          console.warn(`[comptes] e-mail non envoyé : ${String(e?.message || e).slice(0, 200)}`);
          return err(M.mailFail, 502);
        }
      }
      return json({ ok: true, message: M.sent });
    }

    case "verifier": {
      const jeton = typeof body.jeton === "string" ? body.jeton : "";
      if (!RESET_TOKEN_RE.test(jeton)) return json({ ok: true, valide: false });
      if (!(await allowed("reinit-lecture", ip, 60, 60))) return err(M.many, 429);
      try {
        return json({ ok: true, valide: await reinitValide(tokenHash(jeton)) });
      } catch (e) {
        return dbFail(M, e, "lien de réinitialisation");
      }
    }

    case "reinit": {
      const jeton = typeof body.jeton === "string" ? body.jeton : "";
      if (!RESET_TOKEN_RE.test(jeton)) return err(M.linkInvalid, 400);
      const pb = passwordProblem(body.mdp);
      if (pb) return err(pb === "court" ? M.short : M.long, 400, { field: "mdp" });
      if (!(await allowed("reinit-ip", ip, 20, 60))) return err(M.many, 429);
      let r;
      try {
        r = await utiliserReinit(tokenHash(jeton), await hashPassword(body.mdp));
      } catch (e) {
        return dbFail(M, e, "nouveau mot de passe");
      }
      if (!r?.ok) return err(M.linkInvalid, 400);
      console.log("[comptes] mot de passe changé par lien e-mail");
      return json({ ok: true }, 200, await freshAccountSession({ id: r.id, email: r.email, nom: r.nom, whop_uid: r.whop_uid, sv: r.sv }));
    }

    default:
      return err(M.unknown, 400);
  }
}
