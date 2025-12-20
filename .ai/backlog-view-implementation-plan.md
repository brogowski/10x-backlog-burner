## View Implementation Plan – Backlog

## 1. Overview

The **Backlog** view at `/backlog` lets users **view and manage their full backlog of games** imported from Steam and added manually.  
It focuses on **listing backlog entries with pagination**, allowing users to **move games into the in-progress queue** (respecting the in-progress cap) and **remove games from the backlog**, while providing clear error handling, keyboard accessibility, and optional progress indicators.

## 2. View Routing

- **Route path**: `/backlog`
- **Framework**: Astro 5 + React 19 (React for interactive list, pagination, and item actions)
- **Implementation approach**:
  - Astro page: `src/pages/backlog.astro`
  - Main interactive content: React client component (e.g. `BacklogPageView` in `src/components/backlog/BacklogPageView.tsx`) mounted from the Astro page.
  - API calls made from the browser to Astro API proxies under `/api/v1/...` (which forward to backend `/v1/...`), consistent with the in-progress view.

## 3. Component Structure

High-level hierarchy:

- `BacklogPageView` (React, main container)
  - Header section
    - Title + subtitle
    - `AddGamesButton` (navigates to manual Search/Add flow)
  - Main content (conditional):
    - If loading and no data yet:
      - Loading state (skeleton or message)
    - Else if error:
      - `InlineErrorBanner`
    - Else if backlog has items:
      - `BacklogList`
        - `BacklogListItem` (one per game)
          - `GameRow` (shared presentational row)
          - `AddToInProgressButton`
          - `RemoveFromBacklogButton`
      - `PaginationControl` (“Load more” button and meta)
    - Else (no backlog items):
      - `BacklogEmptyState`
        - Inline `AddGamesButton`

Supporting hooks / utilities:

- `useBacklog` – custom hook for data fetching, pagination, and item mutations (add-to-in-progress, remove-from-backlog).
- Backlog types and mappers in `src/lib/backlog/types.ts`.
- Backlog API helpers in `src/lib/backlog/backlogApi.ts`.

## 4. Component Details

### 4.1 `BacklogPageView`

- **Component description**:  
  Top-level React component for the `/backlog` route. It coordinates loading backlog data, rendering the list or empty state, handling pagination, and wiring row-level actions (add to in-progress, remove) to the `useBacklog` hook.

- **Main elements and children**:
  - `<section>` container with responsive padding and max width.
  - `<header>`:
    - Text label (e.g. “Backlog” as an eyebrow label).
    - `<h1>` for page title (e.g. “Your backlog”).
    - Short explanatory paragraph (e.g. “Review everything you own and decide what to play next.”).
    - `AddGamesButton` as primary CTA.
  - Main content block:
    - Loading state (`div` with skeleton or “Loading your backlog...” text) when `loading && !backlog`.
    - `InlineErrorBanner` when `error` is present.
    - If `backlog && backlog.items.length > 0`:
      - `BacklogList` for current items.
      - `PaginationControl` underneath the list when `backlog.hasMore` is `true`.
    - If `backlog` exists and has no items:
      - `BacklogEmptyState`.

- **Handled interactions**:
  - On mount: triggers `useBacklog` initial fetch.
  - Header `AddGamesButton` click: navigates to manual add/search view (e.g. `/backlog/add` or another agreed route).
  - List events delegated to hook:
    - `onAddToInProgress` → `useBacklog.addToInProgress`.
    - `onRemove` → `useBacklog.removeFromBacklog`.
  - Pagination:
    - `PaginationControl` “Load more” → `useBacklog.loadMore`.
  - Error handling:
    - `InlineErrorBanner` “Retry” → `useBacklog.refetch`.

- **Validation conditions (according to API and UX)**:
  - Do not render list until initial fetch finishes (avoid flicker with empty state).
  - Ensure we never invoke `loadMore` when `backlog.hasMore === false` or when `loadingMore === true`.
  - Avoid duplicate entries: when appending new items, deduplicate using `steamAppId` (from `BacklogGameItemVM`).
  - Treat `status` defensively: display only items with `status === "backlog"` (if server returns mixed statuses).
  - Ensure keyboard focus order: header → error banner (if visible) → list → pagination.

- **Types used**:
  - DTOs: `UserGamesListDTO`, `UserGameDTO` (from `src/types.ts`).
  - ViewModels: `BacklogGameItemVM`, `BacklogPageVM` (from `src/lib/backlog/types.ts`).
  - Hook result: `UseBacklogResult` (custom type for `useBacklog`).
  - Error metadata: `RateLimitMetadata` and `ApiError` (reuse from in-progress or shared).

