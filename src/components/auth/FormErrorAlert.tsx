interface FormErrorAlertProps {
  message?: string | null;
}

const FormErrorAlert = ({ message }: FormErrorAlertProps) => {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      aria-live="assertive"
    >
      {message}
    </div>
  );
};

export default FormErrorAlert;
