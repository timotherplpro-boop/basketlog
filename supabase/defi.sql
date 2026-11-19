-- Jeu « Bats le modèle » (/app/defi) : choix des vainqueurs des matchs NBA par les membres, comparés au favori du modèle.
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor). Ajoute une table et quatre fonctions :
-- rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : table fermée au public (RLS, aucun droit pour anon ni authenticated),
-- fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).
-- Tant que ce script n'a pas été lancé, le jeu marche quand même : les choix restent dans le navigateur du joueur,
-- et le classement de la semaine affiche « bientôt ».

create table if not exists public.basketlog_defi (
  uid        text not null check (char_length(uid) between 1 and 80),
  d          text not null check (d ~ '^[0-9]{8}$'),                         -- date NBA du match (AAAAMMJJ, heure de New York)
  game_id    text not null check (char_length(game_id) between 1 and 20),     -- identifiant ESPN du match
  pick       text not null check (char_length(pick) between 1 and 10),        -- équipe choisie (identifiant ESPN)
  modele     text check (modele is null or char_length(modele) between 1 and 10), -- favori du modèle au moment du choix
  nom        text check (nom is null or char_length(nom) between 1 and 40),   -- nom affiché dans le classement (« Prénom I. »)
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  primary key (uid, game_id)
);
create index if not exists basketlog_defi_d on public.basketlog_defi (d);

alter table public.basketlog_defi enable row level security;
revoke all on table public.basketlog_defi from anon, authenticated;

-- Enregistre les choix d'un membre (au plus 20 par appel). p_picks : [{"g": "<match>", "p": "<équipe>", "m": "<favori>", "d": "AAAAMMJJ"}].
-- Le site vérifie avant l'appel que chaque match n'a pas commencé et que l'équipe joue ce match.
create or replace function public.basketlog_defi_set(p_key text, p_uid text, p_nom text, p_picks jsonb)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v jsonb;
  n int := 0;
  v_nom text := nullif(left(btrim(coalesce(p_nom, '')), 40), '');
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 or jsonb_typeof(p_picks) <> 'array' or jsonb_array_length(p_picks) > 20 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  for v in select * from jsonb_array_elements(p_picks) loop
    insert into public.basketlog_defi (uid, d, game_id, pick, modele, nom)
    values (p_uid, v->>'d', v->>'g', v->>'p', nullif(v->>'m', ''), v_nom)
    on conflict (uid, game_id) do update set pick = excluded.pick, modele = excluded.modele, nom = excluded.nom, d = excluded.d, modifie_le = now();
    n := n + 1;
  end loop;
  return json_build_object('ok', true, 'n', n);
end $function$;

-- Choix d'un membre entre deux dates NBA (incluses).
create or replace function public.basketlog_defi_get(p_key text, p_uid text, p_from text, p_to text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  if p_uid is null or char_length(p_uid) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  return coalesce((select json_agg(json_build_object('d', x.d, 'g', x.game_id, 'p', x.pick, 'm', x.modele) order by x.d, x.game_id)
    from public.basketlog_defi x where x.uid = p_uid and x.d between p_from and p_to), '[]'::json);
end $function$;

-- Tous les choix entre deux dates (classement de la semaine). uid renvoyé tel quel : le site ne l'affiche jamais.
create or replace function public.basketlog_defi_range(p_key text, p_from text, p_to text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  return coalesce((select json_agg(json_build_object('u', x.uid, 'n', x.nom, 'd', x.d, 'g', x.game_id, 'p', x.pick, 'm', x.modele))
    from (select * from public.basketlog_defi where d between p_from and p_to limit 50000) x), '[]'::json);
end $function$;

-- Efface les choix d'un membre (suppression du compte).
create or replace function public.basketlog_defi_supprimer(p_key text, p_uid text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare n int;
begin
  perform public.basketlog_check(p_key);
  with d as (delete from public.basketlog_defi x where x.uid = p_uid returning 1) select count(*) into n from d;
  return json_build_object('ok', true, 'n', n);
end $function$;

revoke all on function public.basketlog_defi_set(text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.basketlog_defi_get(text, text, text, text) from public, anon, authenticated;
revoke all on function public.basketlog_defi_range(text, text, text) from public, anon, authenticated;
revoke all on function public.basketlog_defi_supprimer(text, text) from public, anon, authenticated;
grant execute on function public.basketlog_defi_set(text, text, text, jsonb) to anon, service_role;
grant execute on function public.basketlog_defi_get(text, text, text, text) to anon, service_role;
grant execute on function public.basketlog_defi_range(text, text, text) to anon, service_role;
grant execute on function public.basketlog_defi_supprimer(text, text) to anon, service_role;

notify pgrst, 'reload schema';