- **Props (component interface)**:
  - MVP: no props (component fetches data client-side).
  - Optionally (for future SSR): `initialBacklog?: BacklogPageVM` to hydrate from server-rendered data.

### 4.2 `BacklogList`

- **Component description**:  
  Presentational component that renders the list of backlog games in a vertical stack, delegating row actions up to `BacklogPageView`.

- **Main elements**:
  - `<ul>` or `<div role="list">` as list container.
  - Each item rendered as `BacklogListItem` within `<li>` / `<div role="listitem">`.
  - Tailwind classes for spacing, borders, hover/focus states.

- **Handled interactions**:
  - Row-level callbacks:
    - `onAddToInProgress(item: BacklogGameItemVM)`.
    - `onRemove(item: BacklogGameItemVM)`.
  - Does not perform any data fetching or state management; simply calls props methods.

- **Handled validation conditions**:
  - Receives `items` already normalized; ensures list is stable by using `steamAppId` as React key for each row.
  - Does not allow reorder; order is purely controlled upstream (e.g. sorted by `lastUpdatedAt`).
  - If `items.length === 0`, this component should generally not be rendered (empty state used instead).

- **Types (DTO and ViewModel)**:
  - `BacklogGameItemVM` (for each item).

- **Props**:
  - `items: BacklogGameItemVM[]`
  - `onAddToInProgress: (item: BacklogGameItemVM) => void`
  - `onRemove: (item: BacklogGameItemVM) => void`
  - `activeItemMutations: Record<number, "addToInProgress" | "remove" | "idle">` – for per-row loading states keyed by `steamAppId`.

### 4.3 `BacklogListItem`

- **Component description**:  
  Represents a single backlog entry row, combining `GameRow` for metadata display with two action buttons: “Add to In-Progress” and “Remove”.

- **Main elements**:
  - Outer container:
    - `<li>` (if parent is `<ul>`) with flex layout: game info on the left, actions on the right.
  - `GameRow` subcomponent:
    - Displays title, optional (future) artwork, achievements progress (if any), and updated timestamp.
  - Actions area:
    - `AddToInProgressButton`
    - `RemoveFromBacklogButton`

- **Handled interactions**:
  - Click or keyboard activation on `AddToInProgressButton` triggers `onAddToInProgress`.
  - Click or keyboard activation on `RemoveFromBacklogButton` triggers `onRemove`.
  - Focus/hover states on row for visual clarity.

- **Handled validation conditions**:
  - Uses `isMutating` state to disable both buttons while a mutation affecting this item is in progress.
  - Ensures accessible labels for buttons:
    - Example: `aria-label="Add ${title} to in-progress queue"` and `aria-label="Remove ${title} from backlog"`.
  - Does not render action buttons if required data (e.g. `steamAppId`) is missing (should not happen, but guard).

- **Types**:
  - `BacklogGameItemVM`.

- **Props**:
  - `item: BacklogGameItemVM`
  - `activeState: "addToInProgress" | "remove" | "idle"`
  - `onAddToInProgress: (item: BacklogGameItemVM) => void`
  - `onRemove: (item: BacklogGameItemVM) => void`

### 4.4 `GameRow` (shared)

- **Component description**:  
  Presentational component used in both Backlog and (optionally) other views to show core game information: title, metadata, and optional progress details.

- **Main elements**:
  - Wrapper: `<article>` or `<div>` with flex layout.
  - Title block:
    - `<h3>` with `title`.
    - Optional secondary text (e.g. slug or status badge “Backlog”).
  - Metadata row:
    - Updated timestamp (“Updated {relative time} ago” derived from `lastUpdatedAt`).
    - Achievements progress pill, if `achievementsUnlocked` (and optionally `achievementsTotal`) is available:
      - e.g. “12 achievements unlocked” or “12 / 50 achievements”.
    - Popularity/other metadata if desired later.

- **Handled interactions**:
  - Optional `onClick` for game details (future; for this plan, can be non-interactive aside from hover).
  - Hover/focus styling only for MVP.

- **Handled validation conditions**:
  - Requires `title` and `steamAppId`.
  - If timestamp fields are invalid/missing, fallback to no date instead of rendering broken text.
  - If `achievementsUnlocked` is `null` or `undefined`, hide progress pill.
  - If `achievementsTotal` is present and non-zero, clamp display to ensure `achievementsUnlocked <= achievementsTotal`.

