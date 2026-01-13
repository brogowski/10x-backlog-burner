import { useMemo } from "react";

import type { SearchFiltersVM, SortOption } from "./types";

interface AppliedFiltersBarProps {
  filters: SearchFiltersVM;
  onRemove: (key: keyof SearchFiltersVM, value?: string) => void;
  onReset: () => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  popularity: "Popularity",
  release_date_desc: "Release date",
  title_asc: "Title A–Z",
};

const AppliedFiltersBar = ({ filters, onRemove, onReset }: AppliedFiltersBarProps) => {
  const hasFilters = useMemo(
    () =>
      Boolean(
        filters.search ||
          filters.genres.length ||
          filters.releasedAfter ||
          filters.releasedBefore ||
          filters.sort !== "popularity"
      ),
    [filters]
  );

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm text-foreground/90">
      {filters.search ? <FilterChip label={`Search: “${filters.search}”`} onRemove={() => onRemove("search")} /> : null}

      {filters.genres.map((genre) => (
        <FilterChip key={genre} label={genre} onRemove={() => onRemove("genres", genre)} />
      ))}

      {filters.releasedAfter ? (
        <FilterChip label={`After ${filters.releasedAfter}`} onRemove={() => onRemove("releasedAfter")} />
      ) : null}

      {filters.releasedBefore ? (
        <FilterChip label={`Before ${filters.releasedBefore}`} onRemove={() => onRemove("releasedBefore")} />
      ) : null}

      {filters.sort !== "popularity" ? (
        <FilterChip label={`Sort: ${SORT_LABELS[filters.sort]}`} onRemove={() => onRemove("sort")} />
      ) : null}

      <button
        type="button"
        onClick={onReset}
        className="ml-auto rounded-md border border-transparent px-2 py-1 text-xs font-medium text-foreground/80 underline-offset-2 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Reset all
      </button>
    </div>
  );
};

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

const FilterChip = ({ label, onRemove }: FilterChipProps) => (
  <span className="inline-flex items-center gap-2 rounded-full bg-background px-3 py-1 shadow-sm ring-1 ring-border">
    {label}
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Remove ${label}`}
      className="rounded-full px-1 text-xs text-foreground/70 transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      ×
    </button>
  </span>
);

export default AppliedFiltersBar;
