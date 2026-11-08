-- Basketlog : les liens d'invitation (créateurs et admins) n'expirent plus.
--
-- Avant : un lien d'invitation expirait 30 jours après sa création (valeur par défaut de la colonne expire_le).
-- Après : il reste valable tant qu'il n'a pas servi et que l'admin ne l'a pas annulé (bouton « Annuler »).
-- Il reste à usage unique : une fois activé par un compte, un autre compte ne peut plus l'utiliser.
--
-- Ce que le script change, et rien d'autre :
--   1. la date de fin par défaut des nouveaux liens passe de 30 jours à 100 ans ;
--   2. les liens déjà créés, pas encore utilisés et encore valides reçoivent la même date de fin.
-- Les fonctions existantes (basketlog_admin_inviter, basketlog_admin_list, basketlog_claim) ne sont pas touchées :
-- elles comparent toujours expire_le à l'heure actuelle, et cette date est simplement repoussée.
-- Un lien déjà expiré avant ce script reste expiré. Un code promo n'est jamais touché.
--
-- Relançable sans risque : une deuxième exécution ne change rien.

alter table public.basketlog_invitations
  alter column expire_le set default (now() + interval '100 years');

update public.basketlog_invitations
   set expire_le = now() + interval '100 years'
 where utilise_par is null
   and expire_le > now()
   and expire_le < now() + interval '1 year';
