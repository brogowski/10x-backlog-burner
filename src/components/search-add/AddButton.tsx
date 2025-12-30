import { cn } from "@/lib/utils"

import type { AddStatus, CapState } from "./types"

type AddButtonProps = {
  mode: "backlog" | "inProgress"
  status: AddStatus
  capState?: CapState
  disabledReason?: string
  onClick: () => void
}

const AddButton = ({
  mode,
  status,
  capState,
  disabledReason,
  onClick,
}: AddButtonProps) => {
  const isPending = status === "pending"
  const isSuccess = status === "success"
  const isDisabled =
    isPending || isSuccess || !!disabledReason || (mode === "inProgress" && capState && !capState.canAdd)

  const label =
    mode === "backlog"
      ? isSuccess
        ? "Added"
        : "Add to backlog"
      : isSuccess
        ? "Added to in-progress"
        : "Add to in-progress"

  const reason =
    disabledReason ??
    (mode === "inProgress" && capState && !capState.canAdd
      ? capState.notice ?? "In-progress queue is full."
      : undefined)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        mode === "backlog"
          ? "bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/60"
          : "border border-border bg-background text-foreground hover:bg-muted disabled:bg-muted/60",
      )}
      aria-disabled={isDisabled}
      aria-label={label}
      title={reason}
    >
      {isPending ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent" />
      ) : null}
      <span>{label}</span>
    </button>
  )
}

export default AddButton

