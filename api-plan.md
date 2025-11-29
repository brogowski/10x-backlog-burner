# REST API Plan

## 1. Resources

- `Profile` (`profiles`): Extends Supabase `auth.users` with `steam_id`, display metadata, onboarding timestamp, and `suggestion_weights`. Managed per-authenticated user.
- `Game` (`games`): Canonical Steam metadata with fuzzy-search (`games_title_trgm_idx`) and TSV-based search (`games_search_tsv_idx`). Read-only to end users; upserts happen through trusted workers.
- `BacklogEntry` (`user_games`): Per-user backlog/in-progress rows (PK `user_id + game_id`) containing status, ordering, completion data, and user-specific progress metrics.
- `ImportJob` (`import_jobs`): Asynchronous Steam import tracker with idempotency guarantees (`idempotency_key`, `import_jobs_user_active_idx`).
- `AnalyticsEvent` (`analytics_events`): Append-only telemetry store for import/reorder/completion actions; accessible only with service role credentials.

## 2. Endpoints

### 2.1 Profiles & Auth

- **HTTP Method & Path**: `GET /v1/profile`
  - Description: Fetch the authenticated user’s profile, onboarding status, and suggestion weights.
  - Query Parameters: none.
  - Request Payload: n/a.
  - JSON Response:
    ```json
    {
      "userId": "UUID",
      "steamId": "string|null",
      "steamDisplayName": "string|null",
      "suggestionWeights": {
        "priority": 1,
        "genre": 1,
        "playtime": 1,
        "freshness": 1
      },
      "onboardedAt": "2025-01-01T00:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
    ```
  - Success: `200 OK — profile loaded`.
  - Errors: `401 Unauthorized`, `404 Not Found` (profile missing), `500 ProfileFetchFailed`.

- **HTTP Method & Path**: `PATCH /v1/profile`
  - Description: Update optional profile fields (display name, suggestion weights) after validating ranges (weights > 0, <= 5).
  - Query Parameters: none.
  - JSON Request:
    ```json
    {
      "steamDisplayName": "Optional string",
      "suggestionWeights": {
        "priority": 1.25,
        "genre": 0.9,
        "playtime": 1,
        "freshness": 1.1
      }
    }
    ```
  - JSON Response: same shape as `GET /v1/profile`.
  - Success: `200 OK — profile updated`.
  - Errors: `400 InvalidWeights`, `401 Unauthorized`, `409 SteamIdConflict`, `422 ValidationError`.

- **HTTP Method & Path**: `POST /v1/auth/steam/link`
  - Description: Link existing Supabase user to Steam identity using a signed nonce returned from the client’s Steam OAuth popup.
  - Query Parameters: none.
  - JSON Request:
    ```json
    {
      "steamId": "76561198000000000",
      "displayName": "SteamUser",
      "proof": {
        "nonce": "uuid",
        "signature": "string"
      }
    }
    ```
  - JSON Response:
    ```json
    {
      "steamId": "76561198000000000",
      "linked": true,
      "updatedAt": "2025-01-01T00:00:00Z"
    }
    ```
  - Success: `201 Created — Steam identity linked`.
  - Errors: `400 InvalidNonce`, `401 Unauthorized`, `409 SteamIdAlreadyLinked` 


### 2.2 Games Catalog

- **HTTP Method & Path**: `GET /v1/games`
  - Description: Public search endpoint leveraging `games_search_tsv_idx` and `games_title_trgm_idx`.
  - Query Parameters:
    - `page` (default 1), `pageSize` (max 100),
    - `search` (full-text, uses TSV),
    - `genres[]` (array filter),
    - `releasedBefore`, `releasedAfter`,
    - `sort` (`popularity`, `release_date_desc`, `title_asc`).
  - Request Payload: n/a.
  - JSON Response:
    ```json
    {
      "page": 1,
      "pageSize": 25,
      "total": 2400,
      "results": [
        {
          "steamAppId": 620,
          "title": "Portal 2",
          "slug": "portal-2",
          "genres": ["Puzzle", "Co-op"],
          "releaseDate": "2011-04-18",
          "popularityScore": 92,
          "artworkUrl": "https://cdn/.../620",
          "achievementsTotal": 50
        }
      ]
    }
    ```
  - Success: `200 OK`.
  - Errors: `400 InvalidFilter`, `429 RateLimited`, `500 CatalogQueryFailed`.

