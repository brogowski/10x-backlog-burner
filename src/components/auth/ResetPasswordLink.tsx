const ResetPasswordLink = ({ className }: { className?: string }) => {
  return (
    <a href="/reset-password" className={className ?? "text-sm font-medium text-primary hover:underline"}>
      Forgot your password?
    </a>
  );
};

export default ResetPasswordLink;
