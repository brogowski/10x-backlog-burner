import { useCallback, useMemo } from "react";
import type { KeyboardEvent, RefObject } from "react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

const MAX_LENGTH = 200;

const SearchInput = ({ value, onChange, onSubmit, isLoading, inputRef }: SearchInputProps) => {
  const trimmedValue = useMemo(() => value ?? "", [value]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }
    },
    [onSubmit]
  );

  const handleClear = useCallback(() => {
    onChange("");
    inputRef?.current?.focus();
  }, [inputRef, onChange]);

  return (
    <div className="flex items-center gap-3">
      <label className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-ring">
        <span className="text-sm font-medium text-foreground/80">Search</span>
        <input
          ref={inputRef}
          type="search"
          className="h-10 w-full flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/50"
          placeholder="Find games by title"
          value={trimmedValue}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={MAX_LENGTH}
        />
      </label>
      {trimmedValue ? (
        <button
          type="button"
          className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground/80 shadow-sm transition hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={handleClear}
        >
          Clear
        </button>
      ) : null}
      {isLoading ? (
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-foreground/40 border-t-transparent"
          role="status"
          aria-label="Loading search"
        />
      ) : null}
    </div>
  );
};

export default SearchInput;
