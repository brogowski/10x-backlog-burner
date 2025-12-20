# API Endpoint Implementation Plan: User Games (GET/POST/PATCH/DELETE)

## 1) Endpoint Overview
- Provide backlog CRUD and progress-management surface under `/v1/user-games` for authenticated users.
- GET lists user backlog entries with filtering, search, and ordering.
- POST manually inserts a backlog entry (ensuring game exists and respecting the in-progress cap when `status="in_progress"`).
- PATCH `/v1/user-games/{steamAppId}` updates a single backlog entry’s status, `in_progress_position` and `achievements_unlocked`, while enforcing allowed status transitions and queue invariants.
- PATCH `/v1/user-games/reorder` bulk-updates in-progress queue positions.
- POST `/v1/user-games/{steamAppId}/complete` is a convenience action to mark a game as completed (sets `status="completed"`, `completed_at=now`, `in_progress_position=null`).
- DELETE `/v1/user-games/{steamAppId}` soft-removes an entry (`status="removed"`, `removed_at=now`) and clears any in-progress position, with an optional permanent delete for manual adds once schema support exists.

## 2) Request Details
- **Auth**: Required (Supabase session); use `locals.supabase` with caller’s JWT so RLS `owner_crud` policies apply.

- **GET /v1/user-games**
  - Query params:
    - `status[]` (optional, multi): `backlog | in_progress | completed | removed`.
    - `search` (optional): string to match title/slug (TSV search via `search_tsv` on `games`).
    - `orderBy` (optional): `in_progress_position | updated_at | popularity_score` (default `updated_at desc`; `in_progress_position asc` when filtering in_progress).
    - `page` (optional): default 1; `pageSize` (optional): default 50; enforce max 100.

- **POST /v1/user-games**
  - JSON body (validated via Zod `createUserGameSchema` already in `userGames.schema.ts`):
    - `steamAppId: number` (required, positive).
    - `status: "backlog" | "in_progress" ` (required).
    - `inProgressPosition: number | null`:
      - Must be non-null, integer ≥ 1 when `status="in_progress"`.
      - Must be `null` for all other statuses.
  - Business rules:
    - Verifies referenced `games.steam_app_id` exists.
    - Enforces in-progress cap when `status="in_progress"` (shared helper with PATCH).

- **PATCH /v1/user-games/reorder**
  - JSON body:
    - `{ items: Array<{ steamAppId: number; position: number }> }` (already defined as `ReorderInProgressPayload`).
  - Constraints:
    - `steamAppId` and `position` must be positive integers.
    - `items` must be non-empty, with unique `steamAppId` and `position` values.

- **PATCH /v1/user-games/{steamAppId}**
  - URL param:
    - `steamAppId` (path): required; treated as positive integer (`z.coerce.number().int().positive()`); invalid values → `400 InvalidPayload`.
  - JSON body (`UpdateUserGamePayload`, new Zod schema):
    - At least one of the following fields must be present:
      - `status?: "backlog" | "in_progress"`.
      - `inProgressPosition?: number | null`.
      - `achievementsUnlocked?: number`.
    - Field-level rules:
      - `inProgressPosition`:
        - When provided and non-null, must be integer ≥ 1.
        - Must be non-null when the *target* status is `in_progress` (either from payload or existing row) → otherwise `400 PositionRequiredForInProgress`.
        - Must be `null` when the *target* status is not `in_progress`.
      - `achievementsUnlocked`:
        - Integer ≥ 0; upper bound (`<= games.achievements_total`) enforced in service.
  - Business rules (service-enforced):
    - Status transition matrix (from `@.ai/api-plan.md`):
      - `backlog → in_progress | removed`.
      - `in_progress → completed | backlog`.
      - `completed → backlog`.
      - Any other transition → `422 InvalidStatusTransition`.
    - In-progress cap:
      - When transitioning *into* `in_progress` from a non-`in_progress` status, count existing `user_games` rows with `status='in_progress'` for the user (using `user_games_status_idx`).
      - If count is already at configured cap (default 5), reject with `409 InProgressCapReached`.
    - Queue invariants:
      - When target status is `in_progress`, ensure `in_progress_position` is non-null and unique per user (rely on partial unique index, map conflicts to `400 DuplicatePositions` or `409 InProgressCapReached` depending on context).
      - When status changes away from `in_progress`, automatically clear `in_progress_position` (set to `null`).
    - Achievements:
      - If `achievementsUnlocked` provided, ensure `0 <= achievementsUnlocked <= games.achievements_total`; otherwise reject with `400 InvalidPayload` (details include specific issue).
    - Completion timestamps:
      - If status becomes `completed` and `completedAt` is omitted, set `completed_at` to current UTC timestamp.
      - If `completedAt` is provided, normalize and persist it (UTC) only when new status is `completed`.

