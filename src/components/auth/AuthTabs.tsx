import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type {
  AuthFormValuesLogin,
  AuthFormValuesSignup,
  AuthFormStatus,
  AuthMode,
} from "@/lib/auth/types"

import LoginForm from "./LoginForm"
import SignupForm from "./SignupForm"

type AuthTabsProps = {
  mode: AuthMode
  onChange: (mode: AuthMode) => void
  loginFormProps: {
    values: AuthFormValuesLogin
    errors: Record<string, string | undefined>
    status: AuthFormStatus
    onChange: (field: "email" | "password", value: string) => void
    onSubmit: (values: AuthFormValuesLogin) => Promise<void>
  }
  signupFormProps: {
    values: AuthFormValuesSignup
    errors: Record<string, string | undefined>
    status: AuthFormStatus
    onChange: (field: "email" | "password" | "confirmPassword", value: string) => void
    onSubmit: (values: AuthFormValuesSignup) => Promise<void>
  }
}

const AuthTabs = ({ mode, onChange, loginFormProps, signupFormProps }: AuthTabsProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Authentication tabs">
        <button
          type="button"
          role="tab"
          aria-selected={mode === "login"}
          className={cn(
            buttonVariants({ variant: mode === "login" ? "default" : "outline", size: "lg" }),
            "w-full",
          )}
          onClick={() => onChange("login")}
        >
          Log in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "signup"}
          className={cn(
            buttonVariants({ variant: mode === "signup" ? "default" : "outline", size: "lg" }),
            "w-full",
          )}
          onClick={() => onChange("signup")}
        >
          Sign up
        </button>
      </div>

      <div>
        {mode === "login" ? (
          <LoginForm
            values={loginFormProps.values}
            errors={loginFormProps.errors}
            status={loginFormProps.status}
            onChange={loginFormProps.onChange}
            onSubmit={loginFormProps.onSubmit}
          />
        ) : (
          <SignupForm
            values={signupFormProps.values}
            errors={signupFormProps.errors}
            status={signupFormProps.status}
            onChange={signupFormProps.onChange}
            onSubmit={signupFormProps.onSubmit}
          />
        )}
      </div>
    </div>
  )
}

export default AuthTabs
