## API Endpoint Implementation Plan: Auth (Signup, Login, Logout, Password Reset)

## 1. Endpoint Overview

The auth API under `/api/v1/auth` provides email/password authentication using Supabase Auth and secure HTTP-only cookies. It exposes POST endpoints for **signup**, **login**, **logout**, and **password reset (request and confirm)**, all returning a consistent JSON envelope `{ success, data?, error? }`. The endpoints are designed for use by Astro SSR pages with React islands, must not leak sensitive information, and must integrate cleanly with existing middleware, logging, and rate limiting.

## 2. Request Details

### 2.1 Common request characteristics

- **Base path**: `/api/v1/auth`
- **Format**: JSON over HTTPS
- **Headers**:
  - **Required**: `content-type: application/json` for requests with bodies
  - **Optional**: `accept: application/json`
- **Authentication**:
  - **Signup, Login, Password Reset (request/confirm)**: no existing session required
  - **Logout**: uses current Supabase session from cookies, but is idempotent and should succeed even when no active session is present
- **Astro route requirements**:
  - Each route file exports `export const prerender = false`
  - Implement handlers as `export const POST: APIRoute`
  - Use `context.locals.supabase` (typed as `SupabaseClient`) instead of importing a client directly in routes

### 2.2 POST `/api/v1/auth/signup`

- **Purpose**: Create a new Supabase user with email/password and (by default) sign them in by establishing a session.
- **HTTP Method**: `POST`
- **URL**: `/api/v1/auth/signup`
- **Path parameters**: none
- **Request body (JSON)**:
  - **Required**:
    - `email: string`
      - Trimmed, must be a valid email address.
    - `password: string`
      - At least 8 characters.
- **Validation rules (Zod schema `SignupPayload`)**:
  - `email` uses `z.string().trim().email()`
  - `password` uses `z.string().min(8, "Password must be at least 8 characters long")`

### 2.3 POST `/api/v1/auth/login`

- **Purpose**: Authenticate an existing user via email/password and establish a Supabase session using HTTP-only cookies.
- **HTTP Method**: `POST`
- **URL**: `/api/v1/auth/login`
- **Path parameters**: none
- **Query parameters**:
  - **Optional**: `redirect` – opaque string used by the frontend to choose a post-login destination (API may echo it but does not redirect).
- **Request body (JSON)**:
  - **Required**:
    - `email: string` – same constraints as signup.
    - `password: string` – min 8 characters (fix existing schema to `min(8)`).
- **Validation rules**:
  - Reuse `LoginPayload` from `src/lib/validation/auth.ts`, updated to `min(8)` to match UX copy.

### 2.4 POST `/api/v1/auth/logout`

- **Purpose**: Invalidate the current Supabase session and clear auth cookies.
- **HTTP Method**: `POST`
- **URL**: `/api/v1/auth/logout`
- **Path/query parameters**: none
- **Request body**: none (empty body)
- **Behavioral notes**:
  - Idempotent: always returns a success envelope even when there is no active session.
  - Uses Supabase `auth.signOut()` and cookie clearing on the server.

### 2.5 POST `/api/v1/auth/password-reset/request`

- **Purpose**: Trigger Supabase to send a password reset email to the user, if the email exists.
- **HTTP Method**: `POST`
- **URL**: `/api/v1/auth/password-reset/request`
- **Path parameters**: none
- **Query parameters**: none
- **Request body (JSON)**:
  - **Required**:
    - `email: string` – same constraints as signup.
- **Validation rules (Zod `ResetRequestPayload`)**:
  - `email: z.string().trim().email()`
- **Behavioral notes**:
  - Uses a **service-role Supabase client** to call `auth.resetPasswordForEmail`.
  - Must not reveal whether the email exists; always respond with a generic success message if the payload is valid.

### 2.6 POST `/api/v1/auth/password-reset/confirm`

- **Purpose**: Complete password reset using a one-time Supabase code and set a new password, establishing a new session.
- **HTTP Method**: `POST`
- **URL**: `/api/v1/auth/password-reset/confirm`
- **Path parameters**: none
- **Query parameters**:
  - **Required**: `code: string`
    - One-time token from Supabase’s password reset email.
- **Request body (JSON)**:
  - **Required**:
    - `password: string` – min 8 characters.
- **Validation rules (Zod `ResetConfirmPayload`)**:
  - `code` validated via `z.string().min(1)` against `URLSearchParams`.
  - `password` uses the same constraint as signup/login.
