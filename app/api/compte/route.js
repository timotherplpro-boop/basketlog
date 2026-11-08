import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { COOKIE, cookieOptions, currentSession, encodeSession } from "../../../lib/pro";
import { dbRpc, getRole, getRoleInfo, profileNotInstalled, rolesConfigured } from "../../../lib/roles";
import { mk } from "../../../lib/i18n";
import { DELETE_WORDS, cleanName, deleteConfirmed, renewing } from "../../../lib/account";
import { cancelMembership, listMemberships, listPlans, resumeMembership, whopAccountReady } from "../../../lib/whop-account";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// « Mon compte » : lecture de l'état du compte (prénom, abonnements) et quatre actions du membre connecté :
//   nom (choisir son prénom), resilier (arrêt en fin de période), reprendre (annuler la résiliation), supprimer (effacer son compte).
// Le membre n'agit que sur son propre compte : l'identifiant vient du cookie signé, jamais de la requête, et chaque abonnement
// est relu chez Whop pour vérifier qu'il lui appartient (lib/whop-account.js).

const json = (body, status = 200, cookie = null) => {
  const res = NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  if (cookie) res.cookies.set(COOKIE, cookie, cookieOptions);
  return res;
};
const err = (error, status = 400, extra = {}) => json({ ok: false, error, ...extra }, status);

// Les requêtes d'écriture doivent venir de notre propre site (en plus du cookie SameSite=Lax).
function sameOrigin(req) {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === (req.headers.get("x-forwarded-host") || req.headers.get("host"));
  } catch {
    return false;
  }
}

// Limite simple par compte : l'instance se souvient des demandes des 10 dernières minutes (lectures et actions comptées à part).
// Les lectures interrogent Whop à chaque fois : sans limite, un seul compte pourrait épuiser le quota de la clé API du site.
const hits = new Map();
function tooMany(uid, kind, max) {
  const key = `${kind}:${uid}`;
  const now = Date.now();
  const list = (hits.get(key) || []).filter((x) => now - x < 600e3);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}
const MAX_READS = 60;
const MAX_ACTIONS = 30;

// Prénom choisi : { installed, nom, unreachable }. installed est faux tant que supabase/compte.sql n'a pas été lancé.
async function readProfile(uid) {
  if (!rolesConfigured()) return { installed: false, nom: null };
  try {
    const r = await dbRpc("basketlog_profil_get", { p_uid: uid });
    return { installed: true, nom: typeof r === "string" && r.trim() ? r.trim().slice(0, 40) : null };
  } catch (e) {
    return profileNotInstalled(e) ? { installed: false, nom: null } : { installed: true, nom: null, unreachable: true };
  }
}