- **POST /v1/user-games/{steamAppId}/complete**
  - URL param:
    - `steamAppId`: same validation as PATCH.
  - JSON body (`CompleteUserGamePayload` → `CompleteUserGameCommand`):
    - Optional: `{ "achievementsUnlocked": number }`.
    - `achievementsUnlocked` must be integer ≥ 0 and ≤ `games.achievements_total`.
  - Business rules:
    - Allowed from `backlog` or `in_progress` to `completed`; other source statuses (e.g., `removed`) produce `422 InvalidStatusTransition`.
    - Sets:
      - `status="completed"`.
      - `completed_at=now()` (UTC) unless an explicit, valid `completedAt` is later added to the command type for admin flows.
      - `in_progress_position=null`.
    - Logs a `game_completed` analytics event into `analytics_events` (best-effort; failure should not generally fail the user-facing request).

- **DELETE /v1/user-games/{steamAppId}**
  - URL param:
    - `steamAppId`: same validation as PATCH.
  - Business rules:
    - Soft delete:
      - Set `status="removed"`, `removed_at=now()` and `in_progress_position=null`.
      - Idempotent: deleting an already-removed entry is treated as success (`204`), with no-op update.

## 3) Used Types
- DTOs from `src/types.ts`:
  - `UserGameDTO`, `UserGamesListDTO`, `GamePlayStatus`.
  - `CreateUserGameCommand`, `ReorderInProgressCommand`, `ReorderInProgressResultDTO`.
  - `UpdateUserGameCommand` for single-entry PATCH operations.
  - `CompleteUserGameCommand` for completion operations.
- DB tables and enums:
  - `user_games`, `games`, `profiles`, and enum `game_play_status`.
  - `analytics_events` for `game_completed` telemetry (service-role write).
- Validation / payload types (Zod-backed, in `src/lib/validation/userGames.schema.ts`):
  - `UserGamesQuery` (existing) for GET.
  - `CreateUserGamePayload` (existing) for POST.
  - `ReorderInProgressPayload` (existing) for PATCH `/reorder`.
  - `UpdateUserGamePayload` for PATCH `/v1/user-games/{steamAppId}`.
  - `CompleteUserGamePayload` for POST `/v1/user-games/{steamAppId}/complete`.
  - Helper for parsing `steamAppId` path param (e.g., `parseSteamAppIdParam`).
- Error types:
  - `UserGamesServiceError` (already exists) extended with additional codes:
    - `BacklogUpdateFailed`, `CompletionFailed`,
    - `InProgressCapReached`, `InvalidStatusTransition`,
    - `PositionRequiredForInProgress`, `EntryNotFound`.
  - `ApiErrorCode` in `src/lib/http/responses.ts` extended to mirror these API-level error codes for consistent JSON envelopes.

## 4) Response Details
- Success responses:
  - **GET** `/v1/user-games` → `200 OK`: `UserGamesListDTO` with pagination meta.
  - **POST** `/v1/user-games` → `201 Created`: `UserGameDTO` for created row.
  - **PATCH** `/v1/user-games/reorder` → `200 OK`: `{ "updated": number }`.
  - **PATCH** `/v1/user-games/{steamAppId}` → `200 OK`: updated `UserGameDTO`.
  - **POST** `/v1/user-games/{steamAppId}/complete` → `200 OK`: updated `UserGameDTO` (now `status="completed"`).
  - **DELETE** `/v1/user-games/{steamAppId}` → `204 No Content`: no body; client infers success from status.