- **Behavioral notes**:
  - Uses service-role Supabase client to:
    - Call `auth.exchangeCodeForSession(code)` to obtain a session.
    - Call `auth.updateUser({ password })` if needed.
  - On success, sets new auth cookies and returns the authenticated user.

### 2.7 Request DTOs and command models

These will be defined as shared TypeScript types in `src/types.ts` to keep backend and frontend consistent, while Zod schemas in `src/lib/validation/auth.ts` enforce runtime rules:

- **`SignupCommand`**:
  - `email: string`
  - `password: string`
- **`LoginCommand`**:
  - `email: string`
  - `password: string`
- **`PasswordResetRequestCommand`**:
  - `email: string`
- **`PasswordResetConfirmCommand`**:
  - `code: string`
  - `password: string`

## 3. Response Details

### 3.1 Common response envelope

- All auth endpoints return a JSON envelope:
  - **Success**:
    - `{ "success": true, "data": { ... } }`
  - **Error**:
    - `{ "success": false, "error": { "code": string, "message": string, "details"?: unknown } }`
- Responses must include `cache-control: no-store` and `content-type: application/json`.

### 3.2 Used response DTO types

- **`AuthUserDTO`** (new, in `src/types.ts`):
  - `id: string`
  - `email: string | null`
- **`AuthSuccessDTO`** (per-endpoint variants using the envelope above):
  - **Signup/Login**:
    - `data: { user: AuthUserDTO }`
  - **Logout**:
    - `data: { }` (empty object) or `{ message: string }`
  - **Password reset request**:
    - `data: { message: string }` (generic, non-enumerating)
  - **Password reset confirm**:
    - `data: { user: AuthUserDTO }`
- **`AuthErrorDTO`**:
  - `code: "validation_error" | "invalid_credentials" | "email_exists" | "auth_failed" | "supabase_unavailable" | "reset_invalid_or_expired" | "rate_limited" | "unknown_error"`
  - `message: string`
  - `details?: unknown` – Zod issues, Supabase error metadata, etc. (never raw passwords or reset codes).

### 3.3 Status codes per endpoint

- **POST /api/v1/auth/signup**
  - `201 Created` – user created (and session established if Supabase returns one).
  - `400 Bad Request` – invalid JSON or payload (email/password validation).
  - `409 Conflict` – Supabase error `email_exists` / `user_already_exists`.
  - `500 Internal Server Error` – Supabase unavailable or unexpected error.
- **POST /api/v1/auth/login**
  - `201 Created` – session created for valid credentials.
  - `400 Bad Request` – invalid payload shape.
  - `401 Unauthorized` – invalid credentials (Supabase `invalid_credentials`).
  - `500 Internal Server Error` – Supabase or other unexpected server error.
- **POST /api/v1/auth/logout**
  - `200 OK` – logout processed (success or already signed out).
  - `500 Internal Server Error` – Supabase sign-out failure or cookie handling failure.
- **POST /api/v1/auth/password-reset/request**
  - `200 OK` – accepted (whether or not the email exists); validation passed.
  - `400 Bad Request` – invalid payload shape.
  - `500 Internal Server Error` – misconfiguration (e.g., missing service-role client) that prevents the operation from even being attempted.
- **POST /api/v1/auth/password-reset/confirm**
  - `200 OK` – password successfully updated and session established.
  - `400 Bad Request` – invalid/missing `code`, invalid password, or Supabase indicating an invalid/expired code.
  - `500 Internal Server Error` – Supabase failure when exchanging code or updating password.

## 4. Data Flow

### 4.1 Shared infrastructure

- **Middleware**:
  - `src/middleware/index.ts` already sets `locals.requestId` and `locals.supabase`.
  - Future enhancements can extend `locals` with rate limit info and user/session but are not required for auth endpoints.
- **Supabase clients**:
  - Continue to use `locals.supabase` (from `supabaseClient`) for **signup**, **login**, and **logout**.
  - Introduce a **service-role client** in a new `src/db/supabase-server.ts` for password reset flows:
    - Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
    - Configured with `auth: { autoRefreshToken: false, persistSession: false }`.
- **Auth service module**:
  - Create `src/lib/services/auth.service.ts` encapsulating Supabase calls and mapping to `AuthUserDTO` / `AuthServiceError`.

### 4.2 Signup flow

