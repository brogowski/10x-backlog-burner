-- migration: establish core backlog burner domain schema
-- purpose: create enums, tables, indexes, partitioning, and rls policies for games, profiles, user_games, import_jobs, and analytics_events
-- notes: requires pg_trgm, unaccent, and pgcrypto extensions; partitions analytics_events monthly and locks down access using supabase roles

set statement_timeout to 0;
set lock_timeout to 0;

-- ensure required extensions exist for text search, accent folding, and uuid generation
create extension if not exists pg_trgm with schema public;
create extension if not exists unaccent with schema public;

create or replace function public.immutable_unaccent(input text)
returns text
language sql
immutable
strict
parallel safe
as $$
    select public.unaccent('public.unaccent'::regdictionary, input);
$$;

do $$
begin
    create type public.game_play_status as enum ('backlog', 'in_progress', 'completed', 'removed');
exception
    when duplicate_object then
        null;
end;
$$;

do $$
begin
    create type public.import_job_status as enum ('pending', 'running', 'succeeded', 'failed');
exception
    when duplicate_object then
        null;
end;
$$;

create or replace function public.ensure_policy(
    policy_name text,
    schema_name text,
    table_name text,
    policy_sql text
)
returns void
language plpgsql
as $$
begin
    if not exists (
        select 1
        from pg_policies
        where policyname = policy_name
          and schemaname = schema_name
          and tablename = table_name
    ) then
        execute policy_sql;
    end if;
end;
$$;

-- main catalog of steam games tracked by the application
create table if not exists public.games (
    steam_app_id bigint primary key,
    title text not null,
    slug text not null,
    genres text[] not null default '{}'::text[],
    release_date date,
    popularity_score smallint,
    achievements_total smallint check (achievements_total >= 0),
    artwork_url text,
    last_imported_at timestamptz,
    search_tsv tsvector generated always as (
        setweight(to_tsvector('simple', title), 'A') ||
        setweight(array_to_tsvector(genres), 'B')
    ) stored,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint games_slug_key unique (slug)
);

create index if not exists games_title_trgm_idx on public.games using gin (title gin_trgm_ops);
create index if not exists games_search_tsv_idx on public.games using gin (search_tsv);
create index if not exists games_release_date_idx on public.games (release_date desc);

-- enable row level security and force all access through defined policies
alter table public.games enable row level security;
alter table public.games force row level security;

select public.ensure_policy(
    'games_select_anon',
    'public',
    'games',
    $policy$
        create policy games_select_anon on public.games
            for select
            to anon
            using (true);
    $policy$
);

-- authenticated users share the same read access guarantees
select public.ensure_policy(
    'games_select_authenticated',
    'public',
    'games',
    $policy$
        create policy games_select_authenticated on public.games
            for select
            to authenticated
            using (true);
    $policy$
);

-- service role manages catalog ingestion and curation lifecycle
select public.ensure_policy(
    'games_insert_service_role',
    'public',
    'games',
    $policy$
        create policy games_insert_service_role on public.games
            for insert
            to service_role
            with check (true);
    $policy$
);

select public.ensure_policy(
    'games_update_service_role',
    'public',
    'games',
    $policy$
        create policy games_update_service_role on public.games
            for update
            to service_role
            using (true);
    $policy$
);

select public.ensure_policy(
    'games_delete_service_role',
    'public',
    'games',
    $policy$
        create policy games_delete_service_role on public.games
            for delete
            to service_role
            using (true);
    $policy$
);

-- user profile data extends supabase auth identities with steam metadata
create table if not exists public.profiles (
    user_id uuid primary key references auth.users (id) on delete cascade,
    steam_id text unique,
    steam_display_name text,
    suggestion_weights jsonb not null default '{"priority":1,"genre":1,"playtime":1,"freshness":1}'::jsonb,
    onboarded_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

-- allow authenticated users to read only their own profile row
select public.ensure_policy(
    'profiles_select_authenticated',
    'public',
    'profiles',
    $policy$
        create policy profiles_select_authenticated on public.profiles
            for select
            to authenticated
            using (auth.uid() = user_id);
    $policy$
);

-- enforce self-service profile creation with matching auth identity
select public.ensure_policy(
    'profiles_insert_authenticated',
    'public',
    'profiles',
    $policy$
        create policy profiles_insert_authenticated on public.profiles
            for insert
            to authenticated
            with check (auth.uid() = user_id);
    $policy$
);

-- allow users to update only their own profile data
select public.ensure_policy(
    'profiles_update_authenticated',
    'public',
    'profiles',
    $policy$
        create policy profiles_update_authenticated on public.profiles
            for update
            to authenticated
            using (auth.uid() = user_id);
    $policy$
);

-- join table capturing backlog entries per user across the game catalog
create table if not exists public.user_games (
    user_id uuid not null references auth.users (id) on delete cascade,
    game_id bigint not null references public.games (steam_app_id) on delete cascade,
    status game_play_status not null default 'backlog',
    in_progress_position smallint,
    achievements_unlocked smallint check (achievements_unlocked >= 0),
    completed_at timestamptz,
    imported_at timestamptz not null default timezone('utc', now()),
    removed_at timestamptz,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now()),
    constraint user_games_pkey primary key (user_id, game_id)
);

-- enforce backlog invariants through supporting indexes
create index if not exists user_games_status_idx on public.user_games (user_id, status);
create index if not exists user_games_game_idx on public.user_games (game_id);
create unique index if not exists user_games_in_progress_position_key on public.user_games (user_id, in_progress_position)
    where status = 'in_progress'::game_play_status and in_progress_position is not null;

alter table public.user_games enable row level security;
alter table public.user_games force row level security;

