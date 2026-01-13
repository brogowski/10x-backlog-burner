import type { Session } from "@supabase/supabase-js";

import type {
  AuthUserDTO,
  LoginCommand,
  PasswordResetConfirmCommand,
  PasswordResetRequestCommand,
  SignupCommand,
} from "../../types";
import type { SupabaseClient } from "../../db/supabase.client";

type AuthErrorCode =
  | "invalid_credentials"
  | "email_exists"
  | "auth_failed"
  | "reset_invalid_or_expired"
  | "supabase_unavailable";

export class AuthServiceError extends Error {
  constructor(
    public readonly code: AuthErrorCode,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "AuthServiceError";
  }
}

interface AuthResult {
  user: AuthUserDTO;
  session: Session | null;
}

const toAuthUser = (sessionOrUser: { id: string; email?: string | null }) => ({
  id: sessionOrUser.id,
  email: sessionOrUser.email ?? null,
});

export const signUpUser = async (command: SignupCommand, supabase: SupabaseClient | null): Promise<AuthResult> => {
  if (!supabase) {
    throw new AuthServiceError("supabase_unavailable", "Authentication service is unavailable.");
  }

  const emailRedirectTo = buildRedirectUrl("/auth/reset-confirm");
  const { data, error } = await supabase.auth.signUp({
    email: command.email,
    password: command.password,
    options: {
      emailRedirectTo,
    },
  });

  if (error) {
    if (error.code === "user_already_exists" || error.code === "email_exists") {
      throw new AuthServiceError("email_exists", "An account with that email already exists.", {
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }

    throw new AuthServiceError("auth_failed", "Signup failed.", {
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }

  if (!data.user) {
    throw new AuthServiceError("auth_failed", "Signup failed.");
  }

  return {
    user: toAuthUser(data.user),
    session: data.session ?? null,
  };
};

export const loginUser = async (command: LoginCommand, supabase: SupabaseClient | null): Promise<AuthResult> => {
  if (!supabase) {
    throw new AuthServiceError("supabase_unavailable", "Authentication service is unavailable.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: command.email,
    password: command.password,
  });

  if (error) {
    if (error.code === "invalid_credentials") {
      throw new AuthServiceError("invalid_credentials", "Invalid email or password.", {
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }

    throw new AuthServiceError("auth_failed", "Login failed.", {
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }

  if (!data.user || !data.session) {
    throw new AuthServiceError("auth_failed", "Login failed.");
  }

  return {
    user: toAuthUser(data.user),
    session: data.session,
  };
};

export const logoutUser = async (supabase: SupabaseClient | null): Promise<void> => {
  if (!supabase) {
    throw new AuthServiceError("supabase_unavailable", "Authentication service is unavailable.");
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new AuthServiceError("auth_failed", "Logout failed.", {
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }
};

export const requestPasswordReset = async (
  command: PasswordResetRequestCommand,
  supabase: SupabaseClient | null
): Promise<void> => {
  if (!supabase) {
    throw new AuthServiceError("supabase_unavailable", "Authentication service is unavailable.");
  }

  const redirectTo = buildRedirectUrl("/auth/reset-confirm");
  const { error } = await supabase.auth.resetPasswordForEmail(command.email, {
    redirectTo,
  });

  if (error) {
    if (error.code === "over_email_send_rate_limit") {
      throw new AuthServiceError("auth_failed", "Reset email send rate limited.", {
        code: error.code,
        message: error.message,
        status: error.status,
      });
    }

    throw new AuthServiceError("auth_failed", "Password reset failed.", {
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }
};

export const confirmPasswordReset = async (
  command: PasswordResetConfirmCommand,
  supabase: SupabaseClient | null
): Promise<AuthResult> => {
  if (!supabase) {
    throw new AuthServiceError("supabase_unavailable", "Authentication service is unavailable.");
  }

  const { accessToken, refreshToken, password, type } = command;
  if (!accessToken || !refreshToken || (type && type !== "recovery")) {
    throw new AuthServiceError("reset_invalid_or_expired", "Reset link is invalid or expired.");
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  if (sessionError || !sessionData.session || !sessionData.user) {
    throw new AuthServiceError(
      "reset_invalid_or_expired",
      "Reset link is invalid or expired.",
      sessionError ?? undefined
    );
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password,
  });

  if (updateError) {
    throw new AuthServiceError("auth_failed", "Unable to update password.", {
      code: updateError.code,
      message: updateError.message,
      status: updateError.status,
    });
  }

  return {
    user: toAuthUser(sessionData.user),
    session: sessionData.session,
  };
};

const buildRedirectUrl = (path: string): string | undefined => {
  const baseUrl = import.meta.env.APP_URL;
  if (!baseUrl) return undefined;

  try {
    const url = new URL(path, baseUrl);
    return url.toString();
  } catch {
    return undefined;
  }
};
