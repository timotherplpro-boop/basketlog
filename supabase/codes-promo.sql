-- Codes promo des créateurs : chaque créateur reçoit un code et une remise (en %) choisis dans l'espace admin.
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor). Ajoute une table et quatre fonctions :
-- rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : table fermée au public (RLS, aucun droit pour anon ni authenticated),
-- fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).
--
-- Le code est celui que le client saisit sur la page de paiement Whop : il doit aussi être créé chez Whop
-- (Codes promo > Créer un code promo) ; whop_ok sert à se souvenir que c'est fait.

create table if not exists public.basketlog_promo (
  id         uuid primary key default gen_random_uuid(),
  code       text not null check (code ~ '^[A-Z0-9]{3,24}$'),   -- majuscules et chiffres, sans espace
  pct        smallint not null check (pct between 1 and 90),    -- remise pour l'acheteur, en %
  uid        text,                                              -- compte du créateur (rôle), quand il en a un
  inv_code   text,                                              -- invitation d'origine (retrouve le compte une fois le lien activé)
  nom        text,                                              -- nom du créateur au moment de la création (repère d'affichage)
  whop_ok    boolean not null default false,                    -- le code existe chez Whop
  cree_le    timestamptz not null default now(),
  modifie_le timestamptz not null default now(),
  constraint basketlog_promo_cible check (uid is not null or inv_code is not null)
);

create unique index if not exists basketlog_promo_code_uniq on public.basketlog_promo (code);
create unique index if not exists basketlog_promo_uid_uniq  on public.basketlog_promo (uid) where uid is not null;
create unique index if not exists basketlog_promo_inv_uniq  on public.basketlog_promo (inv_code) where inv_code is not null;

alter table public.basketlog_promo enable row level security;
revoke all on table public.basketlog_promo from anon, authenticated;

-- Liste des codes. uid : le compte du créateur, retrouvé par l'invitation qu'il a activée quand la ligne n'en porte pas.
create or replace function public.basketlog_admin_promos(p_key text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  return coalesce((
    select json_agg(json_build_object(
      'id', p.id, 'code', p.code, 'pct', p.pct, 'nom', p.nom,
      'uid', coalesce(p.uid, i.utilise_par), 'inv_code', p.inv_code,
      'whop_ok', p.whop_ok, 'cree_le', p.cree_le, 'modifie_le', p.modifie_le
    ) order by p.cree_le)
    from public.basketlog_promo p
    left join public.basketlog_invitations i on i.code = p.inv_code
  ), '[]'::json);
end $function$;

-- Crée ou modifie le code d'un créateur (par compte, ou par invitation tant que le lien n'est pas activé).
-- Un changement de code ou de remise remet whop_ok à faux (le code doit être refait chez Whop) et renvoie l'ancien.
create or replace function public.basketlog_admin_promo_set(p_key text, p_uid text, p_inv_code text, p_code text, p_pct integer, p_nom text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_old public.basketlog_promo;
  v_id uuid;
begin
  perform public.basketlog_check(p_key);
  if v_code !~ '^[A-Z0-9]{3,24}$' or p_pct is null or p_pct not between 1 and 90
     or (p_uid is null and p_inv_code is null)
     or length(coalesce(p_uid, '')) > 80 or length(coalesce(p_inv_code, '')) > 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select * into v_old from public.basketlog_promo p
   where (p_uid is not null and (p.uid = p_uid
            or p.inv_code in (select i.code from public.basketlog_invitations i where i.utilise_par = p_uid)))
      or (p_inv_code is not null and p.inv_code = p_inv_code)
   order by p.cree_le
   limit 1
   for update;
  if exists (select 1 from public.basketlog_promo p where p.code = v_code and p.id is distinct from v_old.id) then
    return json_build_object('ok', false, 'reason', 'code_pris');
  end if;
  if v_old.id is null then
    insert into public.basketlog_promo (code, pct, uid, inv_code, nom)
    values (v_code, p_pct, p_uid, p_inv_code, nullif(left(btrim(coalesce(p_nom, '')), 80), ''))
    returning id into v_id;
    return json_build_object('ok', true, 'id', v_id, 'ancien', null);
  end if;
  update public.basketlog_promo
     set code = v_code,
         pct = p_pct,
         whop_ok = case when v_old.code = v_code and v_old.pct = p_pct then v_old.whop_ok else false end,
         uid = coalesce(p_uid, uid),
         modifie_le = now()
   where id = v_old.id;
  return json_build_object('ok', true, 'id', v_old.id,
    'ancien', case when v_old.code = v_code and v_old.pct = p_pct then null
                   else json_build_object('code', v_old.code, 'pct', v_old.pct, 'whop_ok', v_old.whop_ok) end);
exception when unique_violation then
  return json_build_object('ok', false, 'reason', 'code_pris');
end $function$;

-- Note « code créé chez Whop » (ou non).
create or replace function public.basketlog_admin_promo_whop(p_key text, p_id uuid, p_ok boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  update public.basketlog_promo set whop_ok = coalesce(p_ok, false), modifie_le = now() where id = p_id;
  return json_build_object('ok', found);
end $function$;

-- Supprime le code d'un créateur (compte retiré, invitation annulée ou code abandonné) et renvoie ce qui a été supprimé.
create or replace function public.basketlog_admin_promo_off(p_key text, p_uid text, p_inv_code text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_del json;
begin
  perform public.basketlog_check(p_key);
  if p_uid is null and p_inv_code is null then
    raise exception 'invalid' using errcode = '22023';
  end if;
  with d as (
    delete from public.basketlog_promo p
     where (p_uid is not null and (p.uid = p_uid
              or p.inv_code in (select i.code from public.basketlog_invitations i where i.utilise_par = p_uid)))
        or (p_inv_code is not null and p.inv_code = p_inv_code)
    returning p.code, p.pct, p.whop_ok
  )
  select coalesce(json_agg(json_build_object('code', d.code, 'pct', d.pct, 'whop_ok', d.whop_ok)), '[]'::json) into v_del from d;
  return json_build_object('ok', true, 'supprimes', v_del);
end $function$;

-- Mêmes droits que les autres fonctions basketlog_* : le site les appelle avec la clé publique + la clé serveur (p_key).
revoke all on function public.basketlog_admin_promos(text) from public, anon, authenticated;
revoke all on function public.basketlog_admin_promo_set(text, text, text, text, integer, text) from public, anon, authenticated;
revoke all on function public.basketlog_admin_promo_whop(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.basketlog_admin_promo_off(text, text, text) from public, anon, authenticated;
grant execute on function public.basketlog_admin_promos(text) to anon, service_role;
grant execute on function public.basketlog_admin_promo_set(text, text, text, text, integer, text) to anon, service_role;
grant execute on function public.basketlog_admin_promo_whop(text, uuid, boolean) to anon, service_role;
grant execute on function public.basketlog_admin_promo_off(text, text, text) to anon, service_role;

notify pgrst, 'reload schema';
