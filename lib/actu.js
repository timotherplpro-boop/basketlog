import crypto from "node:crypto";

// « Actu du jour » publiée chaque jour sur les réseaux (demande de Tim, 26/11/2026 21 h 45 : un visuel fait par IA
// sur l'actualité, sur chaque réseau). Sans base de données : titre, texte et adresse de l'image source tiennent dans
// un jeton signé (clé SESSION_SECRET, préfixe « actu: »), que seul un compte admin peut fabriquer (api/cron/social?actu=1).
// Le jeton sert à la page /actu?k=… (aperçu X et LinkedIn) et aux images /api/og/actu?k=…&f=og|portrait|thumb.
// Même logique que lib/pro.js : SESSION_SECRET si défini, sinon clé dérivée de la clé API Whop (jamais exposée).
const SECRET = process.env.SESSION_SECRET
  || (process.env.WHOP_API_KEY ? crypto.createHash("sha256").update(`basketlog-actu:${process.env.WHOP_API_KEY}`).digest("hex") : "");
const mac = (data) => crypto.createHmac("sha256", SECRET).update(`actu:${data}`).digest("base64url").slice(0, 24);

export function actuToken({ t, x = "", i, d, w = "", n = "", m = "", c = "", l = "" }) {
  if (!SECRET) throw new Error("clé de signature manquante");
  // Image de fond facultative depuis la version « stats » (sans joueur) ; si elle est donnée, adresse https.
  if (i && !/^https:\/\//.test(String(i))) throw new Error("image : adresse https attendue");
  const body = { t: String(t || "").trim().slice(0, 110), x: String(x || "").trim().slice(0, 700), i: i ? String(i) : "", d: d || new Date().toISOString().slice(0, 10) };
  // Champs du visuel version 2 (facultatifs) : w joueur ou équipe, n stats « 44 PTS|16 REB », m score « A|111|116|B », c couleurs, l étiquette.
  for (const [key, val, max] of [["w", w, 40], ["n", n, 60], ["m", m, 80], ["c", c, 20], ["l", l, 28]]) {
    const v = String(val || "").trim().slice(0, max);
    if (v) body[key] = v;
  }
  if (!body.t) throw new Error("titre manquant");
  const data = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${data}.${mac(data)}`;
}

export function readActu(token) {
  if (!SECRET || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const want = Buffer.from(mac(data));
  const got = Buffer.from(String(sig || ""));
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const a = JSON.parse(Buffer.from(data, "base64url").toString());
    return a && a.t && (!a.i || /^https:\/\//.test(a.i)) ? a : null;
  } catch {
    return null;
  }
}

export const ACTU_SITE = "https://basketlog-app.com";
export const actuUrls = (k) => {
  const q = encodeURIComponent(k);
  return {
    page: `${ACTU_SITE}/actu?k=${q}`,
    og: `${ACTU_SITE}/api/og/actu?k=${q}&f=og`,
    portrait: `${ACTU_SITE}/api/og/actu?k=${q}&f=portrait`,
    thumb: `${ACTU_SITE}/api/og/actu?k=${q}&f=thumb`,
  };
};