- **Types**:
  - `GameRowProps` (Backlog-specific subset):
    - `steamAppId: number`
    - `title: string`
    - `lastUpdatedAt: string`
    - `importedAt: string`
    - `achievementsUnlocked?: number | null`
    - `achievementsTotal?: number | null`
    - `status: GamePlayStatus`
    - `slug: string`
    - Optional `onClick?: () => void`

- **Props**:
  - As defined in `GameRowProps`, usually fed from `BacklogGameItemVM`.

### 4.5 `AddToInProgressButton`

- **Component description**:  
  Primary action button rendered in each backlog row to move a game from backlog into the in-progress queue.

- **Main elements**:
  - `shadcn/ui` `Button` with variant “default” or “primary”, labeled “Add to In-Progress”.
  - Optional icon (e.g. play/queue) to visually indicate action.

- **Handled interactions**:
  - Click/keyboard:
    - `onClick` calls `onAddToInProgress()`.
  - Loading state:
    - Shows spinner and disables button when `isLoading` is true.

- **Handled validation conditions**:
  - `disabled` when:
    - An add-to-in-progress mutation is in-flight for this item.
    - Or (optionally) when we know the in-progress cap has been reached (if `isQueueAtCap` is true).
  - Button must remain focusable; disabled state should be clearly indicated.
  - `aria-label` includes game title for SR users.

- **Types**:
  - `AddToInProgressButtonProps`:
    - `onClick: () => void`
    - `isLoading?: boolean`
    - `isQueueAtCap?: boolean`

- **Props**:
  - `onClick`, `isLoading`, `isQueueAtCap`.

### 4.6 `RemoveFromBacklogButton`

- **Component description**:  
  Secondary action in each backlog row that removes the game from the backlog entirely (soft delete via API).

- **Main elements**:
  - `Button` with `variant="outline"` or `variant="ghost"` and label “Remove”.
  - Optional destructive styling when confirmed (e.g. red text/icon).

- **Handled interactions**:
  - `onClick` triggers `onRemove()`:
    - Option A (MVP friendly): No intermediate confirm; rely on undo or toast for feedback.
    - Option B: Use a small confirm popover or 2-step pattern (first click marks, second click confirms).
  - Loading state while delete is in-flight (spinner + disabled).

- **Handled validation conditions**:
  - `disabled` when `isLoading` is true.
  - `aria-label` includes game title, e.g. `aria-label="Remove Hades from your backlog"`.

- **Types**:
  - `RemoveFromBacklogButtonProps`:
    - `onRemove: () => void`
    - `isLoading?: boolean`

- **Props**:
  - `onRemove`, `isLoading`.

### 4.7 `PaginationControl`

- **Component description**:  
  Control shown beneath the backlog list that handles server-side pagination using a “Load more” button.

- **Main elements**:
  - Container with summary text, e.g. “Showing {loadedCount} of {total} games”.
  - `Button` labeled “Load more” when more pages are available.
  - Optional subtle divider between list and pagination.

- **Handled interactions**:
  - Click/keyboard on “Load more”:
    - Calls `onLoadMore()`, which triggers `useBacklog.loadMore`.
  - Loading indicator while `isLoadingMore` is true.

- **Handled validation conditions**:
  - Button hidden or disabled when `hasMore === false`.
  - Button disabled while `isLoadingMore` is true.
  - `aria-label="Load more backlog games"` to describe purpose for SR users.

- **Types**:
  - `PaginationControlProps`:
    - `hasMore: boolean`
    - `isLoadingMore: boolean`
    - `loadedCount: number`
    - `total: number`
    - `onLoadMore: () => void`

- **Props**:
  - As above.

### 4.8 `AddGamesButton` (Backlog context)

- **Component description**:  
  High-level CTA for adding new games to the backlog via the manual search/add view (US-008), used both in the page header and in the empty state.

- **Main elements**:
  - `Button` (primary CTA) with label like “Add games”.
  - Optional plus icon.

- **Handled interactions**:
  - Click/keyboard:
    - `onClick` navigates to manual add/search route (e.g. `window.location.assign("/backlog/add")` or router-based navigation).

- **Handled validation conditions**:
  - Typically always enabled; backlog size is unbounded for MVP (no cap).
  - `aria-label` describing that this opens a search/add screen.

- **Types**:
  - `AddGamesButtonProps`:
    - `onClick: () => void`
    - `disabled?: boolean`

- **Props**:
  - As above (MVP: `disabled` normally false).

### 4.9 `BacklogEmptyState`

