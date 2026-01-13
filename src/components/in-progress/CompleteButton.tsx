import { useState } from "react";

import { Button } from "@/components/ui/button";

export interface CompleteUserGameViewPayload {
  achievementsUnlocked?: number;
}

interface CompleteButtonProps {
  onConfirm: (payload: CompleteUserGameViewPayload) => void;
  achievementsTotal?: number | null;
  isLoading?: boolean;
}

const CompleteButton = ({ onConfirm, achievementsTotal, isLoading }: CompleteButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setValue("");
    setError(null);
  };

  const validate = (raw: string): number | null => {
    if (!raw.trim()) {
      return null;
    }

    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError("Enter a non-negative integer.");
      return null;
    }

    if (typeof achievementsTotal === "number" && parsed > achievementsTotal) {
      setError("Unlocked cannot exceed total achievements.");
      return null;
    }

    return parsed;
  };

  const handleSubmit = () => {
    const parsed = validate(value);
    if (value.trim() && parsed === null) {
      return;
    }

    onConfirm(parsed === null ? {} : { achievementsUnlocked: parsed });
    setIsOpen(false);
    reset();
  };

  return (
    <div className="relative">
      <Button size="sm" onClick={() => setIsOpen((open) => !open)} disabled={isLoading}>
        Complete
      </Button>

      {isOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute right-0 z-10 mt-2 w-64 rounded-lg border border-border bg-background p-4 shadow-lg"
        >
          <div className="space-y-3 text-sm">
            <p className="font-medium text-foreground">Mark as completed</p>
            <label className="space-y-1">
              <span className="text-xs text-foreground/70">Achievements unlocked (optional)</span>
              <input
                type="number"
                min={0}
                max={achievementsTotal ?? undefined}
                value={value}
                onChange={(event) => {
                  setValue(event.target.value);
                  setError(null);
                }}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-invalid={Boolean(error)}
              />
            </label>
            {achievementsTotal ? (
              <p className="text-xs text-foreground/60">Total achievements: {achievementsTotal}</p>
            ) : null}
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  reset();
                }}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={isLoading}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CompleteButton;
