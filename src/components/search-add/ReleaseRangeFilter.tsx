import { useMemo } from "react"

type ReleaseRangeFilterProps = {
  value: {
    releasedAfter?: string
    releasedBefore?: string
  }
  onChange: (value: { releasedAfter?: string; releasedBefore?: string }) => void
}

const ReleaseRangeFilter = ({ value, onChange }: ReleaseRangeFilterProps) => {
  const hasConflict = useMemo(() => {
    if (value.releasedAfter && value.releasedBefore) {
      return Date.parse(value.releasedAfter) > Date.parse(value.releasedBefore)
    }
    return false
  }, [value.releasedAfter, value.releasedBefore])

  const handleChange = (
    key: "releasedAfter" | "releasedBefore",
    nextValue: string,
  ) => {
    const sanitized = nextValue.trim().length ? nextValue : undefined
    onChange({ ...value, [key]: sanitized })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground/80">Release range</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1">
          <span className="text-xs text-foreground/70">Released after</span>
          <input
            type="date"
            value={value.releasedAfter ?? ""}
            onChange={(event) =>
              handleChange("releasedAfter", event.target.value)
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-foreground/70">Released before</span>
          <input
            type="date"
            value={value.releasedBefore ?? ""}
            onChange={(event) =>
              handleChange("releasedBefore", event.target.value)
            }
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
      </div>
      {hasConflict ? (
        <p className="text-sm text-destructive">
          Start date must be earlier than end date.
        </p>
      ) : null}
    </div>
  )
}

export default ReleaseRangeFilter

