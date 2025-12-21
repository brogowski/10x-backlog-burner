## View Implementation Plan – Auth & Password Reset

## 1. Overview

The **Auth** view at `/auth` provides an email/password **login and signup experience** using a tabbed interface, integrating with Supabase-backed API endpoints to create sessions and redirect authenticated users into the app (default `/in-progress`).  
The **Password Reset** flow, exposed via `/reset-password` (request) and `/auth/reset-confirm` (confirm from email), lets users request a reset email and set a new password without leaking whether an account exists.  
Both views use **Astro 5** pages with **React 19** islands, **TypeScript 5**, **Tailwind 4**, and **shadcn/ui** form components, with inline validation, accessible keyboard navigation, and structured error handling consistent with the JSON `{ success, data?, error? }` envelope returned by `/api/v1/auth/*`.  
These views primarily satisfy **US-001 (signup)**, **US-002 (login)**, and **US-003 (password reset)** from the PRD.

## 2. View Routing

- **Public Auth view**
  - **Route path**: `/auth`
  - **Astro page**: `src/pages/auth.astro`
  - **Layout**:
    - Uses a minimal auth-focused layout (e.g. `src/layouts/AuthLayout.astro`) with centered card, app logo/name, and optional footer links; can be implemented by reusing styles from existing `Layout.astro`.
  - **Behavior (SSR)**:
    - Reads `Astro.locals.user` (or `locals.session`) from middleware.
    - If a session exists, **redirect** immediately to a safe target:
      - Prefer `redirect` query parameter when present and safe (same-origin relative path, not `/auth`, not another auth route).
      - Fallback to `/in-progress`.
    - If no session, renders `AuthPageView` React island with the `redirect` value (if any) passed as a prop.

- **Password Reset – request view**
  - **Route path**: `/reset-password`
  - **Astro page**: `src/pages/reset-password.astro`
  - **Layout**:
    - Reuses `AuthLayout.astro` for consistent auth styling.
  - **Behavior (SSR)**:
    - Reads `Astro.locals.user`:
      - If a session exists, optionally redirect to `/in-progress` (password reset is primarily for logged-out users, but we may allow it even when logged in; decision can be toggled in middleware).
    - Does **not** reveal whether any email is on file.
    - Renders `PasswordResetView` React island with initial `mode="request"` and no `code`.

- **Password Reset – confirm view (from email link)**
  - **Route path**: `/auth/reset-confirm`
  - **Astro page**: `src/pages/auth/reset-confirm.astro`
  - **Layout**:
    - Reuses `AuthLayout.astro`.
  - **Behavior (SSR)**:
    - Reads `code` from `Astro.url.searchParams.get("code")`.
    - If `code` is missing or empty:
      - Renders `PasswordResetView` in an **“invalid link”** state with a message like “Reset link is invalid or expired. Request a new one.” and a button back to `/reset-password`.
    - If `code` is present:
      - Renders `PasswordResetView` with `mode="confirm"` and `code` passed as a prop to be submitted to `/api/v1/auth/password-reset/confirm`.
    - On successful confirm, client-side JS redirects to `/in-progress` (or an optional safe `redirect` query param).

## 3. Component Structure

### 3.1 Auth view (`/auth`)

- `AuthPageView` (React island, top-level for `/auth`)
  - `AuthCard` (visual container using shadcn/ui `Card`)
    - `AuthHeader`
      - App logo/title
      - Short description
    - `AuthTabs`
      - Tab list (`Login`, `Sign up`)
      - Tab panels:
        - `LoginForm`
          - `EmailInput`
          - `PasswordInput`
          - `SubmitButton`
          - `ResetPasswordLink`
          - `FormErrorAlert`
        - `SignupForm`
          - `EmailInput`
          - `PasswordInput`
          - `ConfirmPasswordInput`
          - `PasswordRequirementsHint`
          - `SubmitButton`
          - `FormErrorAlert`
    - Optional footer text (e.g. privacy notice)

### 3.2 Password Reset views (`/reset-password`, `/auth/reset-confirm`)

- `PasswordResetView` (React island, shared between routes)
  - **When rendered at `/reset-password` (request)**:
    - `AuthCard`
      - `AuthHeader` (title “Reset your password”)
      - `PasswordResetRequestForm`
        - `EmailInput`
        - `SubmitButton`
        - `FormErrorAlert`
        - `FormSuccessNotice` (“If that email exists, we’ve sent reset instructions.”)
  - **When rendered at `/auth/reset-confirm` with valid `code`**:
    - `AuthCard`
      - `AuthHeader` (title “Choose a new password”)
      - `PasswordResetConfirmForm`
        - `PasswordInput`
        - `ConfirmPasswordInput`
        - `PasswordRequirementsHint`
        - `SubmitButton`
        - `FormErrorAlert`
  - **When `code` is missing/invalid**:
    - `AuthCard`
      - `AuthHeader` (title “Reset link is invalid or expired”)
      - `PasswordResetInvalidState`
        - Explanatory text
        - Button linking to `/reset-password`

## 4. Component Details

### 4.1 `AuthPageView`

- **Component description**:  
  Top-level React container for `/auth`, responsible for wiring tab state, passing the `redirect` target, and coordinating form submission handlers for login and signup.
- **Main elements and children**:
  - `<main>` wrapper with max-width and vertical centering.
  - Renders a single `AuthCard` with `AuthHeader` and `AuthTabs`.
