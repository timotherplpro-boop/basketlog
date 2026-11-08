import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { COOKIE, PREVIEW_TIERS, cookieOptions, decodeSession, displayName, encodeSession, resolveAccess } from "../../../lib/pro";
import { adminData, dbRpc, getRole } from "../../../lib/roles";
import { LANGS, mk } from "../../../lib/i18n";
import { CODE_RE, cleanPct, randomChars, suggestCode } from "../../../lib/promo";
import { describeProblems, disablePromo, ensurePromo, whopPromoReady } from "../../../lib/whop-promo";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODE = /^[0-9a-f]{20}$/;
const err = (error, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

// Codes promo des créateurs (table et fonctions ajoutées par supabase/codes-promo.sql).
// Tant que ce script n'a pas été lancé, Supabase répond 404 aux fonctions basketlog_admin_promo*.
const promoNotInstalled = (e) => /Supabase 404/.test(String(e?.message));

// Créateur visé : soit un compte (uid), soit une invitation pas encore activée (inv), jamais les deux.
function promoTarget(body) {
  const uid = typeof body.uid === "string" ? body.uid.trim() : "";
  const inv = typeof body.inv === "string" ? body.inv.trim() : "";
  if (uid && !inv && uid.length <= 80) return { uid, inv: null };
  if (inv && !uid && CODE.test(inv)) return { uid: null, inv };
  return null;
}

// Premier code libre pour un créateur qu'on vient d'inviter : son nom + la remise, puis avec deux caractères en plus,
// puis un code tiré au hasard. Renvoie { code, pct, id }, ou null si rien n'était libre.
async function proposePromo({ inv, nom, pct }) {
  const first = suggestCode(nom, pct, randomChars);
  for (const code of [first, `${first}${randomChars(2)}`.slice(0, 24), suggestCode("", pct, randomChars)]) {
    const res = await dbRpc("basketlog_admin_promo_set", { p_uid: null, p_inv_code: inv, p_code: code, p_pct: pct, p_nom: nom || null });
    if (res?.ok) return { code, pct, id: res.id };
    if (res?.reason !== "code_pris") break;
  }
  return null;
}

// Code choisi par l'admin pour un créateur qu'on vient d'inviter : une seule tentative, avec exactement ce code.
// Renvoie { code, pct, id }, ou null s'il vient d'être pris entre-temps.
async function setPromo({ inv, nom, pct, code }) {
  const res = await dbRpc("basketlog_admin_promo_set", { p_uid: null, p_inv_code: inv, p_code: code, p_pct: pct, p_nom: nom || null });
  return res?.ok ? { code, pct, id: res.id } : null;
}

// Liaison avec Whop. Ces deux fonctions ne lèvent jamais : un souci chez Whop ne défait pas ce qui est enregistré ici, il
// est signalé à l'admin, qui peut réessayer avec « Créer chez Whop ». state : created, exists, reactivated (code prêt chez
// Whop) ; disabled, already, absent (code retiré de chez Whop) ; manual (clé API Whop absente) ; error (voir kind).
async function whopSync({ id, code, pct }) {
  if (!whopPromoReady()) return { state: "manual" };
  try {
    const r = await ensurePromo({ code, pct });
    if (id) { try { await dbRpc("basketlog_admin_promo_whop", { p_id: id, p_ok: true }); } catch { /* le bouton « Créer chez Whop » adopte le code déjà créé */ } }
    return { state: r.state };
  } catch (e) {
    return { state: "error", kind: e?.kind || "network", problems: e?.problems, deactivated: e?.deactivated, detail: e?.detail };
  }
}
async function whopRetire(code) {
  if (!whopPromoReady()) return { state: "manual" };
  try {
    return await disablePromo(code);
  } catch (e) {
    return { state: "error", kind: e?.kind || "network", detail: e?.detail };
  }
}

// Phrase pour l'admin quand la liaison avec Whop n'a pas abouti, dans la langue de l'écran.
function whopMessage(t, w, code) {
  const c = code ? ` ${code}` : "";
  const why = describeProblems(w.problems, t) || w.detail || "";
  switch (w.kind) {
    case "nokey":
      return t("La clé API de Whop n'est pas configurée sur le site : crée le code à la main (guide ci-dessous).", "Whop's API key isn't set up on the site: create the code by hand (guide below).", "La clave API de Whop no está configurada en el sitio: crea el código a mano (guía de abajo).");
    case "scope":
      return t(
        "Whop a refusé : la clé API du site n'a pas la permission de gérer les codes promo. Sur la page des clés API de Whop, ajoute à la clé « promo_code:create », « promo_code:update » et « promo_code:basic:read » (ou donne-lui le rôle Admin), puis clique sur « Créer chez Whop ».",
        "Whop refused: the site's API key isn't allowed to manage promo codes. On Whop's API keys page, give the key “promo_code:create”, “promo_code:update” and “promo_code:basic:read” (or the Admin role), then click “Create in Whop”.",
        "Whop lo ha rechazado: la clave API del sitio no tiene permiso para gestionar códigos promocionales. En la página de claves API de Whop, añade a la clave «promo_code:create», «promo_code:update» y «promo_code:basic:read» (o el rol de administrador) y pulsa «Crear en Whop»."
      );
    case "differs":
      return t(
        `Le code${c} existe déjà chez Whop avec d'autres réglages (${why}). Whop ne permet pas de les modifier : choisis un autre nom de code ici, ou supprime celui de Whop puis clique sur « Créer chez Whop ».`,
        `The code${c} already exists in Whop with other settings (${why}). Whop doesn't allow editing them: pick another code name here, or delete the one in Whop and then click “Create in Whop”.`,
        `El código${c} ya existe en Whop con otros ajustes (${why}). Whop no permite modificarlos: elige otro nombre de código aquí, o elimina el de Whop y pulsa «Crear en Whop».`
      );
    case "conflict":
      return t(`Whop refuse de créer le code${c} (il existe déjà ou son nom est réservé) : choisis un autre nom de code.`, `Whop refuses to create the code${c} (it already exists or its name is reserved): pick another code name.`, `Whop se niega a crear el código${c} (ya existe o su nombre está reservado): elige otro nombre de código.`);
    case "invalid":
      return t(`Whop a refusé ce code ou cette remise${why ? ` (${why})` : ""} : choisis-en un autre.`, `Whop refused this code or discount${why ? ` (${why})` : ""}: pick another one.`, `Whop ha rechazado este código o descuento${why ? ` (${why})` : ""}: elige otro.`);
    case "mismatch":
      return w.deactivated
        ? t(`Whop a enregistré autre chose que prévu (${why}) : par sécurité, le code${c} a été désactivé chez Whop. Aucun client ne peut l'utiliser.`, `Whop saved something other than expected (${why}): as a safety measure, the code${c} was deactivated in Whop. No customer can use it.`, `Whop ha guardado algo distinto de lo previsto (${why}): por seguridad, el código${c} se ha desactivado en Whop. Ningún cliente puede usarlo.`)
        : t(`Whop a enregistré autre chose que prévu (${why}) et le code${c} n'a pas pu être désactivé : désactive-le tout de suite chez Whop.`, `Whop saved something other than expected (${why}) and the code${c} couldn't be deactivated: deactivate it in Whop right away.`, `Whop ha guardado algo distinto de lo previsto (${why}) y el código${c} no se ha podido desactivar: desactívalo en Whop ahora mismo.`);
    default:
      return t("Whop ne répond pas pour le moment : réessaie dans un instant avec « Créer chez Whop ».", "Whop isn't responding right now: try again in a moment with “Create in Whop”.", "Whop no responde por el momento: vuelve a intentarlo en un instante con «Crear en Whop».");
  }
}

// Supprime le code d'un créateur qui disparaît (accès retiré, invitation annulée) et le désactive chez Whop.
// Renvoie ce qui a été supprimé, avec pour chaque code le résultat chez Whop (`whop`). Sans conséquence si les codes
// promo ne sont pas en base.
async function retireAll(rows) {
  if (!whopPromoReady()) return rows;
  const out = [];
  for (const row of rows) out.push({ ...row, whop: await whopRetire(row.code) });
  return out;
}
async function closePromo(args) {
  try {
    const r = await dbRpc("basketlog_admin_promo_off", args);
    return await retireAll(Array.isArray(r?.supprimes) ? r.supprimes : []);
  } catch {
    return [];
  }
}

// Actions de l'espace admin. Le rôle est relu dans la base à chaque appel (jamais seulement dans le cookie).
// Les messages d'erreur sont rendus dans la langue de l'écran (body.lang : fr, en ou es ; français par défaut).
export async function POST(req) {
  const raw = await req.json().catch(() => null);
  const body = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const { t } = mk(LANGS.includes(body.lang) ? body.lang : "fr");
  const msg = {
    pct: () => t("Remise invalide : choisis un nombre entier entre 1 et 90 %.", "Invalid discount: pick a whole number between 1 and 90%.", "Descuento no válido: elige un número entero entre 1 y 90 %."),
    code: () => t("Code invalide : 3 à 24 lettres ou chiffres, sans espace ni accent.", "Invalid code: 3 to 24 letters or digits, no spaces or accents.", "Código no válido: de 3 a 24 letras o cifras, sin espacios ni acentos."),
    taken: () => t("Ce code existe déjà : choisis-en un autre.", "That code already exists: pick another one.", "Ese código ya existe: elige otro."),
    off: () => t("Les codes promo ne sont pas encore activés dans la base de données (script supabase/codes-promo.sql à lancer une fois).", "Promo codes aren't enabled in the database yet (run the supabase/codes-promo.sql script once).", "Los códigos promocionales aún no están activados en la base de datos (hay que ejecutar una vez el script supabase/codes-promo.sql)."),
  };

  // Résultat chez Whop pour l'écran : en cas d'échec, la phrase est déjà dans la langue de l'écran.
  const shown = (w, code) => (w?.state === "error" ? { ...w, message: whopMessage(t, w, code) } : w);
  const shownAll = (rows) => rows.map((r) => (r.whop ? { ...r, whop: shown(r.whop, r.code) } : r));

  const s = decodeSession(req.cookies.get(COOKIE)?.value);
  if (!s?.uid) return err(t("Connecte-toi avec ton compte admin.", "Log in with your admin account.", "Inicia sesión con tu cuenta de administrador."), 401);
  let role = null;
  try {
    role = await getRole(s.uid);
  } catch {
    return err(t("Base momentanément injoignable, réessaie dans un instant.", "The database is temporarily unreachable, please try again in a moment.", "La base de datos no está accesible por el momento, inténtalo de nuevo en un instante."), 503);
  }
  if (role !== "admin") return err(t("Réservé aux admins.", "Admins only.", "Reservado a los administradores."), 403);

  // Aperçu d'une formule : la session devient celle d'un client de cette formule (ou redevient admin).
  if (body.action === "apercu") {
    const tier = PREVIEW_TIERS.includes(body.tier) ? body.tier : null;
    let next;
    if (tier) {
      next = { ...s, tier, role: null, admin: true, preview: tier, checked: Date.now() };
    } else {
      let a;
      try { a = await resolveAccess(s.uid, { ...s, role: "admin" }); } catch { a = { tier: "lifetime", paid: s.paid ?? "compte", role: "admin", nom: null, v: s.v }; }
      next = { ...s, tier: a.tier, paid: a.paid, role: a.role, name: displayName(a, s), v: a.v, checked: Date.now() };
      delete next.preview;
      delete next.admin;
    }
    const value = encodeSession(next);
    if (!value) return err(t("Session impossible à mettre à jour.", "Couldn't update the session.", "No se ha podido actualizar la sesión."), 500);
    const res = NextResponse.json({ ok: true, preview: tier }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(COOKIE, value, cookieOptions);
    return res;
  }

  let extra = {};
  try {
    switch (body.action) {
      case "avis_publier":
      case "avis_retirer":
      case "avis_supprimer": {
        if (!UUID.test(String(body.id || ""))) return err(t("Avis introuvable.", "Review not found.", "Opinión no encontrada."));
        await dbRpc("basketlog_admin_avis", { p_id: body.id, p_action: body.action.slice(5) });
        revalidateTag("avis"); // le site affiche tout de suite la liste à jour
        break;
      }
      case "inviter": {
        const r = body.role === "admin" ? "admin" : "createur";
        const note = String(body.note || "").trim().slice(0, 80);
        // Remise du code promo du créateur, en % (vide : pas de code). Contrôlée avant de créer le lien.
        const askedPct = r === "createur" && body.pct != null && String(body.pct).trim() !== "";
        const pct = askedPct ? cleanPct(body.pct) : null;
        if (askedPct && pct == null) return err(msg.pct());
        // Nom du code choisi par l'admin (vide : proposé d'après le nom du créateur et la remise). Sans remise, pas de code.
        // Contrôlé, et vérifié libre, AVANT de créer le lien : un code refusé ne laisse pas d'invitation orpheline.
        if (pct != null && body.code != null && typeof body.code !== "string") return err(msg.code());
        const wanted = pct != null && typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
        if (wanted) {
          if (!CODE_RE.test(wanted)) return err(msg.code());
          let used = false;
          try { used = (await dbRpc("basketlog_admin_promos"))?.some?.((p) => p.code === wanted) === true; } catch { /* codes promo non installés : signalé plus bas */ }
          if (used) return err(msg.taken(), 409);
        }
        const res = await dbRpc("basketlog_admin_inviter", { p_role: r, p_note: note || null });
        extra = { code: res?.code || null };
        // Le lien est créé quoi qu'il arrive : un souci avec le code promo est signalé à côté, sans bloquer.
        if (pct != null && res?.code) {
          let created = null;
          try {
            created = wanted ? await setPromo({ inv: res.code, nom: note, pct, code: wanted }) : await proposePromo({ inv: res.code, nom: note, pct });
            if (!created) {
              extra.promoError = wanted
                ? t(`Le lien est créé, mais le code ${wanted} vient d'être pris : choisis-en un autre dans la liste ci-dessous.`, `The link is created, but the code ${wanted} was just taken: pick another one in the list below.`, `El enlace está creado, pero el código ${wanted} acaba de ser ocupado: elige otro en la lista de abajo.`)
                : t("Le lien est créé, mais aucun code promo libre n'a été trouvé : ajoute-en un dans la liste ci-dessous.", "The link is created, but no free promo code was found: add one in the list below.", "El enlace está creado, pero no se ha encontrado ningún código promocional libre: añade uno en la lista de abajo.");
            }
          } catch (e) {
            extra.promoError = promoNotInstalled(e)
              ? msg.off()
              : t("Le lien est créé, mais le code promo n'a pas pu l'être : ajoute-le dans la liste ci-dessous.", "The link is created, but the promo code couldn't be: add it in the list below.", "El enlace está creado, pero no se ha podido crear el código promocional: añádelo en la lista de abajo.");
          }
          if (created) {
            const { id, ...pub } = created;
            extra.promo = pub;
            // Le code est aussi créé chez Whop (si la clé API le permet) pour que le client puisse l'utiliser tout de suite.
            if (whopPromoReady()) extra.whop = shown(await whopSync({ id, code: pub.code, pct: pub.pct }), pub.code);
          }
        }
        break;
      }
      case "annuler_invitation": {
        if (!CODE.test(String(body.code || ""))) return err(t("Invitation introuvable.", "Invitation not found.", "Invitación no encontrada."));
        await dbRpc("basketlog_admin_annuler", { p_code: body.code });
        extra = { supprimes: shownAll(await closePromo({ p_uid: null, p_inv_code: body.code })) };
        break;
      }
      case "retirer_acces": {
        const uid = String(body.uid || "");
        if (!uid || uid.length > 80) return err(t("Compte introuvable.", "Account not found.", "Cuenta no encontrada."));
        if (uid === s.uid) return err(t("Tu ne peux pas retirer ton propre accès admin.", "You can't remove your own admin access.", "No puedes retirar tu propio acceso de administrador."));
        const res = await dbRpc("basketlog_admin_retirer", { p_uid: uid });
        if (res?.reason === "dernier_admin") return err(t("Il faut garder au moins un admin.", "At least one admin must remain.", "Debe quedar al menos un administrador."));
        extra = { supprimes: res?.ok ? shownAll(await closePromo({ p_uid: uid, p_inv_code: null })) : [] };
        break;
      }
      // Code promo d'un créateur : création ou modification (code et remise), répercutée chez Whop.
      case "promo_definir": {
        const target = promoTarget(body);
        if (!target) return err(t("Créateur introuvable.", "Creator not found.", "Creador no encontrado."));
        const pct = cleanPct(body.pct);
        if (pct == null) return err(msg.pct());
        const code = String(body.code ?? "").trim().toUpperCase();
        if (!CODE_RE.test(code)) return err(msg.code());
        const nom = String(body.nom || "").trim().slice(0, 80);
        const res = await dbRpc("basketlog_admin_promo_set", { p_uid: target.uid, p_inv_code: target.inv, p_code: code, p_pct: pct, p_nom: nom || null });
        if (res?.reason === "code_pris") return err(msg.taken(), 409);
        extra = { ancien: res?.ancien || null }; // ancien code, s'il vient d'être remplacé
        if (res?.ok && res.id && whopPromoReady()) {
          // Whop ne permet pas de modifier un code : l'ancien est désactivé, le nouveau est créé. Même nom avec une autre
          // remise : l'ancien d'abord (le nom est pris tant qu'il est actif) ; autre nom : le nouveau d'abord.
          const old = res.ancien;
          const sameName = !!old && old.code === code;
          let oldWhop = null;
          if (old && sameName) oldWhop = await whopRetire(old.code);
          const w = await whopSync({ id: res.id, code, pct });
          if (old && !sameName) oldWhop = await whopRetire(old.code);
          extra.whop = shown(w, code);
          if (old) extra.ancien = { ...old, whop: shown(oldWhop, old.code) };
        }
        break;
      }
      // « Ce code existe chez Whop » : simple repère pour l'admin (liaison automatique indisponible), rien n'est envoyé à Whop.
      case "promo_whop": {
        if (!UUID.test(String(body.id || ""))) return err(t("Code promo introuvable.", "Promo code not found.", "Código promocional no encontrado."));
        await dbRpc("basketlog_admin_promo_whop", { p_id: body.id, p_ok: body.ok === true });
        break;
      }
      // « Créer chez Whop » : crée le code là-bas, ou vérifie qu'il y existe avec la bonne remise (puis le note comme prêt).
      case "promo_sync": {
        if (!UUID.test(String(body.id || ""))) return err(t("Code promo introuvable.", "Promo code not found.", "Código promocional no encontrado."));
        const list = await dbRpc("basketlog_admin_promos");
        const p = Array.isArray(list) ? list.find((x) => x.id === body.id) : null;
        if (!p) return err(t("Code promo introuvable.", "Promo code not found.", "Código promocional no encontrado."), 404);
        extra = { promo: { code: p.code, pct: p.pct }, whop: shown(await whopSync({ id: p.id, code: p.code, pct: p.pct }), p.code) };
        break;
      }
      case "promo_supprimer": {
        const target = promoTarget(body);
        if (!target) return err(t("Créateur introuvable.", "Creator not found.", "Creador no encontrado."));
        const res = await dbRpc("basketlog_admin_promo_off", { p_uid: target.uid, p_inv_code: target.inv });
        extra = { supprimes: shownAll(await retireAll(Array.isArray(res?.supprimes) ? res.supprimes : [])) };
        break;
      }
      case "lister":
        break;
      default:
        return err(t("Action inconnue.", "Unknown action.", "Acción desconocida."));
    }
    const data = await adminData();
    return NextResponse.json({ ok: true, data, ...extra }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (String(body.action).startsWith("promo_") && promoNotInstalled(e)) return err(msg.off(), 503);
    return err(t("L'action n'a pas pu être enregistrée. Réessaie dans un instant.", "The action couldn't be saved. Please try again in a moment.", "No se ha podido guardar la acción. Inténtalo de nuevo en un instante."), 502);
  }
}
