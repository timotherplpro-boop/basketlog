-- Notifications sur le téléphone (web push, 20/11/2026) : abonnements des visiteurs qui ont accepté de recevoir
-- les matchs du soir. Un abonnement = un navigateur ou une appli installée (adresse d'envoi + clés de chiffrement).
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor). Ajoute une table et quatre fonctions :
-- rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : table fermée au public (RLS, aucun droit pour anon ni authenticated),
-- fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).

create table if not exists public.basketlog_push (
  endpoint   text primary key check (char_length(endpoint) between 20 and 1000 and endpoint like 'https://%'),
  p256dh     text not null check (char_length(p256dh) between 20 and 200),
  auth       text not null check (char_length(auth) between 8 and 100),
  langue     text not null default 'fr' check (langue in ('fr', 'en', 'es', 'pt')),
  uid        text check (uid is null or char_length(uid) between 1 and 80),   -- compte Basketlog, si connecté
  cree_le    timestamptz not null default now(),
  envoye_le  timestamptz,
  echecs     int not null default 0
);

alter table public.basketlog_push enable row level security;
revoke all on table public.basketlog_push from anon, authenticated;

-- Ajoute ou met à jour un abonnement.
create or replace function public.basketlog_push_add(p_key text, p_endpoint text, p_p256dh text, p_auth text, p_langue text, p_uid text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  insert into public.basketlog_push (endpoint, p256dh, auth, langue, uid)
  values (p_endpoint, p_p256dh, p_auth, coalesce(nullif(p_langue, ''), 'fr'), nullif(p_uid, ''))
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, langue = excluded.langue,
    uid = coalesce(excluded.uid, public.basketlog_push.uid), echecs = 0;
  return json_build_object('ok', true);
end $function$;

-- Retire un abonnement (désabonnement, ou adresse refusée par le service d'envoi).
create or replace function public.basketlog_push_remove(p_key text, p_endpoint text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare n int;
begin
  perform public.basketlog_check(p_key);
  with d as (delete from public.basketlog_push x where x.endpoint = p_endpoint returning 1) select count(*) into n from d;
  return json_build_object('ok', true, 'n', n);
end $function$;

-- Tous les abonnements (envoi du jour), au plus 5 000.
create or replace function public.basketlog_push_list(p_key text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  return coalesce((select json_agg(json_build_object('e', x.endpoint, 'k', x.p256dh, 'a', x.auth, 'l', x.langue))
    from (select * from public.basketlog_push order by cree_le limit 5000) x), '[]'::json);
end $function$;

-- Note l'envoi du jour (p_ok) ou un échec ; au 5e échec de suite, l'abonnement est retiré.
create or replace function public.basketlog_push_mark(p_key text, p_endpoint text, p_ok boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  if p_ok then
    update public.basketlog_push set envoye_le = now(), echecs = 0 where endpoint = p_endpoint;
  else
    update public.basketlog_push set echecs = echecs + 1 where endpoint = p_endpoint;
    delete from public.basketlog_push where endpoint = p_endpoint and echecs >= 5;
  end if;
  return json_build_object('ok', true);
end $function$;

revoke all on function public.basketlog_push_add(text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.basketlog_push_remove(text, text) from public, anon, authenticated;
revoke all on function public.basketlog_push_list(text) from public, anon, authenticated;
revoke all on function public.basketlog_push_mark(text, text, boolean) from public, anon, authenticated;
grant execute on function public.basketlog_push_add(text, text, text, text, text, text) to anon, service_role;
grant execute on function public.basketlog_push_remove(text, text) to anon, service_role;
grant execute on function public.basketlog_push_list(text) to anon, service_role;
grant execute on function public.basketlog_push_mark(text, text, boolean) to anon, service_role;

notify pgrst, 'reload schema';