- Error responses (all use standard envelope `{ "error": { "code", "message", "details" } }`):
  - **Common across all methods**:
    - `400 InvalidPayload`: malformed JSON, invalid types, or missing required fields (including bad `steamAppId` path values).
    - `401 Unauthorized`: missing/invalid Supabase auth; user not logged in.
    - `404 NotFound` / `EntryNotFound`: no `user_games` row for `(user_id, game_id)`.
    - `500 BacklogFetchFailed | BacklogCreateFailed | BacklogUpdateFailed | BacklogReorderFailed | CompletionFailed`: unexpected Supabase or internal errors.
  - **PATCH /v1/user-games/reorder** (existing):
    - `400 DuplicatePositions`: duplicate `steamAppId`/`position` pairs in payload or unique-index violations.
    - `409 QueueMismatch`: payload items do not match current in-progress set.
  - **PATCH /v1/user-games/{steamAppId}`**:
    - `400 PositionRequiredForInProgress`: target status is `in_progress` but `inProgressPosition` is missing or `null`.
    - `400 InvalidPayload`: `achievementsUnlocked` < 0 or general shape issues.
    - `409 InProgressCapReached`: user already has N entries in progress (cap configured; default 5).
    - `422 InvalidStatusTransition`: status change violates allowed transition matrix or sends `completedAt` for non-completed status.
  - **POST /v1/user-games/{steamAppId}/complete**:
    - `400 InvalidPayload`: invalid `achievementsUnlocked` value.
    - `404 EntryNotFound`: missing `user_games` row for given `steamAppId`.
    - `422 InvalidStatusTransition`: current status not eligible for completion (e.g., `removed`).
    - `500 CompletionFailed`: failure updating row or (optionally) logging analytics event.
  - **DELETE /v1/user-games/{steamAppId}`**:
    - `404 EntryNotFound`: no matching row.
    - `409 DeleteNotAllowed` (optional future code): attempt to hard-delete a non-manual entry when such a distinction exists.

## 5) Data Flow
- Shared concerns for all handlers:
  - Obtain `supabase` from `locals.supabase`; do **not** import `supabaseClient` directly in routes.
  - Validate input with Zod (query params, JSON body, and path params).
  - Auth guard:
    - Call `locals.supabase.auth.getUser()` and require a non-null user.
    - On failure, return `401 Unauthorized` without touching the database.
  - Use `locals.requestId` in logs, and wrap all responses with `withRateLimitHeaders` using `locals.rateLimit`.

- **GET /v1/user-games** (existing, unchanged at high level):
  - Parse query with `parseUserGamesQuery(url.searchParams)` into `UserGamesQuery`.
  - Map to `UserGamesFilters` and call `listUserGames(userId, filters, supabase)`.
  - Service composes Supabase query against `user_games` + join to `games`, applies filters, sorting, pagination, and returns `UserGamesListDTO`.

- **POST /v1/user-games** (existing with additional cap enforcement detail):
  - Parse JSON body via `parseCreateUserGame`.
  - Auth + rate-limit checks as per GET.
  - Call `createUserGame({ userId, gameId: steamAppId, status, inProgressPosition }, supabase)`:
    - Service verifies `games` existence.
    - When `status="in_progress"`, shared helper checks queue cap; if exceeded, throws `UserGamesServiceError("InProgressCapReached")`.
    - Inserts row into `user_games`, returning joined row mapped to `UserGameDTO`.
  - Route translates:
    - `DuplicateEntry` → `409 DuplicateEntry`.
    - `InProgressCapReached` → `409 InProgressCapReached`.
    - Other service errors → `500 BacklogCreateFailed`.

- **PATCH /v1/user-games/reorder** (existing, unchanged at high level):
  - Parse body with `parseReorderInProgress`.
  - Auth + rate-limit checks.
  - Call `reorderInProgress(userId, items, supabase)`; service:
    - Fetches current `in_progress` rows.
    - Validates submitted items cover exactly that set; otherwise `QueueMismatch`.
    - Performs two-phase update to avoid unique constraint violations, mapping to `DuplicatePositions` where applicable.
  - Return `{ updated }` as `ReorderInProgressResultDTO`.