- **Component description**:  
  Empty-state panel shown when the user has no backlog entries. Encourages users to import from Steam (if that’s covered elsewhere) or use manual add to start building their backlog.

- **Main elements**:
  - Icon/illustration placeholder.
  - Heading (e.g. “Your backlog is empty”).
  - Body text explaining what backlog is and how to add games.
  - Inline `AddGamesButton` as primary CTA.

- **Handled interactions**:
  - `onAddClick` from CTA triggers `BacklogPageView`’s navigation handler.

- **Handled validation conditions**:
  - Render only when `backlog.items.length === 0` and `loading === false` and `error === null`.

- **Types**:
  - `BacklogEmptyStateProps`:
    - `onAddClick: () => void`

- **Props**:
  - `onAddClick`.

### 4.10 `InlineErrorBanner` (Backlog-specific usage)

- **Component description**:  
  Non-modal error banner used in the Backlog view to surface fetch errors and potentially rate-limit messages, mirroring the pattern used in the in-progress view.

- **Main elements**:
  - Banner container with contrasting background and icon.
  - Error text (derived from `error` string).
  - Optional additional copy when rate-limited.
  - “Retry” button to refetch backlog.

- **Handled interactions**:
  - “Retry” button calls `onRetry()`.
  - Optional close/dismiss action that hides banner while keeping error in state for analytics, if needed.

- **Handled validation conditions**:
  - Distinguish rate limit (HTTP 429 or `error.code === "RateLimited"`) when available and show tailored message (e.g. “You’ve hit a rate limit. Try again in a moment.”).
  - Do not show if `error` is null/empty.

- **Types**:
  - `BacklogErrorBannerProps`:
    - `message: string`
    - `rateLimit?: RateLimitMetadata | null`
    - `onRetry?: () => void`

- **Props**:
  - `message`, `rateLimit`, `onRetry`.

## 5. Types

### 5.1 Existing DTOs (from `src/types.ts`)

- **`UserGameDTO`**:
  - `gameId: number`
  - `title: string`
  - `status: GamePlayStatus` (`"backlog" | "in_progress" | "completed" | "removed"`)
  - `inProgressPosition: number | null`
  - `achievementsUnlocked: number | null`
  - `completedAt: string | null`
  - `importedAt: string`
  - `updatedAt: string`
  - `removedAt: string | null`
  - `popularityScore: number | null`
  - `slug: string`

- **`UserGamesListDTO`**:
  - `page: number`
  - `pageSize: number`
  - `total: number`
  - `results: ReadonlyArray<UserGameDTO>`

- **`PaginatedResponseDTO<T>`**:
  - Generic base for list endpoints such as `UserGamesListDTO`.

- **`CreateUserGameCommand`**:
  - `steamAppId: number`
  - `status: GamePlayStatus`
  - `inProgressPosition: number | null`

- **`UpdateUserGameCommand`**:
  - Partial command for updating status, position, achievements, and completion timestamp.

### 5.2 New Backlog ViewModel types (`src/lib/backlog/types.ts`)

- **`BacklogGameItemVM`**:
  - **Purpose**: UI-friendly representation of a backlog game entry used by list and item components.
  - **Fields**:
    - `steamAppId: number` – from `UserGameDTO.gameId`.
    - `title: string` – from `UserGameDTO.title`.
    - `status: GamePlayStatus` – typically `"backlog"` for this view.
    - `lastUpdatedAt: string` – from `UserGameDTO.updatedAt`.
    - `importedAt: string` – from `UserGameDTO.importedAt`.
    - `achievementsUnlocked?: number | null` – from `UserGameDTO.achievementsUnlocked`.
    - `achievementsTotal?: number | null` – reserved for future enrichment; `null` for now.
    - `popularityScore?: number | null` – from `UserGameDTO.popularityScore`.
    - `slug: string` – from `UserGameDTO.slug`.
    - `isPendingAddToInProgress?: boolean` – local flag indicating add-to-in-progress is in-flight.
    - `isPendingRemove?: boolean` – local flag indicating removal is in-flight.

- **`BacklogPageVM`**:
  - **Purpose**: Represents the Backlog view’s aggregate state derived from one or more `UserGamesListDTO` pages.
  - **Fields**:
    - `items: BacklogGameItemVM[]`
    - `page: number` – last loaded page index.
    - `pageSize: number`
    - `total: number`
    - `hasMore: boolean` – computed as `items.length < total`.

- **`FetchBacklogQuery`**:
  - `status: "backlog"`
  - `page: number`
  - `pageSize: number`
  - `orderBy?: "updated_at" | "popularity_score"`