-- owners can list their backlog entries
select public.ensure_policy(
    'user_games_select_authenticated',
    'public',
    'user_games',
    $policy$
        create policy user_games_select_authenticated on public.user_games
            for select
            to authenticated
            using (auth.uid() = user_id);
    $policy$
);

-- owners can add games to their backlog
select public.ensure_policy(
    'user_games_insert_authenticated',
    'public',
    'user_games',
    $policy$
        create policy user_games_insert_authenticated on public.user_games
            for insert
            to authenticated
            with check (auth.uid() = user_id);
    $policy$
);

-- owners can modify their backlog metadata
select public.ensure_policy(
    'user_games_update_authenticated',
    'public',
    'user_games',
    $policy$
        create policy user_games_update_authenticated on public.user_games
            for update
            to authenticated
            with check (auth.uid() = user_id);
    $policy$
);

-- owners can remove entries they no longer want to track
select public.ensure_policy(
    'user_games_delete_authenticated',
    'public',
    'user_games',
    $policy$
        create policy user_games_delete_authenticated on public.user_games
            for delete
            to authenticated
            using (auth.uid() = user_id);
    $policy$
);

-- import jobs record background synchronization state per user
create table if not exists public.import_jobs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users (id) on delete cascade,
    status import_job_status not null default 'pending',
    idempotency_key text not null,
    requested_at timestamptz not null default timezone('utc', now()),
    started_at timestamptz,
    finished_at timestamptz,
    error_code text,
    error_message text,
    payload jsonb,
    constraint import_jobs_user_idempotency_key_key unique (user_id, idempotency_key)
);

-- partial unique index ensures only one active job per user across pending/running states
create unique index if not exists import_jobs_user_active_idx on public.import_jobs (user_id)
    where status in ('pending'::import_job_status, 'running'::import_job_status);

-- redundant unique index mirrors the explicit idempotency constraint for clarity in query plans
create unique index if not exists import_jobs_idempotency_idx on public.import_jobs (user_id, idempotency_key);

alter table public.import_jobs enable row level security;
alter table public.import_jobs force row level security;

-- trusted service role policies supporting background workers and administrative tooling
select public.ensure_policy(
    'import_jobs_select_service_role',
    'public',
    'import_jobs',
    $policy$
        create policy import_jobs_select_service_role on public.import_jobs
            for select
            to service_role
            using (true);
    $policy$
);

select public.ensure_policy(
    'import_jobs_insert_service_role',
    'public',
    'import_jobs',
    $policy$
        create policy import_jobs_insert_service_role on public.import_jobs
            for insert
            to service_role
            with check (true);
    $policy$
);

select public.ensure_policy(
    'import_jobs_update_service_role',
    'public',
    'import_jobs',
    $policy$
        create policy import_jobs_update_service_role on public.import_jobs
            for update
            to service_role
            using (true);
    $policy$
);

-- analytics_events serves as a partitioned append-only log of user interactions
create table if not exists public.analytics_events (
    id bigint generated always as identity,
    occurred_at timestamptz not null,
    user_id uuid references auth.users (id) on delete set null,
    game_id bigint references public.games (steam_app_id) on delete set null,
    event_type text not null,
    properties jsonb not null default '{}'::jsonb,
    primary key (id, occurred_at)
) partition by range (occurred_at);

-- supporting indexes to accelerate common analytics slicers
create index if not exists analytics_events_user_time_idx on public.analytics_events (user_id, occurred_at desc);
create index if not exists analytics_events_type_idx on public.analytics_events (event_type);
create index if not exists analytics_events_game_idx on public.analytics_events (game_id);

alter table public.analytics_events enable row level security;
alter table public.analytics_events force row level security;

-- restrict analytics access to trusted backend clients only
select public.ensure_policy(
    'analytics_events_select_service_role',
    'public',
    'analytics_events',
    $policy$
        create policy analytics_events_select_service_role on public.analytics_events
            for select
            to service_role
            using (true);
    $policy$
);

select public.ensure_policy(
    'analytics_events_insert_service_role',
    'public',
    'analytics_events',
    $policy$
        create policy analytics_events_insert_service_role on public.analytics_events
            for insert
            to service_role
            with check (true);
    $policy$
);

-- utility helpers for managing analytics event partitions
create or replace function public.create_analytics_events_partition(p_partition_start date)
returns void
language plpgsql
as $$
declare
    partition_start date := date_trunc('month', p_partition_start)::date;
    partition_end date := (partition_start + interval '1 month')::date;
    partition_name text := format('analytics_events_%s', to_char(partition_start, 'YYYY_MM'));
begin
    if partition_start is null then
        raise exception 'Partition start must not be null';
    end if;

    execute format(
        'create table if not exists public.%I partition of public.analytics_events for values from (%L) to (%L);',
        partition_name,
        partition_start,
        partition_end
    );

    execute format('alter table public.%I enable row level security;', partition_name);
    execute format('alter table public.%I force row level security;', partition_name);
end;
$$;

create or replace function public.drop_analytics_events_partition(p_partition_start date)
returns void
language plpgsql
as $$
declare
    partition_start date := date_trunc('month', p_partition_start)::date;
    partition_name text := format('analytics_events_%s', to_char(partition_start, 'YYYY_MM'));
begin
    if partition_start is null then
        raise exception 'Partition start must not be null';
    end if;

    execute format('drop table if exists public.%I;', partition_name);
end;
$$;

-- pre-provision monthly partitions through the end of 2026 using the helper
do $$
declare
    partition_start date := date '2025-01-01';
    final_partition date := date '2026-12-01';
begin
    while partition_start <= final_partition loop
        perform public.create_analytics_events_partition(partition_start);
        partition_start := (partition_start + interval '1 month')::date;
    end loop;
end;
$$;