import { useCallback, useEffect, useState } from "react";

import {
  confirmPasswordReset as confirmPasswordResetApi,
  requestPasswordReset as requestPasswordResetApi,
  type AuthApiError,
} from "@/lib/auth/authApi";
import type {
  AuthFormStatus,
  PasswordResetConfirmErrors,
  PasswordResetConfirmValues,
  PasswordResetRequestErrors,
  PasswordResetRequestValues,
  PasswordResetTokenParams,
  UsePasswordResetConfirmResult,
  UsePasswordResetRequestResult,
} from "@/lib/auth/types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const createStatus = (): AuthFormStatus => ({
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
});

const defaultRequestValues: PasswordResetRequestValues = {
  email: "",
};

const defaultConfirmValues: PasswordResetConfirmValues = {
  password: "",
  confirmPassword: "",
};

const isEmpty = (value: string) => value.trim().length === 0;

const validateEmail = (email: string): PasswordResetRequestErrors => {
  const errors: PasswordResetRequestErrors = {};
  if (isEmpty(email) || !EMAIL_REGEX.test(email.trim())) {
    errors.email = "Enter a valid email.";
  }
  return errors;
};

const validatePassword = (values: PasswordResetConfirmValues): PasswordResetConfirmErrors => {
  const errors: PasswordResetConfirmErrors = {};
  if (isEmpty(values.password) || values.password.length < MIN_PASSWORD) {
    errors.password = "Password must be at least 8 characters.";
  }
  if (isEmpty(values.confirmPassword) || values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords must match.";
  }
  return errors;
};

const redirectTo = (target?: string | null) => {
  const next = target || "/in-progress";
  window.location.assign(next);
};

const isInvalidResetToken = (tokens?: PasswordResetTokenParams | null) => {
  if (!tokens) return true;
  if (!tokens.accessToken || !tokens.refreshToken) return true;
  if (tokens.type && tokens.type !== "recovery") return true;
  return false;
};

export const usePasswordResetRequest = (): UsePasswordResetRequestResult => {
  const [values, setValues] = useState<PasswordResetRequestValues>(defaultRequestValues);
  const [errors, setErrors] = useState<PasswordResetRequestErrors>({});
  const [status, setStatus] = useState<AuthFormStatus>(createStatus);

  const setEmail = useCallback((value: string) => {
    setValues({ email: value });
    setErrors((prev) => {
      if (!prev.email) return prev;
      const { email: removed, ...next } = prev;
      void removed;
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (status.isSubmitting) return;
    const validationErrors = validateEmail(values.email);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setStatus((prev) => ({ ...prev, isSubmitting: true, submitError: null }));
    setErrors({});

    try {
      await requestPasswordResetApi(values);
      setStatus({ isSubmitting: false, submitError: null, submitSuccess: true });
    } catch (err) {
      const apiError = err as AuthApiError<string>;
      if (apiError.code === "validation_error") {
        setErrors({ email: apiError.message || "Enter a valid email." });
        setStatus({ isSubmitting: false, submitError: apiError.message, submitSuccess: false });
        return;
      }
      // Enumeration protection: treat other errors as success
      setStatus({ isSubmitting: false, submitError: null, submitSuccess: true });
    }
  }, [status.isSubmitting, values]);

  return {
    values,
    errors,
    status,
    setEmail,
    submit,
  };
};

export const usePasswordResetConfirm = (
  tokens: PasswordResetTokenParams | null | undefined,
  redirect?: string | null
): UsePasswordResetConfirmResult => {
  const [values, setValues] = useState<PasswordResetConfirmValues>(defaultConfirmValues);
  const [errors, setErrors] = useState<PasswordResetConfirmErrors>({});
  const [status, setStatus] = useState<AuthFormStatus>(createStatus);

  const [invalidToken, setInvalidToken] = useState<boolean>(tokens === undefined ? false : isInvalidResetToken(tokens));

  useEffect(() => {
    if (tokens === undefined) return;
    setInvalidToken(isInvalidResetToken(tokens));
  }, [tokens]);

  const setField = useCallback((field: "password" | "confirmPassword", value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: removed, ...next } = prev;
      void removed;
      return next;
    });
  }, []);

  const submit = useCallback(async () => {
    if (status.isSubmitting) return;
    if (tokens === undefined) return;
    const validationErrors = validatePassword(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    if (!tokens || isInvalidResetToken(tokens)) {
      setInvalidToken(true);
      setErrors({ general: "Reset link is invalid or expired. Request a new one." });
      return;
    }

    setStatus((prev) => ({ ...prev, isSubmitting: true, submitError: null }));
    setErrors({});

    try {
      await confirmPasswordResetApi({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        password: values.password,
        type: tokens.type,
      });
      setStatus({ isSubmitting: false, submitError: null, submitSuccess: true });
      redirectTo(redirect);
    } catch (err) {
      const apiError = err as AuthApiError<string>;
      if (apiError.code === "reset_invalid_or_expired") {
        setInvalidToken(true);
        setErrors({
          general: "Reset link is invalid or expired. Request a new one.",
        });
        setStatus({ isSubmitting: false, submitError: apiError.message, submitSuccess: false });
        return;
      }
      if (apiError.code === "validation_error") {
        setErrors({ general: apiError.message || "Check the form and try again." });
        setStatus({ isSubmitting: false, submitError: apiError.message, submitSuccess: false });
        return;
      }
      setErrors({ general: "Something went wrong. Please try again." });
      setStatus({ isSubmitting: false, submitError: "Something went wrong. Please try again.", submitSuccess: false });
    }
  }, [redirect, status.isSubmitting, tokens, values]);

  return {
    values,
    errors,
    status,
    invalidToken,
    submit,
    setField,
  };
};
