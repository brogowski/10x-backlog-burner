## View Implementation Plan – In-Progress

## 1. Overview

The **In-Progress** view at `/in-progress` lets users manage a capped queue (up to 5 games) of actively played games.  
It focuses on **prioritizing, reordering, and completing games**, while displaying key metadata (title, artwork, achievements) and enforcing the in-progress cap with clear feedback.

## 2. View Routing

- **Route path**: `/in-progress`
- **Framework**: Astro 5 + React 19 (for interactive list, DnD, and optimistic updates)
- **Implementation approach**:
  - Astro page: `src/pages/in-progress.astro`
  - Main interactive content: React client component mounted within the Astro page (e.g. `InProgressPageView` in `src/components/in-progress/InProgressPageView.tsx`)

## 3. Component Structure

High-level hierarchy:

- `InProgressPageView` (React, main container)
  - `HeaderCapBadge`
  - Conditional:
    - If there are in-progress games:
      - `InProgressList` (DnD-enabled list)
        - `InProgressListItem` (one per game)
          - `GameRow`
            - Artwork thumbnail
            - Title + metadata
            - Achievements info
          - `DragHandle`
          - `CompleteButton` (opens `CompleteConfirmDialog`)
          - `RemoveToBacklogButton`
    - If empty:
      - `EmptyState`
  - `AddGamesButton`
  - `InlineErrorBanner`

Supporting hooks / utilities:

- `useInProgressQueue` – data fetching, local state, mutations, optimistic reorder.
- API helpers (e.g. `inProgressApi.ts`) for typed HTTP calls.

## 4. Component Details

### 4.1 `InProgressPageView`

- **Description**: Top-level React component orchestrating the in-progress queue: fetches data, wires up DnD, handles optimistic reorder, completes/removes games, exposes add-games entry point, and shows errors/undo.
- **Main elements / children**:
  - Layout wrapper (`<section>` with heading and description).
  - `HeaderCapBadge` (cap indicator).
  - `InProgressList` or `EmptyState` depending on queue length.
  - `AddGamesButton` placed near header or above list.
- **Handled interactions**:
  - Initial data load on mount via `GET /v1/user-games?status=in_progress&orderBy=in_progress_position`.
  - Drag-and-drop reorder (mouse + keyboard).
  - Click complete → open confirm → call complete API.
  - Click remove → call status change / delete API.
  - Click "Add games" → open in-page search modal (configurable by future design).
- **Validation conditions**:
  - Ensure only items with `status === "in_progress"` are displayed.
  - Ensure positions are unique integers starting from 1, sorted by `inProgressPosition`.
  - Enforce a hard cap of 5 items at UI level (no "add" when already at 5).
  - Before PATCH reorder, validate `items.length` equals current in-progress count and that positions are unique (frontend guard).
  - Disable actions that would exceed cap (e.g. not relevant in this view for status changes to `in_progress`, but do consider race conditions with backend).
- **Types used**:
  - `UserGameDTO` and `UserGamesListDTO` from `src/types.ts`.
  - `GamePlayStatus` enum type for status checks.
  - ViewModels: `InProgressGameItemVM`, `InProgressQueueVM`.
  - State types and mutation payloads: `ReorderInProgressRequest`, `CompleteGameRequest`, `UpdateUserGameStatusRequest`.
- **Props**:
  - Expected as root: either no props or optional server-provided initial data:
    - `initialQueue?: InProgressQueueVM` (for future SSR/Hydration); for MVP, can omit and rely on client fetch.

### 4.2 `HeaderCapBadge`

- **Description**: Small header element showing the current count of in-progress games and the cap (e.g. `3 / 5 in progress`), plus optional tooltip or helper copy.
- **Main elements**:
  - Wrapper: `<div>` or `<header>` segment within page header.
  - `shadcn/ui` badge or pill-like container (`<span>` with Tailwind).
  - Optional icon for "fire" or "queue" to reinforce concept.
  - Optional tooltip explaining the cap behavior.
- **Handled interactions**:
  - Optional tooltip hover/focus events.