- **Handled interactions**:
  - Reads initial tab (`"login"` or `"signup"`) from:
    - Optional `mode` query param (e.g. `/auth?mode=signup`).
    - Fallback to `"login"`.
  - Handles tab change (`onTabChange`) and updates internal state (and optionally the URL query param for deep-linking).
  - Provides `onLoginSubmit`, `onSignupSubmit` callbacks to child forms, calling `useAuthForm` hook functions for API integration.
- **Handled validation**:
  - Delegates all field-level validation to form components/hooks.
  - Ensures tab name is restricted to `"login"` or `"signup"`; invalid values default to `"login"`.
- **Types**:
  - Uses `AuthMode` (`"login" | "signup"`).
  - Receives `redirect?: string | null` prop.
  - Interacts with `UseAuthFormResult` (see Types section) for submission handlers and status.
- **Props**:
  - `redirect?: string | null` – sanitized target path from query for post-auth navigation.

### 4.2 `AuthCard`

- **Component description**:  
  Presentational wrapper for auth content using shadcn/ui `Card` component and Tailwind spacing; reused by Auth and Password Reset views.
- **Main elements**:
  - Outer `<section>` or `<div>` with responsive padding and centered layout.
  - Inner `Card` containing:
    - `CardHeader` (logo/title/subtitle via `AuthHeader`).
    - `CardContent` (forms).
    - Optional `CardFooter` (subtle links or legal text).
- **Handled interactions**:
  - None (purely presentational).
- **Handled validation**:
  - None; delegates to children.
- **Types**:
  - `AuthCardProps`:
    - `children: ReactNode`
    - Optional `title`, `subtitle`, `icon` for convenience.
- **Props**:
  - `children`
  - Optional `title?: string`, `subtitle?: string`, `icon?: ReactNode`.

### 4.3 `AuthHeader`

- **Component description**:  
  Displays the auth page heading, small description, and optionally an app logo.
- **Main elements**:
  - `<div>` with:
    - Optional logo icon.
    - `<h1>` (e.g. “Welcome back” / “Create your account” / “Reset your password”).
    - `<p>` descriptive text.
- **Handled interactions**:
  - None; static content.
- **Handled validation**:
  - None.
- **Types**:
  - `AuthHeaderProps`:
    - `title: string`
    - `subtitle?: string`
- **Props**:
  - `title`, `subtitle`.

### 4.4 `AuthTabs`

- **Component description**:  
  Tabbed UI that switches between login and signup forms while preserving independent form state per tab.
- **Main elements**:
  - Uses shadcn/ui `Tabs` primitives:
    - `TabsList` with two `TabsTrigger` buttons (“Log in”, “Sign up”).
    - Two `TabsContent` panels:
      - `LoginForm`
      - `SignupForm`
- **Handled interactions**:
  - `onValueChange(mode: AuthMode)` fired when user switches tabs via click or keyboard.
  - Manage focus: when switching tabs, focus the first input in the newly visible form.
- **Handled validation**:
  - Ensures only `"login"` or `"signup"` are accepted tab values.
  - Does not allow tab switching while a submit is in progress unless we explicitly choose to allow it; if blocked, disabled state can be applied based on `isSubmitting`.
- **Types**:
  - `AuthTabsProps`:
    - `mode: AuthMode`
    - `onChange: (mode: AuthMode) => void`
    - `loginFormProps: AuthFormProps<"login">`
    - `signupFormProps: AuthFormProps<"signup">`
- **Props**:
  - As in `AuthTabsProps`.

### 4.5 `LoginForm`

- **Component description**:  
  Controlled form for email/password login, with inline validation and disabled-on-submit behavior.
- **Main elements**:
  - `<form>` with:
    - `EmailInput`
    - `PasswordInput`
    - `FormErrorAlert` (top or near submit button)
    - `SubmitButton` (“Log in”)
    - `ResetPasswordLink` below the button
- **Handled interactions**:
  - `onSubmit`:
    - Prevents default.
    - Runs client-side validation (email format, non-empty password).
    - If valid, calls `props.onSubmit(values)` from `useAuthForm`.
  - `onChange` for inputs updates local `values` state and clears field-level errors for that field.
- **Handled validation**:
  - Email:
    - Required; must match simple email regex.
    - Error message: “Enter a valid email.”
  - Password:
    - Required; min length 8 (to match server-side zod schema).
    - Error: “Password must be at least 8 characters.”
  - On successful API call:
    - No client-side validation errors; redirect handled upstream.
  - On API `validation_error`:
    - Use `error.message` from server as a general form error, or map to field error if possible.
  - On API `invalid_credentials`:
    - Show “Incorrect email or password.” as a form-level error without specifying which field was wrong.
- **Types**:
  - Uses `LoginCommand` DTO from `src/types.ts`:
    - `{ email: string; password: string }`
  - `AuthFormValuesLogin`:
    - `{ email: string; password: string }`
  - `AuthFormErrorsLogin`: partial mapping `{ email?: string; password?: string; general?: string }`.
  - `AuthFormStatus` shared type for login/signup:
    - `{ isSubmitting: boolean; submitError?: string | null; submitSuccess?: boolean }`.