- **PATCH /v1/user-games/{steamAppId}** (new route file `src/pages/api/v1/user-games/[steamAppId].ts`):
  - Handler steps:
    1. Extract `steamAppId` from route params; coerce/validate via helper; invalid → `400 InvalidPayload`.
    2. Parse JSON body with `parseUpdateUserGame`; on `ZodError`, log `warn` and return `400 InvalidPayload` (include `issues` in `details`).
    3. Run auth and rate-limit checks as above.
    4. Call new service `updateUserGame(userId, steamAppId, command, supabase)` where `command: UpdateUserGameCommand`:
       - Loads current `user_games` row (including `status`, `in_progress_position`, `achievements_unlocked`, `completed_at`, and joined `games.achievements_total`).
       - If missing, throws `UserGamesServiceError("EntryNotFound")`.
       - Derives target status (`payload.status ?? current.status`) and applies transition matrix.
       - When transitioning to `in_progress` from non-`in_progress`, checks queue cap and throws `InProgressCapReached` if full.
       - Enforces invariants for `in_progress_position` and `achievements_unlocked` as described above.
       - Performs `UPDATE ... RETURNING` with join to `games`, then maps to `UserGameDTO` using shared `mapRowToDto`.
    5. Map `UserGamesServiceError` codes to HTTP status + `ApiErrorCode`:
       - `EntryNotFound` → `404 EntryNotFound`.
       - `InProgressCapReached` → `409 InProgressCapReached`.
       - `InvalidStatusTransition` → `422 InvalidStatusTransition`.
       - `PositionRequiredForInProgress` → `400 PositionRequiredForInProgress`.
       - `DuplicatePositions` → `400 DuplicatePositions`.
       - Others → `500 BacklogUpdateFailed`.
    6. On success, return `UserGameDTO` in a `200 OK` JSON response.

- **POST /v1/user-games/{steamAppId}/complete** (new route file `src/pages/api/v1/user-games/[steamAppId]/complete.ts`):
  - Handler steps:
    1. Extract and validate `steamAppId` from params as above.
    2. Parse optional body with `parseCompleteUserGame`; treat empty body as `{}`.
    3. Auth and rate-limit guards.
    4. Call `completeUserGame(userId, steamAppId, command, supabase)`:
       - Loads target `user_games` row and joins `games` for `achievements_total`.
       - Validates current status is `backlog` or `in_progress`; else throws `InvalidStatusTransition`.
       - Computes new `achievements_unlocked` (use provided value if present; otherwise keep existing).
       - Sets `status="completed"`, `completed_at=now()`, `in_progress_position=null`.
       - Writes update and returns mapped `UserGameDTO`.
       - After successful update, uses a separate, service-role Supabase client (inside an `analytics.service.ts` helper) to insert `analytics_events` row:
         - `event_type="game_completed"`.
         - `user_id`, `game_id`, `occurred_at`, and lightweight `properties` (e.g., previous status, previous/next achievements).
       - If analytics insert fails, log `warn` and continue; reserve `CompletionFailed` for core update failures.
    5. Map errors:
       - `EntryNotFound` → `404 EntryNotFound`.
       - `InvalidStatusTransition` → `422 InvalidStatusTransition`.
       - Other service errors → `500 CompletionFailed`.
  - Response: `200 OK` with updated `UserGameDTO`.

- **DELETE /v1/user-games/{steamAppId}** (shares route file with PATCH):
  - Handler steps:
    1. Extract `steamAppId`.
    2. Auth and rate-limit guards.
    3. Call `removeUserGame(userId, steamAppId, supabase)`:
       - Loads current row; if not found, throws `EntryNotFound`.
       - Update `status="removed"`, `removed_at=now()`, `in_progress_position=null`.
    4. Map `EntryNotFound` → `404 EntryNotFound`, `DeleteNotAllowed` → `409 DeleteNotAllowed`, other DB issues → `500 BacklogUpdateFailed`.
    5. Always return `204 No Content` on success (soft or hard delete).

## 6) Security Considerations
- **Authentication & Authorization**
  - All `/v1/user-games` endpoints require a valid Supabase session; anonymous callers receive `401 Unauthorized`.
  - Routes always operate through `locals.supabase` so that RLS (`owner_crud`/`owner_insert`) enforces per-user scoping.
  - Status-changing operations (PATCH/POST-complete/DELETE) never accept a `userId` from the client; they always derive it from the authenticated Supabase user.