- **Validation conditions**:
  - Display `currentCount` as a non-negative integer.
  - Display `cap` as constant 5 from config.
  - If `currentCount >= cap`, visually emphasize (e.g. red/orange badge) and ensure `AddGamesButton` is disabled.
- **Types**:
  - Props type `HeaderCapBadgeProps`:
    - `currentCount: number`
    - `cap: number`
    - `isAtCap: boolean` (derived or passed).
- **Props**:
  - `currentCount`
  - `cap` (default 5)
  - `isAtCap` (optional; otherwise computed from `currentCount >= cap`).

### 4.3 `InProgressList`

- **Description**: DnD-enabled list for reordering in-progress games, built with `@dnd-kit` and fully keyboard accessible.
- **Main elements**:
  - Container: `<ol>` for ordered semantics (positions).
  - DnD context providers:
    - `DndContext`
    - `SortableContext` (or equivalent from dnd-kit).
  - Each list item is `InProgressListItem`.
  - ARIA roles: `role="list"` / `role="listitem"` as appropriate; ensure only one ordering semantics (HTML list vs ARIA).
- **Handled interactions**:
  - Drag start / drag end events from mouse, touch, keyboard.
  - On successful reorder, call parent `onReorder(newOrder: InProgressGameItemVM[])`.
  - On cancel (escape), revert local ordering.
- **Validation conditions**:
  - Incoming `items` must have unique `steamAppId` and unique `inProgressPosition`.
  - After local reordering, recalculate positions (1-based) and ensure uniqueness.
  - Do not attempt reorder if only one item.
- **Types**:
  - `InProgressListProps`:
    - `items: InProgressGameItemVM[]`
    - `isReordering: boolean` (for disabling while API in-flight).
    - `onReorder: (items: InProgressGameItemVM[]) => void`
    - `onComplete: (item: InProgressGameItemVM) => void`
    - `onRemove: (item: InProgressGameItemVM) => void`
- **Props**:
  - `items`, `isReordering`, `onReorder`, `onComplete`, `onRemove` as above.

### 4.4 `InProgressListItem`

- **Description**: Represents a single in-progress game entry within the DnD list; wraps `GameRow` plus DnD handle and action buttons.
- **Main elements**:
  - `<li>` outer element with sortable attributes / DnD sensors.
  - `GameRow` component displaying game metadata.
  - `DragHandle` (icon/button with `aria-label="Reorder"`).
  - `CompleteButton` (primary action).
  - `RemoveToBacklogButton` (secondary action).
- **Handled interactions**:
  - Dragging via `DragHandle`.
  - Click "Complete" → triggers `onComplete`.
  - Click "Move to backlog" or "Remove" → triggers `onRemove`.
  - Keyboard shortcuts:
    - Space/Enter on `DragHandle` to start keyboard drag.
    - Arrow keys to move item up/down in the list.
  - Focus management after reorder (keep focused item stable).
- **Validation conditions**:
  - Ensure `position` (displayed number) matches index + 1 or `inProgressPosition`.
  - Actions disabled while global `isReordering` or per-item mutation in-flight.
  - Only show achievements info when `achievementsTotal` is known (from catalog) or param provided.
- **Types**:
  - `InProgressListItemProps`:
    - `item: InProgressGameItemVM`
    - `isMutating: boolean` (any item-level mutation).
    - `onComplete: () => void`
    - `onRemove: () => void`
- **Props**:
  - `item`, `isMutating`, `onComplete`, `onRemove` as above.

### 4.5 `GameRow`

- **Description**: Presentational row for a single game, shared across in-progress and potentially other views, showing artwork, title, and meta (achievements, status, etc.).
- **Main elements**:
  - Layout container: `<div>` or `<article>`; flexbox row.
  - Artwork thumbnail: `<img>` or `<picture>` with lazy loading and alt text; possible wrapper for aspect ratio.
  - Title block: `<h3>` for game title, optional subtitle/slug.
  - Metadata: inline text/icons showing achievements unlocked, total achievements, popularity, etc. (for now: achievements if available).
  - Optional tags: "In progress", "Completed", etc. (here: always `In progress`).
