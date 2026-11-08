// Nom d'un compte dans l'espace admin et les statistiques (aucune dépendance à Next : testé dans tests/unit.mjs).
// Un compte a deux noms : `nom`, celui du compte Whop (« matheosds »), que Whop renvoie quand la personne active son lien
// d'invitation ; et `note`, ce que l'admin a saisi en l'invitant (« Gonzopicks », ou « Propriétaire » pour le compte de départ).
// Pour un créateur, la note est son nom : c'est celui qu'on reconnaît, il passe devant et le nom Whop reste visible à côté.
// Pour les autres rôles, l'ordre ne change pas : le nom du compte, puis la note (« Tim · Propriétaire »).

const clean = (s) => String(s ?? "").trim();
// « Gonzo Picks » et « GONZOPICKS » sont le même nom : pas de doublon à l'écran.
const squash = (s) => clean(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const same = (a, b) => squash(a) !== "" && squash(a) === squash(b);

// -> { main, sub, whop } : `main` s'affiche en gras ; `sub` est l'autre nom, à côté ; `whop` vaut true quand `sub` est le nom du compte Whop
// (l'écran l'annonce alors « compte Whop matheosds » pour qu'on comprenne d'où vient ce nom).
export function accountLabel(row) {
  const nom = clean(row?.nom);
  const note = clean(row?.note);
  if (row?.role === "createur" && note) return { main: note, sub: nom && !same(nom, note) ? nom : "", whop: true };
  return { main: nom || clean(row?.uid), sub: note && !same(note, nom) ? note : "", whop: false };
}

// Lien d'invitation sans date de fin. Depuis supabase/liens-sans-expiration.sql, la base donne à chaque lien une date de fin
// située 100 ans plus tard (les fonctions la comparent toujours à l'heure actuelle) : l'écran affiche « sans date de fin »
// dès qu'elle est à plus de 50 ans, et garde « expire le … » pour une date plus proche (lien créé avant le script).
export const NO_END_YEARS = 50;
export function noEndDate(iso, now = Date.now()) {
  const t = typeof iso === "string" ? Date.parse(iso) : NaN;
  return Number.isFinite(t) && t - now > NO_END_YEARS * 365.25 * 864e5;
}

// uid -> nom du créateur (la note saisie à l'invitation), pour les créateurs qui en ont une : sert aux statistiques,
// où les comptes sont sinon désignés par leur nom d'utilisateur Whop.
export function creatorNames(roles = []) {
  const out = {};
  for (const r of roles) if (r?.uid && r.role === "createur" && clean(r.note)) out[r.uid] = clean(r.note);
  return out;
}
