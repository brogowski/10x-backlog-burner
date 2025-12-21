import type {
  AuthUserDTO,
  LoginCommand,
  PasswordResetConfirmCommand,
  PasswordResetRequestCommand,
  SignupCommand,
} from "@/types"

export type ApiErrorPayload<ECode extends string = string> = {
  code: ECode
  message: string
  details?: unknown
}

export type ApiSuccessResponse<T> = { success: true; data: T }

export type ApiErrorResponse<ECode extends string = string> = {
  success: false
  error: ApiErrorPayload<ECode>
}

export type ApiResponse<T, ECode extends string = string> =
  | ApiSuccessResponse<T>
  | ApiErrorResponse<ECode>

export type SignupErrorCode =
  | "validation_error"
  | "invalid_credentials"
  | "email_exists"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error"

export type SignupResponseData = {
  user: AuthUserDTO
}

export type SignupResponse = ApiResponse<SignupResponseData, SignupErrorCode>

export type LoginErrorCode =
  | "validation_error"
  | "invalid_credentials"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error"

export type LoginResponseData = {
  user: AuthUserDTO
}

export type LoginResponse = ApiResponse<LoginResponseData, LoginErrorCode>

export type PasswordResetRequestErrorCode =
  | "validation_error"
  | "supabase_unavailable"
  | "auth_failed"

export type PasswordResetRequestResponseData = {
  message: string
}

export type PasswordResetRequestResponse = ApiResponse<
  PasswordResetRequestResponseData,
  PasswordResetRequestErrorCode
>

export type PasswordResetConfirmErrorCode =
  | "validation_error"
  | "reset_invalid_or_expired"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error"

export type PasswordResetConfirmResponseData = {
  user: AuthUserDTO
}

export type PasswordResetConfirmResponse = ApiResponse<
  PasswordResetConfirmResponseData,
  PasswordResetConfirmErrorCode
>

export type AuthApiSignupRequest = SignupCommand
export type AuthApiLoginRequest = LoginCommand
export type AuthApiPasswordResetRequest = PasswordResetRequestCommand
export type AuthApiPasswordResetConfirmRequest = PasswordResetConfirmCommand