- **Handled interactions**:
  - Click or keyboard activation can open a detail view (future; can be no-op for MVP).
  - Focus/hover styling only.
- **Validation conditions**:
  - Require `title` and `steamAppId`.
  - Artwork: if `artworkUrl` is missing, show placeholder.
  - Achievements: if `achievementsTotal` is present (> 0) and `achievementsUnlocked` is defined, show `unlocked / total`; else hide.
- **Types**:
  - `GameRowProps`:
    - `title: string`
    - `artworkUrl?: string | null`
    - `achievementsUnlocked?: number | null`
    - `achievementsTotal?: number | null`
    - `status: GamePlayStatus`
    - `position?: number`
  - Derived from `InProgressGameItemVM`.
- **Props**:
  - Values above, plus optional callbacks for click (future extension).

### 4.6 `DragHandle`

- **Description**: Accessible handle to initiate drag operations for reordering.
- **Main elements**:
  - Icon button (`<button type="button">`) using `shadcn/ui` `Button` with `variant="ghost"` and appropriate icon (e.g. grip/drag).
  - ARIA attributes like `aria-label="Reorder game"` and `aria-describedby` referencing position.
- **Handled interactions**:
  - Mouse/touch drag gestures via dnd-kit listeners.
  - Keyboard: Space/Enter to start drag; arrow keys to move.
- **Validation conditions**:
  - Disabled state when reordering is not allowed (e.g. `isReordering` or network request in-flight).
- **Types**:
  - `DragHandleProps`:
    - `listeners: DraggableAttributes & SyntheticListeners` (from dnd-kit).
    - `attributes: DraggableAttributes` (ARIA attributes from dnd-kit).
    - `disabled?: boolean`.
- **Props**:
  - `listeners`, `attributes`, `disabled`.

### 4.7 `CompleteButton`

- **Description**: Action button for marking a game as completed (opens a confirmation modal/dialog).
- **Main elements**:
  - Button (`shadcn/ui` `Button`) with label "Complete" and success styling.
  - `CompleteConfirmDialog`:
    - Title, description.
    - Optional numeric input for `achievementsUnlocked`.
    - Confirm + Cancel actions.
- **Handled interactions**:
  - Click "Complete" → open dialog.
  - In dialog:
    - Confirm → call `onConfirmComplete({ achievementsUnlocked? })`.
    - Cancel → close without action.
  - Keyboard:
    - Enter / Space to trigger.
    - Escape to cancel in dialog.
- **Validation conditions**:
  - `achievementsUnlocked` input:
    - Non-negative integer.
    - If `achievementsTotal` provided, `achievementsUnlocked <= achievementsTotal`.
  - Disable confirm while API request is in-flight.
- **Types**:
  - `CompleteButtonProps`:
    - `onConfirm: (payload: CompleteUserGameViewPayload) => void`
    - `achievementsTotal?: number | null`
    - `isLoading?: boolean`
  - `CompleteConfirmDialogProps` mirrors plus `isOpen`, `onOpenChange`.
  - `CompleteUserGameViewPayload` maps to backend `CompleteUserGameCommand`.
- **Props**:
  - `onConfirm`, `achievementsTotal`, `isLoading`.

### 4.8 `RemoveToBacklogButton`

- **Description**: Action button to move a game out of the in-progress queue back to backlog (or remove entirely).
- **Main elements**:
  - Secondary `Button` (`variant="outline"` or `ghost`) with label "Move to backlog" or "Remove".
  - Optional inline confirm (e.g. popover or second click) if removal is destructive.
- **Handled interactions**:
  - Click → call `onRemove()`; parent will:
    - Trigger a PATCH or DELETE to update status.
    - Optimistically remove item from list.
    - Show undo toast.
- **Validation conditions**:
  - Disabled when mutation is in-flight.
  - Ensure we do not exceed cap logic (removal reduces count so fine).