- **Props**:
  - `values: AuthFormValuesLogin`
  - `errors: AuthFormErrorsLogin`
  - `status: AuthFormStatus`
  - `onChange: (field: "email" | "password", value: string) => void`
  - `onSubmit: (values: AuthFormValuesLogin) => Promise<void>`

### 4.6 `SignupForm`

- **Component description**:  
  Controlled form for account creation with email, password, and confirmation, plus password requirements hinting.
- **Main elements**:
  - `<form>` with:
    - `EmailInput`
    - `PasswordInput`
    - `ConfirmPasswordInput`
    - `PasswordRequirementsHint`
    - `FormErrorAlert`
    - `SubmitButton` (“Create account”)
- **Handled interactions**:
  - `onSubmit`:
    - Prevents default.
    - Validates all fields (email, password strength, confirmation match).
    - Calls `props.onSubmit(values)` if valid.
  - `onChange` updates local state and clears respective errors.
- **Handled validation**:
  - Email:
    - Same as `LoginForm`.
  - Password:
    - Required; minimum length 8.
    - Optionally enforce additional rules (e.g. at least one number) if mirrored by server validation.
  - Confirm password:
    - Required; must equal `password`.
    - Error: “Passwords must match.”
  - On API `validation_error`:
    - Use server message or map to top-level error.
  - On API `email_exists` (409):
    - Show “An account with that email already exists.” without revealing more details.
  - On `auth_failed`/`supabase_unavailable`:
    - Show generic message: “We couldn’t create your account. Please try again.”
- **Types**:
  - Uses `SignupCommand` DTO from `src/types.ts`:
    - `{ email: string; password: string }`
  - `AuthFormValuesSignup`:
    - `{ email: string; password: string; confirmPassword: string }`
  - `AuthFormErrorsSignup` similar to login but includes `confirmPassword?: string`.
- **Props**:
  - `values: AuthFormValuesSignup`
  - `errors: AuthFormErrorsSignup`
  - `status: AuthFormStatus`
  - `onChange: (field: "email" | "password" | "confirmPassword", value: string) => void`
  - `onSubmit: (values: AuthFormValuesSignup) => Promise<void>`

### 4.7 `EmailInput`

- **Component description**:  
  Shared controlled email input field using shadcn/ui `Input` with label and error text.
- **Main elements**:
  - `<label>` with `htmlFor`.
  - `<Input type="email">` from shadcn/ui.
  - `<p>` or `<span>` for error text, conditionally rendered.
- **Handled interactions**:
  - `onChange` calls `props.onChange(value)`.
  - `onBlur` triggers validation in parent hook if desired.
- **Handled validation**:
  - Displays error string passed via props; does not run its own validation logic beyond basic HTML5 `type="email"` behavior.
  - Adds `aria-invalid` and `aria-describedby` when an error is present.
- **Types**:
  - `EmailInputProps`:
    - `id: string`
    - `value: string`
    - `error?: string`
    - `onChange: (value: string) => void`
- **Props**:
  - As above.

### 4.8 `PasswordInput` and `ConfirmPasswordInput`

- **Component description**:  
  Shared password fields with show/hide toggle and error display; `ConfirmPasswordInput` is a stylized wrapper around the same base component.
- **Main elements**:
  - `<label>` + shadcn/ui `Input type="password"` or `type="text"` when toggled.
  - Icon button or text button to toggle visibility (`aria-pressed`, `aria-label`).
  - Error text under field.
- **Handled interactions**:
  - `onChange` passes new value upward.
  - Show/hide toggle updates local `show` state while maintaining focus.
- **Handled validation**:
  - Displays error string from props.
  - Adds `aria-invalid` and `aria-describedby` when error is present.
- **Types**:
  - `PasswordInputProps`:
    - `id: string`
    - `value: string`
    - `error?: string`
    - `label: string`
    - `onChange: (value: string) => void`
- **Props**:
  - As above.

### 4.9 `SubmitButton`

- **Component description**:  
  Primary call-to-action button for forms, using shadcn/ui `Button` with built-in loading state.
- **Main elements**:
  - `Button` with full width styling, variant `"default"` or `"primary"`.
  - Optional spinner icon when loading.
- **Handled interactions**:
  - `onClick` is handled by the parent `<form>` submit; button uses `type="submit"`.
  - Disabled when `props.disabled` or `props.isLoading` is true.
- **Handled validation**:
  - Prevents double-submits via disabled state.
- **Types**:
  - `SubmitButtonProps`:
    - `label: string`
    - `isLoading?: boolean`
    - `disabled?: boolean`
- **Props**:
  - As above.

### 4.10 `ResetPasswordLink`

- **Component description**:  
  Simple link/button under the login form that navigates to `/reset-password`.
- **Main elements**:
  - `<button type="button">` styled as a text link or `<a>` tag pointing to `/reset-password`.
- **Handled interactions**:
  - On click, navigates to `/reset-password`, using `window.location.assign("/reset-password")` or a standard `<a href>` to preserve SSR and middleware.
- **Handled validation**:
  - None.
- **Types**:
  - Stateless; `ResetPasswordLinkProps` may just include optional `className`.
- **Props**:
  - Optional `className?: string`.

### 4.11 `FormErrorAlert` and `FormSuccessNotice`

- **Component description**:  
  Shared alert components using shadcn/ui `Alert` to surface form-level errors and success messages.
- **Main elements**:
  - `Alert` with icon and text.
  - For errors, role `alert` or within an `aria-live="assertive"` region.