function messages(lang) {
  const { t } = mk(lang);
  return {
    login: t("Connecte-toi pour accéder à ton compte.", "Log in to access your account.", "Inicia sesión para acceder a tu cuenta."),
    refused: t("Requête refusée.", "Request refused.", "Solicitud rechazada."),
    many: t("Trop de demandes, réessaie dans quelques minutes.", "Too many requests, please try again in a few minutes.", "Demasiadas solicitudes, inténtalo de nuevo en unos minutos."),
    preview: t("Tu es en mode aperçu : quitte l'aperçu pour modifier ton compte.", "You're in preview mode: leave the preview to change your account.", "Estás en modo vista previa: sal de la vista previa para modificar tu cuenta."),
    nameShort: t("Ton prénom doit faire au moins 2 caractères.", "Your name must be at least 2 characters.", "Tu nombre debe tener al menos 2 caracteres."),
    nameLong: t("40 caractères au maximum.", "40 characters maximum.", "Máximo 40 caracteres."),
    nameInvalid: t("Ce prénom n'est pas valide (ni lien, ni balise).", "This name isn't valid (no links or tags).", "Este nombre no es válido (sin enlaces ni etiquetas)."),
    notReady: t("Cette fonction sera activée très bientôt.", "This feature will be turned on very soon.", "Esta función se activará muy pronto."),
    dbDown: t("Base momentanément injoignable, réessaie dans un instant.", "The database is temporarily unreachable, please try again in a moment.", "La base de datos no está accesible por el momento, inténtalo de nuevo en un instante."),
    whopDown: t("Whop ne répond pas pour le moment, réessaie dans un instant.", "Whop isn't responding right now, please try again in a moment.", "Whop no responde por ahora, inténtalo de nuevo en un instante."),
    whopNoKey: t("Le service d'abonnement n'est pas configuré sur le site : écris-nous à contact@basketlog-app.com.", "The subscription service isn't set up on the site: write to us at contact@basketlog-app.com.", "El servicio de suscripción no está configurado en el sitio: escríbenos a contact@basketlog-app.com."),
    whopScope: t("Whop a refusé l'opération. Écris-nous à contact@basketlog-app.com, on s'en occupe tout de suite.", "Whop refused the operation. Write to us at contact@basketlog-app.com and we'll take care of it right away.", "Whop ha rechazado la operación. Escríbenos a contact@basketlog-app.com y nos ocupamos enseguida."),
    notFound: t("Abonnement introuvable.", "Subscription not found.", "Suscripción no encontrada."),
    inactive: t("Cet abonnement n'est plus en cours : rien à modifier.", "This subscription is no longer active: nothing to change.", "Esta suscripción ya no está activa: no hay nada que modificar."),
    cantResume: t("Cet abonnement ne peut plus être repris. Prends-en un nouveau depuis la page des formules.", "This subscription can no longer be resumed. Get a new one from the plans page.", "Esta suscripción ya no se puede reanudar. Contrata una nueva desde la página de planes."),
    whopRefused: t("Whop a refusé l'opération. Réessaie, ou fais-le depuis ta page de commandes Whop.", "Whop refused the operation. Try again, or do it from your Whop orders page.", "Whop ha rechazado la operación. Inténtalo de nuevo, o hazlo desde tu página de pedidos de Whop."),
    unconfirmed: t("Whop n'a pas confirmé le changement. Vérifie l'état de ton abonnement sur ta page de commandes Whop avant de réessayer.", "Whop didn't confirm the change. Check your subscription's status on your Whop orders page before trying again.", "Whop no ha confirmado el cambio. Comprueba el estado de tu suscripción en tu página de pedidos de Whop antes de volver a intentarlo."),
    word: t(`Recopie le mot ${DELETE_WORDS.fr} pour confirmer.`, `Type the word ${DELETE_WORDS.en} to confirm.`, `Escribe la palabra ${DELETE_WORDS.es} para confirmar.`),
    role: t("Les comptes admin et créateur ne se suppriment pas ici : écris-nous à contact@basketlog-app.com.", "Admin and creator accounts can't be deleted here: write to us at contact@basketlog-app.com.", "Las cuentas de administrador y de creador no se eliminan aquí: escríbenos a contact@basketlog-app.com."),
    half: (n) => t(
      `${n > 1 ? "Tes abonnements sont arrêtés" : "Ton abonnement est arrêté"} (plus aucun renouvellement), mais l'effacement de tes données a échoué. Réessaie dans un instant.`,
      `${n > 1 ? "Your subscriptions are stopped" : "Your subscription is stopped"} (no further renewals), but erasing your data failed. Please try again in a moment.`,
      `${n > 1 ? "Tus suscripciones están detenidas" : "Tu suscripción está detenida"} (sin más renovaciones), pero ha fallado el borrado de tus datos. Inténtalo de nuevo en un instante.`
    ),
    unknown: t("Action inconnue.", "Unknown action.", "Acción desconocida."),
  };
}

// Réponse d'erreur pour un souci chez Whop (le détail technique reste dans les journaux du serveur, jamais dans la réponse).
function whopFail(M, e, { resume = false, ...extra } = {}) {
  console.warn(`[compte] Whop : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 300)}`);
  switch (e?.kind) {
    case "nokey": return err(M.whopNoKey, 503, extra);
    case "scope": return err(M.whopScope, 502, extra);
    case "notfound":
    case "forbidden": return err(M.notFound, 404, extra);
    case "inactive": return err(resume ? M.cantResume : M.inactive, 409, extra);
    case "invalid":
    case "conflict": return err(resume ? M.cantResume : M.whopRefused, 409, extra);
    case "unconfirmed": return err(M.unconfirmed, 502, extra);
    default: return err(M.whopDown, 503, extra);
  }
}

export async function GET(req) {
  const lang = new URL(req.url).searchParams.get("lang");
  const M = messages(lang);
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) return err(M.login, 401);
  if (tooMany(session.uid, "lecture", MAX_READS)) return err(M.many, 429);

  const preview = !!session.preview;
  const [plansRes, prof] = await Promise.all([
    whopAccountReady()
      ? listPlans(session.uid).then((plans) => ({ ok: true, plans }), (e) => { console.warn(`[compte] lecture des abonnements : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`); return { ok: false, plans: [] }; })
      : { ok: false, plans: [] },
    readProfile(session.uid),
  ]);
  const role = session.role || (session.admin ? "admin" : null);
  const writable = prof.installed && !prof.unreachable && !preview;
  return json(
    {
      ok: true,
      tier: session.tier || "compte",
      role,
      preview,
      name: { current: session.name || "", custom: prof.nom, whop: session.wname || null },
      whop: plansRes.ok,
      plans: plansRes.plans,
      can: { rename: writable, cancel: !preview && plansRes.ok, delete: writable && !role },
    },
    200,
    refreshed
  );
}