- **Types**:
  - `RemoveToBacklogButtonProps`:
    - `onRemove: () => void`
    - `isLoading?: boolean`
- **Props**:
  - `onRemove`, `isLoading`.

### 4.9 `AddGamesButton`

- **Description**: CTA to add games into the in-progress queue (via separate search/add flow).
- **Main elements**:
  - Prominent `Button` (e.g. "Add games").
  - Optional icon (plus symbol).
- **Handled interactions**:
  - Click →  open a modal.
  - If queue at cap, button disabled and shows tooltip "You’ve reached the in-progress cap (5 games)."
- **Validation conditions**:
  - `disabled` when `currentCount >= cap`.
- **Types**:
  - `AddGamesButtonProps`:
    - `onClick: () => void`
    - `disabled: boolean`
- **Props**:
  - `onClick`, `disabled`.

### 4.10 `EmptyState`

- **Description**: View shown when no in-progress games exist; encourages the user to add games.
- **Main elements**:
  - Illustration or icon.
  - Message (e.g. "No games in progress yet").
  - Inline `AddGamesButton` or simple "Add your first game" button.
- **Handled interactions**:
  - Click CTA → same as `AddGamesButton` behavior.
- **Validation conditions**:
  - Only rendered when `items.length === 0` and not loading.
- **Types**:
  - `EmptyStateProps`:
    - `onAddClick: () => void`
    - `isAtCap: boolean` (for sanity, though should never be true when empty).
- **Props**:
  - `onAddClick`, `isAtCap`.


### 4.12 `InlineErrorBanner`

- **Description**: Non-modal banner showing when actions hit API rate limits or other global errors.
- **Main elements**:
  - Banner at top of page with error icon and message.
  - Optional "Retry" button for list refetch.
- **Handled interactions**:
  - Click "Retry" → refetch queue.
  - Dismiss banner.
- **Validation conditions**:
  - Distinguish 429 (`RateLimited`) from other errors; show tailored copy for 429.
- **Types**:
  - `RateLimitBannerProps`:
    - `isRateLimited: boolean`
    - `resetAt?: Date`
    - `onRetry?: () => void`
- **Props**:
  - `isRateLimited`, `resetAt`, `onRetry`.

## 5. Types

### 5.1 Existing DTOs and types (from `src/types.ts`)

- **`UserGameDTO`**:
  - `gameId: number` – Steam app ID for the game.
  - `title: string`
  - `status: GamePlayStatus` – one of `"backlog" | "in_progress" | "completed" | "removed"` (from `Enums<"game_play_status">`).
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
  - `results: UserGameDTO[]`

### 5.2 New ViewModel types

- **`InProgressGameItemVM`**
  - Purpose: Minimal, view-friendly representation of an in-progress game item used by list and item components.
  - Fields:
    - `steamAppId: number` – from `UserGameDTO.gameId`.
    - `title: string`
    - `status: GamePlayStatus` – always `"in_progress"` in this view, but keep type-safe.
    - `position: number` – non-null, 1-based position in current queue.
    - `achievementsUnlocked?: number | null`
    - `achievementsTotal?: number | null` – join/augment later with catalog data from `GamesListDTO` (optional for MVP).
    - `artworkUrl?: string | null` – from catalog; optional.
    - `isPending?: boolean` – local flag to indicate in-flight mutations.

- **`InProgressQueueVM`**
  - Purpose: Represent full queue and metadata for the view.
  - Fields:
    - `items: InProgressGameItemVM[]`
    - `total: number` – same as `items.length` for in-progress, but kept to mirror API.
    - `cap: number` – constant 5, but stored for clarity.
    - `isAtCap: boolean`

- **`ReorderInProgressRequest`**
  - Mirrors `PATCH /v1/user-games/reorder` request.
  - Fields:
    - `items: { steamAppId: number; position: number }[]`

- **`ReorderInProgressResult`**
  - Mirrors backend `ReorderInProgressResultDTO`.
  - Fields:
    - `updated: number`

