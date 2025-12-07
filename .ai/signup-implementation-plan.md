# API Endpoint Implementation Plan: `POST /api/v1/auth/signup`

## 1. Endpoint Overview
- Creates a new Supabase email/password user, sets session cookies when Supabase returns a session, and responds with minimal user metadata. Handles Supabase `email_exists` with HTTP 409.

## 2. Request Details
- HTTP Method: POST
- URL: `/api/v1/auth/signup`
- Headers: `Content-Type: application/json`
- Required body fields:
  - `email` (string, valid email)
  - `password` (string, min 8 chars)
- Optional body fields: none (redirect target derived server-side from `APP_URL`)

## 3. Used Types
- Validation schema: `SignupSchema` in `src/lib/validation/auth.ts` (Zod: email required/format, password min length 8).
- Response DTO (new or reused helper):
  - Success: `{ success: true, data: { id: string; email: string } }`
  - Error: `{ success: false, error: { code: string; message: string } }`

## 4. Response Details
- 201 Created on success; sets Supabase auth cookies; returns user `id` and `email`.
- 400 Bad Request when validation fails.
- 409 Conflict when Supabase returns `email_exists`.
- 500 Internal Server Error for unexpected Supabase or runtime failures.

## 5. Data Flow
1. Astro API route receives POST JSON.
2. Parse and validate with `SignupSchema`; early-return 400 on failure.
3. Build `emailRedirectTo` using `APP_URL` env plus `/auth/reset-confirm`.
4. Use `supabase` from `Astro.locals` (server client) to call `auth.signUp({ email, password, options: { emailRedirectTo } })`.
5. If Supabase returns `error`, map to HTTP code and message; do not leak raw error text for unknown cases.
6. If a session is returned, persist auth cookies using helper (e.g., `setAuthCookies(Astro, data.session)` or `supabase.auth.setSession` via helper from auth-helpers).
7. Respond with 201 JSON payload containing `{ id, email }` from Supabase user.

## 6. Security Considerations
- Trust Supabase for password hashing; never log passwords.
- Use server-side env `APP_URL` to avoid open redirect in `emailRedirectTo`.
- Ensure cookies set with `HttpOnly`, `Secure` (when applicable), `SameSite=Lax`.
- Avoid user enumeration: keep generic error messaging for unknown errors; only map `email_exists` to 409 with neutral message.
- Add (or reuse) middleware rate limiting if available; otherwise document as follow-up.

## 7. Error Handling
- Validation failure: 400 with first Zod issue message.
- Supabase `email_exists`: 409 with stable code `email_exists`.
- Supabase `over_email_send_rate_limit`: 429 if desired; otherwise treat as 500 with generic message (note: optional enhancement).
- Unknown Supabase errors: 500 with generic message; log internal details server-side only.
- Request parsing errors: 400.

## 8. Performance Considerations
- Single Supabase network call; no DB round-trips beyond Supabase auth.
- Keep payload small; avoid extra selects.

## 9. Implementation Steps
1. Add/confirm `SignupSchema` in `src/lib/validation/auth.ts` (email, password rules).
2. Add/confirm HTTP response helpers in `src/lib/http/responses.ts` to standardize `{ success, data?, error? }`.
3. Implement `src/pages/api/v1/auth/signup.ts`:
   - Export `POST` handler.
   - Parse JSON body; validate with `SignupSchema`.
   - Derive `emailRedirectTo` from `APP_URL` env (fallback guard if missing).
   - Use `const supabase = Astro.locals.supabase` (typed with `SupabaseClient` from `src/db/supabase.client.ts`).
   - Call `supabase.auth.signUp` with options.
   - Map errors (`email_exists` -> 409; otherwise 500).
   - If `data.session`, set cookies via helper from auth-helpers; ensure idempotent.
   - Return 201 JSON with `{ id, email }`.
4. Add minimal tests (if test harness exists) for validation (400), email exists (409), and success (201).
5. Document env requirement `APP_URL` in README/config notes if not already.

