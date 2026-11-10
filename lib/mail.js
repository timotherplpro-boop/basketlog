// E-mails du site (lien « mot de passe oublié »), envoyés avec Resend (https://resend.com).
// Réglages Vercel : RESEND_API_KEY (la même clé que la newsletter du dimanche) et, au besoin, MAIL_FROM (par défaut
// « Basketlog <compte@basketlog-app.com> », sur le domaine basketlog-app.com vérifié chez Resend). Sans clé, le site dit
// d'écrire à contact@basketlog-app.com au lieu d'envoyer l'e-mail.

export const CONTACT = "contact@basketlog-app.com";
export const MAIL_FROM_DEFAULT = "Basketlog <compte@basketlog-app.com>";
export const mailReady = () => !!(process.env.RESEND_API_KEY || "").trim();
const mailFrom = () => (process.env.MAIL_FROM || "").trim() || MAIL_FROM_DEFAULT;

export async function sendMail({ to, subject, html, text }, fetchImpl = fetch) {
  if (!mailReady()) throw new Error("envoi d'e-mails non configuré");
  const r = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY.trim()}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: mailFrom(), to: [to], subject, html, text, reply_to: CONTACT }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}`);
  return r.json().catch(() => ({}));
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// E-mail « mot de passe oublié » (français, anglais ou espagnol) : { subject, html, text }.
export function resetEmail({ lang = "fr", link, name = null, minutes = 60 }) {
  const T = {
    fr: {
      subject: "Ton lien pour choisir un nouveau mot de passe Basketlog",
      hello: name ? `Bonjour ${name},` : "Bonjour,",
      body: "Tu as demandé à changer le mot de passe de ton compte Basketlog. Clique sur le bouton ci-dessous pour en choisir un nouveau :",
      cta: "Choisir un nouveau mot de passe",
      valid: `Ce lien est valable ${minutes} minutes et ne sert qu'une fois.`,
      ignore: "Tu n'as rien demandé ? Ignore cet e-mail : ton mot de passe ne change pas.",
      copy: "Le bouton ne marche pas ? Copie ce lien dans ton navigateur :",
      sign: "L'équipe Basketlog",
    },
    en: {
      subject: "Your link to choose a new Basketlog password",
      hello: name ? `Hi ${name},` : "Hi,",
      body: "You asked to change the password of your Basketlog account. Click the button below to choose a new one:",
      cta: "Choose a new password",
      valid: `This link is valid for ${minutes} minutes and can only be used once.`,
      ignore: "Didn't ask for this? Ignore this email: your password stays the same.",
      copy: "Button not working? Copy this link into your browser:",
      sign: "The Basketlog team",
    },
    es: {
      subject: "Tu enlace para elegir una nueva contraseña de Basketlog",
      hello: name ? `Hola, ${name}:` : "Hola:",
      body: "Has pedido cambiar la contraseña de tu cuenta de Basketlog. Haz clic en el botón de abajo para elegir una nueva:",
      cta: "Elegir una nueva contraseña",
      valid: `Este enlace es válido durante ${minutes} minutos y solo se puede usar una vez.`,
      ignore: "¿No lo has pedido tú? Ignora este correo: tu contraseña no cambia.",
      copy: "¿El botón no funciona? Copia este enlace en tu navegador:",
      sign: "El equipo de Basketlog",
    },
  }[lang === "en" || lang === "es" ? lang : "fr"];
  const html = `<!doctype html><html lang="${lang === "en" || lang === "es" ? lang : "fr"}"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14161c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:-.3px;padding-bottom:18px">🏀 Basketlog</td></tr>
<tr><td style="font-size:16px;line-height:1.55">
<p style="margin:0 0 14px">${esc(T.hello)}</p>
<p style="margin:0 0 22px">${esc(T.body)}</p>
<p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">${esc(T.cta)}</a></p>
<p style="margin:0 0 10px;color:#4b5160;font-size:14px">${esc(T.valid)}</p>
<p style="margin:0 0 22px;color:#4b5160;font-size:14px">${esc(T.ignore)}</p>
<p style="margin:0 0 6px;color:#6b7180;font-size:12px">${esc(T.copy)}</p>
<p style="margin:0 0 22px;font-size:12px;word-break:break-all"><a href="${esc(link)}" style="color:#4b5160">${esc(link)}</a></p>
<p style="margin:0;font-size:14px">${esc(T.sign)} · <a href="mailto:${CONTACT}" style="color:#4b5160">${CONTACT}</a></p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${T.hello}\n\n${T.body}\n${link}\n\n${T.valid}\n${T.ignore}\n\n${T.sign} · ${CONTACT}`;
  return { subject: T.subject, html, text };
}