- **`AddToInProgressRequest`**:
  - **Purpose**: Maps to `PATCH /v1/user-games/{steamAppId}` for backlog → in-progress transition.
  - **Fields**:
    - `status: "in_progress"`
    - `inProgressPosition: number`

- **`UseBacklogResult`**:
  - **Purpose**: Type for the value returned from `useBacklog`.
  - **Fields**:
    - `backlog: BacklogPageVM | null`
    - `loading: boolean` – is initial fetch in progress.
    - `loadingMore: boolean` – is additional page fetch in progress.
    - `error: string | null`
    - `rateLimit: RateLimitMetadata | null`
    - `activeItemMutations: Record<number, "addToInProgress" | "remove" | "idle">`
    - `refetch: () => Promise<void>`
    - `loadMore: () => Promise<void>`
    - `addToInProgress: (item: BacklogGameItemVM) => Promise<void>`
    - `removeFromBacklog: (item: BacklogGameItemVM) => Promise<void>`

- **`RateLimitMetadata` / `ApiError`**:
  - Reuse the existing definitions from `src/lib/in-progress/types.ts` / `src/lib/in-progress/inProgressApi.ts`, or centralize them in a shared module.

### 5.3 Mapping helper

- **`mapUserGamesToBacklogPage(dto: UserGamesListDTO, existing?: BacklogPageVM): BacklogPageVM`**:
  - Filters `dto.results` to `status === "backlog"` as a defensive measure.
  - Sorts new results by `updatedAt` descending.
  - Maps each `UserGameDTO` to `BacklogGameItemVM`.
  - If `existing` is provided (for `loadMore`), appends new items, de-duplicating by `steamAppId`.
  - Sets `page` from `dto.page`, `pageSize` from `dto.pageSize`, `total` from `dto.total`, and `hasMore` as `items.length < total`.

## 6. State Management

- **Where state lives**:
  - All Backlog-specific state is managed by a custom hook `useBacklog` within `src/components/backlog/useBacklog.ts`, similar in design to `useInProgressQueue`.
  - `BacklogPageView` calls `useBacklog` and passes results into presentational components (`BacklogList`, `PaginationControl`, etc.).

- **State variables in `useBacklog`**:
  - `backlog: BacklogPageVM | null`
  - `loading: boolean` – for initial fetch.
  - `loadingMore: boolean` – for subsequent page fetches.
  - `error: string | null` – top-level error message.
  - `rateLimit: RateLimitMetadata | null` – for rate-limit-aware messaging.
  - `activeItemMutations: Record<number, "addToInProgress" | "remove" | "idle">` – track per-item mutation state.
  - Internal:
    - `currentPage: number` – current page index (initially 0 before fetch).
    - `isExhausted: boolean` – no more pages (mirrors `backlog.hasMore`).

- **Hook responsibilities**:
  - `refetch()`:
    - Reset `backlog` to `null` or empty, `currentPage` to 0, `isExhausted` to false.
    - Call `fetchBacklogPage(1)`.
  - `loadMore()`:
    - Guard: do nothing if `loadingMore === true` or `isExhausted === true`.
    - Call `fetchBacklogPage(currentPage + 1)`; merge into existing `backlog`.
  - `addToInProgress(item)`:
    - Set `activeItemMutations[item.steamAppId] = "addToInProgress"`.
    - Optionally optimistically remove the item from `backlog.items` and adjust `total`.
    - Call `backlogApi.addToInProgress(steamAppId, payload)`.
    - On success:
      - Ensure item remains removed from backlog (it now lives in in-progress).
    - On `InProgressCapReached` (409):
      - Revert optimistic removal (if applied).
      - Update `error` to a user-friendly cap message.
    - On other errors:
      - Revert to previous backlog state (snapshot) and set `error`.
    - Finally: set `activeItemMutations[steamAppId]` back to `"idle"`.
  - `removeFromBacklog(item)`:
    - Set `activeItemMutations[item.steamAppId] = "remove"`.
    - Optimistically remove the item from `backlog.items` and decrement `total`.
    - Call `backlogApi.removeFromBacklog(steamAppId)`.
    - On failure:
      - Restore pre-mutation backlog snapshot and set `error`.
    - Finally: mark mutation as `"idle"`.

- **No global store required**:
  - All state is local to the Backlog view; global state management (Redux, Zustand, etc.) is not necessary for MVP.

## 7. API Integration

### 7.1 Fetch backlog list

