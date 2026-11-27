// Même visuel que /api/og/actu, servi hors de /api/ : X garde robots.txt en mémoire jusqu'à 24 h et /api/ y était
// fermé aux robots, d'où des aperçus de liens sans image (27/11/2026). Les adresses des posts utilisent celle-ci.
export { GET } from "../../api/og/actu/route";
