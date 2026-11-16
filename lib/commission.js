// Part reversée au créateur : 40 % de chaque paiement des abonnés venus avec son code promo, tant qu'ils restent abonnés
// (offre faite aux créateurs le 13/11/2026). Un seul endroit où la changer : l'espace admin (lib/admin-stats.js) et la rubrique
// « Mes gains » des créateurs (lib/creator-report.js) affichent ainsi toujours le même montant. Aucune dépendance (tests sous Node).
export const CREATOR_COMMISSION = 0.4;
export const COMMISSION_PCT = Math.round(CREATOR_COMMISSION * 100);
