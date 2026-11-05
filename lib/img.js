// Logos et photos de joueurs servis à la taille utile par leurs CDN d'origine.
// Les fichiers d'origine font 500 px (logos ESPN, 45 à 100 Ko), jusqu'à 510 px (écussons EuroLeague, jusqu'à 130 Ko)
// et 600 px (photos ESPN des joueurs, 200 Ko) pour un affichage de 15 à 110 px : on demande la largeur utile.
// ESPN redimensionne via son « combiner » (mêmes PNG transparents, gardés 1 jour en cache au lieu de quelques heures),
// les CDN EuroLeague (InCrowd, Cortex) via ?w= (ils n'agrandissent jamais au-delà de l'original).
const ESPN = /^https?:\/\/a\.espncdn\.com(?:\/combiner\/i\?img=)?(\/i\/[^?&#]+\.(?:png|jpe?g))/i;
const ELCDN = /^https?:\/\/(media-cdn\.(?:incrowdsports\.com|cortextech\.io)\/[^?#]+\.(?:png|jpe?g|webp))/i;

// `w` : largeur voulue en pixels réels (affichage × 3 pour les écrans haute densité). Sans `w` : fichier d'origine.
export function sized(url, w) {
  if (!url || typeof url !== "string") return url || null;
  const e = url.match(ESPN);
  if (e) return w ? `https://a.espncdn.com/combiner/i?img=${e[1]}&w=${Math.round(w)}` : `https://a.espncdn.com${e[1]}`;
  const c = url.match(ELCDN);
  if (c) return w ? `https://${c[1]}?w=${Math.round(w)}` : `https://${c[1]}`;
  return url;
}

export const LOGO_W = 200; // nets jusqu'à ~66 px affichés sur écran x3 (la plupart des logos font 15 à 64 px)
export const HEAD_W = 300; // photos rondes de 48 à 72 px, recadrées sur la hauteur (image 4:3)
export const logo = (url, w = LOGO_W) => sized(url, w);
export const headshot = (url, w = HEAD_W) => sized(url, w);
