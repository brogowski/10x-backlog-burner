import { useCallback, useMemo, useState } from "react"
import type { FormEvent } from "react"

import { login, signup, type AuthApiError } from "@/lib/auth/authApi"
import type {
  AuthFormErrorsLogin,
  AuthFormErrorsSignup,
  AuthFormStatus,
  AuthFormValuesLogin,
  AuthFormValuesSignup,
  AuthMode,
  UseAuthFormResult,
} from "@/lib/auth/types"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const createStatus = (): AuthFormStatus => ({
  isSubmitting: false,
  submitError: null,
  submitSuccess: false,
})

const defaultLoginValues: AuthFormValuesLogin = { email: "", password: "" }
const defaultSignupValues: AuthFormValuesSignup = {
  email: "",
  password: "",
  confirmPassword: "",
}

const isEmpty = (value: string) => value.trim().length === 0

const validateLogin = (values: AuthFormValuesLogin): AuthFormErrorsLogin => {
  const errors: AuthFormErrorsLogin = {}
  if (isEmpty(values.email) || !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email."
  }
  if (isEmpty(values.password) || values.password.length < 8) {
    errors.password = "Password must be at least 8 characters."
  }
  return errors
}

const validateSignup = (values: AuthFormValuesSignup): AuthFormErrorsSignup => {
  const errors: AuthFormErrorsSignup = {}
  if (isEmpty(values.email) || !EMAIL_REGEX.test(values.email.trim())) {
    errors.email = "Enter a valid email."
  }
  if (isEmpty(values.password) || values.password.length < 8) {
    errors.password = "Password must be at least 8 characters."
  }
  if (isEmpty(values.confirmPassword) || values.confirmPassword !== values.password) {
    errors.confirmPassword = "Passwords must match."
  }
  return errors
}

const redirectTo = (target?: string | null) => {
  const next = target || "/in-progress"
  window.location.assign(next)
}

const mapAuthError = (mode: AuthMode, error: AuthApiError<string>): string | undefined => {
  if (error.code === "invalid_credentials") {
    return "Invalid email or password."
  }
  if (mode === "signup" && error.code === "email_exists") {
    return "An account with that email already exists."
  }
  if (error.code === "validation_error") {
    return error.message || "Check the form and try again."
  }
  return "Something went wrong. Please try again."
}

const clearFieldError = <T extends Record<string, unknown>>(
  errors: Partial<Record<keyof T | "general", string>>,
  field: keyof T,
) => {
  if (!errors[field]) return errors
  const next = { ...errors }
  delete next[field]
  return next
}

export const useAuthForm = (
  mode: AuthMode,
  redirect?: string | null,
): UseAuthFormResult<AuthFormValuesLogin | AuthFormValuesSignup> => {
  const initialValues = useMemo(
    () => (mode === "login" ? defaultLoginValues : defaultSignupValues),
    [mode],
  )
  const [values, setValues] = useState<
    AuthFormValuesLogin | AuthFormValuesSignup
  >(initialValues)
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof values | "general", string>>
  >({})
  const [status, setStatus] = useState<AuthFormStatus>(createStatus)

  const setFieldValue = useCallback(
    <K extends keyof typeof values>(field: K, value: (typeof values)[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => clearFieldError(prev, field))
    },
    [],
  )

  const validate = useCallback(
    (current: typeof values) => {
      return mode === "login"
        ? validateLogin(current as AuthFormValuesLogin)
        : validateSignup(current as AuthFormValuesSignup)
    },
    [mode],
  )

  const submit = useCallback(
    async (provided?: typeof values) => {
      if (status.isSubmitting) return
      const payload = provided ?? values
      const validationErrors = validate(payload)
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors)
        return
      }

      setStatus((prev) => ({ ...prev, isSubmitting: true, submitError: null }))
      setErrors({})

      try {
        if (mode === "login") {
          await login(payload as AuthFormValuesLogin)
        } else {
          await signup(payload as AuthFormValuesSignup)
        }

        setStatus({ isSubmitting: false, submitError: null, submitSuccess: true })
        redirectTo(redirect)
      } catch (err) {
        const apiError = err as AuthApiError<string>
        const friendly = mapAuthError(mode, apiError)
        setErrors({ general: friendly })
        setStatus({ isSubmitting: false, submitError: friendly, submitSuccess: false })
      }
    },
    [mode, redirect, status.isSubmitting, validate, values],
  )

  const handleSubmit = useCallback(
    async (ev: FormEvent<HTMLFormElement>) => {
      ev.preventDefault()
      await submit(values)
    },
    [submit, values],
  )

  return {
    values,
    errors,
    status,
    setFieldValue,
    handleSubmit,
    submit,
  }
}