- **Input validation & sanitization**
  - All query, path, and body parameters are validated with Zod before hitting services or Supabase.
  - `steamAppId` is coerced to integer and rejected if invalid to avoid path traversal or type-confusion issues.
  - Strict enums (`GamePlayStatus`) and whitelisted `orderBy` fields prevent arbitrary column access or SQL injection.

- **Rate limiting & abuse prevention**
  - Reuse `withRateLimitHeaders` and existing `locals.rateLimit` metadata across all new handlers to protect against brute-force or script abuse.
  - Enforce in-progress cap (`InProgressCapReached`) to prevent users from creating excessively large in-progress queues.

- **Data integrity and consistency**
  - Status transition matrix and queue cap are enforced in the service layer to avoid clients bypassing rules via alternate endpoints.
  - Partial unique index `user_games_in_progress_position_key` guarantees no two in-progress entries share a position; services catch and map these violations gracefully.

- **Analytics / service-role access**
  - Only analytics logging uses a service-role Supabase client, encapsulated in a dedicated service module so API routes themselves never see service-role keys.
  - Analytics failures are logged but do not leak internals to clients; messages remain generic.

## 7) Error Handling
- **Validation errors (Zod)**
  - Query, path, and body parsing errors return `400 InvalidPayload` (or more specific codes like `PositionRequiredForInProgress` where appropriate), with `details` including `ZodError.issues`.
  - Error logs use `logger.warn` with `requestId`, user id (if available), and sanitized input.

- **Service-layer errors (`UserGamesServiceError`)**
  - Each handler catches `UserGamesServiceError` and maps:
    - `NotFound` / `EntryNotFound` → `404 EntryNotFound`.
    - `DuplicateEntry` → `409 DuplicateEntry`.
    - `QueueMismatch` → `409 QueueMismatch`.
    - `DuplicatePositions` → `400 DuplicatePositions`.
    - `InProgressCapReached` → `409 InProgressCapReached`.
    - `PositionRequiredForInProgress` → `400 PositionRequiredForInProgress`.
    - `InvalidStatusTransition` → `422 InvalidStatusTransition`.
    - `BacklogFetchFailed | BacklogCreateFailed | BacklogReorderFailed | BacklogUpdateFailed | CompletionFailed` → `500` with the corresponding code.
  - All such errors are logged with `logger.error`, including Supabase `PostgrestError` details where available.

- **Unexpected errors**
  - Non-`UserGamesServiceError` exceptions are treated as `500` with generic codes:
    - `BacklogFetchFailed` for GET.
    - `BacklogCreateFailed` for POST.
    - `BacklogReorderFailed` for `/reorder`.
    - `BacklogUpdateFailed` for PATCH/DELETE.
    - `CompletionFailed` for POST `/complete`.
  - Stack traces are never sent to clients; only stable codes/messages are returned.

- **Error logging and observability**
  - All 5xx responses log at `error` level with `requestId`, user id, endpoint, and high-level context (but not sensitive payloads).
  - Optionally, severe failures (e.g., frequent `CompletionFailed`) can be mirrored into `analytics_events` with event type like `game_completion_failed` for monitoring, using service-role client.

## 8) Performance Considerations
- **Query efficiency**
  - For GET, continue to select only required columns and rely on `user_games_status_idx`, `user_games_game_idx`, `games_search_tsv_idx`, and `games_title_trgm_idx`.
  - For PATCH/DELETE/COMPLETE, operations are single-row updates keyed by `(user_id, game_id)` (the PK), leveraging primary key index for O(1) lookups.
  - Queue cap checks should use `select("game_id", { count: "exact", head: true })` with filters `user_id` + `status='in_progress'` to avoid loading full rows.

- **Minimal round trips**
  - Use `UPDATE ... SELECT`-style patterns (as supported by Supabase) to both mutate and return the row in a single request for PATCH and COMPLETE, minimizing extra queries.
  - Consider combining row fetch and validation into a single update where practical, while keeping logic readable and testable.