1. API route `signup.ts`:
   - Read `locals.requestId`, ensure `locals.supabase` exists (else return `500 supabase_unavailable`).
   - Parse `request.json()` and validate with Zod `SignupPayload`. On `ZodError`, log a `warn` with `requestId` and issues; return `400 validation_error`.
   - Compute a **hashed email** (`sha256` of normalized email) for logs (never log the raw email).
2. Service `auth.service.signUpUser(command, supabase)`:
   - Calls `supabase.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL + "/auth/reset-confirm" } })`.
   - Maps Supabase errors:
     - `error.code === "user_already_exists" | "email_exists"` → `AuthServiceError("email_exists")`.
     - Network or other auth errors → `AuthServiceError("auth_failed")`.
   - On success, builds `AuthUserDTO` and returns `{ user, session: data.session ?? null }`.
3. Route:
   - If no error and `session` is present:
     - Use a shared helper (extracted from existing `login.ts`) to append `sb-access-token` and `sb-refresh-token` cookies (Secure, HttpOnly, SameSite=Lax, proper `Max-Age` / `Expires`).
   - Return `201` with `{ success: true, data: { user } }`.
   - On `AuthServiceError`, log via `logger.warn` or `logger.error` with `requestId` and `emailHash`, then map to HTTP status and error payload.

### 4.3 Login flow

1. API route `login.ts` (refactor existing implementation to use the service layer):
   - Keep `prerender = false` and current cookie helper, but:
     - Delegate Supabase call and error mapping to `auth.service.loginUser`.
     - Ensure validation uses updated `LoginPayload` (min 8 chars).
   - Continue logging with `requestId` and `emailHash`.
2. Service `auth.service.loginUser(command, supabase)`:
   - Calls `supabase.auth.signInWithPassword({ email, password })`.
   - On `error.code === "invalid_credentials"`, throw `AuthServiceError("invalid_credentials")`.
   - On any other Supabase error, throw `AuthServiceError("auth_failed")`.
   - On success with `user` and `session`, map to `AuthUserDTO` and return `{ user, session }`.
3. Route:
   - On success, set cookies (reusing the same helper as signup) and return `201` with `{ success: true, data: { user } }`.
   - On `invalid_credentials`, return `401` with generic message `"Invalid email or password."`.
   - On other service errors, return `500` with `"Unable to complete login request."`.

### 4.4 Logout flow

1. API route `logout.ts`:
   - Ensure `locals.supabase` exists; if not, log and return `500 supabase_unavailable`.
   - Optionally attempt `locals.supabase.auth.getUser()`; regardless of result, call `locals.supabase.auth.signOut()` inside a `try/catch`.
   - Clear `sb-access-token` and `sb-refresh-token` cookies by setting expired cookies (reusing cookie helper).
   - Return `200` with `{ success: true, data: {} }` even if the user was not signed in, to keep the endpoint idempotent.
   - On Supabase failure, log at `error` with `requestId` and return `500 auth_failed`.

### 4.5 Password reset request flow

1. API route `password-reset/request.ts`:
   - Parse JSON and validate via `ResetRequestPayload`.
   - Compute `emailHash` for logging.
2. Service `auth.service.requestPasswordReset(command, serviceSupabase)`:
   - Calls `serviceSupabase.auth.resetPasswordForEmail(command.email, { redirectTo: APP_URL + "/auth/reset-confirm" })`.
   - Handles Supabase errors:
     - `over_email_send_rate_limit` → log at `warn`; do **not** change HTTP response.
     - Other errors → log at `error`; optionally rethrow as `AuthServiceError("auth_failed")`.
3. Route:
   - Regardless of Supabase result (unless there is a gross misconfiguration like missing service client), return `200`:
     - `{ success: true, data: { message: "If that email exists, we've sent reset instructions." } }`.
   - On validation failure, return `400 validation_error`.
   - Only when the service client cannot be constructed (e.g., missing env) or throws unexpected errors should the route respond with `500 auth_failed`.

### 4.6 Password reset confirm flow

1. API route `password-reset/confirm.ts`:
   - Read `code` from `url.searchParams`; validate via Zod; if missing/empty, return `400 reset_invalid_or_expired` with UX message `"Reset link is invalid or expired. Request a new one."`
   - Parse `request.json()` and validate new password via `ResetConfirmPayload`.
