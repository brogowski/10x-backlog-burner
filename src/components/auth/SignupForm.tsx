import EmailInput from "@/components/auth/EmailInput";
import FormErrorAlert from "@/components/auth/FormErrorAlert";
import PasswordInput from "@/components/auth/PasswordInput";
import PasswordRequirementsHint from "@/components/auth/PasswordRequirementsHint";
import SubmitButton from "@/components/auth/SubmitButton";
import type { AuthFormErrorsSignup, AuthFormStatus, AuthFormValuesSignup } from "@/lib/auth/types";

interface SignupFormProps {
  values: AuthFormValuesSignup;
  errors: AuthFormErrorsSignup;
  status: AuthFormStatus;
  onChange: (field: "email" | "password" | "confirmPassword", value: string) => void;
  onSubmit: (values: AuthFormValuesSignup) => Promise<void>;
}

const SignupForm = ({ values, errors, status, onChange, onSubmit }: SignupFormProps) => {
  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        void onSubmit(values);
      }}
      noValidate
    >
      <EmailInput
        id="signup-email"
        value={values.email}
        error={errors.email}
        onChange={(value) => onChange("email", value)}
      />
      <div className="space-y-3">
        <PasswordInput
          id="signup-password"
          label="Password"
          value={values.password}
          error={errors.password}
          onChange={(value) => onChange("password", value)}
        />
        <PasswordRequirementsHint />
      </div>
      <PasswordInput
        id="signup-confirm-password"
        label="Confirm password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(value) => onChange("confirmPassword", value)}
      />

      <FormErrorAlert message={errors.general} />

      <SubmitButton label="Create account" isLoading={status.isSubmitting} disabled={status.isSubmitting} />
    </form>
  );
};

export default SignupForm;
