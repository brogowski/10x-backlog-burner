# API Endpoint Implementation Plan: User Games (GET/POST/PATCH)

## 1) Endpoint Overview
- Provide backlog CRUD surface under `/v1/user-games` for authenticated users.
- GET lists user backlog entries with filtering, search, and ordering.
- POST manually inserts a backlog entry (ensuring game exists).
- PATCH `/reorder` bulk-updates in-progress queue positions.

## 2) Request Details
- **Auth**: Required (Supabase session); use `locals.supabase`.
- **GET /v1/user-games**
  - Query params:
    - `status[]` (optional, multi): `backlog | in_progress | completed | removed`
    - `search` (optional): string to match title/slug (ILIKE with trigram or `search_tsv`).
    - `orderBy` (optional): `in_progress_position | updated_at | popularity_score` (default `updated_at desc`; `in_progress_position asc` when filtering in_progress).
    - `page` (optional): default 1; `pageSize` (optional): default 50; enforce max 100.
- **POST /v1/user-games**
  - Body: `{ steamAppId: number; status: "backlog" | "in_progress" | "completed" | "removed"; inProgressPosition: number | null }`
- **PATCH /v1/user-games/reorder**
  - Body: `{ items: Array<{ steamAppId: number; position: number }> }`

## 3) Used Types
- DTOs from `src/types.ts`: `UserGameDTO`, `UserGamesListDTO`, `CreateUserGameCommand`, `ReorderInProgressCommand`, `ReorderInProgressResultDTO`, `GamePlayStatus`.
- DB tables: `user_games`, `games`, `profiles` (for ownership), enums `game_play_status`.
- Service inputs/outputs should mirror DTOs/commands above.

## 4) Response Details
- **GET** `200`: `UserGamesListDTO` with pagination meta.
- **POST** `201`: `UserGameDTO` for created row.
- **PATCH** `200`: `{ updated: number }`.
- Errors: `400` (validation/missing/duplicate positions), `401` (unauthorized), `404` (game not found), `409` (duplicate entry / queue mismatch), `422` (invalid status / payload), `500` (unexpected DB issues).

## 5) Data Flow
- Obtain `supabase` from `locals.supabase` per request.
- Validate input via Zod; normalize pagination defaults.
- Auth guard: ensure `session` present (`getSession` or `getUser`); return `401` early.
- GET flow:
  - Build filters: status array, search (use `ilike('%search%')` or `textSearch` via `search_tsv`), orderBy mapping to safe column list.
  - Query `user_games` joined to `games` for title/slug/popularity; apply `eq('user_id', user.id)`.
  - Paginate with `range`/`limit` and `order`.
  - Fetch `count` with `head: true` or separate count query.
  - Map rows to `UserGameDTO`; return `UserGamesListDTO`.
- POST flow:
  - Validate body.
  - Check `games` existence by `steam_app_id`; else 404.
  - Insert into `user_games` with provided status/position; set defaults for `achievements_unlocked`, timestamps.
  - Handle unique violation (conflict on `user_id, game_id`) → `409 DuplicateEntry`.
  - Return inserted row joined with `games`.
- PATCH reorder flow:
  - Validate items array: non-empty, unique `steamAppId`, unique `position`, positions >=1.
  - Fetch current `in_progress` rows for user; ensure items cover exactly those rows (else `409 QueueMismatch`).
  - Use transaction (PostgREST RPC or multi-step) to update `in_progress_position` for each item; enforce partial unique index.
  - Return updated count.

## 6) Security Considerations
- Enforce authentication; RLS already restricts by `user_id`, but still guard early.
- Whitelist orderBy fields to avoid SQL injection; use parameterized filters only.
- Limit `pageSize` to prevent abuse; consider rate limiting (`src/lib/http/rateLimit.ts`).
- Do not expose internal errors; map DB errors to safe messages.
- Ensure `steamAppId`/`position` are numbers to avoid type confusion.

## 7) Error Handling
- Validation failures → `400` or `422` per spec; include zod issues for debugging (structured).
- Auth missing/invalid → `401`.
- Game not found on POST → `404`.
- Duplicate entry insert conflict → `409`.
- Reorder duplicates/position clashes → `400 DuplicatePositions`.
- Queue mismatch or index violation during reorder → `409 QueueMismatch`.
- Unexpected DB errors → log with context (user id, endpoint) and return `500 BacklogFetchFailed` or generic.

## 8) Performance Considerations
- Use `select` projection limited to needed columns; join only `games` fields required for DTO.
- Leverage existing indexes: `user_games_status_idx`, `user_games_game_idx`, `games_search_tsv_idx`, `games_title_trgm_idx`.
- Prefer text search on `search_tsv` when `search` provided; fallback to `ilike`.
- Paginate with `range`; cap `pageSize` to 100 to bound cost.
- Batch reorder updates in single transaction to reduce round trips.

## 9) Implementation Steps
1. Add Zod schemas for GET query, POST body, PATCH body in the API handler file or a shared validator module.
2. Implement auth guard using `locals.supabase.auth.getUser()`; return `401` if missing.
3. GET handler:
   - Parse query with defaults; derive orderBy and directions.
   - Build Supabase query with filters, search, order, pagination, count.
   - Map results to `UserGameDTO` and respond with `UserGamesListDTO`.
4. POST handler:
   - Validate body; ensure `steamAppId` present.
   - Confirm game existence; on miss, return `404`.
   - Insert into `user_games` with status/position; catch conflict for `409`.
   - Return created DTO with `201`.
5. PATCH `/reorder` handler:
   - Validate items, uniqueness, positions.
   - Fetch existing in-progress set; compare for mismatch.
   - Execute transactional updates; on unique violation return `400/409` per spec.
   - Return `{ updated }`.
6. Centralize error mapping: translate Supabase errors to API error codes/messages; ensure consistent JSON structure.
7. Add rate limiting middleware hook if required for this route.
8. Add tests (unit for validation/service; integration for Supabase queries if harness exists).

