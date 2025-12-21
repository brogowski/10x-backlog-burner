import EmailInput from "@/components/auth/EmailInput"
import FormErrorAlert from "@/components/auth/FormErrorAlert"
import PasswordInput from "@/components/auth/PasswordInput"
import ResetPasswordLink from "@/components/auth/ResetPasswordLink"
import SubmitButton from "@/components/auth/SubmitButton"
import type {
  AuthFormErrorsLogin,
  AuthFormValuesLogin,
  AuthFormStatus,
} from "@/lib/auth/types"

type LoginFormProps = {
  values: AuthFormValuesLogin
  errors: AuthFormErrorsLogin
  status: AuthFormStatus
  onChange: (field: "email" | "password", value: string) => void
  onSubmit: (values: AuthFormValuesLogin) => Promise<void>
}

const LoginForm = ({ values, errors, status, onChange, onSubmit }: LoginFormProps) => {
  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault()
        void onSubmit(values)
      }}
      noValidate
    >
      <EmailInput
        id="login-email"
        value={values.email}
        error={errors.email}
        onChange={(value) => onChange("email", value)}
      />
      <PasswordInput
        id="login-password"
        label="Password"
        value={values.password}
        error={errors.password}
        onChange={(value) => onChange("password", value)}
      />

      <FormErrorAlert message={errors.general} />

      <SubmitButton label="Log in" isLoading={status.isSubmitting} disabled={status.isSubmitting} />

      <div className="text-center">
        <ResetPasswordLink />
      </div>
    </form>
  )
}

export default LoginForm
