-- Comptes Basketlog par e-mail (mot de passe) ou par Google, comme l'inscription de Visifoot :
-- le visiteur crée un compte gratuit avant de voir une analyse, puis s'abonne chez Whop.
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor), après supabase/compte.sql (déjà lancé).
-- Ajoute 3 tables et 15 fonctions : rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : tables fermées au public (RLS, aucun droit pour anon ni authenticated),
-- fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).
--
-- Ce que la base garde : l'adresse e-mail, l'empreinte du mot de passe (calculée par le site avec scrypt : le mot de
-- passe lui-même n'est jamais envoyé ici), l'identifiant Google du compte s'il se connecte avec Google, le prénom donné
-- par Google, la langue, le compte Whop relié après paiement, les dates de création et de dernière connexion.
-- Les liens « mot de passe oublié » ne sont gardés que sous forme d'empreinte, 1 heure. La colonne « marketing » est
-- réservée et reste à faux : l'accord pour la newsletter est gardé chez Resend, pas ici.
-- Dans le reste de la base, un compte e-mail a pour identifiant « bl_ » suivi de son id (analyses, questions, avis,
-- prénom choisi, rôle), comme un compte Whop a son identifiant Whop.
--
-- sv (version de session) : chaque session du site garde ce numéro ; il augmente quand le mot de passe change ou qu'un
-- ancien mot de passe jamais vérifié est retiré, ce qui déconnecte les autres appareils à leur prochaine vérification.
-- email_ok : l'adresse est prouvée (connexion Google avec une adresse vérifiée par Google, ou lien reçu par e-mail).

create table if not exists public.basketlog_comptes (
  id            uuid primary key default gen_random_uuid(),
  email         text not null check (char_length(email) between 3 and 254),
  mdp           text check (mdp is null or char_length(mdp) between 20 and 300),        -- empreinte scrypt
  google_sub    text check (google_sub is null or char_length(google_sub) between 1 and 255),
  nom           text check (nom is null or char_length(nom) between 1 and 80),          -- prénom donné par Google
  whop_uid      text check (whop_uid is null or char_length(whop_uid) between 1 and 80), -- compte Whop relié (abonnement)
  langue        text check (langue is null or langue in ('fr', 'en', 'es')),
  marketing     boolean not null default false,                                         -- réservé (pas utilisé par le site)
  marketing_le  timestamptz,
  sv            int not null default 1,
  email_ok      boolean not null default false,
  cree_le       timestamptz not null default now(),
  vu_le         timestamptz
);
alter table public.basketlog_comptes add column if not exists sv int not null default 1;
alter table public.basketlog_comptes add column if not exists email_ok boolean not null default false;
create unique index if not exists basketlog_comptes_email_uniq on public.basketlog_comptes (lower(email));
create unique index if not exists basketlog_comptes_google_uniq on public.basketlog_comptes (google_sub) where google_sub is not null;
create unique index if not exists basketlog_comptes_whop_uniq on public.basketlog_comptes (whop_uid) where whop_uid is not null;
create index if not exists basketlog_comptes_cree on public.basketlog_comptes (cree_le);

create table if not exists public.basketlog_reinit (
  jeton    text primary key check (jeton ~ '^[0-9a-f]{64}$'),   -- empreinte sha256 du lien envoyé par e-mail
  compte   uuid not null references public.basketlog_comptes (id) on delete cascade,
  expire   timestamptz not null,
  utilise  timestamptz
);
create index if not exists basketlog_reinit_compte on public.basketlog_reinit (compte);

create table if not exists public.basketlog_tentatives (
  cle      text not null check (char_length(cle) between 1 and 120),  -- action + empreinte de l'e-mail ou de l'adresse IP
  fenetre  timestamptz not null,
  n        int not null default 0,
  primary key (cle, fenetre)
);
create index if not exists basketlog_tentatives_fenetre on public.basketlog_tentatives (fenetre);

alter table public.basketlog_comptes enable row level security;
alter table public.basketlog_reinit enable row level security;
alter table public.basketlog_tentatives enable row level security;
revoke all on table public.basketlog_comptes from anon, authenticated;
revoke all on table public.basketlog_reinit from anon, authenticated;
revoke all on table public.basketlog_tentatives from anon, authenticated;

-- Adresse e-mail normalisée (minuscules, sans espaces autour) ou null si elle n'a pas la forme d'une adresse.
create or replace function public.basketlog_email_norm(p_email text)
returns text
language sql
immutable
set search_path to 'public'
as $function$
  select case
    when p_email is null then null
    when char_length(btrim(p_email)) not between 3 and 254 then null
    when lower(btrim(p_email)) !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then null
    else lower(btrim(p_email))
  end
$function$;

-- Inscription par e-mail et mot de passe. Renvoie { ok, id, email, sv }, ou { ok: false, reason: 'existe', google }
-- (google : ce compte se connecte avec Google et n'a pas de mot de passe) ou { ok: false, reason: 'invalide' }.
create or replace function public.basketlog_compte_inscrire(p_key text, p_email text, p_mdp text, p_langue text, p_marketing boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := public.basketlog_email_norm(p_email);
  r record;
  v_id uuid;
begin
  perform public.basketlog_check(p_key);
  if v_email is null or p_mdp is null or char_length(p_mdp) not between 20 and 300 then
    return json_build_object('ok', false, 'reason', 'invalide');
  end if;
  select c.mdp, c.google_sub into r from public.basketlog_comptes c where lower(c.email) = v_email;
  if found then
    return json_build_object('ok', false, 'reason', 'existe', 'google', r.mdp is null and r.google_sub is not null);
  end if;
  insert into public.basketlog_comptes (email, mdp, langue, marketing, marketing_le, vu_le)
  values (v_email, p_mdp, case when p_langue in ('fr', 'en', 'es') then p_langue end, coalesce(p_marketing, false),
          case when p_marketing then now() end, now())
  returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'email', v_email, 'sv', 1);
exception when unique_violation then
  return json_build_object('ok', false, 'reason', 'existe', 'google', false);
end $function$;

-- Compte d'une adresse e-mail, pour la connexion : le site vérifie lui-même le mot de passe avec l'empreinte.
-- Renvoie null si l'adresse n'a pas de compte.
create or replace function public.basketlog_compte_email(p_key text, p_email text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := public.basketlog_email_norm(p_email);
  r record;
begin
  perform public.basketlog_check(p_key);
  if v_email is null then return null; end if;
  select c.* into r from public.basketlog_comptes c where lower(c.email) = v_email;
  if not found then return null; end if;
  return json_build_object('id', r.id, 'email', r.email, 'mdp', r.mdp, 'nom', r.nom, 'whop_uid', r.whop_uid,
    'google', r.google_sub is not null, 'sv', r.sv);
end $function$;

-- Connexion ou inscription avec Google (jeton vérifié par le site auprès de Google). Retrouve le compte par son identifiant
-- Google, sinon par son adresse e-mail si Google la dit vérifiée (le compte e-mail existant est alors relié à Google), sinon
-- crée le compte. Relier Google à un compte dont l'adresse n'avait jamais été prouvée retire son mot de passe et déconnecte
-- ses autres sessions : quelqu'un aurait pu créer ce compte avec l'adresse d'un autre avant lui.
-- Renvoie { ok, id, email, sv, nouveau, mdp_retire } ou { ok: false, reason: 'email_non_verifie' | 'invalide' }.
create or replace function public.basketlog_compte_google(p_key text, p_sub text, p_email text, p_verifie boolean, p_nom text, p_langue text, p_marketing boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := public.basketlog_email_norm(p_email);
  v_nom text := nullif(left(btrim(regexp_replace(coalesce(p_nom, ''), '\s+', ' ', 'g')), 80), '');
  r record;
  v_id uuid;
  v_retire boolean := false;
begin
  perform public.basketlog_check(p_key);
  if p_sub is null or char_length(p_sub) not between 1 and 255 or v_email is null then
    return json_build_object('ok', false, 'reason', 'invalide');
  end if;
  select c.* into r from public.basketlog_comptes c where c.google_sub = p_sub for update;
  if found then
    update public.basketlog_comptes set vu_le = now(), nom = coalesce(nom, v_nom) where id = r.id;
    return json_build_object('ok', true, 'id', r.id, 'email', r.email, 'sv', r.sv, 'nouveau', false, 'mdp_retire', false);
  end if;
  if not coalesce(p_verifie, false) then
    return json_build_object('ok', false, 'reason', 'email_non_verifie');
  end if;
  select c.* into r from public.basketlog_comptes c where lower(c.email) = v_email for update;
  if found then
    v_retire := r.mdp is not null and not r.email_ok;
    update public.basketlog_comptes
      set google_sub = p_sub, email_ok = true, vu_le = now(), nom = coalesce(nom, v_nom),
          mdp = case when v_retire then null else mdp end,
          sv = case when v_retire then sv + 1 else sv end
      where id = r.id;
    if v_retire then delete from public.basketlog_reinit where compte = r.id; end if;
    return json_build_object('ok', true, 'id', r.id, 'email', r.email, 'sv', case when v_retire then r.sv + 1 else r.sv end,
      'nouveau', false, 'mdp_retire', v_retire);
  end if;
  insert into public.basketlog_comptes (email, google_sub, nom, langue, marketing, marketing_le, email_ok, vu_le)
  values (v_email, p_sub, v_nom, case when p_langue in ('fr', 'en', 'es') then p_langue end, coalesce(p_marketing, false),
          case when p_marketing then now() end, true, now())
  returning id into v_id;
  return json_build_object('ok', true, 'id', v_id, 'email', v_email, 'sv', 1, 'nouveau', true, 'mdp_retire', false);
exception when unique_violation then
  return json_build_object('ok', false, 'reason', 'invalide');
end $function$;

-- Fiche d'un compte (sans l'empreinte du mot de passe), ou null s'il n'existe plus.
create or replace function public.basketlog_compte_get(p_key text, p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
begin
  perform public.basketlog_check(p_key);
  select c.* into r from public.basketlog_comptes c where c.id = p_id;
  if not found then return null; end if;
  return json_build_object('id', r.id, 'email', r.email, 'nom', r.nom, 'whop_uid', r.whop_uid, 'langue', r.langue,
    'marketing', r.marketing, 'google', r.google_sub is not null, 'mdp', r.mdp is not null, 'sv', r.sv,
    'email_ok', r.email_ok, 'cree_le', r.cree_le);
end $function$;

-- Dernière connexion (connexion par e-mail réussie).
create or replace function public.basketlog_compte_vu(p_key text, p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  update public.basketlog_comptes set vu_le = now() where id = p_id;
end $function$;

-- Relie le compte Whop qui a payé (connexion Whop juste après le paiement). Un compte Whop ne peut être relié qu'à un
-- seul compte Basketlog. Renvoie { ok } ou { ok: false, reason: 'autre_compte' | 'introuvable' }.
create or replace function public.basketlog_compte_lier_whop(p_key text, p_id uuid, p_whop text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  if p_whop is null or char_length(p_whop) not between 1 and 80 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if exists (select 1 from public.basketlog_comptes c where c.whop_uid = p_whop and c.id <> p_id) then
    return json_build_object('ok', false, 'reason', 'autre_compte');
  end if;
  update public.basketlog_comptes set whop_uid = p_whop where id = p_id;
  if not found then return json_build_object('ok', false, 'reason', 'introuvable'); end if;
  return json_build_object('ok', true);
exception when unique_violation then
  return json_build_object('ok', false, 'reason', 'autre_compte');
end $function$;

-- Nouveau mot de passe (empreinte), depuis « Mon compte » : les autres appareils sont déconnectés (sv + 1).
-- Renvoie { ok, sv } ou { ok: false, reason: 'introuvable' }.
create or replace function public.basketlog_compte_mdp(p_key text, p_id uuid, p_mdp text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sv int;
begin
  perform public.basketlog_check(p_key);
  if p_mdp is null or char_length(p_mdp) not between 20 and 300 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  update public.basketlog_comptes set mdp = p_mdp, sv = sv + 1 where id = p_id returning sv into v_sv;
  if not found then return json_build_object('ok', false, 'reason', 'introuvable'); end if;
  delete from public.basketlog_reinit where compte = p_id;
  return json_build_object('ok', true, 'sv', v_sv);
end $function$;

-- Accord pour recevoir des e-mails (analyses du soir, offres), modifiable dans « Mon compte ».
create or replace function public.basketlog_compte_marketing(p_key text, p_id uuid, p_ok boolean)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  update public.basketlog_comptes set marketing = coalesce(p_ok, false), marketing_le = now() where id = p_id;
  if not found then return json_build_object('ok', false, 'reason', 'introuvable'); end if;
  return json_build_object('ok', true, 'marketing', coalesce(p_ok, false));
end $function$;

-- « Mot de passe oublié » : enregistre l'empreinte du lien (valable p_minutes) et renvoie l'adresse, la langue et le
-- prénom du compte pour l'e-mail, ou null si l'adresse n'a pas de compte (le site répond pareil dans les deux cas).
-- Un nouveau lien remplace les précédents.
create or replace function public.basketlog_reinit_creer(p_key text, p_email text, p_jeton text, p_minutes int)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text := public.basketlog_email_norm(p_email);
  r record;
begin
  perform public.basketlog_check(p_key);
  if p_jeton is null or p_jeton !~ '^[0-9a-f]{64}$' or p_minutes is null or p_minutes not between 5 and 1440 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  if v_email is null then return null; end if;
  select c.* into r from public.basketlog_comptes c where lower(c.email) = v_email;
  if not found then return null; end if;
  delete from public.basketlog_reinit where compte = r.id or expire < now() - interval '1 day';
  insert into public.basketlog_reinit (jeton, compte, expire) values (p_jeton, r.id, now() + make_interval(mins => p_minutes));
  return json_build_object('id', r.id, 'email', r.email, 'langue', r.langue, 'nom', r.nom);
end $function$;

-- Le lien « mot de passe oublié » est-il encore valable ? (page qui demande le nouveau mot de passe)
create or replace function public.basketlog_reinit_valide(p_key text, p_jeton text)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  return exists (select 1 from public.basketlog_reinit t where t.jeton = p_jeton and t.utilise is null and t.expire > now());
end $function$;

-- Utilise un lien « mot de passe oublié » : nouveau mot de passe si le lien est valable et pas encore utilisé. L'adresse est
-- alors prouvée (email_ok) et les autres appareils sont déconnectés (sv + 1). Le lien ne sert qu'une fois.
-- Renvoie { ok, id, email, nom, whop_uid, sv } ou { ok: false, reason: 'invalide' }.
create or replace function public.basketlog_reinit_utiliser(p_key text, p_jeton text, p_mdp text)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  c record;
begin
  perform public.basketlog_check(p_key);
  if p_mdp is null or char_length(p_mdp) not between 20 and 300 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  select t.* into r from public.basketlog_reinit t where t.jeton = p_jeton and t.utilise is null and t.expire > now()
  for update;
  if not found then return json_build_object('ok', false, 'reason', 'invalide'); end if;
  update public.basketlog_comptes set mdp = p_mdp, sv = sv + 1, email_ok = true, vu_le = now()
    where id = r.compte returning * into c;
  delete from public.basketlog_reinit where compte = r.compte;
  if c.id is null then return json_build_object('ok', false, 'reason', 'invalide'); end if;
  return json_build_object('ok', true, 'id', c.id, 'email', c.email, 'nom', c.nom, 'whop_uid', c.whop_uid, 'sv', c.sv);
end $function$;

-- Limite d'essais (connexion, inscription, mot de passe oublié) : compte un essai pour la clé dans la tranche de
-- p_minutes en cours et dit s'il reste sous p_max. Les vieilles tranches sont effacées au passage.
create or replace function public.basketlog_tentative(p_key text, p_cle text, p_max int, p_minutes int)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_fen timestamptz;
  v_n int;
begin
  perform public.basketlog_check(p_key);
  if p_cle is null or char_length(p_cle) not between 1 and 120 or p_max is null or p_max not between 1 and 10000
     or p_minutes is null or p_minutes not between 1 and 1440 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  v_fen := to_timestamp(floor(extract(epoch from now()) / (p_minutes * 60)) * (p_minutes * 60));
  insert into public.basketlog_tentatives (cle, fenetre, n) values (p_cle, v_fen, 1)
  on conflict (cle, fenetre) do update set n = public.basketlog_tentatives.n + 1
  returning n into v_n;
  delete from public.basketlog_tentatives where fenetre < now() - interval '2 days';
  return v_n <= p_max;
end $function$;

-- Supprime un compte e-mail et tout ce que Basketlog garde sur lui (analyses, questions, avis, prénom choisi : fonction
-- basketlog_compte_supprimer de compte.sql), puis le compte lui-même. Refusé si ce compte, ou le compte Whop qui lui est
-- relié, a un rôle (admin, créateur) : un créateur passe d'abord par basketlog_createur_supprimer (compte-createur.sql).
-- L'abonnement Whop est arrêté avant par le site. Renvoie le nombre de lignes effacées, ou { ok: false, reason }.
create or replace function public.basketlog_compte_email_supprimer(p_key text, p_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  r record;
  v_res json;
begin
  perform public.basketlog_check(p_key);
  select c.* into r from public.basketlog_comptes c where c.id = p_id for update;
  if not found then return json_build_object('ok', false, 'reason', 'introuvable'); end if;
  if r.whop_uid is not null and exists (select 1 from public.basketlog_roles x where x.uid = r.whop_uid) then
    return json_build_object('ok', false, 'reason', 'role_whop');
  end if;
  v_res := public.basketlog_compte_supprimer(p_key, 'bl_' || p_id::text);
  if not coalesce((v_res ->> 'ok')::boolean, false) then return v_res; end if;
  delete from public.basketlog_comptes where id = p_id;
  return (v_res::jsonb || jsonb_build_object('compte', 1))::json;
end $function$;

-- Admin : comptes créés (les plus récents d'abord) et chiffres, pour l'espace admin et l'export des e-mails.
create or replace function public.basketlog_admin_comptes(p_key text, p_limite int)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  return json_build_object(
    'total', (select count(*) from public.basketlog_comptes),
    'marketing', (select count(*) from public.basketlog_comptes where marketing),
    'google', (select count(*) from public.basketlog_comptes where google_sub is not null),
    'abonnes_relies', (select count(*) from public.basketlog_comptes where whop_uid is not null),
    'jours', (select coalesce(json_agg(d order by d.jour), '[]'::json) from (
      select to_char(date_trunc('day', cree_le at time zone 'Europe/Paris'), 'YYYY-MM-DD') as jour, count(*) as n
      from public.basketlog_comptes where cree_le > now() - interval '30 days' group by 1) d),
    'comptes', (select coalesce(json_agg(c), '[]'::json) from (
      select email, nom, langue, marketing, google_sub is not null as google, whop_uid is not null as abonne_relie, cree_le, vu_le
      from public.basketlog_comptes order by cree_le desc limit greatest(1, least(coalesce(p_limite, 200), 5000))) c)
  );
end $function$;

-- Mêmes droits que les autres fonctions basketlog_* : le site les appelle avec la clé publique + la clé serveur (p_key).
revoke all on function public.basketlog_email_norm(text) from public, anon, authenticated;
revoke all on function public.basketlog_compte_inscrire(text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function public.basketlog_compte_email(text, text) from public, anon, authenticated;
revoke all on function public.basketlog_compte_google(text, text, text, boolean, text, text, boolean) from public, anon, authenticated;
revoke all on function public.basketlog_compte_get(text, uuid) from public, anon, authenticated;
revoke all on function public.basketlog_compte_vu(text, uuid) from public, anon, authenticated;
revoke all on function public.basketlog_compte_lier_whop(text, uuid, text) from public, anon, authenticated;
revoke all on function public.basketlog_compte_mdp(text, uuid, text) from public, anon, authenticated;
revoke all on function public.basketlog_compte_marketing(text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.basketlog_reinit_creer(text, text, text, int) from public, anon, authenticated;
revoke all on function public.basketlog_reinit_valide(text, text) from public, anon, authenticated;
revoke all on function public.basketlog_reinit_utiliser(text, text, text) from public, anon, authenticated;
revoke all on function public.basketlog_tentative(text, text, int, int) from public, anon, authenticated;
revoke all on function public.basketlog_compte_email_supprimer(text, uuid) from public, anon, authenticated;
revoke all on function public.basketlog_admin_comptes(text, int) from public, anon, authenticated;
grant execute on function public.basketlog_compte_inscrire(text, text, text, text, boolean) to anon, service_role;
grant execute on function public.basketlog_compte_email(text, text) to anon, service_role;
grant execute on function public.basketlog_compte_google(text, text, text, boolean, text, text, boolean) to anon, service_role;
grant execute on function public.basketlog_compte_get(text, uuid) to anon, service_role;
grant execute on function public.basketlog_compte_vu(text, uuid) to anon, service_role;
grant execute on function public.basketlog_compte_lier_whop(text, uuid, text) to anon, service_role;
grant execute on function public.basketlog_compte_mdp(text, uuid, text) to anon, service_role;
grant execute on function public.basketlog_compte_marketing(text, uuid, boolean) to anon, service_role;
grant execute on function public.basketlog_reinit_creer(text, text, text, int) to anon, service_role;
grant execute on function public.basketlog_reinit_valide(text, text) to anon, service_role;
grant execute on function public.basketlog_reinit_utiliser(text, text, text) to anon, service_role;
grant execute on function public.basketlog_tentative(text, text, int, int) to anon, service_role;
grant execute on function public.basketlog_compte_email_supprimer(text, uuid) to anon, service_role;
grant execute on function public.basketlog_admin_comptes(text, int) to anon, service_role;

notify pgrst, 'reload schema';
