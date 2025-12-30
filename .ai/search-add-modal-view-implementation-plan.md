# View Implementation Plan – Search/Add Modal

## 1. Overview
Modal/overlay invoked from `/in-progress` and `/backlog` to search the public games catalog and add titles to the user’s backlog or in-progress queue. Supports manual add fallback (US-008), respects in-progress cap, syncs filters to URL, and provides accessible feedback, rate-limit notices, and error handling.

## 2. View Routing
- Triggered from existing FAB on `/in-progress` and `/backlog`.
- Modal uses URL search params for filters (`search`, `genres`, `releasedAfter`, `releasedBefore`, `sort`, `page`, `pageSize`) without navigating away; keep base route intact.

## 3. Component Structure
- `SearchAddModal`
  - `ModalHeader` (title, close)
  - `SearchInput` (debounced)
  - `FiltersRow`
    - `GenresMultiSelect`
    - `ReleaseRangeFilter`
    - `SortSelect`
    - `AppliedFiltersBar`
  - `RateLimitBanner` (conditional)
  - `ResultsSection`
    - `ResultsList`
      - `ResultItem`*
        - `AddButton`
    - `ResultsEmptyState` / `ResultsErrorState`
    - `ResultsSkeleton`
  - `PaginationControls`
  - `ToastsHost` + `AriaLiveRegion`
- `ErrorBoundary` wraps modal content.

## 4. Component Details
### SearchAddModal
- Purpose: orchestrates modal lifecycle, state, URL sync, fetch orchestration, and error/rate-limit handling.
- Main elements: dialog overlay, header, filters row, results area, pagination, toasts/live region.
- Handled interactions: open/close (Esc, backdrop click), initial focus on search, refetch on filter/sort/pagination changes.
- Validation: resets page to 1 when filters change; rejects invalid dates; clamps `pageSize` to ≤100.
- Types: `SearchFiltersVM`, `GamesListDTO`, `RateLimitState`, `CapState`.
- Props: `isOpen`, `onClose`, `capState`, optional `initialFilters`.

### SearchInput
- Purpose: controlled text input with debounce; Enter triggers immediate fetch.
- Elements: input field, clear button (×), optional loading spinner.
- Interactions: type, clear, submit on Enter.
- Validation: max length (optional 200); trims whitespace.
- Types: `SearchFiltersVM`.
- Props: `value`, `onChange`, `onSubmit`, `isLoading`.

### GenresMultiSelect
- Purpose: multi-select genres via checkboxes/pills.
- Elements: dropdown or inline list, checkboxes, “Clear” control.
- Interactions: toggle genre, clear all.
- Validation: accept only known genre values list.
- Types: `string[]`.
- Props: `selected`, `options`, `onChange`.

### ReleaseRangeFilter
- Purpose: set `releasedAfter` and `releasedBefore`.
- Elements: two date inputs or preset buttons.
- Interactions: set start/end, clear range.
- Validation: ISO date strings; `releasedAfter` ≤ `releasedBefore`; ignore invalid inputs and surface inline error.
- Types: `{ releasedAfter?: string; releasedBefore?: string }`.
- Props: `value`, `onChange`.

### SortSelect
- Purpose: choose sort (`popularity`, `release_date_desc`, `title_asc`).
- Elements: select/dropdown.
- Interactions: change sort.
- Validation: only allowed options; default `popularity`.
- Types: `SortOption`.
- Props: `value`, `onChange`.

### AppliedFiltersBar
- Purpose: display active filters as chips; allow removal/reset; reflect URL sync.
- Elements: chips for search, genres, dates, sort; “Reset all”.
- Interactions: remove single filter, reset all.
- Validation: none beyond upstream.
- Types: `SearchFiltersVM`.
- Props: `filters`, `onRemove`, `onReset`.

### RateLimitBanner
- Purpose: show 429 info with retry countdown.
- Elements: banner with remaining/retryAfter, retry button.
- Interactions: click retry to refetch when timer elapsed.
- Validation: disables retry until `retryAfter` passed.
- Types: `RateLimitState`.
- Props: `rateLimit`, `onRetry`.

### ResultsList
- Purpose: render catalog results grid/list.
- Elements: cards/rows with artwork, title, genres, release date, popularity, achievements.
- Interactions: none; delegates add to `ResultItem`.
- Validation: none; handles empty state if `results.length === 0`.
- Types: `GameCardVM[]`.
- Props: `items`, `isLoading`, `error`, `onRetry`.

### ResultItem
- Purpose: display single game and add controls.
- Elements: artwork image, title, metadata, `AddButton`.
- Interactions: click add (backlog or in-progress), maybe show tooltip when disabled.
- Validation: none; respects `addDisabledReason`.
- Types: `GameCardVM`, `AddStatus`.
- Props: `item`, `onAddBacklog`, `onAddInProgress`, `addStatus`.

### AddButton
- Purpose: trigger add; shows status/disable on cap/duplicate.
- Elements: primary button with spinner; optional secondary for “Add to in-progress”.
- Interactions: click actions.
- Validation: disabled when `capState.canAdd` is false (for in-progress), or when already added; guards double submits.
- Types: `CapState`, `AddStatus`.
- Props: `mode` (`backlog` | `inProgress`), `disabledReason`, `status`, `onClick`.

### PaginationControls
- Purpose: page navigation and pageSize select.
- Elements: prev/next buttons, page display, pageSize select (<=100).
- Interactions: change page/pageSize, keyboard accessible.
- Validation: clamp page ≥1; reset to 1 on pageSize change.
- Types: `PaginationState`.
- Props: `page`, `pageSize`, `total`, `onPageChange`, `onPageSizeChange`.

