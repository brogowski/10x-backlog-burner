import type { SortOption } from "./types";

interface SortSelectProps {
  value: SortOption;
  onChange: (next: SortOption) => void;
}

const SORT_LABELS: Record<SortOption, string> = {
  popularity: "Popularity",
  release_date_desc: "Release date (newest)",
  title_asc: "Title (A–Z)",
};

const SortSelect = ({ value, onChange }: SortSelectProps) => {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground/80">Sort by</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortOption)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {Object.entries(SORT_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default SortSelect;