// E-mail « Confirme ton inscription à la newsletter » (français, anglais ou espagnol) : { subject, html, text }.
// Envoyé à l'adresse d'un compte Basketlog dont l'adresse n'est pas encore prouvée ; le lien ouvre la page de confirmation
// (lib/newsletter-confirm.js). Rien n'est envoyé ensuite tant que le bouton de cette page n'a pas été cliqué.
export function confirmEmail({ lang = "fr", link, hours = 48 }) {
  const T = {
    fr: {
      subject: "Confirme ton inscription à la newsletter Basketlog",
      hello: "Bonjour,",
      body: "Tu as demandé à recevoir la newsletter Basketlog chaque dimanche à 18 h (heure de Paris) : le bilan des 7 derniers jours et les matchs à confiance très élevée de la semaine. Pour confirmer que cette adresse est bien la tienne, clique sur le bouton ci-dessous :",
      cta: "Je confirme mon inscription",
      valid: `Ce lien est valable ${hours} heures. Tant que tu n'as pas confirmé, rien ne t'est envoyé.`,
      ignore: "Tu n'as rien demandé ? Ignore simplement cet e-mail : aucune inscription n'est faite et tu ne recevras rien.",
      copy: "Le bouton ne marche pas ? Copie ce lien dans ton navigateur :",
      sign: "L'équipe Basketlog",
    },
    en: {
      subject: "Confirm your Basketlog newsletter signup",
      hello: "Hi,",
      body: "You asked to receive the Basketlog newsletter every Sunday at 6 pm (Paris time): the record of the last 7 days and the week's very-high-confidence games. To confirm that this address is yours, click the button below:",
      cta: "Confirm my signup",
      valid: `This link is valid for ${hours} hours. Until you confirm, nothing is sent to you.`,
      ignore: "Didn't ask for this? Just ignore this email: no signup is made and you won't receive anything.",
      copy: "Button not working? Copy this link into your browser:",
      sign: "The Basketlog team",
    },
    es: {
      subject: "Confirma tu suscripción a la newsletter de Basketlog",
      hello: "Hola:",
      body: "Has pedido recibir la newsletter de Basketlog cada domingo a las 18:00 (hora de París): el balance de los últimos 7 días y los partidos de confianza muy alta de la semana. Para confirmar que esta dirección es tuya, haz clic en el botón de abajo:",
      cta: "Confirmo mi suscripción",
      valid: `Este enlace es válido durante ${hours} horas. Mientras no confirmes, no se te envía nada.`,
      ignore: "¿No lo has pedido tú? Ignora este correo: no se hace ninguna suscripción y no recibirás nada.",
      copy: "¿El botón no funciona? Copia este enlace en tu navegador:",
      sign: "El equipo de Basketlog",
    },
  }[lang === "en" || lang === "es" ? lang : "fr"];
  const html = `<!doctype html><html lang="${lang === "en" || lang === "es" ? lang : "fr"}"><body style="margin:0;padding:24px;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#14161c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;padding:32px">
<tr><td style="font-size:22px;font-weight:800;letter-spacing:-.3px;padding-bottom:18px">🏀 Basketlog</td></tr>
<tr><td style="font-size:16px;line-height:1.55">
<p style="margin:0 0 14px">${esc(T.hello)}</p>
<p style="margin:0 0 22px">${esc(T.body)}</p>
<p style="margin:0 0 22px"><a href="${esc(link)}" style="display:inline-block;background:#ff7a1a;color:#ffffff;text-decoration:none;font-weight:700;padding:13px 22px;border-radius:10px">${esc(T.cta)}</a></p>
<p style="margin:0 0 10px;color:#4b5160;font-size:14px">${esc(T.valid)}</p>
<p style="margin:0 0 22px;color:#4b5160;font-size:14px">${esc(T.ignore)}</p>
<p style="margin:0 0 6px;color:#6b7180;font-size:12px">${esc(T.copy)}</p>
<p style="margin:0 0 22px;font-size:12px;word-break:break-all"><a href="${esc(link)}" style="color:#4b5160">${esc(link)}</a></p>
<p style="margin:0;font-size:14px">${esc(T.sign)} · <a href="mailto:${CONTACT}" style="color:#4b5160">${CONTACT}</a></p>
</td></tr></table></td></tr></table></body></html>`;
  const text = `${T.hello}\n\n${T.body}\n${link}\n\n${T.valid}\n${T.ignore}\n\n${T.sign} · ${CONTACT}`;
  return { subject: T.subject, html, text };
}