- **`CompleteUserGameViewPayload`**
  - Purpose: Local representation for completing a game via `POST /v1/user-games/{steamAppId}/complete`.
  - Fields:
    - `steamAppId: number`
    - `achievementsUnlocked?: number`

- **`UpdateUserGameStatusRequest`**
  - Purpose: For `PATCH /v1/user-games/{steamAppId}` used to move game back to backlog or adjust fields.
  - Fields:
    - `status?: GamePlayStatus`
    - `inProgressPosition?: number | null`
    - `achievementsUnlocked?: number`
    - `completedAt?: string | null`


### 5.3 API helper types

- `FetchInProgressGamesResponse = UserGamesListDTO`
- `FetchInProgressGamesQuery`:
  - `status: "in_progress"`
  - `orderBy?: "in_progress_position" | "updated_at" | "popularity_score"`
  - `page?: number`
  - `pageSize?: number`

## 6. State Management

- **Top-level state** within `InProgressPageView` (via `useInProgressQueue`):
  - `queue: InProgressQueueVM | null` – current in-progress queue.
  - `loading: boolean` – while fetching.
  - `error: string | null` – generic fetch error.
  - `rateLimitError: { resetAt?: Date } | null` – for 429-specific handling.
  - `isReordering: boolean` – when reorder API is in-flight.
  - `activeItemMutations: Record<number, "complete" | "remove" | "idle">` – keyed by `steamAppId`.
  - `undoEntry: UndoEntry | null` – most recent undoable mutation.
- **Hook: `useInProgressQueue`**
  - Responsibilities:
    - Fetch queue from `GET /v1/user-games`.
    - Normalize `UserGamesListDTO` into `InProgressQueueVM`.
    - Provide methods: `reorderQueue`, `completeGame`, `removeToBacklog`, `refetch`.
    - Handle optimistic updates: update local queue first, then send API request; record `undoEntry`.
    - Handle API responses and errors, including rate limit detection.

State should remain local to the view (no global store) to keep the implementation simple and focused on this page only.

## 7. API Integration

### 7.1 Fetch in-progress games

- **Endpoint**: `GET /v1/user-games`
- **Query**:
  - `status=in_progress`
  - `orderBy=in_progress_position`
  - Optionally: `page=1&pageSize=50` (cap small; queue max is 5).
- **Request**:

```ts
type FetchInProgressGamesQuery = {
  status: "in_progress";
  orderBy?: "in_progress_position";
  page?: number;
  pageSize?: number;
};
```

- **Response type**: `UserGamesListDTO`
- **Frontend action**:
  - Called on page mount (and on retry).
  - On success, map `results` to `InProgressGameItemVM[]`, sorting by `inProgressPosition ?? Infinity`.
  - On `401`, redirect to login or show auth error (depending on app-wide behavior).
  - On `422`/`500`, show error banner and allow retry.

### 7.2 Reorder in-progress queue

- **Endpoint**: `PATCH /v1/user-games/reorder`
- **Request type**: `ReorderInProgressRequest`

```ts
type ReorderInProgressRequest = {
  items: { steamAppId: number; position: number }[];
};
```

- **Response type**: `ReorderInProgressResult` (`{ updated: number }`)
- **Frontend action**:
  - On drag end, if order changed:
    - Compute new positions and update local `queue.items` optimistically.
    - Set `undoEntry` with `previousQueue` snapshot.
    - Call API.
  - On success:
    - Optionally reconcile positions if backend returns different order (shouldn’t for happy path).
  - On error:
    - For `400 DuplicatePositions`: revert to previous order and show error toast.
    - For `409 QueueMismatch`: refetch queue, show message "Your queue changed in another session; we refreshed it."
    - For generic `422`/`500`: revert to previous order and show error.
    - For `401`: treat as auth error; optionally redirect.

### 7.3 Complete game

- **Endpoint**: `POST /v1/user-games/{steamAppId}/complete`
- **Request type**: `CompleteUserGameViewPayload`

```ts
type CompleteUserGameRequest = {
  achievementsUnlocked?: number;
};
```