- **Endpoint**: `GET /v1/user-games` (called via `/api/v1/user-games` from the frontend).
- **Query parameters**:
  - `status=backlog`
  - `page` – 1-based page index, starting at 1.
  - `pageSize=50` – as specified in the view description.
  - `orderBy=updated_at`
  - `orderDirection=desc` (if supported by backend; otherwise rely on default).
- **Request type**:
  - `FetchBacklogQuery` as defined in Backlog types.
- **Response type**:
  - `UserGamesListDTO`.
- **Frontend behavior**:
  - Use `backlogApi.fetchBacklogPage(page, signal?)` returning `{ page: BacklogPageVM; rateLimit: RateLimitMetadata }`.
  - Map response with `mapUserGamesToBacklogPage`.
  - On `401 Unauthorized`, show sign-in messaging or rely on global auth redirect.
  - On `422`/`500`, set `error` and show `InlineErrorBanner`.

### 7.2 Add game to in-progress

- **Endpoint**: `PATCH /v1/user-games/{steamAppId}` (via `/api/v1/user-games/{steamAppId}`).
- **Request body**:
  - `AddToInProgressRequest`:
    - `{"status":"in_progress","inProgressPosition":<number>}`
- **Determining `inProgressPosition`**:
  - Implement a helper in `backlogApi`:
    - Option A (simpler, but more round trips): call `GET /api/v1/user-games?status=in_progress&page=1&pageSize=IN_PROGRESS_CAP` the first time user tries to add from backlog, compute `nextPosition` as `existingCount + 1`, and cache `inProgressCount` locally.
    - For MVP, we can:
      - Compute `nextPosition` as `min(existingCount + 1, IN_PROGRESS_CAP)` and rely on backend 409 to enforce cap.
  - Include this logic inside `backlogApi.addToInProgress` to keep hook code simple.
- **Response type**:
  - Updated `UserGameDTO`.
- **Frontend behavior**:
  - On success:
    - Remove item from backlog (if not already removed optimistically).
    - Optionally display success toast (“Moved to in-progress”).
  - On `409 InProgressCapReached`:
    - Keep entry in backlog.
    - Show explicit message to user (error banner or toast).
  - On `422 InvalidStatusTransition` or other errors:
    - Revert UI to previous backlog state (if it was changed optimistically).
    - Show generic or API-provided error message.

### 7.3 Remove game from backlog

- **Endpoint**: `DELETE /v1/user-games/{steamAppId}` (via `/api/v1/user-games/{steamAppId}`).
- **Request body**: none.
- **Response**:
  - `204 No Content` on success; no JSON body.
- **Frontend behavior**:
  - Optimistically remove item from `backlog.items`.
  - On `404 EntryNotFound`:
    - Treat as already removed; keep it removed and optionally refetch.
  - On other non-2xx errors:
    - Restore prior backlog state and show error.

### 7.4 Manual add search and create (via AddGamesButton)

- **Search Endpoint**: `GET /v1/games` (via `/api/v1/games`).
  - Used by a separate Search/Add view (outside this Backlog view) to find games.
  - Response type: `GamesListDTO` (from `src/types.ts`).
- **Create Endpoint**: `POST /v1/user-games` (via `/api/v1/user-games`).
  - Used by the manual add view to add a selected game into backlog.
  - Request type: `CreateUserGameCommand`.
  - Response: `UserGameDTO` (backlog entry).
- **Integration with Backlog view**:
  - `AddGamesButton` navigates to Search/Add route.
  - After manual adds, returning to `/backlog` triggers initial fetch (refetch) and the newly added entries show up in the paginated list.

### 7.5 Shared API utilities

- **Error handling**:
  - Reuse `ApiError` class and `handleResponse` helper from `src/lib/in-progress/inProgressApi.ts`:
    - Parse JSON error envelope `{ "error": { "code", "message", "details" } }`.
    - Attach parsed `RateLimitMetadata` to thrown error for 429 handling.
- **Auth headers**:
  - Reuse `buildAuthHeaders` which injects `sb-auth-token` header taken from session/middleware.

## 8. User Interactions

- **Page load**:
  - User navigates to `/backlog`.
  - `BacklogPageView` calls `useBacklog`, which triggers initial fetch.
  - While loading:
    - Show loading skeleton or “Loading your backlog...” text.
  - When data arrives:
    - If `items.length > 0`:
      - Show list of backlog entries with action buttons and a “Load more” control if `hasMore`.
    - If `items.length === 0`:
      - Show `BacklogEmptyState` with `AddGamesButton`.