2. Service `auth.service.confirmPasswordReset(command, serviceSupabase)`:
   - Calls `serviceSupabase.auth.exchangeCodeForSession(command.code)`:
     - If Supabase indicates invalid or expired token, throw `AuthServiceError("reset_invalid_or_expired")`.
   - With the session, optionally call `auth.updateUser({ password: command.password })` if required by the current Supabase flow.
   - Build `AuthUserDTO` from `session.user` and return `{ user, session }`.
3. Route:
   - On success, set cookies from the returned session and return `200` with `{ success: true, data: { user } }`.
   - On `reset_invalid_or_expired`, log with `requestId` and email hash (if available) and return `400` with UX-friendly message.
   - On other unexpected errors, return `500 auth_failed` with generic `"Something went wrong. Please try again."`.

## 5. Security Considerations

- **Input validation and sanitization**:
  - All inputs (body and query) are validated using Zod before calling Supabase.
  - Email addresses are trimmed and normalized; passwords are only validated for length and never logged or returned.
- **Secret handling**:
  - Passwords and reset codes are never written to logs, analytics, or error `details`.
  - Emails in logs are always represented via a deterministic SHA-256 hash.
- **Account enumeration prevention**:
  - Password reset request endpoint always returns `200` with the same generic message given a valid payload, regardless of whether the email exists.
  - Signup and login error messages are generic and avoid confirming whether a given email is registered, apart from the explicit `email_exists` case needed by the product.
- **Session security**:
  - Auth cookies use `Secure`, `HttpOnly`, and `SameSite=Lax`, with appropriate `Max-Age`/`Expires`.
  - Tokens are never stored in `localStorage` or exposed to client-side JavaScript.
- **CSRF considerations**:
  - Because these endpoints are called via `fetch` from same-origin pages and rely on SameSite cookies, CSRF risk is reduced.
  - The design leaves room to introduce an explicit CSRF token (e.g. header + hidden input) in the future; API endpoints can validate such a token if added.
- **Rate limiting and abuse prevention**:
  - For IP-/email-based throttling (especially on login and password reset), integrate existing `locals.rateLimit` and `withRateLimitHeaders` once those are wired at the middleware layer.
  - Supabase’s own email send rate limits (e.g. `over_email_send_rate_limit`) are respected and surfaced only via logging.
- **Redirect and open-redirect safety**:
  - Any optional `redirect` parameters must not be blindly followed by the backend; redirect decisions are made by the frontend.
  - If the API ever needs to echo or validate redirect URLs, it should enforce same-origin or a small whitelist of allowed paths.

## 6. Error Handling

- **Validation errors**:
  - Zod `ZodError` in any endpoint results in:
    - HTTP `400 Bad Request`.
    - `error.code = "validation_error"`.
    - First issue’s message surfaced as `error.message`, with full `error.issues` in `details`.
  - These are logged at `warn` level with `requestId` and minimal, non-sensitive context.
- **Supabase auth errors**:
  - Mapped centrally in `AuthServiceError` within `auth.service.ts`:
    - `invalid_credentials` → `401 Unauthorized`, code `"invalid_credentials"`.
    - `user_already_exists` / `email_exists` → `409 Conflict`, code `"email_exists"`.
    - `over_email_send_rate_limit` → request endpoint still returns `200`, but logs at `warn` with rate-limit info.
    - Invalid / expired reset code → `400`, code `"reset_invalid_or_expired"`.
    - All other auth errors → `500`, code `"auth_failed"`.
- **Infrastructure errors**:
  - Missing or misconfigured Supabase clients (e.g., missing env vars) are treated as:
    - HTTP `500`, code `"supabase_unavailable"`.
  - These are logged at `error` with `requestId` and environment hints (no secrets).
- **Error logging and “error table” integration**:
  - All 4xx/5xx responses are logged using `src/lib/logger.ts` with:
    - `requestId`, endpoint, HTTP method, and sanitized request context (`emailHash`, not raw email).
  - For persistent error tracking, the design allows optionally writing to the existing `analytics_events` table using a service-role client:
    - `event_type = "auth_error"`.
    - `properties` include `{ endpoint, errorCode, emailHash, occurredAt }`.
    - This is best-effort and must not affect the main response flow.

## 7. Performance Considerations

- **Supabase call efficiency**:
  - Each endpoint performs at most one or two Supabase auth calls (e.g. signup/login: one call; reset confirm: exchange + update).
  - No heavy database queries or joins are used; operations are O(1) per request.
