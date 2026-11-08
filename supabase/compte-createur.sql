-- « Mon compte » pour les créateurs : suppression du compte par le créateur lui-même.
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor), après supabase/compte.sql et supabase/codes-promo.sql
-- (déjà lancés). Ajoute deux fonctions : rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).
--
-- Un membre sans rôle supprime déjà son compte avec basketlog_compte_supprimer (compte.sql), qui refuse tout compte ayant un rôle.
-- Pour un créateur, il faut en plus retirer son accès, son code promo et le lien d'invitation qu'il a activé : une opération
-- en plusieurs étapes, faite ici en une seule transaction (si une étape échoue, rien n'est effacé). Un compte admin n'est
-- jamais supprimé par ces fonctions : un autre admin lui retire d'abord son accès depuis l'espace admin.
--
-- Tant que ce script n'a pas été lancé, un créateur voit « bientôt disponible » à la place du bouton de suppression.

-- Lecture seule : ce compte est-il un créateur, et quels codes promo lui appartiennent ?
-- Le site s'en sert pour afficher le code qui sera désactivé et pour savoir, avant de toucher à Whop, que la suppression est possible.
-- Renvoie { ok: true, codes: [{ code, pct, whop_ok }] }, ou { ok: false, reason: 'pas_createur' | 'admin' }.
create or replace function public.basketlog_createur_infos(p_key text, p_uid text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select r.role into v_role from public.basketlog_roles r where r.uid = p_uid;
  if v_role is null then
    return json_build_object('ok', false, 'reason', 'pas_createur');
  end if;
  if v_role <> 'createur' then
    return json_build_object('ok', false, 'reason', 'admin');
  end if;
  return json_build_object('ok', true, 'codes', coalesce((
    select json_agg(json_build_object('code', p.code, 'pct', p.pct, 'whop_ok', p.whop_ok) order by p.cree_le)
      from public.basketlog_promo p
     where p.uid = p_uid
        or p.inv_code in (select i.code from public.basketlog_invitations i where i.utilise_par = p_uid)
  ), '[]'::json));
end $function$;

-- Supprime un compte créateur : code promo, lien d'invitation activé, accès créateur, puis toutes ses données
-- (analyses, questions, avis, prénom : basketlog_compte_supprimer). Tout ou rien.
-- Renvoie { ok: true, codes: [{ code, pct, whop_ok }], invitations, analyses, questions, avis, profil }, ou
-- { ok: false, reason: 'pas_createur' | 'admin' } sans rien effacer.
-- Les codes supprimés sont renvoyés pour que le site les désactive chez Whop ; l'abonnement éventuel du créateur
-- chez Whop n'est pas touché par cette fonction (le site l'arrête avant de l'appeler).
create or replace function public.basketlog_createur_supprimer(p_key text, p_uid text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_role text;
  v_codes json;
  n_invitations int;
  v_data json;
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  -- La ligne du rôle est verrouillée : deux demandes simultanées ne s'exécutent pas deux fois.
  select r.role into v_role from public.basketlog_roles r where r.uid = p_uid for update;
  if v_role is null then
    return json_build_object('ok', false, 'reason', 'pas_createur');
  end if;
  if v_role <> 'createur' then
    return json_build_object('ok', false, 'reason', 'admin');
  end if;

  -- 1) Code promo : celui du compte, ou celui rattaché au lien d'invitation que ce compte a activé (avant de supprimer ce lien).
  with d as (
    delete from public.basketlog_promo p
     where p.uid = p_uid
        or p.inv_code in (select i.code from public.basketlog_invitations i where i.utilise_par = p_uid)
    returning p.code, p.pct, p.whop_ok, p.cree_le
  )
  select coalesce(json_agg(json_build_object('code', d.code, 'pct', d.pct, 'whop_ok', d.whop_ok) order by d.cree_le), '[]'::json)
    into v_codes from d;

  -- 2) Lien d'invitation activé par ce compte (il garde l'identifiant du créateur et le nom saisi par l'admin).
  with d as (delete from public.basketlog_invitations i where i.utilise_par = p_uid returning 1)
  select count(*) into n_invitations from d;

  -- 3) Accès créateur.
  delete from public.basketlog_roles where uid = p_uid;

  -- 4) Données du compte, comme pour un membre ordinaire. Un échec annule les trois étapes précédentes.
  v_data := public.basketlog_compte_supprimer(p_key, p_uid);
  if not coalesce((v_data ->> 'ok')::boolean, false) then
    raise exception 'effacement impossible';
  end if;

  return json_build_object('ok', true, 'codes', v_codes, 'invitations', n_invitations,
    'analyses', v_data -> 'analyses', 'questions', v_data -> 'questions', 'avis', v_data -> 'avis', 'profil', v_data -> 'profil');
end $function$;

-- Mêmes droits que les autres fonctions basketlog_* : le site les appelle avec la clé publique + la clé serveur (p_key).
revoke all on function public.basketlog_createur_infos(text, text) from public, anon, authenticated;
revoke all on function public.basketlog_createur_supprimer(text, text) from public, anon, authenticated;
grant execute on function public.basketlog_createur_infos(text, text) to anon, service_role;
grant execute on function public.basketlog_createur_supprimer(text, text) to anon, service_role;

notify pgrst, 'reload schema';
