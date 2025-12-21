import FormErrorAlert from "@/components/auth/FormErrorAlert"
import PasswordInput from "@/components/auth/PasswordInput"
import PasswordRequirementsHint from "@/components/auth/PasswordRequirementsHint"
import SubmitButton from "@/components/auth/SubmitButton"
import type {
  AuthFormStatus,
  PasswordResetConfirmErrors,
  PasswordResetConfirmValues,
} from "@/lib/auth/types"

type PasswordResetConfirmFormProps = {
  values: PasswordResetConfirmValues
  errors: PasswordResetConfirmErrors
  status: AuthFormStatus
  onChange: (field: "password" | "confirmPassword", value: string) => void
  onSubmit: (values: PasswordResetConfirmValues) => Promise<void>
}

const PasswordResetConfirmForm = ({
  values,
  errors,
  status,
  onChange,
  onSubmit,
}: PasswordResetConfirmFormProps) => {
  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault()
        void onSubmit(values)
      }}
      noValidate
    >
      <div className="space-y-3">
        <PasswordInput
          id="reset-password"
          label="New password"
          value={values.password}
          error={errors.password}
          onChange={(value) => onChange("password", value)}
        />
        <PasswordRequirementsHint />
      </div>
      <PasswordInput
        id="reset-confirm-password"
        label="Confirm new password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(value) => onChange("confirmPassword", value)}
      />

      <FormErrorAlert message={errors.general} />

      <SubmitButton
        label="Update password"
        isLoading={status.isSubmitting}
        disabled={status.isSubmitting}
      />
    </form>
  )
}

export default PasswordResetConfirmForm
