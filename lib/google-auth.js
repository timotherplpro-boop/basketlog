// « Continuer avec Google » : connexion OAuth classique, par redirection (aucun script Google chargé sur les pages de
// Basketlog). Le bouton mène à /api/auth/google, qui envoie le visiteur choisir son compte chez Google ; Google le renvoie
// sur /api/auth/google/retour avec un code, que le serveur échange directement auprès de Google (avec le secret du site)
// contre l'identité du compte : identifiant Google, adresse e-mail (et si Google l'a vérifiée), prénom.
// Réglages Vercel : GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET (Google Cloud > API et services > Identifiants >
// ID client OAuth « Application Web », URI de redirection autorisé : https://basketlog-app.com/api/auth/google/retour).

export const googleClientId = () => (process.env.GOOGLE_CLIENT_ID || "").trim();
const googleSecret = () => (process.env.GOOGLE_CLIENT_SECRET || "").trim();
export const googleReady = () => !!(googleClientId() && googleSecret());

export const GOOGLE_AUTHORIZE = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN = "https://oauth2.googleapis.com/token";

export class GoogleAuthError extends Error {
  constructor(kind, detail = "") {
    super(detail ? `${kind} : ${detail}` : kind);
    this.kind = kind; // config | invalid | audience | down
  }
}

// Adresse de la page Google « Choisis un compte ».
export function googleAuthUrl({ redirectUri, state, challenge, nonce, lang = "fr", clientId = googleClientId() }) {
  const u = new URL(GOOGLE_AUTHORIZE);
  u.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
    hl: lang === "en" || lang === "es" ? lang : "fr",
  }).toString();
  return u.toString();
}

// Identité contenue dans le jeton d'identité reçu DIRECTEMENT de Google (requête serveur à serveur en HTTPS) :
// on vérifie l'émetteur, le destinataire (notre identifiant client), la date d'expiration et le nonce de la demande.
export function readIdToken(idToken, { clientId = googleClientId(), nonce = null, now = Date.now() } = {}) {
  const parts = typeof idToken === "string" ? idToken.split(".") : [];
  if (parts.length !== 3) throw new GoogleAuthError("invalid", "jeton d'identité mal formé");
  let p;
  try {
    p = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
  } catch {
    throw new GoogleAuthError("invalid", "jeton d'identité illisible");
  }
  if (p.iss !== "https://accounts.google.com" && p.iss !== "accounts.google.com") throw new GoogleAuthError("invalid", "émetteur inattendu");
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!clientId || !aud.includes(clientId)) throw new GoogleAuthError("audience", "jeton émis pour un autre site");
  if (!(Number(p.exp) * 1000 > now - 60e3)) throw new GoogleAuthError("invalid", "jeton expiré");
  if (nonce && p.nonce !== nonce) throw new GoogleAuthError("invalid", "nonce différent");
  if (!p.sub || typeof p.email !== "string" || !p.email.includes("@")) throw new GoogleAuthError("invalid", "adresse e-mail absente");
  const name = String(p.given_name || p.name || "").trim().slice(0, 80) || null;
  return { sub: String(p.sub), email: p.email.trim().toLowerCase(), verified: p.email_verified === true || p.email_verified === "true", name };
}

// Échange du code reçu au retour de Google contre le jeton d'identité.
export async function exchangeCode({ code, verifier, redirectUri }, { fetchImpl = fetch } = {}) {
  if (!googleReady()) throw new GoogleAuthError("config");
  if (typeof code !== "string" || code.length < 10 || code.length > 2048) throw new GoogleAuthError("invalid", "code absent");
  let r;
  try {
    r = await fetchImpl(GOOGLE_TOKEN, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleClientId(),
        client_secret: googleSecret(),
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier,
      }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch (e) {
    throw new GoogleAuthError("down", String(e?.message || e).slice(0, 120));
  }
  if (r.status === 400 || r.status === 401) throw new GoogleAuthError("invalid", `token ${r.status}`);
  if (!r.ok) throw new GoogleAuthError("down", `token ${r.status}`);
  const j = await r.json().catch(() => null);
  if (!j?.id_token) throw new GoogleAuthError("invalid", "pas de jeton d'identité");
  return j.id_token;
}
