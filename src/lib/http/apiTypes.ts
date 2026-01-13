import type {
  AuthUserDTO,
  LoginCommand,
  PasswordResetConfirmCommand,
  PasswordResetRequestCommand,
  SignupCommand,
} from "@/types";

export interface ApiErrorPayload<ECode extends string = string> {
  code: ECode;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse<ECode extends string = string> {
  success: false;
  error: ApiErrorPayload<ECode>;
}

export type ApiResponse<T, ECode extends string = string> = ApiSuccessResponse<T> | ApiErrorResponse<ECode>;

export type SignupErrorCode =
  | "validation_error"
  | "invalid_credentials"
  | "email_exists"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error";

export interface SignupResponseData {
  user: AuthUserDTO;
}

export type SignupResponse = ApiResponse<SignupResponseData, SignupErrorCode>;

export type LoginErrorCode =
  | "validation_error"
  | "invalid_credentials"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error";

export interface LoginResponseData {
  user: AuthUserDTO;
}

export type LoginResponse = ApiResponse<LoginResponseData, LoginErrorCode>;

export type PasswordResetRequestErrorCode = "validation_error" | "supabase_unavailable" | "auth_failed";

export interface PasswordResetRequestResponseData {
  message: string;
}

export type PasswordResetRequestResponse = ApiResponse<PasswordResetRequestResponseData, PasswordResetRequestErrorCode>;

export type PasswordResetConfirmErrorCode =
  | "validation_error"
  | "reset_invalid_or_expired"
  | "auth_failed"
  | "supabase_unavailable"
  | "unknown_error";

export interface PasswordResetConfirmResponseData {
  user: AuthUserDTO;
}

export type PasswordResetConfirmResponse = ApiResponse<PasswordResetConfirmResponseData, PasswordResetConfirmErrorCode>;

export type AuthApiSignupRequest = SignupCommand;
export type AuthApiLoginRequest = LoginCommand;
export type AuthApiPasswordResetRequest = PasswordResetRequestCommand;
export type AuthApiPasswordResetConfirmRequest = PasswordResetConfirmCommand;
