// Textes du changement de formule partagés par « Mon compte » et la page des formules. Aucune dépendance.

export const TIER_NAME = { starter: "Starter", pro: "Pro", lifetime: "Lifetime" };

// Message de fin : la nouvelle formule est en place, l'ancienne s'arrête à la fin de sa période (ou l'était déjà).
// T : la fonction de traduction du site (français, anglais, espagnol) ; j : réponse « done » de /api/compte ;
// until : date lisible de la fin de période de l'ancien abonnement, ou "".
export function switchDoneText(T, j, until = "") {
  const from = TIER_NAME[j?.from?.tier] || "";
  const to = TIER_NAME[j?.to?.tier] || "";
  return j?.already
    ? T(
      `Changement terminé : tu es passé à ${to}. Ton ancien abonnement ${from} était déjà arrêté : plus aucun prélèvement pour lui.`,
      `Switch complete: you're now on ${to}. Your previous ${from} subscription was already stopped: no further charges for it.`,
      `Cambio completado: ahora estás en ${to}. Tu anterior suscripción ${from} ya estaba detenida: sin más cobros por ella.`
    )
    : T(
      `Changement terminé : tu es passé à ${to}. Ton ancien abonnement ${from} s'arrête ${until ? `le ${until}` : "à la fin de sa période"} : tu le gardes jusque-là, puis plus aucun prélèvement.`,
      `Switch complete: you're now on ${to}. Your previous ${from} subscription stops ${until ? `on ${until}` : "at the end of its period"}: you keep it until then, with no further charges after that.`,
      `Cambio completado: ahora estás en ${to}. Tu anterior suscripción ${from} se detiene ${until ? `el ${until}` : "al final de su periodo"}: la conservas hasta entonces y después no habrá más cobros.`
    );
}
