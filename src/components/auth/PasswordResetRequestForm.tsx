import EmailInput from "@/components/auth/EmailInput";
import FormErrorAlert from "@/components/auth/FormErrorAlert";
import FormSuccessNotice from "@/components/auth/FormSuccessNotice";
import SubmitButton from "@/components/auth/SubmitButton";
import type { AuthFormStatus, PasswordResetRequestErrors, PasswordResetRequestValues } from "@/lib/auth/types";

interface PasswordResetRequestFormProps {
  values: PasswordResetRequestValues;
  errors: PasswordResetRequestErrors;
  status: AuthFormStatus;
  onChange: (value: string) => void;
  onSubmit: (values: PasswordResetRequestValues) => Promise<void>;
}

const PasswordResetRequestForm = ({ values, errors, status, onChange, onSubmit }: PasswordResetRequestFormProps) => {
  return (
    <form
      className="space-y-4"
      onSubmit={(ev) => {
        ev.preventDefault();
        void onSubmit(values);
      }}
      noValidate
    >
      <EmailInput id="reset-email" value={values.email} error={errors.email} onChange={onChange} />

      <FormErrorAlert message={errors.general} />
      <FormSuccessNotice
        message={status.submitSuccess ? "If that email exists, we’ve sent reset instructions." : undefined}
      />

      <SubmitButton label="Send reset link" isLoading={status.isSubmitting} disabled={status.isSubmitting} />
    </form>
  );
};

export default PasswordResetRequestForm;