export async function POST(req) {
  let body;
  try { body = await req.json(); } catch { return err("Requête invalide / Invalid request.", 400); }
  const M = messages(body?.lang);
  if (!sameOrigin(req)) return err(M.refused, 403);

  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) return err(M.login, 401);
  if (session.preview) return err(M.preview, 403);
  const uid = session.uid;
  if (tooMany(uid, "action", MAX_ACTIONS)) return err(M.many, 429);

  switch (body.action) {
    case "nom": {
      const c = cleanName(body.nom);
      if (!c.ok) return err(c.reason === "court" ? M.nameShort : c.reason === "long" ? M.nameLong : M.nameInvalid, 400);
      try {
        await dbRpc("basketlog_profil_set", { p_uid: uid, p_nom: c.name });
      } catch (e) {
        return profileNotInstalled(e) ? err(M.notReady, 503) : err(M.dbDown, 502);
      }
      // Nom affiché : le prénom choisi ; s'il est effacé, le nom donné par l'admin (admin, créateur) ou celui du compte Whop.
      const wname = session.wname ?? session.name ?? "";
      let name = c.name;
      if (!name) {
        let given = null;
        try { given = (await getRoleInfo(uid))?.nom || null; } catch {}
        name = given || wname;
      }
      const value = encodeSession({ ...session, name, wname });
      return json({ ok: true, name: { current: name, custom: c.name || null, whop: wname || null } }, 200, value || refreshed);
    }

    case "resilier":
    case "reprendre": {
      if (!whopAccountReady()) return err(M.whopNoKey, 503);
      const resume = body.action === "reprendre";
      try {
        const r = resume ? await resumeMembership(uid, body.id) : await cancelMembership(uid, body.id);
        console.log(`[compte] ${resume ? "reprise" : "résiliation en fin de période"} : abonnement ${r.plan.id} (${r.plan.tier})${r.already ? ", déjà dans cet état" : ""}`);
        return json({ ok: true, already: r.already, plan: r.plan }, 200, refreshed);
      } catch (e) {
        return whopFail(M, e, { resume });
      }
    }

    case "supprimer": {
      if (!deleteConfirmed(body.confirm)) return err(M.word, 400);
      // Rôle relu en base (pas seulement dans le cookie) : un compte admin ou créateur n'est jamais effacé d'ici.
      let role;
      try { role = await getRole(uid); } catch { return err(M.dbDown, 503); }
      if (role) return err(M.role, 403);
      // Avant de toucher à Whop : la base sait-elle effacer ? Sinon on s'arrête là, rien n'est modifié.
      const prof = await readProfile(uid);
      if (!prof.installed) return err(M.notReady, 503);
      if (prof.unreachable) return err(M.dbDown, 503);
      if (!whopAccountReady()) return err(M.whopNoKey, 503);

      // 1) Abonnements encore en cours : arrêtés en fin de période. Au moindre échec, on s'arrête sans rien effacer.
      let stopped = 0;
      try {
        const mine = await listMemberships(uid);
        for (const m of renewing(mine)) {
          await cancelMembership(uid, m.id);
          stopped++;
        }
      } catch (e) {
        return whopFail(M, e, { stopped });
      }
      // 2) Données Basketlog.
      let r;
      try {
        r = await dbRpc("basketlog_compte_supprimer", { p_uid: uid });
      } catch (e) {
        console.warn(`[compte] effacement : ${String(e?.message || e).slice(0, 200)}`);
        return err(M.half(stopped), 502, { stopped });
      }
      if (!r?.ok) return r?.reason === "role" ? err(M.role, 403) : err(M.half(stopped), 502, { stopped });
      revalidateTag("avis"); // l'avis du membre, s'il était publié, disparaît du site
      console.log(`[compte] compte supprimé : ${stopped} abonnement(s) arrêté(s), ${r.analyses ?? 0} analyse(s), ${r.questions ?? 0} question(s), ${r.avis ?? 0} avis`);
      const res = json({ ok: true, stopped });
      res.cookies.delete({ name: COOKIE, path: "/" });
      return res;
    }

    default:
      return err(M.unknown, 400);
  }
}