- **Click “Load more”**:
  - Button becomes disabled and shows spinner / “Loading...” text.
  - After fetch:
    - Append new items to list.
    - Update summary text (“Showing X of Y games”).
    - Hide button if `hasMore` becomes `false`.
  - On error:
    - Keep existing items.
    - Show inline error near pagination and allow retry.

- **Click “Add to In-Progress” in a row**:
  - Button shows spinner; row’s actions are disabled.
  - On success:
    - Row disappears from backlog list.
    - Optional toast: “Moved to in-progress queue.”
  - On 409 (cap reached):
    - Row remains visible.
    - Show message that in-progress queue is full and suggest going to `/in-progress` to complete/remove games.
  - On other errors:
    - Row remains; actions re-enable.
    - Show inline or toast error message.

- **Click “Remove” in a row**:
  - Immediate optimistic removal:
    - Row is removed from list.
    - Optional toast: “Removed from backlog.”
  - On failure:
    - Reinstate row.
    - Show error text.

- **Click “Add games” in header or empty state**:
  - Navigates to manual Search/Add screen.
  - When user has finished adding and returns to `/backlog`, view refetches and shows new entries.

- **Keyboard interactions & accessibility**:
  - Tab order flows logically from header controls to list items to pagination.
  - Enter/Space activates buttons (Add, Remove, Load more).
  - Focus styles are clearly visible (Tailwind + design tokens).
  - Buttons have ARIA labels that include the game title and action context.

## 9. Conditions and Validation

- **Backlog list integrity**:
  - Interface ensures all displayed items have `status === "backlog"` and valid `steamAppId` and `title`.
  - Duplicate detection by `steamAppId` when merging new pages.
  - List order is based on `lastUpdatedAt` (derived from `updatedAt`); no reordering controls shown in UI (re-ordering of backlog is not part of MVP).

- **Pagination conditions**:
  - `pageSize` is fixed at 50.
  - `hasMore` computed from `items.length < total`.
  - `Load more` button rendered only when `hasMore === true`.
  - Additional `loadMore` calls disabled while a load is already in progress.

- **Add-to-In-Progress conditions**:
  - `status` transition from `"backlog"` to `"in_progress"` only.
  - `inProgressPosition` must be supplied; computed from existing in-progress entries using helper.
  - 409 `InProgressCapReached` is handled gracefully:
    - UI prevents removal from backlog.
    - Clear user-facing message displayed.

- **Remove-from-backlog conditions**:
  - `DELETE /v1/user-games/{steamAppId}` only called for entries with `status === "backlog"` (UI ensures this).
  - On 404 `EntryNotFound`, treat as already removed and keep UI consistent.

- **Auth & security**:
  - All API requests include the appropriate auth token via shared header builder.
  - On 401 responses, show user-friendly message or rely on app-wide redirect, without leaking sensitive error info.

- **Accessibility validations**:
  - All interactive controls (`Add to In-Progress`, `Remove`, `Load more`, `Add games`) are focusable via keyboard.
  - SR labels describe both the action and the affected game.
  - Error messages are presented in a way that screen readers can access (e.g. within an `aria-live` region, or via focus shift).

## 10. Error Handling

- **Initial load errors (GET /user-games)**:
  - If network or server error occurs:
    - Set `error` string.
    - Render `InlineErrorBanner` with generic but helpful copy and a Retry button.
    - `Retry` triggers `refetch()`.

- **Pagination errors (Load more)**:
  - If `loadMore` fails:
    - Preserve the already-loaded items.
    - Optionally present a small inline error near the `Load more` button stating “We couldn’t load more games. Try again.”
    - Allow user to retry `loadMore`.

- **Add-to-In-Progress errors**:
  - **409 InProgressCapReached**:
    - Keep item in backlog; do not remove.
    - Show cap-specific message, possibly with link to `/in-progress`.
  - **422 InvalidStatusTransition**:
    - Re-sync by calling `refetch()`.
    - Show generic message: “We couldn’t move that game. Your list has been refreshed.”
  - **Other 4xx/5xx / network**:
    - Revert any optimistic UI changes.
    - Show generic error (“We couldn’t update your backlog. Please try again.”).

- **Remove-from-backlog errors**:
  - On 404 `EntryNotFound`:
    - Do nothing (already removed), optionally notify user that list is up to date.
  - On other errors:
    - Restore removed row from snapshot.
    - Show error in banner or toast.

- **401 Unauthorized**:
  - If encountered on any request:
    - Optionally show “You need to sign in to view your backlog” message and a login button.
    - Or rely on global auth handler to redirect user.

