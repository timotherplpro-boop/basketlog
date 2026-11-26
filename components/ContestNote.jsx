import Link from "next/link";
import { CONCOURS, concoursOuvert } from "../lib/concours";

// Rappel du jeu de Noël 2026 (réservé aux abonnés Pro ou Lifetime) près des boutons « Passer Pro » et sur la page
// des formules, pour que tout le monde le voie (demande de Tim, 26/11/2026 21 h 32). Disparaît à la clôture ;
// absent en portugais (Brésil exclu du jeu).
export default function ContestNote({ L, className = "contest-note" }) {
  if (!L || L.pt || !concoursOuvert()) return null;
  return (
    <p className={className}>
      <Link href={L.href(CONCOURS.path)}>
        {L.t(
          "🎄 Bonus Pro : tu participes au tirage du 20 décembre pour gagner une PS5 ou un maillot de Victor Wembanyama. Voir le jeu →",
          "🎄 Pro bonus: you're entered in the December 20 drawing for a PS5 or a Victor Wembanyama jersey. See the giveaway →",
          "🎄 Bonus Pro: participas en el sorteo del 20 de diciembre de una PS5 o una camiseta de Victor Wembanyama. Ver el sorteo →",
          "",
        )}
      </Link>
    </p>
  );
}
