import type { FormEvent } from "react"

export type AuthMode = "login" | "signup"

export type AuthFormValuesLogin = {
  email: string
  password: string
}

export type AuthFormValuesSignup = {
  email: string
  password: string
  confirmPassword: string
}

export type AuthFormErrorsLogin = {
  email?: string
  password?: string
  general?: string
}

export type AuthFormErrorsSignup = {
  email?: string
  password?: string
  confirmPassword?: string
  general?: string
}

export type AuthFormStatus = {
  isSubmitting: boolean
  submitError?: string | null
  submitSuccess?: boolean
}

export type UseAuthFormResult<TValues extends Record<string, unknown>> = {
  values: TValues
  errors: Partial<Record<keyof TValues | "general", string>>
  status: AuthFormStatus
  setFieldValue: <K extends keyof TValues>(field: K, value: TValues[K]) => void
  handleSubmit: (ev: FormEvent<HTMLFormElement>) => void
  submit: (values?: TValues) => Promise<void>
}

export type PasswordResetMode = "request" | "confirm" | "invalid"

export type PasswordResetRequestValues = {
  email: string
}

export type PasswordResetRequestErrors = {
  email?: string
  general?: string
}

export type PasswordResetConfirmValues = {
  password: string
  confirmPassword: string
}

export type PasswordResetConfirmErrors = {
  password?: string
  confirmPassword?: string
  general?: string
}

export type UsePasswordResetRequestResult = {
  values: PasswordResetRequestValues
  errors: PasswordResetRequestErrors
  status: AuthFormStatus
  setEmail: (value: string) => void
  submit: () => Promise<void>
}

export type UsePasswordResetConfirmResult = {
  values: PasswordResetConfirmValues
  errors: PasswordResetConfirmErrors
  status: AuthFormStatus
  invalidCode: boolean
  submit: () => Promise<void>
  setField: (field: "password" | "confirmPassword", value: string) => void
}
