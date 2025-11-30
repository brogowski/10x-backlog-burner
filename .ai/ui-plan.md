# UI Architecture for Backlog Burner

## 1. UI Structure Overview

Backlog Burner is an Astro 5 app using React 19 islands, TypeScript 5, Tailwind 4, and shadcn/ui. Rendering is client-side within islands; authenticated routing is enforced via Astro middleware. Minimal client state: `AuthContext` for session, `ProfileContext` for profile/onboarding, and a `useApi` helper that injects Authorization, parses the standard error envelope, and handles 401 redirects and 429 retry-after.

- Runtime model
  - Public routes: `/auth`, `/reset-password`.
  - Auth-only routes: `/in-progress` (default landing), `/backlog`, `/onboarding`.
  - Redirect: `/` → `/in-progress`. If not onboarded, `/in-progress` → `/onboarding`.
  - Client fetching via `useApi` to the REST plan: `/v1/profile`, `/v1/auth/steam/link`, `/v1/games`, `/v1/user-games`, `/v1/user-games/reorder`, `/v1/user-games/{steamAppId}/complete`, `DELETE /v1/user-games/{steamAppId}`. Import initiation uses a minimal `POST /v1/import-jobs` when available.
- Global UX/A11y/Security
  - Consistent error envelope parsing; 401 → redirect to `/auth`; 429 → toast/banner with countdown from `Retry-After`; all non-2xx show user-friendly toasts/banners.
  - Keyboard-accessible DnD (dnd-kit), focus management on route/modal changes, ARIA-live announcements for async status and reorders.
  - No service-role keys on client; Supabase JWT attached to API calls; RLS enforced by backend. No client-side artwork caching in MVP.
  - Responsive layout with header nav; primary actions remain visible.

## 2. View List

- View name: Auth (Login/Signup)
  - View path: `/auth`
  - Main purpose: Authenticate via email/password; tabbed switch between Login and Signup.
  - Key information to display: Email, password inputs; validation errors; success redirects.
  - Key view components: AuthHeader, AuthTabs (Login, Signup), EmailInput, PasswordInput, SubmitButton, Link to Reset.
  - Endpoints: None directly (handled by Supabase client); redirect to `/in-progress` on success.
  - UX/A11y/Security: Inline validation, disable-on-submit, keyboard-focus order, prevent credential leaks, 401-safe redirect loop handling.
  - User stories: US-001, US-002.

- View name: Password Reset
  - View path: `/reset-password`
  - Main purpose: Request and complete password reset.
  - Key information to display: Email field for request; new password/confirm for reset-complete link.
  - Key view components: RequestForm, ResetForm, SuccessState.
  - Endpoints: Supabase auth flows (email reset link); no app API.
  - UX/A11y/Security: Clear states for “email sent”, hide whether account exists, robust password requirements, focus management.
  - User stories: US-003.

- View name: Onboarding Wizard
  - View path: `/onboarding`
  - Main purpose: Gate main app; guide linking Steam and starting import; optional manual add; “Skip” allowed.
  - Key information to display: Steam link status, import kickoff state (no live progress), manual add hint.
  - Key view components: Stepper (1. Link Steam, 2. Start Import, 3. Optional Manual Add), SteamLinkPanel, StartImportButton, SkipButton, FinishButton, MinimalHelpText.
  - Endpoints: `POST /v1/auth/steam/link`, `POST /v1/import-jobs` (when available), `GET /v1/profile` (for onboarding flag).
  - UX/A11y/Security: Clearly skippable; no progress UI; errors shown as banners; keyboard and screen-reader friendly; secure nonce/signature submission for link.
  - User stories: US-004, US-005, US-006 (generic errors), US-008 (manual add in step 3). US-007 deferred (recent plays).

- View name: In-Progress
  - View path: `/in-progress`
  - Main purpose: Manage up to 5 prioritized games; reorder and complete.
  - Key information to display: Queue list with positions, cap indicator (x/5), per-game metadata (title, artwork, achievements unlocked/total if available).
  - Key view components: HeaderCapBadge, InProgressList (dnd-kit), GameRow, DragHandle, CompleteButton (opens Confirm), RemoveToBacklogButton, AddGamesButton (opens Search/Add), EmptyState, UndoToast.
  - Endpoints: `GET /v1/user-games?status=in_progress`, `PATCH /v1/user-games/reorder`, `POST /v1/user-games/{steamAppId}/complete`, `PATCH /v1/user-games/{steamAppId}` (status changes), `DELETE /v1/user-games/{steamAppId}` (optional remove).
  - UX/A11y/Security: Optimistic reorder with Undo on failure; keyboard-accessible DnD; confirm before complete (optional `achievementsUnlocked`); rate-limit aware actions.
  - User stories: US-010 (reorder), US-011 (complete), US-015 (cap display/enforcement).

- View name: Backlog
  - View path: `/backlog`
  - Main purpose: View and manage backlog items; add to In-Progress or remove; server pagination.
  - Key information to display: Paginated list (pageSize=50), statuses, updated timestamps, optional achievements progress.
  - Key view components: BacklogList, GameRow, AddToInProgressButton, RemoveButton, PaginationControl (“Load more”), AddGamesButton (opens Search/Add), EmptyState.
  - Endpoints: `GET /v1/user-games?status=backlog&page=&pageSize=`, `PATCH /v1/user-games/{steamAppId}` (move to in_progress/backlog), `DELETE /v1/user-games/{steamAppId}`.
  - UX/A11y/Security: “Add to In-Progress” respects queue cap (fallback to backlog with notice); infinite “Load more” or button; keyboard nav; SR labels on controls.
  - User stories: US-009 (view), US-010 (remove from list—reorder of backlog is not in MVP), US-008 (manual adds via Search/Add).