- **Response type**: updated `UserGameDTO`.
- **Frontend action**:
  - On confirm:
    - Optimistically remove item from queue (so it disappears immediately).
    - Record `undoEntry` with `previousItem` and queue snapshot.
    - Call API.
  - On success:
    - Optionally trigger analytics event "user_game_completed".
  - On error:
    - If `409 InProgressCapReached` (unlikely for completion), simply refetch queue.
    - For `422 InvalidStatusTransition` or `400`-series: refetch queue, show message.

### 7.4 Move game to backlog / remove

- **Endpoint**: `PATCH /v1/user-games/{steamAppId}` (preferred, to change status).
- **Request type**: `UpdateUserGameStatusRequest`

```ts
type MoveToBacklogRequest = {
  status: "backlog";
  inProgressPosition: null;
};
```

- **Response type**: updated `UserGameDTO`.
- **Alternate endpoint**: `DELETE /v1/user-games/{steamAppId}` if implementing hard removal (optional).
- **Frontend action**:
  - Optimistically remove the item from the list and push undo entry.
  - On success, keep local change; optionally log analytics.
  - On error, revert removal and show error.

### 7.5 Games search (for Add button) – future integration

- **Endpoint**: `GET /v1/games`
- Used by separate view/modal for search & add; for this plan, `AddGamesButton` only needs a navigation callback.

## 8. User Interactions

- **View load**:
  - User navigates to `/in-progress`.
  - System fetches in-progress queue.
  - UI shows loading state, then either:
    - List of games with positions, or
    - Empty state if no in-progress games.

- **Reorder via drag-and-drop**:
  - User grabs `DragHandle` and reorders games with mouse/touch/keyboard.
  - UI immediately updates positions (optimistic).
  - Reorder call is sent in background.
  - If success: `UndoToast` appears ("Queue reordered – Undo").
  - If failure: order reverts, toast shows error.

- **Mark game as completed**:
  - User clicks "Complete".
  - `CompleteConfirmDialog` opens, optionally pre-filling `achievementsUnlocked`.
  - User confirms → item disappears from list (optimistic), queue shrinks, `UndoToast` shows "Game completed – Undo".
  - Backend records completion (analytics satisfied at backend).

- **Move game to backlog / remove**:
  - User clicks "Move to backlog" (or "Remove").
  - Item disappears from list (optimistic).
  - Request updates status / deletes entry.
  - Undo toast allows revert.

- **Add games**:
  - User clicks `AddGamesButton`.
  - If below cap:
    - Navigate to search/add view.
  - If at cap:
    - Button disabled; tooltip explains cap.

- **Error and rate limit handling**:
  - On errors, in-line banners or toasts explain what happened and how to retry.
  - On 429, show message that rate limit was hit and when to try again.

## 9. Conditions and Validation

- **Cap enforcement (US-015)**:
  - UI-level:
    - `HeaderCapBadge` shows `current / 5`.
    - When `current >= 5`, `AddGamesButton` is disabled and styled accordingly.
  - Back-end-level:
    - When adding or changing status to `in_progress`, backend may return `409 InProgressCapReached`; UI must surface this message in any search/add view (not in this view directly).

- **Queue integrity for reorder (US-010)**:
  - Ensure `items` sent in `PATCH /reorder`:
    - Contain exactly the same `steamAppId`s as current in-progress items.
    - Use positions `1..N` without duplicates.
  - On `409 QueueMismatch`, refetch queue and show "Your queue changed in another session" message.

- **Completion validity (US-011)**:
  - `CompleteConfirmDialog` must validate `achievementsUnlocked` if provided:
    - Non-negative integer.
    - If `achievementsTotal` known, `achievementsUnlocked <= achievementsTotal`.
  - Prevent submission when validation fails (inline error text).

- **Accessibility**:
  - DnD keyboard support via dnd-kit’s keyboard sensors.
  - Buttons with `aria-label`s and focus outlines.
  - Dialog uses focus trapping and correct ARIA roles.

