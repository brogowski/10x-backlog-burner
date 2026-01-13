import type { LoginCommand, PasswordResetConfirmCommand, PasswordResetRequestCommand, SignupCommand } from "@/types";
import type {
  LoginResponse,
  PasswordResetConfirmResponse,
  PasswordResetRequestResponse,
  SignupResponse,
} from "@/lib/http/apiTypes";
import {
  type ApiErrorPayload,
  type ApiResponse,
  type LoginErrorCode,
  type PasswordResetConfirmErrorCode,
  type PasswordResetRequestErrorCode,
  type SignupErrorCode,
} from "@/lib/http/apiTypes";

export class AuthApiError<ECode extends string = string> extends Error {
  constructor(
    public readonly code: ECode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}

const AUTH_BASE_PATH = "/api/v1/auth";

const buildError = <ECode extends string>(
  payload: ApiErrorPayload<ECode> | null | undefined,
  fallbackCode: ECode
): AuthApiError<ECode> => {
  if (payload) {
    return new AuthApiError(payload.code, payload.message, payload.details);
  }
  return new AuthApiError(fallbackCode, "Request failed.");
};

const post = async <TData, ECode extends string>(path: string, body: unknown): Promise<ApiResponse<TData, ECode>> => {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const json = (await response.json().catch(() => null)) as ApiResponse<TData, ECode> | null;
  if (!json) {
    throw new AuthApiError("unknown_error" as ECode, "Unexpected response from server.");
  }

  return json;
};

export const signup = async (command: SignupCommand) => {
  const json = await post<SignupResponse["data"], SignupErrorCode>(`${AUTH_BASE_PATH}/signup`, command);

  if (!json.success) {
    throw buildError(json.error, "unknown_error");
  }

  return json.data.user;
};

export const login = async (command: LoginCommand) => {
  const json = await post<LoginResponse["data"], LoginErrorCode>(`${AUTH_BASE_PATH}/login`, command);

  if (!json.success) {
    throw buildError(json.error, "unknown_error");
  }

  return json.data.user;
};

export const requestPasswordReset = async (command: PasswordResetRequestCommand) => {
  const json = await post<PasswordResetRequestResponse["data"], PasswordResetRequestErrorCode>(
    `${AUTH_BASE_PATH}/password-reset/request`,
    command
  );

  if (!json.success) {
    throw buildError(json.error, "auth_failed");
  }

  return json.data;
};

export const confirmPasswordReset = async (command: PasswordResetConfirmCommand) => {
  const json = await post<PasswordResetConfirmResponse["data"], PasswordResetConfirmErrorCode>(
    `${AUTH_BASE_PATH}/password-reset/confirm`,
    command
  );

  if (!json.success) {
    throw buildError(json.error, "unknown_error");
  }

  return json.data.user;
};