### ErrorBoundary
- Purpose: catch render errors, show fallback and retry.
- Elements: fallback UI with retry button.
- Interactions: retry calls refetch/reset.
- Validation: n/a.
- Types: `ReactErrorInfo` patterns.
- Props: `onReset`.

### ToastsHost & AriaLiveRegion
- Purpose: announce success/error/info; ensure screen readers get updates.
- Elements: toast stack; `aria-live="polite"` region with latest message.
- Interactions: auto-dismiss, close button.
- Validation: n/a.
- Types: `Toast`.
- Props: `toasts`, `onDismiss`.

## 5. Types
- `SearchFiltersVM`: `{ search: string; genres: string[]; releasedAfter?: string; releasedBefore?: string; sort: "popularity" | "release_date_desc" | "title_asc"; page: number; pageSize: number; }`
- `GameCardVM`: derived from `GameSummaryDTO` plus `{ isInBacklog?: boolean; isInProgress?: boolean; addDisabledReason?: string }`
- `PaginationState`: `{ page: number; pageSize: number; total: number }`
- `RateLimitState`: `{ isRateLimited: boolean; limit?: number; remaining?: number; reset?: number; retryAfter?: number }`
- `CapState`: `{ max: number; current: number; canAdd: boolean; notice?: string }`
- `AddStatus`: `"idle" | "pending" | "success" | "error"`
- API DTOs reused: `GamesListDTO`, `GameSummaryDTO`, `CreateUserGameCommand`, `UpdateUserGameCommand`.

## 6. State Management
- Local modal state with React hooks; no global store required.
- `filters` state synced to URL search params (custom `useUrlFiltersSync` hook).
- `debouncedSearch` via `useDebounce`.
- `results`, `loading`, `error`, `rateLimit` managed by `useCatalogSearch` (uses `AbortController` to cancel stale requests).
- `addStatusById` map managed by `useAddUserGame` hook; updates local `GameCardVM` flags.
- `capState` provided by parent or fetched once from `/v1/user-games?status[]=in_progress` (optional helper hook).
- `toasts` state in modal for user feedback.

## 7. API Integration
- GET `/v1/games` with query params from `filters`; headers: cache control, rate-limit headers. Handle status 200 (parse `GamesListDTO`), 400 (show validation error), 429 (set `rateLimit` and banner), 500 (error state).
- POST `/v1/user-games` body `{ steamAppId, status: "backlog", inProgressPosition: null }`; handle 201 success, 409 duplicate (toast and mark as already added), 401 redirect/prompt login, 404 show “Game not found”.
- PATCH `/v1/user-games/{steamAppId}` body `{ status: "in_progress", inProgressPosition }`; success updates flags; on cap exceeded (client-side prevent), 409 duplicate ignore.
- Include `credentials` if required by auth; parse JSON error codes matching backend (`InvalidFilter`, `DuplicateEntry`, etc.).

## 8. User Interactions
- Open modal → focus search.
- Type search → debounced fetch; Enter triggers immediate fetch.
- Select genres/dates/sort → update filters, reset page=1, fetch.
- Clear filters → reset to defaults, fetch.
- Pagination → change page/pageSize, fetch.
- Click Add to backlog → POST; on success toast “Added to backlog”; disable button for that game.
- Click Add to in-progress → if `capState.canAdd` true, PATCH; else show cap notice tooltip/toast.
- Retry after error or rate-limit → re-run GET when allowed.
- Close modal via Esc, close button, or backdrop.

## 9. Conditions and Validation
- `sort` restricted to allowed options; invalid sorts reset to default.
- `pageSize` ≤ 100; non-numeric -> default 25.
- Dates must be valid ISO; if invalid, show inline error and skip sending param.
- `releasedAfter` must be ≤ `releasedBefore`; otherwise show validation and omit request until fixed.
- Add actions blocked when already added or when cap reached (in-progress).
- Debounce prevents firing with every keystroke; ensure immediate fetch on Enter.

## 10. Error Handling
- 400 from search → show inline “Filters invalid” toast + highlight offending controls.
- 429 → show `RateLimitBanner`, disable fetch/add until retryAfter; countdown; retry button.
- 500/network → show `ResultsErrorState` with retry; toast message.
- POST errors: 401 prompt login; 404 show “Game not found”; 409 show “Already in backlog” and mark disabled.
- PATCH errors: treat similarly; if fails, revert local optimistic flags.
- ErrorBoundary catches render errors; fallback with retry/close option.

## 11. Implementation Steps
1) Scaffold `SearchAddModal` component and overlay structure with header/close and focus trap.
2) Implement `useUrlFiltersSync` to parse/serialize filters (with defaults and clamps).
3) Add `SearchInput`, `GenresMultiSelect`, `ReleaseRangeFilter`, `SortSelect`, `AppliedFiltersBar` wired to filters; ensure keyboard accessibility.
4) Build `useCatalogSearch` hook with debounce + `AbortController`; handle rate-limit headers and errors.
5) Add loading skeleton, empty, and error states to `ResultsSection`.
6) Implement `ResultsList`, `ResultItem`, `AddButton` with cap-aware disabling and per-item status.
7) Build `useAddUserGame` (POST) and `useSetInProgress` (PATCH) hooks with toasts and optimistic update.
8) Add `PaginationControls` with page/pageSize management and reset rules.
9) Integrate `RateLimitBanner` + countdown + retry flow.
10) Wire `ToastsHost` and `AriaLiveRegion`; ensure announcements on results count and actions.
11) Wrap modal content in `ErrorBoundary`; verify keyboard-first (tab order, Enter/Esc) and URL sync behavior.

