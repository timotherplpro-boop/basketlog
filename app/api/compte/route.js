import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { COOKIE, cookieOptions, currentSession, encodeSession } from "../../../lib/pro";
import { dbRpc, getRole, getRoleInfo, profileNotInstalled, rolesConfigured } from "../../../lib/roles";
import { mk } from "../../../lib/i18n";
import { DELETE_WORDS, cleanName, creatorCodes, deleteConfirmed, renewing } from "../../../lib/account";
import { cancelMembership, listMemberships, listPlans, resumeMembership, whopAccountReady } from "../../../lib/whop-account";
import { WhopPromoError, disablePromo } from "../../../lib/whop-promo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// « Mon compte » : lecture de l'état du compte (prénom, abonnements) et quatre actions du membre connecté :
//   nom (choisir son prénom), resilier (arrêt en fin de période), reprendre (annuler la résiliation), supprimer (effacer son compte).
// Suppression : un membre efface ses données ; un créateur aussi, et en plus son accès, son lien d'invitation et son code promo
// (désactivé chez Whop AVANT tout effacement : un code resté actif ne profiterait plus à personne) ; un admin ne se supprime pas ici.
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

// Fiche du créateur (supabase/compte-createur.sql) : { installed, unreachable, role, codes }.
// installed est faux tant que ce script n'a pas été lancé ; role vient de la base (« createur », « admin » ou null : la base fait foi,
// pas le cookie) ; codes : ses codes promo [{ code, pct }], à désactiver chez Whop avant l'effacement.
async function readCreator(uid) {
  const none = { role: null, codes: [] };
  if (!rolesConfigured()) return { installed: false, ...none };
  try {
    const r = await dbRpc("basketlog_createur_infos", { p_uid: uid });
    if (r?.ok) return { installed: true, role: "createur", codes: creatorCodes(r.codes) };
    return { installed: true, ...none, role: r?.reason === "admin" ? "admin" : null };
  } catch (e) {
    return profileNotInstalled(e) ? { installed: false, ...none } : { installed: true, unreachable: true, ...none };
  }
}

