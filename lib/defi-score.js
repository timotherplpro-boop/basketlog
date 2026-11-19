// Jeu « Bats le modèle » : calculs purs (testés dans tests/defi.mjs), sans réseau ni base.
// Un choix = { d, g (match), p (équipe choisie), m (favori du modèle au moment du choix) }.
// Un résultat = { w (équipe gagnante), d } pour chaque match terminé, par identifiant de match.

// Semaine du classement : du lundi au dimanche, en dates NBA (AAAAMMJJ, heure de New York).
export function weekBounds(today) {
  const y = +today.slice(0, 4), mo = +today.slice(4, 6) - 1, da = +today.slice(6, 8);
  const dt = new Date(Date.UTC(y, mo, da));
  const dow = (dt.getUTCDay() + 6) % 7; // lundi = 0
  const iso = (x) => x.toISOString().slice(0, 10).replace(/-/g, "");
  const mon = new Date(dt); mon.setUTCDate(dt.getUTCDate() - dow);
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  return { from: iso(mon), to: iso(sun) };
}

// Nom public dans le classement, sans jamais révéler une adresse : « Timothé Rapalli » → « Timothé R. » ;
// un nom tiré d'une adresse e-mail (« tim.dupont84 ») → « Tim » ; rien d'utilisable → « #7F3A » (tiré de l'identifiant).
export function displayName(nom, uid = "") {
  const cap = (w) => w.charAt(0).toUpperCase() + w.slice(1);
  const raw = String(nom || "").trim();
  const words = raw.split(/\s+/).filter((w) => /^[\p{L}'-]+$/u.test(w));
  if (words.length >= 2 && words.length === raw.split(/\s+/).length) return `${cap(words[0]).slice(0, 16)} ${words[words.length - 1][0].toUpperCase()}.`;
  const first = (raw.match(/\p{L}{2,}/u) || [""])[0];
  if (first) return cap(first.toLowerCase()).slice(0, 12);
  let h = 0;
  for (const c of String(uid)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `#${h.toString(16).toUpperCase().slice(-4).padStart(4, "0")}`;
}

// Score d'une liste de choix : matchs terminés, bons choix du joueur, bons choix du modèle sur les mêmes matchs.
export function scorePicks(picks, results) {
  let n = 0, me = 0, model = 0, pending = 0;
  for (const x of picks || []) {
    const r = results?.[x.g];
    if (!r || !r.w) { pending++; continue; }
    n++;
    if (String(x.p) === String(r.w)) me++;
    if (x.m && String(x.m) === String(r.w)) model++;
  }
  return { n, me, model, pending };
}

// Score par jour (date NBA), du plus récent au plus ancien.
export function scoreByDay(picks, results) {
  const byDay = new Map();
  for (const x of picks || []) {
    if (!byDay.has(x.d)) byDay.set(x.d, []);
    byDay.get(x.d).push(x);
  }
  return [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([d, l]) => ({ d, ...scorePicks(l, results) }));
}

// Classement : rows = choix de tous les joueurs ({ u, n, d, g, p, m }). Trié par bons choix, puis écart avec le modèle,
// puis moins de matchs joués. Les joueurs sans match terminé n'apparaissent pas.
export function leaderboard(rows, results, max = 20) {
  const by = new Map();
  for (const r of rows || []) {
    if (!by.has(r.u)) by.set(r.u, { u: r.u, name: r.n, picks: [] });
    const e = by.get(r.u);
    if (r.n) e.name = r.n;
    e.picks.push(r);
  }
  return [...by.values()]
    .map((e) => ({ u: e.u, name: displayName(e.name, e.u), ...scorePicks(e.picks, results) }))
    .filter((e) => e.n > 0)
    .sort((a, b) => b.me - a.me || (b.me - b.model) - (a.me - a.model) || a.n - b.n || a.name.localeCompare(b.name))
    .slice(0, max)
    .map(({ u, ...rest }, i) => ({ rank: i + 1, ...rest }));
}

// Paramètre de partage « 7-6-10 » (bons choix du joueur, du modèle, matchs) : valeurs bornées, sinon null.
export function parseShare(s) {
  const m = /^(\d{1,2})-(\d{1,2})-(\d{1,2})$/.exec(String(s || ""));
  if (!m) return null;
  const [u, mo, n] = [+m[1], +m[2], +m[3]];
  if (n < 1 || n > 30 || u > n || mo > n) return null;
  return { u, m: mo, n };
}
