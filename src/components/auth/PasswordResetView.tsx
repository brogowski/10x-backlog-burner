import AuthCard from "@/components/auth/AuthCard"
import PasswordResetConfirmForm from "@/components/auth/PasswordResetConfirmForm"
import PasswordResetInvalidState from "@/components/auth/PasswordResetInvalidState"
import PasswordResetRequestForm from "@/components/auth/PasswordResetRequestForm"
import { usePasswordResetConfirm, usePasswordResetRequest } from "@/components/auth/usePasswordReset"
import type { PasswordResetMode } from "@/lib/auth/types"

export type PasswordResetViewProps = {
  mode: PasswordResetMode
  code?: string | null
  redirect?: string | null
}

const PasswordResetView = ({ mode, code, redirect }: PasswordResetViewProps) => {
  const requestForm = usePasswordResetRequest(redirect)
  const confirmForm = usePasswordResetConfirm(code ?? null, redirect)

  const effectiveMode =
    mode === "confirm" && confirmForm.invalidCode ? ("invalid" as const) : mode

  if (effectiveMode === "invalid") {
    return (
      <AuthCard title="Reset link is invalid or expired">
        <PasswordResetInvalidState />
      </AuthCard>
    )
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
            await confirmForm.submit()
          }}
        />
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we’ll send reset instructions."
    >
      <PasswordResetRequestForm
        values={requestForm.values}
        errors={requestForm.errors}
        status={requestForm.status}
        onChange={requestForm.setEmail}
        onSubmit={async () => {
          await requestForm.submit()
        }}
      />
    </AuthCard>
  )
}

export default PasswordResetView
