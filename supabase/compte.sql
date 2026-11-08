-- « Mon compte » : prénom choisi par le membre et effacement de ses données Basketlog.
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor). Ajoute une table et trois fonctions :
-- rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : table fermée au public (RLS, aucun droit pour anon ni authenticated),
-- fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).
--
-- Tant que ce script n'a pas été lancé, la page « Mon compte » fonctionne déjà pour l'abonnement (résilier, reprendre) ;
-- le choix du prénom et la suppression du compte affichent « bientôt disponible ».

create table if not exists public.basketlog_profils (
  uid        text primary key check (char_length(uid) between 1 and 80),
  nom        text not null check (char_length(btrim(nom)) between 2 and 40),   -- prénom affiché dans le site
  modifie_le timestamptz not null default now()
);

alter table public.basketlog_profils enable row level security;
revoke all on table public.basketlog_profils from anon, authenticated;

-- Prénom choisi par ce compte, ou null.
create or replace function public.basketlog_profil_get(p_key text, p_uid text)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  return (select p.nom from public.basketlog_profils p where p.uid = p_uid);
end $function$;

-- Enregistre le prénom (2 à 40 caractères) ; un prénom vide efface le choix : le site reprend le nom du compte Whop.
create or replace function public.basketlog_profil_set(p_key text, p_uid text, p_nom text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_nom text := nullif(btrim(regexp_replace(coalesce(p_nom, ''), '\s+', ' ', 'g')), '');
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_nom is null then
    delete from public.basketlog_profils where uid = p_uid;
    return json_build_object('ok', true, 'nom', null);
  end if;
  if char_length(v_nom) not between 2 and 40 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  insert into public.basketlog_profils (uid, nom) values (p_uid, v_nom)
  on conflict (uid) do update set nom = excluded.nom, modifie_le = now();
  return json_build_object('ok', true, 'nom', v_nom);
end $function$;

-- Efface tout ce que Basketlog garde sur ce compte : analyses et questions (compteurs et historique, y compris les
-- aperçus d'admin), avis déposé et prénom choisi. Un compte admin ou créateur (rôle) n'est jamais effacé ici : il faut
-- d'abord lui retirer son rôle. Renvoie le nombre de lignes effacées par table.
-- L'abonnement chez Whop n'est pas touché par cette fonction : c'est le site qui l'arrête avant de l'appeler.
create or replace function public.basketlog_compte_supprimer(p_key text, p_uid text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  n_analyses int;
  n_questions int;
  n_avis int;
  n_profil int;
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if exists (select 1 from public.basketlog_roles r where r.uid = p_uid) then
    return json_build_object('ok', false, 'reason', 'role');
  end if;

  with d as (delete from public.basketlog_analyses a where a.uid = p_uid or starts_with(a.uid, p_uid || '~apercu-') returning 1)
  select count(*) into n_analyses from d;
  with d as (delete from public.basketlog_questions q where q.uid = p_uid or starts_with(q.uid, p_uid || '~apercu-') returning 1)
  select count(*) into n_questions from d;
  with d as (delete from public.basketlog_avis v where v.uid = p_uid returning 1)
  select count(*) into n_avis from d;
  with d as (delete from public.basketlog_profils p where p.uid = p_uid returning 1)
  select count(*) into n_profil from d;

  return json_build_object('ok', true, 'analyses', n_analyses, 'questions', n_questions, 'avis', n_avis, 'profil', n_profil);
end $function$;

-- Mêmes droits que les autres fonctions basketlog_* : le site les appelle avec la clé publique + la clé serveur (p_key).
revoke all on function public.basketlog_profil_get(text, text) from public, anon, authenticated;
revoke all on function public.basketlog_profil_set(text, text, text) from public, anon, authenticated;
revoke all on function public.basketlog_compte_supprimer(text, text) from public, anon, authenticated;
grant execute on function public.basketlog_profil_get(text, text) to anon, service_role;
grant execute on function public.basketlog_profil_set(text, text, text) to anon, service_role;
grant execute on function public.basketlog_compte_supprimer(text, text) to anon, service_role;

notify pgrst, 'reload schema';