- **429 RateLimited**:
  - Use `RateLimitMetadata` to optionally estimate retry time.
  - Show message that user is temporarily rate-limited and should wait before retrying.
  - Disable repeated `loadMore` or mutating actions while in a short-lived rate-limited state, to reduce noise.

## 11. Implementation Steps

1. **Set up routing and Astro shell**
   - Create `src/pages/backlog.astro` using the main layout and mount `BacklogPageView` as a React island.
   - Ensure the route is protected/connected to auth middleware consistently with other authenticated routes.

2. **Define Backlog types and mapping utilities**
   - Add `src/lib/backlog/types.ts` with:
     - `BacklogGameItemVM`, `BacklogPageVM`, `FetchBacklogQuery`, `AddToInProgressRequest`, `UseBacklogResult`.
     - `mapUserGamesToBacklogPage(dto, existing?)` that constructs `BacklogPageVM` from `UserGamesListDTO`.
   - Reuse or centralize `RateLimitMetadata` and `ApiError` to avoid duplication with the in-progress module.

3. **Implement Backlog API helpers**
   - Create `src/lib/backlog/backlogApi.ts` with functions:
     - `fetchBacklogPage(page: number, signal?: AbortSignal)` → `{ page: UserGamesListDTO; rateLimit: RateLimitMetadata }`.
     - `addToInProgress(steamAppId: number, position: number, signal?: AbortSignal)` → updated `UserGameDTO`.
     - `removeFromBacklog(steamAppId: number, signal?: AbortSignal)` → void.
     - (Optionally) `fetchInProgressCount(signal?: AbortSignal)` → number, to compute `inProgressPosition`.
   - Use the same `handleResponse` / `buildAuthHeaders` pattern as `inProgressApi.ts`.

4. **Build `useBacklog` hook**
   - Implement `src/components/backlog/useBacklog.ts`:
     - Manage `backlog`, `loading`, `loadingMore`, `error`, `rateLimit`, `activeItemMutations`.
     - Implement `refetch`, `loadMore`, `addToInProgress`, and `removeFromBacklog` with optimistic updates and rollback on failure.
     - Integrate pagination logic and `hasMore` calculation.

5. **Create presentational components**
   - Implement `BacklogList`, `BacklogListItem`, `BacklogEmptyState`, `PaginationControl`, `AddToInProgressButton`, and `RemoveFromBacklogButton` in `src/components/backlog/`.
   - Reuse styling patterns and shadcn/ui components consistent with the in-progress view (e.g. spacing, typography).
   - Implement `GameRow` as a shared component if not already available, or adapt existing one for backlog context.

6. **Compose `BacklogPageView`**
   - Implement `src/components/backlog/BacklogPageView.tsx`:
     - Use `useBacklog` to obtain all data and action handlers.
     - Render header with `<h1>`, explanatory copy, and `AddGamesButton`.
     - Render loading state, error banner, list + pagination, or empty state as appropriate.
     - Wire event handlers for `onAddToInProgress`, `onRemove`, `onLoadMore`, `onRetry`, and `onAddClick`.

7. **Wire navigation for `AddGamesButton`**
   - Decide on or confirm the route for the Search/Add flow (e.g. `/backlog/add`).
   - Implement `AddGamesButton` `onClick` handler in `BacklogPageView` to navigate to that route using `window.location.assign` or another project-standard navigation method.

8. **Add accessibility and UX polish**
   - Ensure keyboard focus order and focus-visible styling for all interactive elements.
   - Add descriptive `aria-label`s and `aria-live` regions (if needed) for error messages.
   - Verify that list, error banner, and pagination controls are all screen-reader friendly.

9. **Integrate error and rate-limit handling**
   - Ensure `ApiError` is correctly handled in `useBacklog` for 401, 409, 422, 429, and 5xx scenarios.
   - Surface user-friendly error messages in `InlineErrorBanner` and near pagination where appropriate.

10. **Testing and QA**
    - Test normal flows:
      - Initial load with many backlog items.
      - Click “Load more” until all pages are loaded.
      - Add multiple different games to in-progress, including when nearing the in-progress cap.
      - Remove games from backlog and confirm list updates correctly.
    - Test edge/error cases:
      - Simulate backend errors for each API call (GET, PATCH, DELETE).
      - Simulate 409 `InProgressCapReached` and confirm UI leaves game in backlog with a clear message.
      - Simulate 401/429 responses and verify error experiences.
    - Test accessibility:
      - Keyboard-only navigation.
      - Screen reader labels for all controls.
      - Behavior on small screens and responsive layouts.

