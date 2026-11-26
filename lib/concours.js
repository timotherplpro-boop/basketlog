// Jeu de Noël 2026 de Basketlog (décision de Tim, 26/11/2026) : 1 PS5 + 1 maillot de Victor Wembanyama à gagner.
// Participation gratuite et sans obligation d'achat : tout compte Basketlog (gratuit ou payant) créé au plus tard le
// 19/12/2026 à 23 h 59 (heure de Paris), personnes majeures résidant en France métropolitaine ; tirage au sort le 20/12/2026.
// Règlement complet : app/concours/page.jsx. Bandeau du site : components/ContestBar.jsx. Image : lib/og.jsx (concoursOgImage).
export const CONCOURS = {
  path: "/concours",
  debut: "2026-11-26T00:00:00+01:00",
  fin: "2026-12-19T23:59:59+01:00", // dernier moment pour créer son compte et participer
  tirage: "2026-12-20",
};

// Inscriptions ouvertes (le bandeau et le bouton « Participer » disparaissent après la clôture).
export const concoursOuvert = (now = Date.now()) => now <= Date.parse(CONCOURS.fin);
