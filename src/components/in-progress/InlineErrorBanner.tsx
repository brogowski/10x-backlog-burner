import { Button } from "@/components/ui/button";
import type { RateLimitMetadata } from "@/lib/in-progress/types";

interface InlineErrorBannerProps {
  message: string;
  rateLimit?: RateLimitMetadata | null;
  onRetry?: () => void;
}

const InlineErrorBanner = ({ message, rateLimit, onRetry }: InlineErrorBannerProps) => {
  const retryTime =
    rateLimit?.reset && Number.isFinite(rateLimit.reset) ? new Date(rateLimit.reset * 1000).toLocaleTimeString() : null;

  return (
    <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
      <p>{message}</p>
      {retryTime ? <p className="text-foreground/70">Please retry after {retryTime}.</p> : null}
      {onRetry ? (
        <Button onClick={onRetry} variant="outline" size="sm">
          Retry
        </Button>
      ) : null}
    </div>
  );
};

export default InlineErrorBanner;
