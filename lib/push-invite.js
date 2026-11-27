// Invitation aux notifications du soir dans l'appli installée (27/11/2026 : 30 installations, 123 ouvertures de l'appli et
// seulement 3 abonnés aux notifications en 30 jours). Règles partagées par components/PushInvite.jsx et tests/push.mjs :
// aucune dépendance à Next ni au navigateur. Le stockage est passé en paramètre (lib/safe-store.js) ; sans stockage (null),
// on n'invite jamais plutôt que de répéter l'invitation à chaque page.
import { isAnalysisPath } from "./onboarding.js";

export const INVITE_KEY = "bl-push-invite";
export const INVITE_MIN_OPENS = 2; // à partir de la 2e ouverture de l'appli
export const INVITE_SNOOZE = 7 * 864e5; // « Plus tard » : plus rien pendant 7 jours
// Une ouverture = l'appli revient au premier plan (lancement ou retour) après au moins 30 minutes sans être affichée :
// un simple aller-retour vers une autre appli ou un rechargement de page ne compte pas.
export const OPEN_GAP = 30 * 60e3;

const whole = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);

// État gardé : { n : ouvertures comptées, seen : dernière fois que l'appli était affichée, snooze : heure du « Plus tard »,
// shown : n° de l'ouverture où la carte a été montrée (l'événement « affichée » n'est envoyé qu'une fois par ouverture) }.
// null quand le stockage manque ou refuse la lecture ; un contenu abîmé repart de zéro (sinon l'invitation serait bloquée
// pour toujours sur cet appareil).
export function readInvite(store) {
  if (!store) return null;
  let raw;
  try { raw = store.getItem(INVITE_KEY); } catch { return null; }
  let o = null;
  try { o = JSON.parse(raw || "null"); } catch { /* illisible : on repart de zéro */ }
  if (!o || typeof o !== "object") o = {};
  return { n: whole(o.n), seen: whole(o.seen), snooze: whole(o.snooze), shown: whole(o.shown) };
}

function save(store, s) {
  try { store.setItem(INVITE_KEY, JSON.stringify(s)); } catch { /* stockage plein ou refusé : l'état reste celui de cette page */ }
  return s;
}

// L'appli s'affiche (chargement de page, ou retour au premier plan) : nouvelle ouverture si c'est la toute première fois ou
// si elle n'avait pas été affichée depuis OPEN_GAP. Renvoie l'état à jour (ou null sans stockage).
export function noteOpen(store, now = Date.now()) {
  const s = readInvite(store);
  if (!s) return null;
  if (!s.seen || now - s.seen >= OPEN_GAP) s.n += 1;
  s.seen = now;
  return save(store, s);
}

// L'appli passe en arrière-plan (ou la page se ferme) : l'absence de 30 minutes se compte à partir de maintenant.
export function noteSeen(store, now = Date.now()) {
  const s = readInvite(store);
  if (!s) return null;
  s.seen = now;
  return save(store, s);
}

// « Plus tard » (ou demande de permission laissée sans réponse, ou notifications coupées à la main) : 7 jours de silence.
export function snoozeInvite(store, now = Date.now()) {
  const s = readInvite(store);
  if (!s) return null;
  s.snooze = now;
  return save(store, s);
}

// La carte vient d'être montrée pendant l'ouverture en cours. Renvoie true seulement la première fois pour cette ouverture
// (c'est là qu'on envoie « Invitation notifications affichée »).
export function markShown(store) {
  const s = readInvite(store);
  if (!s || !s.n || s.shown === s.n) return false;
  s.shown = s.n;
  save(store, s);
  return true;
}

// Faut-il proposer la carte ? 2e ouverture au moins, et pas de « Plus tard » depuis moins de 7 jours. Un « Plus tard » daté
// dans le futur (horloge du téléphone déréglée) ne bloque pas plus de 7 jours non plus. Le reste (notifications déjà
// actives, permission refusée, fenêtre ouverte, fiche match) est vérifié par le composant.
export function inviteDue(s, now = Date.now()) {
  if (!s || s.n < INVITE_MIN_OPENS) return false;
  if (s.snooze && Math.abs(now - s.snooze) < INVITE_SNOOZE) return false;
  return true;
}

// Pages où la carte ne s'affiche jamais : fiche match et résultat d'analyse (la fenêtre « analyse complète » s'y ouvre, et la
// personne vient y lire l'analyse), page des formules et paiement (on ne détourne pas quelqu'un d'un achat), nouveau mot de
// passe, administration, widgets intégrés à d'autres sites.
export function invitePathOk(pathname = "", search = "") {
  if (isAnalysisPath(pathname, search)) return false;
  const p = String(pathname).replace(/^\/(?:en|es|pt)(?=\/|$)/, "") || "/";
  return !/^\/(?:pro|paiement|reinitialiser|widget|app\/admin)(?:\/|$)/.test(p);
}
