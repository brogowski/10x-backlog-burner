# Authentication Architecture Specification (US-001, US-002, US-003)

Scope: email/password signup, login, logout, and password recovery for Backlog Burner using Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui, and Supabase Auth. Must not regress other product flows (Steam import, backlog management, in-progress queue, onboarding, suggestion).

## 0. Principles and Assumptions
- Keep SSR-compatible navigation and state; do not break existing Astro routing or middleware.
- Use Supabase Auth (email/password) with secure session cookies via `@supabase/auth-helpers-astro` (server) and `@supabase/supabase-js` (browser).
- Guard authenticated areas (in-progress, backlog, suggestion) via middleware; allow public landing.
- Prefer zod-based validation shared between client and API.
- Early-return error handling; structured error payloads; user-friendly messages.
- Tailwind + Shadcn/ui for consistent UI; avoid custom global styles when not needed.

## 1. User Interface Architecture
### 1.1 Pages, layouts, routing
- `src/layouts/AppLayout.astro`: main authenticated shell (nav, user menu, page slots). Includes session-aware header (shows avatar/email, logout action).
- `src/layouts/AuthLayout.astro`: minimal layout for auth pages (logo, card, footer links).
- Astro pages (SSR by default):
  - `src/pages/auth/login.astro`
  - `src/pages/auth/signup.astro`
  - `src/pages/auth/reset-request.astro` (request reset email)
  - `src/pages/auth/reset-confirm.astro` (handles `code` from Supabase email link; prompts new password)
- Protected app pages (existing backlog, in-progress, suggestion) remain in place; middleware redirects unauthenticated users to `/auth/login?redirect=<original>`.
- Landing/onboarding pages remain public but conditionally redirect to app if session exists.

### 1.2 Components (React islands) vs Astro
- Astro pages provide layout, meta, and data from `locals.session`. They render React islands for interactive forms.
- React components under `src/components/auth/`:
  - `AuthCard`: shell using Shadcn Card.
  - `AuthForm`: generic form wrapper with submit/disabled states.
  - `EmailField`, `PasswordField`, `ConfirmPasswordField`: controlled inputs with inline validation and show/hide password toggle.
  - `FormErrorAlert` and `FormSuccessNotice`: Shadcn Alert variants for inline feedback.
  - `OAuthHint` (placeholder for future Steam OAuth button; currently hidden/disabled to avoid breaking scope).
- Responsibility split:
  - Astro page: route protection/redirect, pass `redirect` query, load CSRF token if used, render layout.
  - React form: field state, client-side validation, submit via `fetch` to API, display errors, trigger navigation on success (using `window.location.assign` to preserve SSR).
  - No auth logic in layout; only session display and logout button wired to API.

### 1.3 Validation cases and messages (client mirrored on server)
- Email: required, valid format. Message: "Enter a valid email."
- Password (signup/login): required, min 8 chars, recommend upper/lower/number. Message: "Password must be at least 8 characters."
- Confirm password (signup, reset-confirm): must match password. Message: "Passwords must match."
- Reset request: email required.
- Reset confirm: requires `code` query param; new password constraints as above. If missing/invalid: "Reset link is invalid or expired. Request a new one."
- Generic fallback: "Something went wrong. Please try again."
- Surface Supabase auth errors when safe: e.g., `invalid_credentials` -> "Incorrect email or password."

### 1.4 Key flows
- Signup: form submit -> `/api/v1/auth/signup` -> success sets session cookie; redirect to `/onboarding` (or `redirect` query). If email confirmation enforced later, show "Check your email to confirm" and keep user signed out.
- Login: submit -> `/api/v1/auth/login` -> sets session cookie; redirect to `redirect` query or `/in-progress`.
- Logout: header button -> POST `/api/v1/auth/logout`; on success reload to `/`.
- Reset request: submit -> `/api/v1/auth/password-reset/request`; on success show success notice: "If that email exists, we've sent reset instructions."
- Reset confirm: page reads `code` query; form submits new password to `/api/v1/auth/password-reset/confirm`; success sets session and redirects to `/in-progress`.
- Error handling: inline alerts; preserve field values except password fields (clear on error).
- Loading states: disable submit, show spinner on button.
- Accessibility: label/aria for inputs, focus on first error.

