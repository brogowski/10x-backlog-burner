import { Button } from "@/components/ui/button";

interface PasswordResetInvalidStateProps {
  message?: string;
}

const PasswordResetInvalidState = ({
  message = "Reset link is invalid or expired. Request a new one.",
}: PasswordResetInvalidStateProps) => {
  return (
    <div className="space-y-4">
      <p className="text-sm text-foreground/80">{message}</p>
      <Button asChild className="w-full">
        <a href="/reset-password">Request a new link</a>
      </Button>
    </div>
  );
};

export default PasswordResetInvalidState;