- **Payload size**
  - Reuse `UserGameDTO` mapping to avoid over-selecting fields, keeping response payloads compact for PATCH/COMPLETE.
  - DELETE returns no body on success (`204`) to minimize response size.

- **Concurrency**
  - Rely on database uniqueness constraints for `in_progress_position` and wrap failures into deterministic error codes instead of manual locking.
  - For potential race conditions around queue cap and transitions, keep business logic centralized in the service layer and re-check constraints after Supabase operations as needed.

## 9) Implementation Steps
1. **Update shared error codes**
   - Extend `ApiErrorCode` in `src/lib/http/responses.ts` to include:
     - `BacklogUpdateFailed`, `CompletionFailed`,
     - `InProgressCapReached`, `InvalidStatusTransition`,
     - `PositionRequiredForInProgress`, `EntryNotFound`, `DeleteNotAllowed`.
   - Ensure new codes are used consistently in all new handlers.
2. **Confirm and refine types**
   - Verify `UpdateUserGameCommand` and `CompleteUserGameCommand` in `src/types.ts` cover all needed fields (`status`, `inProgressPosition`, `achievementsUnlocked`, `completedAt`).
   - Add any missing fields or comments to clarify their use in services (e.g., `completedAt` only for admin flows).
3. **Extend validation layer**
   - In `src/lib/validation/userGames.schema.ts`, add:
     - `updateUserGameSchema` and `UpdateUserGamePayload` with cross-field validation for `status`, `inProgressPosition`, `achievementsUnlocked`, `completedAt`.
     - `completeUserGameSchema` and `CompleteUserGamePayload` for the completion endpoint.
     - A helper `parseSteamAppIdParam` that validates/coerces the path param value.
   - Export parser functions `parseUpdateUserGame`, `parseCompleteUserGame` mirroring existing `parseCreateUserGame` and `parseReorderInProgress`.
4. **Extend service layer**
   - In `src/lib/services/userGames.service.ts`:
     - Add new `UserGamesServiceError` codes (`BacklogUpdateFailed`, `CompletionFailed`, `InProgressCapReached`, `InvalidStatusTransition`, `PositionRequiredForInProgress`, `EntryNotFound`, `DeleteNotAllowed`).
     - Implement `updateUserGame(userId, steamAppId, command, supabase)` encapsulating:
       - Fetch + transition matrix enforcement.
       - Queue cap checks and position invariants.
       - Achievements and completion timestamp rules.
       - Single-row update + DTO mapping.
     - Implement `completeUserGame(userId, steamAppId, command, supabase)` building on `updateUserGame` or sharing helpers, and exposing a single call for the completion route.
     - Implement `removeUserGame(userId, steamAppId, options, supabase)` for soft/hard delete semantics.
5. **Implement new API routes**
   - Create `src/pages/api/v1/user-games/[steamAppId].ts`:
     - `export const prerender = false`.
     - `PATCH` handler wired to `parseUpdateUserGame` and `updateUserGame`.
     - `DELETE` handler wired to query `permanent` and `removeUserGame`.
     - Both handlers reuse auth, rate-limiting, and logging patterns from existing `src/pages/api/v1/user-games.ts`.
   - Create `src/pages/api/v1/user-games/[steamAppId]/complete.ts`:
     - `export const prerender = false`.
     - `POST` handler wired to `parseCompleteUserGame` and `completeUserGame`, then triggers analytics logging.
6. **Wire error mapping & logging**
   - Ensure each new handler:
     - Wraps responses in `withRateLimitHeaders`.
     - Maps `UserGamesServiceError` codes to appropriate HTTP statuses and `ApiErrorCode` strings.
     - Uses `logger.info` for successful operations (include `userId`, `steamAppId`, and high-level payload info) and `logger.error` for 5xx failures.
7. **Update existing POST behavior for in-progress cap**
   - Reuse the same in-progress cap helper inside `createUserGame` so that both POST and PATCH respect the same limit.
   - Add corresponding error mapping in `POST /v1/user-games` handler for `InProgressCapReached`.
8. **Documentation & UI integration**
    - Ensure `@.ai/api-plan.md` and frontend UI contracts reference these endpoints with correct payloads and error codes.
    - Coordinate with UI to use POST `/complete` for user-facing “mark completed” flows so analytics events are reliably logged.