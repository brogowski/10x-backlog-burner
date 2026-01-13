import type { FormEvent } from "react";

export type AuthMode = "login" | "signup";

export interface AuthFormValuesLogin {
  email: string;
  password: string;
}

export interface AuthFormValuesSignup {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthFormErrorsLogin {
  email?: string;
  password?: string;
  general?: string;
}

export interface AuthFormErrorsSignup {
  email?: string;
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export interface AuthFormStatus {
  isSubmitting: boolean;
  submitError?: string | null;
  submitSuccess?: boolean;
}

export interface UseAuthFormResult<TValues> {
  values: TValues;
  errors: Partial<Record<string, string>>;
  status: AuthFormStatus;
  setFieldValue: <K extends keyof TValues>(field: K, value: TValues[K]) => void;
  handleSubmit: (ev: FormEvent<HTMLFormElement>) => void;
  submit: (values?: TValues) => Promise<void>;
}

export type PasswordResetMode = "request" | "confirm" | "invalid";

export interface PasswordResetRequestValues {
  email: string;
}

export interface PasswordResetRequestErrors {
  email?: string;
  general?: string;
}

export interface PasswordResetConfirmValues {
  password: string;
  confirmPassword: string;
}

export interface PasswordResetTokenParams {
  accessToken: string;
  refreshToken: string;
  type?: string | null;
}

export interface PasswordResetConfirmErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export interface UsePasswordResetRequestResult {
  values: PasswordResetRequestValues;
  errors: PasswordResetRequestErrors;
  status: AuthFormStatus;
  setEmail: (value: string) => void;
  submit: () => Promise<void>;
}

export interface UsePasswordResetConfirmResult {
  values: PasswordResetConfirmValues;
  errors: PasswordResetConfirmErrors;
  status: AuthFormStatus;
  invalidToken: boolean;
  submit: () => Promise<void>;
  setField: (field: "password" | "confirmPassword", value: string) => void;
}
