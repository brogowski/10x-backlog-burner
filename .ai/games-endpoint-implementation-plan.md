# API Endpoint Implementation Plan: GET /v1/games

## 1. Endpoint Overview
- Public catalog search endpoint returning paginated `games` rows exposed through `GamesListDTO`.
- Supports fuzzy text search, genre filters, release-date fences, and constrained sorting (popularity, newest release, alphabetical).
- Optimized to use `games_search_tsv_idx`, `games_title_trgm_idx`, and `games_release_date_idx` to keep queries under ~200 ms even at scale.

## 2. Request Details
- HTTP Method: `GET`
- URL Structure: `/v1/games`
- Request Body: n/a
- Parameters  
  - Required: none (defaults apply).  
  - Optional query params:  
    - `page`: integer ≥ 1 (default 1).  
    - `pageSize`: integer 1–100 (default 25).  
    - `search`: trimmed string (max 256 chars) interpreted as TS vector query; empty strings ignored.  
    - `genres[]`: array of strings from the canonical genre taxonomy; duplicates removed.  
    - `releasedBefore`, `releasedAfter`: ISO 8601 dates; enforce chronological consistency (`releasedAfter ≤ releasedBefore`).  
    - `sort`: enum of `popularity` (default, `popularity_score DESC`), `release_date_desc`, `title_asc`.
- Validation plan: use Zod schema in the route to coerce query params, enforce numeric ranges, date parsing, and reject unknown sort or invalid genre values. Violations return `400 InvalidFilter`.

## 3. Used Types
- `GameSummaryDTO` and `GamesListDTO` from `src/types.ts` define the response envelope and item structure.
- Introduce internal `GamesSearchFilters` interface within `src/lib/services/games/catalog.service.ts` to capture validated filters/pagination/sort before querying Supabase.
- Shared error envelope type (if existing in project) reused to keep consistent `{ error: { code, message, details } }` responses.

## 4. Response Details
- Success (`200 OK`): JSON payload shaped as `GamesListDTO`, including `page`, `pageSize`, `total`, and `results[]` with `steamAppId`, `title`, `slug`, `genres`, `releaseDate`, `popularityScore`, `artworkUrl`, `achievementsTotal`.
- Error envelopes:  
  - `400 InvalidFilter` for bad query params.  
  - `429 RateLimited` when upstream limiter trips (include `Retry-After` and rate-limit headers).  
  - `500 CatalogQueryFailed` for Supabase errors/timeouts.
- Headers: include cache hints (e.g., `Cache-Control: public, max-age=60`) if acceptable; include pagination metadata only in body.

## 5. Data Flow
1. Request enters Astro route (`src/pages/api/v1/games.ts`). Public route, so middleware still attaches `locals` (including `requestId`, `supabase`, rate-limit context). No auth enforced.
2. Parse query params via helper that normalizes arrays (`genres[]`) and coerce numbers/dates before passing into a Zod schema.
3. On validation success, construct `GamesSearchFilters`.
4. Call `catalogService.searchGames(filters, locals.supabase)` which:
   - Builds Supabase query against `games` table.
   - Applies TSV search (`.textSearch("search_tsv", search, { type: "websearch" })`) when `search` present (leveraging `games_search_tsv_idx`), otherwise uses trigram with `ilike`/`similarity` via RPC if needed.
   - Adds `genres &&` filter using Postgres array operators and `genres` index.
   - Applies release-date bounds using `gte/lte`.
   - Applies sorting via `.order(...)` mapping sort enums to columns and direction.
   - Applies pagination using `.range(offset, offset + pageSize - 1)` and obtains `count` using `maybeSingle` or `select("*", { count: "exact", head: false })`.
5. Service maps rows into `GameSummaryDTO` objects (ensuring camelCase property names).
6. Route wraps data in `GamesListDTO`, attaches rate-limit headers if provided by middleware, and returns JSON.
7. On errors, route catches exceptions, logs via shared logger with `requestId`, and emits appropriate error code.

## 6. Security Considerations
- **Rate limiting**: leverage existing middleware/global limiter to guard against scraping/DoS; return `429` with standard headers.
- **Input sanitization**: limit `search` length, strip control chars, and rely on Supabase parameterization to prevent SQL injection. 
- **Data exposure**: route only selects public columns (`steam_app_id`, `title`, etc.); excludes internal metrics or timestamps not intended for public consumption.
- **RLS**: `games` table already exposes read access; ensure Supabase client uses anon key with RLS enforced so writes are impossible.

## 7. Error Handling
- Validation failures: respond with `400 InvalidFilter`, message describing offending parameter, include `details` from Zod issues.
- Rate limit hits: surface `429 RateLimited`, include limiter metadata headers, optional JSON body guiding retry timing.
- Supabase/query errors: catch thrown errors, log with `logger.error({ err, filters, requestId })`, respond `500 CatalogQueryFailed`. Optionally enqueue analytics event for monitoring (e.g., call `logAnalyticsEvent("catalog_query_failed", { requestId })` if such helper exists).
- Unexpected exceptions bubble up to same `500` handler; ensure no stack traces leak to client.

## 8. Performance Considerations
- Use `select` with explicit columns to minimize payload size and avoid triggering large text fields.
- Always use `count: "exact"` only when necessary; for large datasets consider `count: "planned"` or an additional lightweight count query—monitor Supabase costs.
- Ensure filters align with indexes: text search uses `search_tsv`; title sorting uses `games_title_trgm_idx` for search fallback; release-date filters leverage `games_release_date_idx`.
- Apply pagination via `range` to avoid retrieving entire dataset; default `pageSize=25`, cap at 100.

## 9. Implementation Steps
1. **Routing scaffold**: create `src/pages/api/v1/games.ts` (or `.astro`) with `export const prerender = false`, `GET` handler using `APIRoute`.
2. **Validation schema**: add `src/lib/validation/gamesSearch.schema.ts` (Zod) to parse query params, including helpers for coercing arrays and dates.
3. **Service layer**: implement `src/lib/services/games/catalog.service.ts` exposing `searchGames(filters, supabase)` encapsulating Supabase query composition, sorting, pagination, and DTO mapping.
5. **Error modeling**: reuse shared `createErrorResponse(code, message, details?)` helper for consistent envelopes; map service errors to domain codes.
6. **Logging**: ensure route catches errors and logs via `logger` with `requestId`, `filters`, and Supabase error details before responding.
