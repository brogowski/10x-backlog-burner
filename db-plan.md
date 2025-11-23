1. List of tables with their columns, data types, and constraints

- **Enumerated Types**
  - `game_play_status` ENUM (`backlog`, `in_progress`, `completed`, `removed`) — application governs transitions and caps.
  - `import_job_status` ENUM (`pending`, `running`, `succeeded`, `failed`) — reflects Steam import lifecycle.

- **`games`**
  - `steam_app_id BIGINT PRIMARY KEY` — canonical Steam app id.
  - `title TEXT NOT NULL`.
  - `slug TEXT UNIQUE NOT NULL` — lowercase, hyphenated for stable URLs.
  - `genres TEXT[] NOT NULL DEFAULT '{}'`.
  - `release_date DATE`.
  - `popularity_score SMALLINT`.
  - `achievements_total SMALLINT CHECK (achievements_total >= 0)`.
  - `artwork_url TEXT`.
  - `last_imported_at TIMESTAMPTZ`.
  - `search_tsv TSVECTOR GENERATED ALWAYS AS (
      setweight(to_tsvector('simple', unaccent(coalesce(title, ''))), 'A') ||
      setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(genres, ' '), ''))), 'B')
    ) STORED`.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.

- **`profiles`**
  - `user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`.
  - `steam_id TEXT UNIQUE`.
  - `steam_display_name TEXT`.
  - `suggestion_weights JSONB NOT NULL DEFAULT '{"priority":1,"genre":1,"playtime":1,"freshness":1}'`.
  - `onboarded_at TIMESTAMPTZ`.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.

- **`user_games`**
  - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
  - `game_id BIGINT NOT NULL REFERENCES games(steam_app_id) ON DELETE CASCADE`.
  - `status game_play_status NOT NULL DEFAULT 'backlog'`.
  - `in_progress_position SMALLINT` — nullable outside in-progress.
  - `achievements_unlocked SMALLINT CHECK (achievements_unlocked >= 0)`.
  - `completed_at TIMESTAMPTZ`.
  - `imported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.
  - `removed_at TIMESTAMPTZ`.
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.
  - **Primary Key** `(user_id, game_id)`.

- **`import_jobs`**
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`.
  - `user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
  - `status import_job_status NOT NULL DEFAULT 'pending'`.
  - `idempotency_key TEXT NOT NULL`.
  - `requested_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())`.
  - `started_at TIMESTAMPTZ`.
  - `finished_at TIMESTAMPTZ`.
  - `error_code TEXT`.
  - `error_message TEXT`.
  - `payload JSONB`.
  - **Unique Constraint** `(user_id, idempotency_key)` ensures safe retries.

- **`analytics_events`** (parent table, RANGE partitioned on `occurred_at` monthly)
  - `id BIGINT GENERATED ALWAYS AS IDENTITY`.
  - `occurred_at TIMESTAMPTZ NOT NULL`.
  - `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL`.
  - `game_id BIGINT REFERENCES games(steam_app_id) ON DELETE SET NULL`.
  - `event_type TEXT NOT NULL`.
  - `properties JSONB NOT NULL DEFAULT '{}'`.
  - **Primary Key** `(id, occurred_at)` to keep uniqueness across partitions.


2. Relationships between tables

- `profiles.user_id` has a strict 1:1 relationship with `auth.users.id`; profile rows extend Supabase auth identities.
- `user_games` establishes a many-to-many relationship between `auth.users` and `games`, scoped per user backlog entry.
- `import_jobs.user_id` is a 1:N relationship; each user can have many historical imports.
- `analytics_events` optionally reference both `auth.users` and `games`, enabling attribution for events that may or may not be user-scoped.


3. Indexes

- `games_title_trgm_idx` — `GIN (title gin_trgm_ops)` for fuzzy search.
- `games_search_tsv_idx` — `GIN (search_tsv)` backing combined text search.
- `games_release_date_idx` — `BTREE (release_date DESC)` for chronology filters.
- `user_games_status_idx` — `BTREE (user_id, status)` to power backlog/in-progress lists.
- `user_games_game_idx` — `BTREE (game_id)` to resolve reverse lookups and FK joins.
- `user_games_in_progress_position_key` — `UNIQUE (user_id, in_progress_position) WHERE status = 'in_progress' AND in_progress_position IS NOT NULL`.
- `import_jobs_user_active_idx` — `UNIQUE (user_id) WHERE status IN ('pending','running')` to guarantee a single active job.
- `import_jobs_idempotency_idx` — `UNIQUE (user_id, idempotency_key)` (redundant with constraint but defined explicitly for clarity).
- `analytics_events_user_time_idx` — `BTREE (user_id, occurred_at DESC)` for retention and cohort reporting.
- `analytics_events_type_idx` — `BTREE (event_type)` to accelerate filtering by event class.
- `analytics_events_game_idx` — `BTREE (game_id)` for per-game analytics slices.


4. PostgreSQL policies (RLS)

- Enable RLS on every table except `analytics_events` parent partitions (handled separately) and grant minimal defaults.
- `games`
  - Policy `public_read`: `FOR SELECT USING (true)` allows anonymous or authenticated reads.
  - Service-role-only INSERT/UPDATE/DELETE policies to restrict catalog curation to trusted backend jobs.
- `profiles`
  - Policy `user_can_manage_profile`: `USING (auth.uid() = user_id)` for SELECT/UPDATE.
  - Policy `user_can_insert_profile`: `WITH CHECK (auth.uid() = user_id)` for INSERT.
- `user_games`
  - Policy `owner_crud`: `USING (auth.uid() = user_id)` for SELECT/UPDATE/DELETE.
  - Policy `owner_insert`: `WITH CHECK (auth.uid() = user_id)` for INSERT.
- `import_jobs`
  - Policy `owner_read`: `FOR SELECT USING (auth.uid() = user_id)`.
  - Policy `owner_insert`: `FOR INSERT WITH CHECK (auth.uid() = user_id)`.
  - Policy `owner_update`: `FOR UPDATE USING (auth.uid() = user_id)` to allow users to cancel their own job records if needed.
  - Service-role policy for cross-user writes from the import worker.
- `analytics_events`
  - No row access for end users; service role policy `FOR INSERT/SELECT` scoped to trusted backend only (frontend queries should go through materialized views or service APIs).


5. Additional notes

- Enable `pg_trgm`, `unaccent`, and `pgcrypto` extensions before migrations to support trigram search, accent stripping, and `gen_random_uuid()`.
- Partition `analytics_events` monthly (e.g., `analytics_events_2025_01`) and apply retention (delete partitions older than 12 months) to satisfy logging goals without bloat.
- Keep `in_progress_position` nullable for non in-progress rows; application enforces caps per planning decisions, while the partial unique index prevents duplicate positions.
- Search relevance leverages `search_tsv` combined with GIN indexes to satisfy fast filtering requirements from `@prd.md`.
- Schema aligns with the Supabase/PostgreSQL stack outlined in `@tech-stack.md`; all timestamps stored in UTC for consistency across Astro/Supabase services.
- Open items from planning (final status enum, suggestion log scope, import concurrency guarantees) remain to be confirmed before migration freeze; documented defaults above reflect current assumptions.

