-- Parcours des visiteurs vers l'abonnement (page Statistiques de l'admin, /app/admin/stats).
--
-- À lancer UNE fois sur la base Supabase de Basketlog (SQL Editor). Ajoute une table et deux fonctions :
-- rien d'existant n'est modifié, et le script peut être relancé sans risque.
-- Même protection que le reste de la base : table fermée au public (RLS, aucun droit pour anon ni authenticated),
-- fonctions appelables seulement avec la clé serveur (p_key, vérifiée par basketlog_check).
--
-- Ce que la base garde : un simple compteur par (jour, étape, source d'arrivée, langue, type d'appareil).
-- Aucune adresse IP, aucun identifiant, aucun cookie (voir lib/funnel.js et app/api/stats/route.js).
-- Les compteurs de plus de 400 jours sont effacés au fil de l'eau.

create table if not exists public.basketlog_stats (
  jour     date not null,
  etape    text not null check (etape in ('visite', 'fiche', 'fenetre', 'pro', 'clic', 'compte', 'retour')),
  source   text not null check (char_length(source) between 1 and 20),
  langue   text not null check (langue in ('fr', 'en', 'es')),
  appareil text not null check (appareil in ('mobile', 'tablette', 'ordinateur')),
  n        int  not null default 0 check (n >= 0),
  primary key (jour, etape, source, langue, appareil)
);

alter table public.basketlog_stats enable row level security;
revoke all on table public.basketlog_stats from anon, authenticated;

-- +1 sur une étape du parcours.
create or replace function public.basketlog_stat_hit(p_key text, p_jour date, p_etape text, p_source text, p_langue text, p_appareil text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  if p_jour is null or p_jour < current_date - 2 or p_jour > current_date + 1 then
    raise exception 'invalid' using errcode = '22023';
  end if;
  insert into public.basketlog_stats (jour, etape, source, langue, appareil, n)
  values (p_jour, p_etape, p_source, p_langue, p_appareil, 1)
  on conflict (jour, etape, source, langue, appareil) do update set n = public.basketlog_stats.n + 1;
  -- ménage occasionnel des vieux compteurs
  if random() < 0.01 then
    delete from public.basketlog_stats where jour < current_date - 400;
  end if;
end $function$;

-- Compteurs depuis une date (pour la page Statistiques).
create or replace function public.basketlog_stats_list(p_key text, p_depuis date)
returns table (jour date, etape text, source text, langue text, appareil text, n int)
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  perform public.basketlog_check(p_key);
  return query
    select s.jour, s.etape, s.source, s.langue, s.appareil, s.n
    from public.basketlog_stats s
    where s.jour >= coalesce(p_depuis, current_date - 120)
    order by s.jour;
end $function$;

revoke all on function public.basketlog_stat_hit(text, date, text, text, text, text) from public, anon, authenticated;
revoke all on function public.basketlog_stats_list(text, date) from public, anon, authenticated;
grant execute on function public.basketlog_stat_hit(text, date, text, text, text, text) to anon, service_role;
grant execute on function public.basketlog_stats_list(text, date) to anon, service_role;
