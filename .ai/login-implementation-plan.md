# API Endpoint Implementation Plan: Auth Login (`POST /api/v1/auth/login`)

## 1. Endpoint Overview
- Authenticate a user via email and password using Supabase Auth.
- On success, establish Supabase session cookies and return a minimal user payload.
- Reject invalid credentials without leaking whether the email exists.

## 2. Request Details
- HTTP Method: POST
- URL: `/api/v1/auth/login`
- Headers: `Content-Type: application/json`
- Parameters:
  - Required body: `email` (string), `password` (string)
  - Optional: `redirect` query param handled by caller (not processed server-side beyond passthrough)
- Request Body:
  - JSON: `{ email: string, password: string }`
  - Constraints: email trimmed and valid format; password minimum 8 chars.

## 3. Used Types
- DTOs/Commands: reuse validation schema inputs; response shape `{ success: boolean, data?: { user: { id: string; email: string | null } }, error?: { code: string; message: string } }`.
- Supabase types: `SupabaseClient` from `src/db/supabase.client.ts`.
- Zod schemas: `LoginSchema` (to be placed in `src/lib/validation/auth.ts` if not already).

## 4. Response Details
- 200 OK on successful login with `data.user` containing Supabase user id and email; sets auth cookies.
- 400 Bad Request for validation failures (zod errors).
- 401 Unauthorized for `invalid_credentials`.
- 500 Internal Server Error for unexpected Supabase/auth-helper failures.
- Response JSON always `{ success, data?, error? }`.

## 5. Data Flow
1) Parse JSON body.  
2) Validate with `LoginSchema`.  
3) Create Supabase server client via `createSupabaseServerClient(Astro)` (locals).  
4) Call `supabase.auth.signInWithPassword({ email, password })`.  
5) If error code `invalid_credentials`, return 401 with generic message.  
6) On success, set cookies using auth-helper’s `setAuthCookie`/built-in handling (via server client).  
7) Return 200 with minimal user payload; no DB writes required.  
8) Log unexpected errors server-side with context (endpoint, email hash).

## 6. Security Considerations
- Use server-side Supabase client from request locals; do not expose service key.
- Do not leak account existence; unify messaging for invalid credentials.
- Ensure cookies are HttpOnly, Secure, SameSite=Lax (handled by auth helpers).
- Rate limiting: if middleware exists, ensure endpoint is behind it; otherwise note as follow-up.
- Validate and trim email; do not trim password.
- Avoid returning detailed Supabase error messages to client.

## 7. Error Handling
- Validation failure: 400 with first zod message.
- Supabase `invalid_credentials`: 401 with safe message.
- Supabase other known errors: map to 500 with generic message.
- Unexpected exceptions: 500 with generic message; log details server-side.
- Logging: use existing logger (if available) to capture error code, request path, hashed email.

## 8. Performance Considerations
- Single external call to Supabase Auth; minimal payload.
- Keep response small; avoid extra DB queries.
- Ensure body parsing is streamed/standard Astro request handling (no large payload risk).

## 9. Implementation Steps
1) Add/verify `LoginSchema` in `src/lib/validation/auth.ts` (email string validated/trimmed; password min 8).  
2) Implement `src/pages/api/v1/auth/login.ts`:  
   - Export `prerender = false`.  
   - Parse JSON; validate via schema with guard clauses.  
   - Instantiate server Supabase client from `Astro.locals.supabase` helper.  
   - Call `signInWithPassword`.  
   - Map `invalid_credentials` to 401; success to 200 with `{ id, email }`.  
   - Return consistent `{ success, data?, error? }` using response helpers (e.g., `ok`, `badRequest`, `unauthorized`, `internalError`).  
3) Ensure cookies are set via the server client (auth-helper handles).  
4) Add unit/integration test stubs (if test harness present) covering success, invalid creds, validation failure.  
5) Update any API index barrel if required for routing (likely not needed).  
6) Document endpoint in API README/collection if maintained.  