- Modal/Overlay: Search/Add
  - Invocation: Floating action on `/in-progress` and `/backlog`.
  - Main purpose: Search public catalog and add to user queues.
  - Key information to display: Search box (debounced), filters (genres[], released range), sort (`popularity`, `release_date_desc`, `title_asc`), results grid/list with artwork/title/metadata.
  - Key view components: SearchInput (debounced), GenresMultiSelect, SortSelect, ResultsList, AddButton (cap-aware), AppliedFilters with URL sync.
  - Endpoints: `GET /v1/games?search=&genres[]=&releasedBefore=&releasedAfter=&sort=&page=&pageSize=`, `POST /v1/user-games` (manual add to backlog), `PATCH /v1/user-games/{steamAppId}` (set `in_progress` with position when allowed).
  - UX/A11y/Security: URL-synced filters; keyboard-first form; articulate fallback notice when cap reached; loading skeletons; clear error messages.
  - User stories: US-008; supports US-015 fallback behavior.

- System/Utility: Error Boundary and Rate-Limit Banner
  - Purpose: Capture client errors and display non-blocking notices; honor 429 with countdown.
  - Components: ErrorBoundary, RateLimitBanner, Toasts (success/error/info).
  - Behavior: Standard envelope parsing; ARIA-live region for updates; actionable retry for recoverable failures.
  - User stories: US-006 (generic import/other errors).

## 3. User Journey Map

- First-time user (email/password)
  1. Visit `/` → redirect to `/in-progress`.
  2. Not authenticated → middleware routes to `/auth`.
  3. Complete signup (US-001) → redirect to `/in-progress`.
  4. Profile not onboarded → guard routes to `/onboarding`.
  5. Step 1: Link Steam (US-004) via `POST /v1/auth/steam/link` → success advances.
  6. Step 2: Start Import (US-005) via `POST /v1/import-jobs` (no progress UI) → continue.
  7. Step 3: Optional manual add (US-008) → open Search/Add modal; add games (cap-aware).
  8. Finish or Skip → mark onboarded in profile → navigate to `/in-progress`.
  9. Reorder queue (US-010) with optimistic save; mark a game complete (US-011).
  10. Add more from Search/Add; on cap reached, show notice and add to backlog (US-015).

- Returning user
  1. Visit `/` → `/in-progress`.
  2. Manage queue; complete games; open Search/Add to find new items.
  3. Navigate to `/backlog` to manage, remove, or move items to in-progress.
  4. Update profile or weights in `/settings`.

- Failure and recovery
  - 401 at any API call: `useApi` triggers redirect to `/auth`.
  - 429: top-of-page banner with countdown; actions disabled until retry-after; non-blocking navigation allowed.
  - Reorder failure: auto-revert with Undo toast; retry option.
  - Add-to-in-progress with cap reached: notice; item added to backlog instead.

## 4. Layout and Navigation Structure

- Global layout
  - Header: App logo/name, primary nav links: In-Progress (`/in-progress`), Backlog (`/backlog`)
  - Content area: Island mounting points per route; modals render in root portal.
  - Footer: Minimal or none (MVP).

- Navigation rules
  - `/` redirects to `/in-progress`.
  - Auth guard: `/in-progress`, `/backlog`, `/onboarding` require auth; unauthenticated users are redirected to `/auth`.
  - Onboarding guard: If `profile.onboardedAt` is null, all primary routes redirect to `/onboarding` until completed/skipped.
  - Deep-link resilience: Query params for Search/Add filters are encoded in URL for shareability and back/forward navigation.

## 5. Key Components

- AppShell: Header, MobileDrawer, ContentOutlet, Toast/Toaster, RateLimitBanner, ErrorBoundary.
- HeaderNav: Primary links and current route highlighting; CapBadge on `/in-progress`.
- UserMenu: Profile access, Settings, Logout.
- InProgressList: DnD-enabled list with keyboard support, live region announcements, and optimistic reorder handling.
- BacklogList: Paginated list with “Load more,” Add-to-In-Progress action, and Remove.
- GameRow/Card: Artwork, title, metadata, contextual actions.
- SearchAddModal: Debounced search input, genre multi-select, sort selector, paginated results, cap-aware add action, URL-synced filters.
- ConfirmDialog: Used for completion with optional `achievementsUnlocked`.
- PaginationControl: Server-driven pagination UI (button or infinite scroll sentinel).
- Forms: AuthTabs, PasswordResetForm, SteamLinkSection.
- Contexts & Hooks: `AuthContext`, `ProfileContext`, `useApi` (Authorization, error envelope, 401/429 handling), `useReorderQueue` (optimistic queue state).

— Compatibility and coverage notes —
- API compatibility: All listed views/components consume endpoints defined in the API plan; only `POST /v1/import-jobs` is an assumed minimal addition for onboarding import initiation.
- PRD user-story coverage:
  - US-001, US-002, US-003: Auth and Reset flows.
  - US-004, US-005, US-006: Onboarding link/import and generic error handling.
  - US-007: Deferred (recent plays prompt); wizard provides manual add fallback.
  - US-008: Manual add via Search/Add modal.
  - US-009, US-010: Backlog view and removal; in-progress reorder handled on `/in-progress`.
  - US-011: Mark complete flow with confirm dialog.
  - US-012, US-013: Deferred (suggestion, details view).
  - US-014: Deferred (artwork caching).
  - US-015: Enforced via UI cap display and API conflict handling.