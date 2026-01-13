interface FormSuccessNoticeProps {
  message?: string | null;
}

const FormSuccessNotice = ({ message }: FormSuccessNoticeProps) => {
  if (!message) return null;
  return (
    <div
      role="status"
      className="rounded-md border border-emerald-500/60 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700"
      aria-live="polite"
    >
      {message}
    </div>
  );
};

export default FormSuccessNotice;