- **Handled interactions**:
  - Optional close button that clears error in parent state.
- **Handled validation**:
  - When error/success text changes, parent component should manage focus to the message when appropriate (e.g. first error in form).
- **Types**:
  - `FormAlertProps`:
    - `message: string`
    - `variant: "error" | "success"`
    - `onClose?: () => void`
- **Props**:
  - As above.

### 4.12 `PasswordResetView`

- **Component description**:  
  Shared container for both reset request and reset confirm flows, configured by props (`mode`, `code`) and used from `/reset-password` and `/auth/reset-confirm`.
- **Main elements**:
  - Renders one of:
    - `PasswordResetRequestForm`
    - `PasswordResetConfirmForm`
    - `PasswordResetInvalidState`
- **Handled interactions**:
  - On mount, determines which content to show using props:
    - `mode="request"` → show request form.
    - `mode="confirm"` and `code` present → show confirm form.
    - Missing/empty `code` in confirm mode → invalid state.
- **Handled validation**:
  - Delegates to underlying forms/hooks.
- **Types**:
  - `PasswordResetMode` union: `"request" | "confirm" | "invalid"`.
  - `PasswordResetViewProps`:
    - `mode: PasswordResetMode`
    - `code?: string | null`
- **Props**:
  - As in `PasswordResetViewProps`.

### 4.13 `PasswordResetRequestForm`

- **Component description**:  
  Form to request a password reset email.
- **Main elements**:
  - `<form>` with:
    - `EmailInput`
    - `FormErrorAlert` (optional, for validation/server errors)
    - `FormSuccessNotice` (on successful request)
    - `SubmitButton` (“Send reset link”)
- **Handled interactions**:
  - `onSubmit`:
    - Prevent default.
    - Validate email; call `props.onSubmit({ email })`.
  - `onChange` updates local `email` state and clears errors.
- **Handled validation**:
  - Email same as other forms.
  - Server behavior:
    - On 200 success, always shows the same generic success message: “If that email exists, we’ve sent reset instructions.”
    - On `validation_error` or client-side validation failure, show inline error message.
  - Must not indicate whether the email exists or not.
- **Types**:
  - Uses `PasswordResetRequestCommand` DTO from `src/types.ts`:
    - `{ email: string }`
  - `PasswordResetRequestValues`:
    - `{ email: string }`
  - `PasswordResetRequestErrors`:
    - `{ email?: string; general?: string }`
- **Props**:
  - `values: PasswordResetRequestValues`
  - `errors: PasswordResetRequestErrors`
  - `status: AuthFormStatus`
  - `onChange: (value: string) => void`
  - `onSubmit: (values: PasswordResetRequestValues) => Promise<void>`

### 4.14 `PasswordResetConfirmForm`

- **Component description**:  
  Form for setting a new password after following the email link; submits the `code` and new password to `/api/v1/auth/password-reset/confirm`.
- **Main elements**:
  - `<form>` with:
    - `PasswordInput`
    - `ConfirmPasswordInput`
    - `PasswordRequirementsHint`
    - `FormErrorAlert`
    - `SubmitButton` (“Update password”)
- **Handled interactions**:
  - `onSubmit`:
    - Prevent default.
    - Validates password strength and confirmation match.
    - Calls `props.onSubmit({ code, password })`.
  - Resets fields or navigates away on success depending on behavior in parent.
- **Handled validation**:
  - Same password rules as signup.
  - If API returns `reset_invalid_or_expired`:
    - Show explicit message: “Reset link is invalid or expired. Request a new one.”
    - Optionally display a button to `/reset-password`.
  - On `validation_error`, map to form-level or field-specific messages.
- **Types**:
  - Uses `PasswordResetConfirmCommand` DTO from `src/types.ts`:
    - `{ code: string; password: string }`
  - `PasswordResetConfirmValues`:
    - `{ password: string; confirmPassword: string }`
  - `PasswordResetConfirmErrors`:
    - `{ password?: string; confirmPassword?: string; general?: string }`
- **Props**:
  - `code: string`
  - `values: PasswordResetConfirmValues`
  - `errors: PasswordResetConfirmErrors`
  - `status: AuthFormStatus`
  - `onSubmit: (values: PasswordResetConfirmValues) => Promise<void>`
  - `onChange: (field: "password" | "confirmPassword", value: string) => void`

### 4.15 `PasswordResetInvalidState`

- **Component description**:  
  Simple informational state rendered when the reset link is invalid or expired and no valid code is available.
- **Main elements**:
  - Headline text summarizing problem.
  - Short explanation.
  - Button linking to `/reset-password`.
- **Handled interactions**:
  - Button click navigates to `/reset-password`.
- **Handled validation**:
  - None.
- **Types**:
  - Stateless; `PasswordResetInvalidStateProps` includes optional children or `message`.
- **Props**:
  - Optional `message?: string`.

## 5. Types

### 5.1 Existing DTOs from `src/types.ts`

- **`AuthUserDTO`**:
  - `id: string`
  - `email: string | null`
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

These DTOs should be reused both in API helper functions and in view-specific hooks to keep client code aligned with backend validation.

### 5.2 API response envelope types (frontend)

Define these in a shared frontend module (e.g. `src/lib/http/apiTypes.ts`) for use by auth and other views:

