import { useCallback } from "react"

type GenresMultiSelectProps = {
  selected: string[]
  options: string[]
  onChange: (next: string[]) => void
}

const GenresMultiSelect = ({
  selected,
  options,
  onChange,
}: GenresMultiSelectProps) => {
  const handleToggle = useCallback(
    (genre: string, checked: boolean) => {
      const next = checked
        ? [...selected, genre]
        : selected.filter((value) => value !== genre)
      onChange(next)
    },
    [onChange, selected],
  )

  const handleClear = useCallback(() => {
    onChange([])
  }, [onChange])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground/80">Genres</p>
        <button
          type="button"
          onClick={handleClear}
          disabled={selected.length === 0}
          className="text-sm text-foreground/70 underline-offset-2 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:text-foreground/40"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {options.map((genre) => {
          const isActive = selected.includes(genre)
          return (
            <label
              key={genre}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-sm shadow-sm transition hover:border-foreground/60 focus-within:outline-none focus-within:ring-2 focus-within:ring-ring"
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={isActive}
                onChange={(event) => handleToggle(genre, event.target.checked)}
              />
              <span
                className={`h-2 w-2 rounded-full ${isActive ? "bg-primary" : "bg-foreground/30"}`}
              />
              <span className="text-foreground/90">{genre}</span>
            </label>
          )
        })}
        {options.length === 0 ? (
          <p className="text-sm text-foreground/60">No genres available.</p>
        ) : null}
      </div>
    </div>
  )
}

export default GenresMultiSelect

