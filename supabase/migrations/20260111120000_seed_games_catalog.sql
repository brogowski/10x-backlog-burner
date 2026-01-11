-- migration: seed games catalog from csv
-- purpose: populate public.games with the curated steam catalog defined in supabase/migrations/games_seed.csv
-- notes: uses a temporary staging table to parse csv payloads, converts latex-style json genres to text arrays, and upserts so rerunning the migration refreshes existing rows without duplicates

set statement_timeout to 0;
set lock_timeout to 0;

-- seed data pulled directly from supabase/migrations/games_seed.csv to avoid needing pg_read_server_files privilege
with tmp_games_seed (steam_app_id, title, slug, genres, release_date, popularity_score, achievements_total, artwork_url) as (
    values
        (570, 'Dota 2', 'https://store.steampowered.com/app/570', '["Free to Play","MOBA","Strategy","eSports"]', '2013-07-09'::date, 2, 0, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/570/header.jpg'),
        (730, 'Counter-Strike 2', 'https://store.steampowered.com/app/730', '["FPS","Shooter","Competitive","Action"]', '2021-08-21'::date, 1, 1, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/730/header.jpg'),
        (413150, 'Stardew Valley', 'https://store.steampowered.com/app/413150', '["Farming Sim","Pixel Graphics","Life Sim"]', '2016-02-26'::date, 3, 49, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/413150/header.jpg'),
        (1808500, 'ARC Raiders', 'https://store.steampowered.com/app/1808500', '["Extraction Shooter","PvP","PvE"]', '2025-10-30'::date, 4, 50, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1808500/04baafaf64a5aa5f46ecda5d71889a4848dc0628/header.jpg'),
        (1172470, 'Apex Legends', 'https://store.steampowered.com/app/1172470', '["Free to Play","Battle Royale","FPS"]', '2020-11-05'::date, 5, 12, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/1172470/6ae90b012e725a93622c3694d9d866b886cfd0f8/header.jpg?t=1762457261'),
        (252490, 'Rust', 'https://store.steampowered.com/app/252490', '["Survival","Crafting","Open World"]', '2018-02-08'::date, 6, 92, 'https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/252490/header.jpg')
)

-- upsert the staged rows into public.games so rerunning the migration keeps core properties in sync
insert into public.games (
    steam_app_id,
    title,
    slug,
    genres,
    release_date,
    popularity_score,
    achievements_total,
    artwork_url,
    last_imported_at
)
select
    seed.steam_app_id,
    seed.title,
    seed.slug,
    coalesce(
        array(
            select jsonb_array_elements_text(coalesce(seed.genres, '[]')::jsonb)
        ),
        '{}'::text[]
    ),
    seed.release_date,
    seed.popularity_score,
    seed.achievements_total,
    seed.artwork_url,
    timezone('utc', now())
from tmp_games_seed seed
on conflict (steam_app_id) do update
set
    title = excluded.title,
    slug = excluded.slug,
    genres = excluded.genres,
    release_date = excluded.release_date,
    popularity_score = excluded.popularity_score,
    achievements_total = excluded.achievements_total,
    artwork_url = excluded.artwork_url,
    last_imported_at = excluded.last_imported_at;