- **`ApiErrorPayload<ECode extends string = string>`**:
  - `code: ECode`
  - `message: string`
  - `details?: unknown`
- **`ApiSuccessResponse<T>`**:
  - `{ success: true; data: T }`
- **`ApiErrorResponse<ECode extends string = string>`**:
  - `{ success: false; error: ApiErrorPayload<ECode> }`
- **`ApiResponse<T, ECode extends string = string>`**:
  - `ApiSuccessResponse<T> | ApiErrorResponse<ECode>`

Auth endpoints then specify their `ECode` unions based on backend route `ErrorCode` types:

- **Signup** (`/api/v1/auth/signup`):
  - `SignupErrorCode = "validation_error" | "invalid_credentials" | "email_exists" | "auth_failed" | "supabase_unavailable" | "unknown_error"`
  - `SignupResponseData = { user: AuthUserDTO }`
  - Response type: `ApiResponse<SignupResponseData, SignupErrorCode>`
- **Login** (`/api/v1/auth/login`):
  - `LoginErrorCode = "validation_error" | "invalid_credentials" | "auth_failed" | "supabase_unavailable" | "unknown_error"`
  - `LoginResponseData = { user: AuthUserDTO }`
  - Response type: `ApiResponse<LoginResponseData, LoginErrorCode>`
- **Password reset request** (`/api/v1/auth/password-reset/request`):
  - `PasswordResetRequestErrorCode = "validation_error" | "supabase_unavailable" | "auth_failed"`
  - `PasswordResetRequestResponseData = { message: string }`
  - Response type: `ApiResponse<PasswordResetRequestResponseData, PasswordResetRequestErrorCode>`
- **Password reset confirm** (`/api/v1/auth/password-reset/confirm`):
  - `PasswordResetConfirmErrorCode = "validation_error" | "reset_invalid_or_expired" | "auth_failed" | "supabase_unavailable" | "unknown_error"`
  - `PasswordResetConfirmResponseData = { user: AuthUserDTO }`
  - Response type: `ApiResponse<PasswordResetConfirmResponseData, PasswordResetConfirmErrorCode>`

### 5.3 ViewModel and hook types

Define view-specific models in `src/lib/auth/types.ts` or `src/components/auth/types.ts`:

- **`AuthMode`**:
  - Union: `"login" | "signup"`
- **`AuthFormValuesLogin`**:
  - `{ email: string; password: string }`
- **`AuthFormValuesSignup`**:
  - `{ email: string; password: string; confirmPassword: string }`
- **`AuthFormErrorsLogin`**:
  - `{ email?: string; password?: string; general?: string }`
- **`AuthFormErrorsSignup`**:
  - `{ email?: string; password?: string; confirmPassword?: string; general?: string }`
- **`AuthFormStatus`**:
  - `isSubmitting: boolean`
  - `submitError?: string | null`
  - `submitSuccess?: boolean`
- **`UseAuthFormResult<TValues>`** (generic hook result type):
  - `values: TValues`
  - `errors: Partial<Record<keyof TValues | "general", string>>`
  - `status: AuthFormStatus`
  - `setFieldValue: <K extends keyof TValues>(field: K, value: TValues[K]) => void`
  - `handleSubmit: (ev: FormEvent) => void`
  - `submit: (values?: TValues) => Promise<void>` (for programmatic submit)

For password reset:

- **`PasswordResetMode`**:
  - `"request" | "confirm" | "invalid"`
- **`PasswordResetRequestValues`**:
  - `{ email: string }`
- **`PasswordResetRequestErrors`**:
  - `{ email?: string; general?: string }`
- **`PasswordResetConfirmValues`**:
  - `{ password: string; confirmPassword: string }`
- **`PasswordResetConfirmErrors`**:
  - `{ password?: string; confirmPassword?: string; general?: string }`
- **`UsePasswordResetRequestResult`**:
  - `values: PasswordResetRequestValues`
  - `errors: PasswordResetRequestErrors`
  - `status: AuthFormStatus`
  - `setEmail(value: string): void`
  - `submit(): Promise<void>`
- **`UsePasswordResetConfirmResult`**:
  - `values: PasswordResetConfirmValues`
  - `errors: PasswordResetConfirmErrors`
  - `status: AuthFormStatus`
  - `submit(): Promise<void>`
  - `setField(field: "password" | "confirmPassword", value: string): void`

These types keep the UI logic well-typed and make it easy to reuse the same hooks in tests or Storybook stories.

## 6. State Management

- **Local-only state for auth forms**:
  - No global store is required; Auth and Password Reset forms can manage their own state via React hooks.
  - Authentication session itself is handled via Supabase cookies and server middleware; the view only cares about form state and redirects.

- **Auth view state (`useAuthView` + `useAuthForm`)**:
  - `useAuthView`:
    - Holds `mode: AuthMode` (current tab).
    - Reads `redirect` from props and stores a sanitized version (ensuring same-origin, not `/auth`).
    - Exposes `setMode(mode: AuthMode)` to `AuthTabs`.
  - `useAuthForm("login" | "signup")`:
    - Internal state:
      - `values` (login or signup).
      - `errors` (field + general).
      - `status: AuthFormStatus`.
    - Behavior:
      - `setFieldValue(field, value)` mutates `values` and clears the error for that field.
      - `validate(values)` returns an errors object; if non-empty, sets `errors` and aborts submit.
      - `submit`:
        - Sets `status.isSubmitting = true`, clears previous error.
        - Calls appropriate API helper (`authApi.login`, `authApi.signup`).
        - On success:
          - Sets `status.submitSuccess = true` and triggers redirect (`window.location.assign(safeRedirect)`).
        - On failure:
          - Maps `error.code` to friendly message(s) and sets `errors.general` and/or field-level errors.
        - Finally, sets `status.isSubmitting = false`.