- **Client reuse**:
  - Reuse the global `supabaseClient` (via `locals.supabase`) for user-scoped operations to avoid repeated client construction.
  - Create a single service-role client in `supabase-server.ts` at module scope for password-reset operations to avoid repeated instantiation.
- **Payload size**:
  - Responses only return minimal user data (`id`, `email`); no excessive metadata is included.
  - Error responses avoid large nested objects in `details` except for Zod issues and small Supabase error metadata.
- **Rate limiting**:
  - Optional integration with `locals.rateLimit` keeps abusive login/reset traffic from overwhelming Supabase and the app.

## 8. Implementation Steps

1. **Define shared auth types**
   - Update `src/types.ts` to include:
     - `AuthUserDTO`.
     - `SignupCommand`, `LoginCommand`, `PasswordResetRequestCommand`, `PasswordResetConfirmCommand`.
   - Ensure these are imported by both backend code and any future frontend clients.
2. **Extend auth validation schemas**
   - Update `src/lib/validation/auth.ts`:
     - Fix `loginSchema` password rule to `min(8, "Password must be at least 8 characters long")`.
     - Add `signupSchema`, `resetRequestSchema`, and `resetConfirmSchema`.
     - Export `parseSignupPayload`, `parseResetRequestPayload`, and `parseResetConfirmPayload` helpers mirroring `parseLoginPayload`.
3. **Introduce Supabase service-role client**
   - Create `src/db/supabase-server.ts`:
     - Expose a `createServiceSupabaseClient()` or singleton `serviceSupabaseClient` using `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
     - Document that this client is only for backend operations like password reset emails and must never be imported into client bundles.
4. **Implement `auth.service.ts`**
   - Create `src/lib/services/auth.service.ts` with:
     - `AuthServiceError` class encapsulating auth-specific error codes and `details`.
     - `signUpUser(command: SignupCommand, supabase: SupabaseClient)`.
     - `loginUser(command: LoginCommand, supabase: SupabaseClient)`.
     - `logoutUser(supabase: SupabaseClient)`.
     - `requestPasswordReset(command: PasswordResetRequestCommand, serviceSupabase: SupabaseClient)`.
     - `confirmPasswordReset(command: PasswordResetConfirmCommand, serviceSupabase: SupabaseClient)`.
   - Centralize mapping from Supabase errors to `AuthServiceError` codes here.
5. **Extract shared cookie helpers**
   - Move `appendSessionCookies` and `setCookie` from `src/pages/api/v1/auth/login.ts` into a small utility module (e.g. `src/lib/auth/cookies.ts`).
   - Ensure these helpers are reused by signup, login, logout, and reset-confirm routes to keep cookie behavior consistent.
6. **Implement new API route files**
   - Add:
     - `src/pages/api/v1/auth/signup.ts`
     - `src/pages/api/v1/auth/logout.ts`
     - `src/pages/api/v1/auth/password-reset/request.ts`
     - `src/pages/api/v1/auth/password-reset/confirm.ts`
   - In each route:
     - Set `export const prerender = false`.
     - Parse and validate input with the appropriate Zod parser.
     - Call the corresponding `auth.service` function.
     - Map `AuthServiceError` to HTTP status codes and error payloads as specified.
     - Log with `logger` using `requestId` and `emailHash`.
7. **Refactor existing login route**
   - Update `src/pages/api/v1/auth/login.ts` to:
     - Use `parseLoginPayload` and the updated schema.
     - Delegate Supabase logic to `auth.service.loginUser`.
     - Use the shared cookie and response helpers.
     - Return `201` on successful login to reflect session creation.
8. **Integrate optional rate limiting and analytics**
   - Once `locals.rateLimit` is available, wrap auth responses with `withRateLimitHeaders` similarly to `user-games` routes.
   - Optionally add an analytics helper that logs selected auth failures to `analytics_events` as `auth_error` events using the service-role client.
9. **Testing and verification**
   - Manual and automated tests for:
     - Successful signup, login, logout.
     - Password reset request and confirm with valid and invalid codes.
     - Invalid payloads (missing email/password, malformed JSON).
     - Supabase error paths (invalid credentials, email already exists, over email send rate limit).
   - Verify:
     - Cookies are set/cleared correctly with expected flags.
     - Error responses never leak passwords, reset codes, or raw emails.
     - Logging includes `requestId` and email hashes but no secrets.