## 2. Backend Logic
### 2.1 Modules
- `src/db/supabase-server.ts`: create server client with `@supabase/auth-helpers-astro`, reading `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` when needed (service key only for server-side password reset; avoid exposing).
- `src/db/supabase-browser.ts`: browser client with anon key for optional client-side helpers.
- `src/lib/validation/auth.ts`: zod schemas (SignupSchema, LoginSchema, ResetRequestSchema, ResetConfirmSchema).
- `src/lib/errors.ts`: typed error helpers mapping Supabase errors to HTTP-safe messages/codes.
- `src/lib/http/responses.ts`: helpers for `ok`, `badRequest`, `unauthorized`, `rateLimited`, etc., with `{ success, data?, error? }` shape.

### 2.2 API endpoints (Astro pages under `src/pages/api/v1/auth/`)
- `signup.ts` (POST): validate body; call `supabase.auth.signUp({ email, password, options: { emailRedirectTo: reset-confirm URL } })`; if session returned, set cookies via helper; return user metadata subset (id, email). Handle `email_exists` -> 409.
- `login.ts` (POST): validate; `supabase.auth.signInWithPassword`; on success set session cookie; return user info. Map invalid credentials to 401 without leaking detail.
- `logout.ts` (POST): server-side `supabase.auth.signOut`; clear auth cookies; idempotent (200 even if already signed out).
- `password-reset/request.ts` (POST): validate email; `supabase.auth.resetPasswordForEmail(email, { redirectTo: <APP_URL>/auth/reset-confirm })`; always 200 with generic success to prevent enumeration; log errors server-side.
- `password-reset/confirm.ts` (POST): validate `code` and `password`; use `supabase.auth.exchangeCodeForSession(code)` then `supabase.auth.updateUser({ password })`; set new session cookies; return 200.
- Response format: JSON `{ success: boolean, data?: object, error?: { code, message } }`.
- Rate limiting: reuse any existing middleware if present; otherwise plan to add simple IP/email throttle wrapper (not implemented here).

### 2.3 Input validation
- Use zod schemas; reject on first failure with `400` and `error.message`.
- Server re-validates even if client validated.
- Trim email; keep password verbatim (no trim).

### 2.4 Exception handling
- Wrap Supabase calls; map known codes: `invalid_credentials`, `email_exists`, `over_email_send_rate_limit`. Unknown -> 500 with generic message and server log.
- Do not leak whether email exists on reset or signup confirmation pending.
- Log errors with context (endpoint, email hash, request id if available).

### 2.5 SSR and middleware
- `src/middleware/index.ts`: create Supabase server client per request; attach `locals.session` and `locals.user`; redirect unauthenticated requests for protected paths (`/in-progress`, `/backlog`, `/suggest`, `/api/v1/user-*`, `/api/v1/games*`) to `/auth/login?redirect=...`.
- Auth pages redirect away if session exists (`/in-progress`).
- Ensure `astro.config.mjs` keeps SSR output (`output: "server"`) and adapter already configured; no change required, but auth depends on SSR-capable routing and cookies.
- For Astro pages needing user context (e.g., in-progress view), read `Astro.locals.user` instead of re-calling Supabase on the client.

## 3. Authentication System (Supabase + Astro)
- Environment:
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (client/server)
  - `SUPABASE_SERVICE_ROLE_KEY` (server only; never sent to client)
  - `APP_URL` for redirect links in emails.
- Client: use `supabase-browser` only for optional client-side helpers; primary flow goes through API to ensure consistent cookie handling.
- Sessions: rely on Supabase auth cookies managed by helpers; cookies set/cleared server-side in API responses.
- Password recovery: email links point to `/auth/reset-confirm?code=<token>`; confirm endpoint exchanges code for session then updates password.
- Logout: clears auth cookies; client reloads to landing.
- Security: HTTPS required in production; set cookies `Secure`, `HttpOnly`, `SameSite=Lax`; avoid storing tokens in localStorage.
- Compatibility: does not alter game/backlog APIs; only adds middleware gating and header logout button. Existing pages continue to render for authenticated users with session.

## 4. Open Questions / Future Work
- Do we require email confirmation on signup? If yes, skip auto-login and show confirmation notice.
- Add Steam OAuth button later; ensure UI has placeholder hook.
- Rate limiting strategy (per-IP, per-email) to be defined if not present.
- Analytics: decide whether to log auth events for funnel metrics.