- **Password reset view state (`usePasswordResetRequest`, `usePasswordResetConfirm`)**:
  - `usePasswordResetRequest`:
    - Manages `values.email`, `errors`, `status`.
    - On successful API response (`success: true`), sets `status.submitSuccess = true` and shows `FormSuccessNotice`, but does **not** navigate.
  - `usePasswordResetConfirm`:
    - Receives `code` as an immutable prop.
    - Manages password fields, errors, and submit status.
    - On success:
      - Option 1 (recommended): immediate redirect to `/in-progress` or safe `redirect` via `window.location.assign`.
      - Option 2: show success state briefly then redirect.
    - On `reset_invalid_or_expired`, sets `errors.general` and optionally exposes a flag for `PasswordResetView` to display `PasswordResetInvalidState`.

- **Integration with `AuthContext` (future)**:
  - Optionally, after successful login/signup/reset-confirm, call a global `AuthContext.refresh()` or trigger a full-page reload to ensure all protected routes see an up-to-date session.

## 7. API Integration

Auth views use the Astro API routes under `src/pages/api/v1/auth/`, which in turn call Supabase Auth via `auth.service.ts`. All responses share the `{ success, data?, error? }` envelope and are non-cacheable (`cache-control: no-store`).

### 7.1 Signup API (`POST /api/v1/auth/signup`)

- **Request**:
  - URL: `/api/v1/auth/signup`
  - Method: `POST`
  - Headers: `Content-Type: application/json`
  - Body type: `SignupCommand`
    - `{ "email": string, "password": string }`
- **Response**:
  - On success (`201 Created`):
    - Body: `{ "success": true, "data": { "user": AuthUserDTO } }`
    - If a session is returned by Supabase, cookies are set via `appendSessionCookies`; otherwise the user may need to confirm email before session exists.
  - On error:
    - Body: `{ "success": false, "error": { "code": SignupErrorCode, "message": string, "details"?: unknown } }`
    - Key codes:
      - `"validation_error"` – invalid email/password shape.
      - `"email_exists"` – account already exists.
      - `"supabase_unavailable"`, `"auth_failed"`, `"unknown_error"`.
- **Frontend behavior**:
  - Use `authApi.signup(command)` which:
    - Calls `fetch`, parses JSON, narrows to `ApiResponse<SignupResponseData, SignupErrorCode>`.
    - Throws a typed error or returns `user`.
  - On success, redirect to safe target (e.g. `/in-progress`), optionally honoring `redirect` query.

### 7.2 Login API (`POST /api/v1/auth/login`)

- **Request**:
  - URL: `/api/v1/auth/login`
  - Method: `POST`
  - Headers: `Content-Type: application/json`
  - Body type: `LoginCommand`
- **Response**:
  - On success (`201 Created`):
    - Body: `{ "success": true, "data": { "user": AuthUserDTO } }`
    - `appendSessionCookies` sets session cookies for subsequent authenticated requests.
  - On error:
    - `invalid_credentials` → user-facing “Invalid email or password.”
    - Other codes similar to signup.
- **Frontend behavior**:
  - `authApi.login(command)` returns `AuthUserDTO` or throws.
  - On success, redirect to:
    - `redirect` query param (sanitized to relative same-origin path).
    - Fallback `/in-progress`.

### 7.3 Logout API (`POST /api/v1/auth/logout`) – referenced for completeness

- **Request**:
  - `POST /api/v1/auth/logout` (called from header/user menu, not from Auth view).
- **Response**:
  - Always returns `{ "success": true }` on happy path; clears cookies even on some errors.
- **Frontend behavior**:
  - On success, navigate to landing page (e.g. `/`), letting middleware redirect appropriately.

### 7.4 Password reset request API (`POST /api/v1/auth/password-reset/request`)

- **Request**:
  - URL: `/api/v1/auth/password-reset/request`
  - Method: `POST`
  - Headers: `Content-Type: application/json`
  - Body type: `PasswordResetRequestCommand`
    - `{ "email": string }`
- **Response**:
  - On success (`200 OK`):
    - Body: `{ "success": true, "data": { "message": "If that email exists, we've sent reset instructions." } }`
  - On error:
    - `validation_error` (e.g. missing email).
    - `supabase_unavailable`, `auth_failed` (still may respond 200 for some `AuthServiceError` cases to avoid enumeration; view should treat most error paths as success).
- **Frontend behavior**:
  - `authApi.requestPasswordReset(command)`:
    - On network/500 error, show generic error.
    - For all responses with `success: true`, show the generic success notice and do not indicate whether the email exists.

### 7.5 Password reset confirm API (`POST /api/v1/auth/password-reset/confirm`)

- **Request**:
  - URL: `/api/v1/auth/password-reset/confirm`
  - Method: `POST`
  - Headers: `Content-Type: application/json`
  - Body type: `PasswordResetConfirmCommand`
    - `{ "code": string, "password": string }` (code comes from email link/query param)
