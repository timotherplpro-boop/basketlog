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

// uid -> nom du créateur (la note saisie à l'invitation), pour les créateurs qui en ont une : sert aux statistiques,
// où les comptes sont sinon désignés par leur nom d'utilisateur Whop.
export function creatorNames(roles = []) {
  const out = {};
  for (const r of roles) if (r?.uid && r.role === "createur" && clean(r.note)) out[r.uid] = clean(r.note);
  return out;
}
