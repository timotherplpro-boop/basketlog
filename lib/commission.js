// Part reversée au créateur : 40 % du montant HORS TVA de chaque paiement des abonnés venus avec son code promo, tant qu'ils restent
// abonnés (offre faite aux créateurs le 13/11/2026). Règle précisée par Tim le 16/11/2026 : on prend ce que l'abonné a payé, on retire
// la TVA de 20 % (montant ÷ 1,2), puis on applique 40 % au résultat. Exemple : 1 000 € payés = 833,33 € hors TVA = 333,33 € pour le
// créateur (soit un tiers du montant payé). La même règle vaut pour les euros et les dollars.
// Un seul endroit où la changer : l'espace admin (lib/admin-stats.js) et la rubrique « Mes gains » des créateurs (lib/creator-report.js)
// affichent ainsi toujours le même montant. Aucune dépendance (tests sous Node).
export const CREATOR_COMMISSION = 0.4;
export const VAT_RATE = 0.2; // TVA comprise dans les prix payés : 13,99 € = 11,66 € hors TVA + 2,33 € de TVA
export const COMMISSION_PCT = Math.round(CREATOR_COMMISSION * 100);
export const VAT_PCT = Math.round(VAT_RATE * 100);

const round2 = (x) => Math.round(x * 100) / 100;
// Montant hors TVA d'un montant payé (TTC) : 1 000 -> 833,33.
export const exVat = (paid, vat = VAT_RATE) => round2(paid / (1 + vat));
// Commission sur un montant payé (TTC) : 40 % du montant hors TVA, arrondi au centime : 1 000 -> 333,33.
export const commissionOf = (paid, rate = CREATOR_COMMISSION, vat = VAT_RATE) => round2(exVat(paid, vat) * rate);