- **Response**:
  - On success (`200 OK`):
    - Body: `{ "success": true, "data": { "user": AuthUserDTO } }`
    - Session cookies are set via `appendSessionCookies`; user is now logged in.
  - On error:
    - `validation_error` – invalid password or missing code.
    - `reset_invalid_or_expired` – invalid/expired reset code; user should be sent to `/reset-password`.
    - `supabase_unavailable`, `auth_failed`, `unknown_error`.
- **Frontend behavior**:
  - `authApi.confirmPasswordReset({ code, password })`:
    - On success, redirect to `/in-progress` (or safe `redirect`).
    - On `reset_invalid_or_expired`, show specific message and offer `Request new link` CTA.
    - On other errors, display generic error and allow retry.

## 8. User Interactions

- **Navigate to `/auth` (unauthenticated)**:
  - User sees `AuthCard` with Login and Signup tabs.
  - Default tab is “Log in”.
  - Email and password fields are initially empty; submit button disabled only while submitting.

- **Switch between Login and Signup tabs**:
  - Keyboard accessible via arrow keys / Tab focus on tab headers.
  - Switching preserves typed values per tab in memory (no data loss).
  - Focus moves to the first input of the newly selected tab.

- **Login flow (US-002)**:
  - User enters email and password and submits the form (Enter key or click).
  - If client-side validation fails, inline errors appear and focus moves to the first invalid field.
  - If server returns `invalid_credentials`, `FormErrorAlert` shows “Invalid email or password.”
  - On success, the page redirects to safe `redirect` or `/in-progress`.

- **Signup flow (US-001)**:
  - User switches to “Sign up” tab, fills in email, password, confirmation.
  - Client-side validation ensures email format, min password length, and matching confirmation.
  - On `email_exists`, form shows appropriate error near email or as general error.
  - On success, user is either:
    - Logged in immediately and redirected to `/in-progress` (current behavior when Supabase returns `session`).
    - Or shown a confirmation notice instructing them to check email (if email-confirmation is enforced later).

- **Request password reset (US-003 acceptance criteria 1–2)**:
  - From `/auth`, user clicks “Forgot your password?” → navigates to `/reset-password`.
  - Enters email and submits form.
  - On success, a generic success notice appears; form may remain visible but should show that the email has been (possibly) sent.
  - Even if the email is not associated with an account, the UI behaves identically.

- **Follow reset link and set new password (US-003 acceptance criteria 3–4)**:
  - User clicks email link: `APP_URL/auth/reset-confirm?code=...`.
  - `PasswordResetView` renders confirm form with password and confirmation fields.
  - On submit, client-side validation enforces password rules.
  - On success, user is logged in (session cookies set) and redirected to `/in-progress`.
  - If link is invalid/expired (`reset_invalid_or_expired`), UI shows an explanation and “Request a new link” button to `/reset-password`.

- **Edge interactions**:
  - If a logged-in user manually visits `/auth`, SSR redirect sends them to `/in-progress` (or safe `redirect`).
  - If a user repeatedly fails login (e.g., due to typos), the UI avoids revealing whether email or password is wrong and does not lock out or over-inform about reasons.

## 9. Conditions and Validation

- **Field-level validation**:
  - **Email**:
    - Non-empty and valid email format.
    - Trim whitespace; keep case as typed for display.
  - **Password**:
    - Non-empty; min length 8.
    - The front end should mirror server constraints from `src/lib/validation/auth.ts` as they evolve.
  - **Confirm password**:
    - Non-empty; must equal primary password.
  - **Reset code**:
    - Must be non-empty string; missing or empty code puts view in invalid state.

- **API-driven conditions**:
  - **Login**:
    - On `invalid_credentials`, UI must present a generic message and not say whether the email exists.
  - **Signup**:
    - On `email_exists`, display a clear but non-leaky message (“An account with that email already exists.”).
  - **Password reset request**:
    - Regardless of whether email is known, UI must always show the same success state when the request endpoint returns `success: true`.
  - **Password reset confirm**:
    - On `reset_invalid_or_expired`, treat the code as unusable and prompt the user to request a new link.

- **Redirect safety and loop prevention**:
  - The `redirect` query parameter on `/auth` should be:
    - Parsed as a relative path; discard if absolute or cross-origin.
    - Ignored if it points back to `/auth` or another auth-only route to avoid loops.
  - After a successful login/sign-up/reset-confirm:
    - Navigate to safe redirect or `/in-progress` only once per submit.

- **Accessibility conditions**:
  - All fields have `<label>` elements or `aria-label`s.
  - Error messages are associated with fields via `aria-describedby` and/or `id` attributes.
  - Form-level error alerts use `role="alert"` or reside in `aria-live` regions so screen readers announce them.

## 10. Error Handling

- **Client-side validation errors**:
  - Detected before calling the API; prevent network call and show inline messages under each invalid field.
  - The first invalid field receives focus for quick correction.

- **Network and unexpected server errors**:
  - For unreachable server or 5xx codes, show a generic form-level message like:
    - “Something went wrong. Please try again.”
  - Do not expose raw error details to the user; log details (if available) via app-level logging hooks.