### 2.3 Backlog & In-Progress (`user_games`)

- **HTTP Method & Path**: `GET /v1/user-games`
  - Description: List backlog entries with filtering by status (`backlog`, `in_progress`, `completed`, `removed`).
  - Query Parameters: `status[]`, `search`, `orderBy` (`in_progress_position`, `updated_at`, `popularity_score`), `page`, `pageSize`.
  - Response:
    ```json
    {
      "page": 1,
      "pageSize": 50,
      "total": 320,
      "results": [
        {
          "gameId": 12345,
          "title": "Hades",
          "status": "in_progress",
          "inProgressPosition": 2,
          "achievementsUnlocked": 12,
          "completedAt": null,
          "importedAt": "2025-01-02T00:00:00Z",
          "updatedAt": "2025-01-03T00:00:00Z"
        }
      ]
    }
    ```
  - Success: `200 OK`.
  - Errors: `401 Unauthorized`, `422 InvalidStatus`, `500 BacklogFetchFailed`.

- **HTTP Method & Path**: `POST /v1/user-games`
  - Description: Manually add a game to backlog (used when no play history). Ensures `game_id` exists in `games`.
  - JSON Request:
    ```json
    {
      "steamAppId": 12345,
      "status": "backlog",
      "inProgressPosition": null
    }
    ```
  - JSON Response: created backlog entry (same shape as list item).
  - Success: `201 Created`.
  - Errors: `400 MissingSteamAppId`, `401 Unauthorized`, `404 GameNotFound`, `409 DuplicateEntry`.

- **HTTP Method & Path**: `PATCH /v1/user-games/{steamAppId}`
  - Description: Update status, unlocked achievements, or completion timestamps; enforces enum transitions and queue cap.
  - JSON Request:
    ```json
    {
      "status": "in_progress",
      "inProgressPosition": 1,
      "achievementsUnlocked": 10
    }
    ```
  - Response: updated entry.
  - Success: `200 OK`.
  - Errors: `400 PositionRequiredForInProgress`, `401 Unauthorized`, `409 InProgressCapReached`, `422 InvalidStatusTransition`.

- **HTTP Method & Path**: `PATCH /v1/user-games/reorder`
  - Description: Bulk reorder in-progress queue using array of `{ steamAppId, position }`; validates uniqueness per `user_games_in_progress_position_key`.
  - JSON Request:
    ```json
    {
      "items": [
        { "steamAppId": 12345, "position": 1 },
        { "steamAppId": 54321, "position": 2 }
      ]
    }
    ```
  - Response: `{ "updated": 2 }`.
  - Success: `200 OK`.
  - Errors: `400 DuplicatePositions`, `401 Unauthorized`, `409 QueueMismatch`, `422 ValidationError`.

- **HTTP Method & Path**: `POST /v1/user-games/{steamAppId}/complete`
  - Description: Convenience action to mark completion; sets `status=completed`, `completed_at=now`, `in_progress_position=null`, logs analytics event.
  - Request Payload: optional `{"achievementsUnlocked": number}`.
  - Response: updated entry.
  - Success: `200 OK`.
  - Errors: `401 Unauthorized`, `404 EntryNotFound`, `500 CompletionFailed`.

- **HTTP Method & Path**: `DELETE /v1/user-games/{steamAppId}`
  - Description: Soft-remove entry (sets `status='removed'`, `removed_at=now`); optional permanent delete for manual adds.
  - Success: `204 No Content`.
  - Errors: `401 Unauthorized`, `404 EntryNotFound`.

## 3. Authentication and Authorization

