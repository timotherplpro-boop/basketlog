import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, currentSession } from "../../../lib/pro";
import { mk } from "../../../lib/i18n";
import { creatorEarnings, readCreator } from "../../../lib/creator-stats";
import { demoReport } from "../../../lib/creator-demo";
import { creatorView } from "../../../lib/creator-report";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// « Mes gains » : combien de personnes ont utilisé le code promo du créateur connecté, sur quelle formule, et ce que cela lui rapporte
// (euros et dollars à part), lu chez Whop. Réservé aux créateurs : le rôle et les codes viennent de la base à partir du cookie signé,
// jamais de la requête, donc un créateur ne peut lire que ses propres chiffres. Aucun nom ni e-mail d'abonné ne sort d'ici, ni ce que les
// abonnés ont payé ni le montant hors TVA : le créateur ne reçoit que ses gains (creatorView).
// La lecture chez Whop est faite une fois pour tous les créateurs et gardée 60 s (lib/creator-stats.js) ; en plus, chaque compte est
// limité à 40 lectures par tranche de 10 minutes, ce qui laisse la place à l'actualisation automatique de la page (1 par minute).

const json = (body, status = 200, cookie = null) => {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (cookie) res.cookies.set(COOKIE, cookie, cookieOptions);
  return res;
};
const err = (error, status = 400) => json({ ok: false, error }, status);

const hits = new Map();
const MAX_READS = 40;
function tooMany(uid) {
  const now = Date.now();
  const list = (hits.get(uid) || []).filter((x) => now - x < 600e3);
  list.push(now);
  hits.set(uid, list);
  if (hits.size > 5000) hits.clear();
  return list.length > MAX_READS;
}

function messages(lang) {
  const { t } = mk(lang);
  return {
    login: t("Connecte-toi pour voir tes gains.", "Log in to see your earnings.", "Inicia sesión para ver tus ganancias."),
    gone: t("Ce compte n'existe plus. Reconnecte-toi.", "This account no longer exists. Please log in again.", "Esta cuenta ya no existe. Vuelve a iniciar sesión."),
    many: t("Trop de demandes, réessaie dans quelques minutes.", "Too many requests, please try again in a few minutes.", "Demasiadas solicitudes, inténtalo de nuevo en unos minutos."),
    forbidden: t("Cette rubrique est réservée aux créateurs.", "This section is reserved for creators.", "Esta sección está reservada a los creadores."),
    notReady: t("Cette fonction sera activée très bientôt.", "This feature will be turned on very soon.", "Esta función se activará muy pronto."),
    dbDown: t("Base momentanément injoignable, réessaie dans un instant.", "The database is temporarily unreachable, please try again in a moment.", "La base de datos no está accesible por el momento, inténtalo de nuevo en un instante."),
    whopDown: t("Whop ne répond pas pour le moment, réessaie dans un instant.", "Whop isn't responding right now, please try again in a moment.", "Whop no responde por ahora, inténtalo de nuevo en un instante."),
    whopNoKey: t("Le service d'abonnement n'est pas configuré sur le site : écris-nous à contact@basketlog-app.com.", "The subscription service isn't set up on the site: write to us at contact@basketlog-app.com.", "El servicio de suscripción no está configurado en el sitio: escríbenos a contact@basketlog-app.com."),
  };
}

export async function GET(req) {
  const M = messages(new URL(req.url).searchParams.get("lang"));
  const { session, refreshed, cleared } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) {
    const res = err(cleared ? M.gone : M.login, 401);
    if (cleared) res.cookies.delete({ name: COOKIE, path: "/" });
    return res;
  }
  if (tooMany(session.uid)) return err(M.many, 429);
  // Un admin qui regarde le site « en tant que » créateur n'a aucun chiffre réel à voir : il reçoit un aperçu avec des chiffres d'exemple
  // inventés (marqués « demo »), calculés comme les vrais, sans lecture chez Whop.
  if (session.preview) return json({ ok: true, demo: true, ...creatorView(demoReport()) }, 200, refreshed);

  const creator = await readCreator(session.uid);
  if (!creator.installed) return err(M.notReady, 503);
  if (creator.unreachable) return err(M.dbDown, 503);
  // Un administrateur qui ouvre la rubrique voit la même chose : l'aperçu avec chiffres d'exemple (jamais ceux d'un vrai créateur).
  if (creator.role === "admin") return json({ ok: true, demo: true, ...creatorView(demoReport()) }, 200, refreshed);
  if (creator.role !== "createur") return err(M.forbidden, 403);

  try {
    const report = await creatorEarnings(creator.codes);
    return json({ ok: true, ...creatorView(report) }, 200, refreshed);
  } catch (e) {
    console.warn(`[gains] lecture Whop impossible : ${String(e?.message || e).slice(0, 200)}`);
    return e?.status === "sans clé" ? err(M.whopNoKey, 503) : err(M.whopDown, 503);
  }
}