- **Structured API error codes**:
  - Map specific `error.code` values to UX:
    - `validation_error` → highlight corresponding fields; show server message if user-friendly.
    - `invalid_credentials` → generic login error.
    - `email_exists` → sign-up email duplication message.
    - `reset_invalid_or_expired` → dedicated invalid-link state.
    - `supabase_unavailable` / `auth_failed` / `unknown_error` → generic error.

- **Password reset enumeration protection**:
  - The UI treats most non-validation responses from the reset request endpoint as success and always shows the same “If that email exists…” message, in line with backend behavior.

- **401 responses**:
  - Auth endpoints themselves normally do not return 401 for login/signup; however, the global `useApi` helper should still handle 401 generically for other endpoints by redirecting to `/auth`.

## 11. Implementation Steps

1. **Set up routing and layout**
   - Create `src/layouts/AuthLayout.astro` (or reuse `Layout.astro` with an “auth” variant) that centers a content card and applies a clean, minimal design.
   - Add `src/pages/auth.astro`, `src/pages/reset-password.astro`, and `src/pages/auth/reset-confirm.astro`, all using `AuthLayout.astro` and rendering the appropriate React islands (`AuthPageView`, `PasswordResetView`).
   - Ensure middleware is configured so authenticated users are redirected away from `/auth` to `/in-progress`.

2. **Define frontend auth types**
   - Add shared API envelope types (`ApiErrorPayload`, `ApiResponse`, etc.) and auth-specific error-code unions in `src/lib/http/apiTypes.ts` or `src/lib/auth/types.ts`.
   - Define view model and hook types (`AuthMode`, `AuthForm*`, `PasswordReset*`) as described to keep components strongly typed.

3. **Implement auth API client helpers**
   - Create `src/lib/auth/authApi.ts` with:
     - `signup(command: SignupCommand): Promise<AuthUserDTO>`
     - `login(command: LoginCommand): Promise<AuthUserDTO>`
     - `requestPasswordReset(command: PasswordResetRequestCommand): Promise<void>`
     - `confirmPasswordReset(command: PasswordResetConfirmCommand): Promise<AuthUserDTO>`
   - Each function should:
     - Use `fetch` to call the corresponding `/api/v1/auth/*` endpoint.
     - Parse the JSON envelope.
     - On `success: false`, throw an error object carrying `code` and `message`.

4. **Build form hooks**
   - Implement `useAuthForm(mode: "login" | "signup")` in `src/components/auth/useAuthForm.ts`:
     - Manage values, errors, and `AuthFormStatus`.
     - Call `authApi.login` or `authApi.signup` as appropriate.
     - On success, redirect to safe location.
   - Implement `usePasswordResetRequest` and `usePasswordResetConfirm` in `src/components/auth/usePasswordReset.ts`:
     - Request hook calls `authApi.requestPasswordReset` and controls success banner.
     - Confirm hook reads `code` from props, calls `authApi.confirmPasswordReset`, and handles `reset_invalid_or_expired`.

5. **Implement presentational form components**
   - Add `AuthCard`, `AuthHeader`, `AuthTabs`, `LoginForm`, `SignupForm`, `EmailInput`, `PasswordInput`, `ConfirmPasswordInput`, `SubmitButton`, `ResetPasswordLink`, `FormErrorAlert`, and `FormSuccessNotice` under `src/components/auth/`.
   - Use shadcn/ui components for inputs, buttons, tabs, and alerts; apply Tailwind classes for layout.
   - Ensure all components accept the props described in this plan and are composable.

6. **Compose `AuthPageView` and `PasswordResetView`**
   - `AuthPageView`:
     - Reads `redirect` (and optional `mode`) from props.
     - Creates instances of `useAuthForm("login")` and `useAuthForm("signup")`.
     - Passes state into `AuthTabs`.
   - `PasswordResetView`:
     - Reads `mode` and `code` from props.
     - For `mode="request"`, wires `usePasswordResetRequest` into `PasswordResetRequestForm`.
     - For `mode="confirm"`, wires `usePasswordResetConfirm` into `PasswordResetConfirmForm`.

7. **Hook Astro pages to React islands**
   - In each Astro page:
     - Use `Astro.locals.user` or equivalent to decide whether to redirect (for `/auth`).
     - Parse query parameters (`redirect`, `code`) and pass them as props to the React components.
     - Ensure pages are not prerendered (`export const prerender = false` where needed).

8. **Add accessibility and UX polish**
   - Verify labels, `aria-*` attributes, focus order, and keyboard behavior for tabs and forms.
   - Add `aria-live` regions or `role="alert"` for form-level error/success messages.
   - Ensure error states are color-contrast compliant.

9. **Test auth and reset flows end-to-end**
   - Manually test:
     - Signup with new email, then login with same credentials.
     - Login with invalid credentials and confirm correct error.
     - Request password reset for both existing and non-existing emails (should behave identically).
     - Use real Supabase reset email link for confirm flow; ensure new password works.
   - Test redirect handling with `redirect` query param and loop prevention.

10. **Add basic automated tests (optional but recommended)**
    - Component tests for form validation rules and error mapping (using React Testing Library).
    - Integration tests hitting mock/fake auth API to verify that error codes map to correct messages and states.

11. **Documentation**
    - Update project README and internal docs to describe:
      - Available auth routes (`/auth`, `/reset-password`, `/auth/reset-confirm`).
      - Expected JSON responses from `/api/v1/auth/*`.
      - Guidelines for adding new auth-related flows (e.g. Steam OAuth) reusing these patterns.