- Supabase Auth issues JWTs that Astro middleware (`src/middleware/index.ts`) validates; tokens injected into API requests via `Authorization: Bearer`.
- RLS is enforced at the database level. Endpoints that mutate or read user-scoped data (`profiles`, `user_games`, `import_jobs`) operate with the caller’s session so RLS policies (`owner_crud`, `owner_read`, etc.) apply automatically.
- Service role key (stored server-side) is required for catalog writes, analytics ingestion, and job worker callbacks. Routes under `/v1/analytics` and worker-only `/v1/games` upserts must check `x-service-role: true`.
- Steam OAuth: client completes Steam OpenID, obtains proof payload, and calls `POST /v1/auth/steam/link`; API verifies signature against expected nonce stored in Supabase.
- Rate limiting: apply per-user sliding window (e.g., 5 import job creations/hour) and global cap aligned with “100k API calls/day” PRD constraint. Additionally, throttle suggestion preview endpoints (e.g., 60/min) to protect scoring service.
- Error model: JSON envelope `{ "error": { "code": "string", "message": "human readable", "details": {...} } }` for non-2xx responses to keep clients consistent.

## 4. Validation and Business Logic

- **Profiles**
  - `suggestion_weights` keys required (`priority`, `genre`, `playtime`, `freshness`); values must be positive numbers (0 < weight ≤ 5).
  - `steam_id` unique; linking verifies ownership via nonce+signature and rejects if already tied to another profile.
  - `onboarded_at` set only once; subsequent requests return `409`.

- **Games**
  - `slug` enforced lowercase kebab-case; API rejects invalid slugs on worker upserts.
  - `achievements_total` must be ≥ 0; `release_date` stored in UTC date; `search_tsv` auto-generated, so API should not accept manual overrides.
  - Public read endpoints respect pagination limits (max 100 per page) and use indexed columns (`release_date_idx`, `search_tsv_idx`) for filters.

- **BacklogEntry (`user_games`)**
  - `status` transitions: `backlog → in_progress|removed`, `in_progress → completed|backlog`, `completed → backlog` (manual reopen). Invalid transitions raise `422`.
  - `in_progress_position` required for `status='in_progress'`, must be unique per user, and removed automatically when status changes away from `in_progress`.
  - `achievements_unlocked` must be ≤ `games.achievements_total` and ≥ 0.
  - Enforce configurable in-progress cap (default 5) before accepting status changes/additions; return `409` with current queue size.
  - `completed_at` auto-set to current UTC when marking complete; may only be set when `status='completed'`.
  - Soft deletes set `status='removed'` and `removed_at=now`; hard delete allowed only for entries created manually (flag in row).

- **ImportJob**
  - Require `source="steam"` for MVP; reject others.
  - `Idempotency-Key` header required; API replays existing job if key matches to avoid duplicate imports.
  - Ensure only one job with status `pending` or `running` per user; use index `import_jobs_user_active_idx` to enforce.
  - Worker updates must set `started_at`, `finished_at`, `error_code`, `error_message` consistently; API surfaces status plus `progress` derived from payload.

- **Suggestion**
  - Algorithm weights derived from profile or override input; normalized before scoring.
  - Filter candidate games to statuses `backlog` & `in_progress` with `removed_at` null; exclude entries with `completed_at` not null unless `includeCompleted=true`.
  - Provide reasoning array with contributions sum to total score; ensures transparency requirement from PRD.

- **Analytics**
  - `event_type` allowlist: `import_started`, `import_failed`, `import_succeeded`, `queue_reordered`, `game_completed`, `suggestion_viewed`.
  - `properties` must be JSON objects ≤ 2 KB; `occurred_at` required in UTC and aligned with monthly partition boundaries.

- **General**
  - All timestamps stored/returned in ISO 8601 UTC.
  - Pagination defaults: `page=1`, `pageSize=25`, `pageSize` capped at 100.
  - Filtering inputs validated for type (e.g., `genres[]` must match known taxonomy).
  - Responses include `etag`/`Last-Modified` where practical (catalog, profile) to aid caching.
  - Standardized rate-limit headers (`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`) accompany `429` responses.