- **API preconditions**:
  - Only call authenticated endpoints when the user is signed in; 401 should be globally handled or at least surfaced clearly.
  - Always send required fields:
    - For reorder: `items` non-empty; each `position` numeric.
    - For status change: include `inProgressPosition` when setting `status = "in_progress"` (even though this view doesn't add to in-progress).

## 10. Error Handling

- **Network errors / 5xx**:
  - Show toast "Something went wrong, please try again."
  - Keep last consistent state (rollback optimistic changes).

- **401 Unauthorized**:
  - If GET fails: show message "You need to sign in to view your in-progress queue" with button to login.
  - For mutations: either rely on global auth handling or show error and revert state.

- **422 / 400 validation errors**:
  - For reorder: show "We couldn’t update the queue. Please try again." and refresh data.
  - For completion/status changes: show message from backend (if provided) or generic one.

- **409 QueueMismatch**:
  - Automatically refetch queue.
  - Show small banner or toast: "Your queue changed in another session. We’ve refreshed it."

- **429 RateLimited**:
  - Read `RateLimited` error and any reset metadata (if available from headers).
  - Show `InlineErrorBanner` with approximate retry time.
  - Disable further reorder/complete/remove actions while rate-limited, or show message on click.

- **Client-side validation errors**:
  - For invalid `achievementsUnlocked`, show inline form error and block submission.
  - Ensure DnD gracefully handles invalid reorder attempts (e.g. no-op if index unchanged).

## 11. Implementation Steps

1. **Set up routing and shell**:
   - Create `src/pages/in-progress.astro` with layout wrapper (`Layout.astro`) and mount point for `InProgressPageView` React component.
2. **Create basic types and API helpers**:
   - Define `InProgressGameItemVM`, `InProgressQueueVM`, `ReorderInProgressRequest`, `CompleteUserGameViewPayload`, `UpdateUserGameStatusRequest`, and `UndoEntry` in a dedicated types file (e.g. `src/lib/in-progress/types.ts`).
   - Implement `inProgressApi.ts` with typed functions: `fetchInProgressQueue`, `reorderInProgress`, `completeUserGame`, `moveGameToBacklog`.
3. **Implement `useInProgressQueue` hook**:
   - Fetch queue on mount, handle loading/error states.
   - Provide handlers `reorderQueue`, `completeGame`, `removeToBacklog`, and `refetch`.
   - Implement optimistic updates and undo entries.
4. **Build presentational components**:
   - Implement `HeaderCapBadge`, `GameRow`, `AddGamesButton`, `EmptyState`, `RemoveToBacklogButton`, and `CompleteButton` (with `CompleteConfirmDialog`) using Tailwind + shadcn/ui.
5. **Integrate DnD via `InProgressList` and `InProgressListItem`**:
   - Wire up `DndContext` and `SortableContext`.
   - Implement drag and keyboard reorder behavior.
   - On drag end, call `reorderQueue` from hook.
6. **Add `InlineErrorBanner`**:
   - Connect them to `rateLimitError` from `useInProgressQueue`.
   - Ensure undo logic correctly rolls back state.
7. **Compose `InProgressPageView`**:
   - Use `useInProgressQueue` and render header, list/empty state, add button, and toast/banner.
   - Handle loading and error UI states.
8. **Wire navigation for `AddGamesButton`**:
   - For now, navigate to agreed existing/additional route (e.g. `/backlog` or `/games`) using Astro/React router approach chosen in the project.
9. **Implement accessibility and keyboard support**:
   - Verify tab order, ARIA labels, dialog focus trapping, and DnD keyboard interactions.
10. **Add analytics hooks (if available)**:
   - After successful completion or reorder, call analytics utilities (e.g. `trackEvent("queue_reordered")`, `trackEvent("game_completed")`) as defined elsewhere in the app.
11. **Test and polish**:
   - Test normal flows: initial load, reorder, complete, remove, add at edge of cap.
   - Test error cases by mocking failed API responses.
   - Validate behavior on small screens and with keyboard-only navigation.


