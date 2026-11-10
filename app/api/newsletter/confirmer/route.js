import { newsletterKey } from "../../../../lib/pro";
import { mk } from "../../../../lib/i18n";
import { maskEmail, newsletterConfig, resend } from "../../../../lib/resend";
import { allowed, getCompte } from "../../../../lib/comptes";
import { clientIp, sameOrigin } from "../../../../lib/auth-utils";
import { CONFIRM_TOKEN_RE, checkConfirmation } from "../../../../lib/newsletter-confirm";
import { err, fail, json, messages } from "../../../../lib/newsletter-http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Page « Confirme ton inscription » (…/newsletter/confirmer#<jeton>), ouverte depuis l'e-mail envoyé à un compte Basketlog dont
// l'adresse n'était pas encore prouvée (lib/newsletter-confirm.js) :
//   POST { action: "verifier", jeton, lang }   le lien est-il valable ? → { ok, valide, email (masquée) }
//   POST { action: "confirmer", jeton, lang }  inscrit l'adresse du compte à la newsletter (consentement chez Resend)
// Aucune session n'est demandée : l'e-mail reçu prouve que la personne a accès à la boîte (on peut l'ouvrir sur un autre appareil).
// Le jeton est signé, lié au compte et à son adresse, et il expire au bout de 48 h ; il ne permet qu'une chose : inscrire cette adresse.
// La simple ouverture de la page ne change rien (un antivirus ou un aperçu de messagerie qui suit le lien n'inscrit personne) :
// seul le clic sur le bouton envoie « confirmer ».
export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return err("Requête invalide / Invalid request.", 400); }
  const lang = mk(body?.lang).lang;
  const M = messages(lang);
  if (!sameOrigin(req.headers)) return err(M.refused, 403);
  const action = body?.action;
  if (action !== "verifier" && action !== "confirmer") return err(M.unknown, 400);
  const jeton = typeof body.jeton === "string" ? body.jeton.trim() : "";
  if (!CONFIRM_TOKEN_RE.test(jeton)) return action === "verifier" ? json({ ok: true, valide: false }) : err(M.linkInvalid, 400);

  const cfg = newsletterConfig();
  if (!cfg.enabled) return err(M.notReady, 503); // newsletter fermée (plus de clé Resend, ou interrupteur éteint)
  const ip = clientIp(req.headers);
  if (!(await allowed(action === "verifier" ? "nl-lien-lecture" : "nl-lien-confirmer", ip, action === "verifier" ? 60 : 20, 60))) return err(M.many, 429);

  let c;
  try {
    c = await checkConfirmation(jeton, { key: newsletterKey(), fiche: getCompte });
  } catch (e) {
    console.warn(`[newsletter] lien de confirmation : ${String(e?.message || e).slice(0, 200)}`);
    return err(M.down, 503);
  }
  if (!c.ok) return action === "verifier" ? json({ ok: true, valide: false }) : err(M.linkInvalid, 400);
  if (!cfg.langs.includes(c.lang)) return err(M.notReady, 503); // newsletter pas encore ouverte dans la langue du lien

  if (action === "verifier") return json({ ok: true, valide: true, email: maskEmail(c.email) });
  try {
    await resend().subscribe(c.email, c.lang);
    console.log(`[newsletter] inscription confirmée par e-mail (${c.lang})`);
    return json({ ok: true, subscribed: true, email: maskEmail(c.email) });
  } catch (e) {
    return fail(M, e);
  }
}
