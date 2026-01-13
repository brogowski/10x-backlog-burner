import { useEffect, useState } from "react";

import AuthCard from "@/components/auth/AuthCard";
import PasswordResetConfirmForm from "@/components/auth/PasswordResetConfirmForm";
import PasswordResetInvalidState from "@/components/auth/PasswordResetInvalidState";
import PasswordResetRequestForm from "@/components/auth/PasswordResetRequestForm";
import { usePasswordResetConfirm, usePasswordResetRequest } from "@/components/auth/usePasswordReset";
import type { PasswordResetMode, PasswordResetTokenParams } from "@/lib/auth/types";

export interface PasswordResetViewProps {
  mode: PasswordResetMode;
  redirect?: string | null;
}

const parseResetTokenFromUrl = (): PasswordResetTokenParams | null => {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));

  const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token");
  const type = hashParams.get("type") || searchParams.get("type");

  if (!accessToken || !refreshToken) return null;

  return {
    accessToken,
    refreshToken,
    type,
  };
};

const PasswordResetView = ({ mode, redirect }: PasswordResetViewProps) => {
  const requestForm = usePasswordResetRequest(redirect);
  const [tokens, setTokens] = useState<PasswordResetTokenParams | null | undefined>(
    mode === "confirm" ? undefined : null
  );

  useEffect(() => {
    if (mode !== "confirm") return;
    const parsedTokens = parseResetTokenFromUrl();
    setTokens(parsedTokens);

    if (parsedTokens) {
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = "";
      cleanUrl.searchParams.delete("access_token");
      cleanUrl.searchParams.delete("refresh_token");
      cleanUrl.searchParams.delete("type");
      window.history.replaceState({}, document.title, cleanUrl.toString());
    }
  }, [mode]);

  const confirmForm = usePasswordResetConfirm(tokens, redirect);

  const effectiveMode =
    mode === "confirm" && tokens !== undefined && confirmForm.invalidToken ? ("invalid" as const) : mode;

  if (mode === "confirm" && tokens === undefined) {
    return (
      <AuthCard title="Checking your reset link">
        <p className="text-sm text-muted-foreground">Validating your reset link. This should only take a moment.</p>
      </AuthCard>
    );
  }

  if (effectiveMode === "invalid") {
    return (
      <AuthCard title="Reset link is invalid or expired">
        <PasswordResetInvalidState />
      </AuthCard>
    );
  }

  if (effectiveMode === "confirm") {
    return (
      <AuthCard title="Choose a new password" subtitle="Enter and confirm your new password.">
        <PasswordResetConfirmForm
          values={confirmForm.values}
          errors={confirmForm.errors}
          status={confirmForm.status}
          onChange={confirmForm.setField}
          onSubmit={async () => {
            await confirmForm.submit();
          }}
        />
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Reset your password" subtitle="Enter your email and we’ll send reset instructions.">
      <PasswordResetRequestForm
        values={requestForm.values}
        errors={requestForm.errors}
        status={requestForm.status}
        onChange={requestForm.setEmail}
        onSubmit={async () => {
          await requestForm.submit();
        }}
      />
    </AuthCard>
  );
};

export default PasswordResetView;