function messages(lang) {
  const { t } = mk(lang);
  const stoppedNote = (n) => (n > 1
    ? t("Tes abonnements en cours sont déjà arrêtés (plus aucun renouvellement).", "Your active subscriptions are already stopped (no further renewals).", "Tus suscripciones activas ya están detenidas (sin más renovaciones).")
    : t("Ton abonnement en cours est déjà arrêté (plus aucun renouvellement).", "Your active subscription is already stopped (no further renewals).", "Tu suscripción activa ya está detenida (sin más renovaciones)."));
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
    admin: t("Un compte admin ne se supprime pas d'ici. Écris-nous à contact@basketlog-app.com, ou demande à un autre admin de te retirer l'accès depuis l'espace admin, puis reviens ici.", "An admin account can't be deleted from here. Write to us at contact@basketlog-app.com, or ask another admin to remove your access from the admin area, then come back here.", "Una cuenta de administrador no se elimina desde aquí. Escríbenos a contact@basketlog-app.com, o pide a otro administrador que te retire el acceso desde el espacio de administración y vuelve aquí."),
    roleChanged: t("Ton accès a changé entre-temps : recharge la page, puis réessaie.", "Your access has changed in the meantime: reload the page, then try again.", "Tu acceso ha cambiado entretanto: recarga la página y vuelve a intentarlo."),
    // Échec de l'effacement, après l'arrêt des abonnements (n) et la désactivation des codes promo (codes) : on dit ce qui est déjà fait.
    half: (n, codes = 0) => {
      if (!n && !codes) return t("L'effacement de ton compte a échoué : rien n'a été supprimé. Réessaie dans un instant.", "Deleting your account failed: nothing was removed. Please try again in a moment.", "Ha fallado la eliminación de tu cuenta: no se ha borrado nada. Inténtalo de nuevo en un instante.");
      const subs = n ? t(
        `${n > 1 ? "Tes abonnements sont arrêtés" : "Ton abonnement est arrêté"} (plus aucun renouvellement)`,
        `${n > 1 ? "Your subscriptions are stopped" : "Your subscription is stopped"} (no further renewals)`,
        `${n > 1 ? "Tus suscripciones están detenidas" : "Tu suscripción está detenida"} (sin más renovaciones)`
      ) : "";
      const off = codes ? t(
        codes > 1 ? "tes codes promo sont désactivés" : "ton code promo est désactivé",
        codes > 1 ? "your promo codes are deactivated" : "your promo code is deactivated",
        codes > 1 ? "tus códigos promocionales están desactivados" : "tu código promocional está desactivado"
      ) : "";
      const lead = subs && off ? `${subs} ${t("et", "and", "y")} ${off}` : subs || `${off[0].toUpperCase()}${off.slice(1)}`;
      return `${lead}${t(", mais l'effacement de tes données a échoué. Réessaie dans un instant.", ", but erasing your data failed. Please try again in a moment.", ", pero ha fallado el borrado de tus datos. Inténtalo de nuevo en un instante.")}`;
    },
    // Whop n'a pas pu désactiver le code promo du créateur : rien n'est effacé. stopped : abonnements déjà arrêtés avant.
    codeDown: (stopped = 0) => `${t("Whop ne répond pas pour désactiver ton code promo : rien n'a été supprimé. Réessaie dans un instant.", "Whop isn't responding to deactivate your promo code: nothing was removed. Please try again in a moment.", "Whop no responde para desactivar tu código promocional: no se ha borrado nada. Inténtalo de nuevo en un instante.")}${stopped ? ` ${stoppedNote(stopped)}` : ""}`,
    codeRefused: (stopped = 0) => `${t("Whop a refusé de désactiver ton code promo : rien n'a été supprimé. Écris-nous à contact@basketlog-app.com et on s'en occupe tout de suite.", "Whop refused to deactivate your promo code: nothing was removed. Write to us at contact@basketlog-app.com and we'll take care of it right away.", "Whop ha rechazado desactivar tu código promocional: no se ha borrado nada. Escríbenos a contact@basketlog-app.com y nos ocupamos enseguida.")}${stopped ? ` ${stoppedNote(stopped)}` : ""}`,
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

// Réponse d'erreur quand Whop n'a pas pu désactiver un code promo (détail technique dans les journaux seulement).
function promoFail(M, e, { stopped = 0 } = {}) {
  console.warn(`[compte] code promo : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 300)}`);
  if (e instanceof WhopPromoError && e.kind === "nokey") return err(M.whopNoKey, 503, { stopped });
  if (e instanceof WhopPromoError && ["scope", "notfound", "conflict", "invalid"].includes(e.kind)) return err(M.codeRefused(stopped), 502, { stopped });
  return err(M.codeDown(stopped), 503, { stopped });
}

export async function GET(req) {
  const lang = new URL(req.url).searchParams.get("lang");
  const M = messages(lang);
  const { session, refreshed } = await currentSession(req.cookies.get(COOKIE)?.value);
  if (!session?.uid) return err(M.login, 401);
  if (tooMany(session.uid, "lecture", MAX_READS)) return err(M.many, 429);

  const preview = !!session.preview;
  let role = session.role || (session.admin ? "admin" : null);
  const [plansRes, prof, creator] = await Promise.all([
    whopAccountReady()
      ? listPlans(session.uid).then((plans) => ({ ok: true, plans }), (e) => { console.warn(`[compte] lecture des abonnements : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`); return { ok: false, plans: [] }; })
      : { ok: false, plans: [] },
    readProfile(session.uid),
    role === "createur" && !preview ? readCreator(session.uid) : null,
  ]);
  // Un créateur dont l'accès vient d'être retiré (ou promu admin) : la base fait foi, pas le cookie.
  if (creator?.installed && !creator.unreachable && creator.role !== "createur") role = creator.role;
  const writable = prof.installed && !prof.unreachable && !preview;
  // Suppression : membre ordinaire dès que la base sait effacer ; créateur quand la base sait aussi retirer son accès et son code ;
  // admin jamais (il garde son accès tant qu'un autre admin ne le lui retire pas).
  const canDelete = role === "admin" ? false : role === "createur" ? writable && !!creator?.installed && !creator.unreachable : writable;
  return json(
    {
      ok: true,
      tier: session.tier || "compte",
      role,
      preview,
      name: { current: session.name || "", custom: prof.nom, whop: session.wname || null },
      whop: plansRes.ok,
      plans: plansRes.plans,
      creator: role === "createur" ? { codes: creator?.codes || [] } : null,
      can: { rename: writable, cancel: !preview && plansRes.ok, delete: canDelete },
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
      // Rôle relu en base (pas seulement dans le cookie) : un compte admin n'est jamais effacé d'ici ; un créateur a son propre déroulé.
      let role;
      try { role = await getRole(uid); } catch { return err(M.dbDown, 503); }
      if (role === "admin") return err(M.admin, 403);
      // Avant de toucher à Whop : la base sait-elle effacer ? Sinon on s'arrête là, rien n'est modifié.
      const [prof, creator] = await Promise.all([readProfile(uid), role === "createur" ? readCreator(uid) : null]);
      if (!prof.installed || (creator && !creator.installed)) return err(M.notReady, 503);
      if (prof.unreachable || creator?.unreachable) return err(M.dbDown, 503);
      if (creator && creator.role !== "createur") return creator.role === "admin" ? err(M.admin, 403) : err(M.roleChanged, 409);
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
      // 2) Créateur : codes promo désactivés chez Whop AVANT d'effacer. Au moindre échec, on s'arrête sans rien effacer
      // (relancer reprend où on en était : un code déjà désactivé compte comme fait).
      const off = new Set();
      for (const c of creator?.codes || []) {
        try {
          await disablePromo(c.code);
          off.add(c.code);
        } catch (e) {
          return promoFail(M, e, { stopped });
        }
      }
      // 3) Données Basketlog (pour un créateur : aussi son accès, son lien d'invitation et son code, en une seule opération).
      let r;
      try {
        r = await dbRpc(creator ? "basketlog_createur_supprimer" : "basketlog_compte_supprimer", { p_uid: uid });
      } catch (e) {
        console.warn(`[compte] effacement : ${String(e?.message || e).slice(0, 200)}`);
        return err(M.half(stopped, off.size), 502, { stopped });
      }
      if (!r?.ok) {
        if (r?.reason === "admin") return err(M.admin, 403, { stopped });
        if (r?.reason === "role" || r?.reason === "pas_createur") return err(M.roleChanged, 409, { stopped });
        return err(M.half(stopped, off.size), 502, { stopped });
      }
      // Un code ajouté par l'admin entre la lecture et l'effacement n'a pas été vu plus haut : désactivé maintenant, sans bloquer
      // (le compte est déjà effacé). Un échec est signalé dans les journaux du serveur.
      for (const c of creator ? creatorCodes(r.codes) : []) {
        if (off.has(c.code)) continue;
        try {
          await disablePromo(c.code);
          off.add(c.code);
        } catch (e) {
          console.warn(`[compte] code promo ${c.code} non désactivé après l'effacement : ${e?.kind || "?"} — ${String(e?.message || e).slice(0, 200)}`);
        }
      }
      revalidateTag("avis"); // l'avis du membre, s'il était publié, disparaît du site
      console.log(`[compte] ${creator ? "compte créateur" : "compte"} supprimé : ${stopped} abonnement(s) arrêté(s)${creator ? `, ${off.size} code(s) promo désactivé(s)` : ""}, ${r.analyses ?? 0} analyse(s), ${r.questions ?? 0} question(s), ${r.avis ?? 0} avis`);
      const res = json({ ok: true, stopped, ...(creator ? { creator: true, codes: [...off] } : {}) });
      res.cookies.delete({ name: COOKIE, path: "/" });
      return res;
    }

    default:
      return err(M.unknown, 400);
  }
}
