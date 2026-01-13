import ResultItem from "./ResultItem";
import type { AddStatus, CapState, GameCardVM } from "./types";

interface ResultsListProps {
  items: GameCardVM[];
  isLoading: boolean;
  error: string | null;
  addStatusById: Record<number, AddStatus>;
  capState: CapState;
  onRetry: () => void;
  onAddBacklog: (steamAppId: number) => void;
  onAddInProgress: (steamAppId: number) => void;
}

const ResultsList = ({
  items,
  isLoading,
  error,
  addStatusById,
  capState,
  onRetry,
  onAddBacklog,
  onAddInProgress,
}: ResultsListProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-3" aria-busy="true">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-24 rounded-lg border border-border bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <div className="flex items-center justify-between gap-3">
          <p>{error}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md border border-destructive/60 px-3 py-1 text-xs font-medium text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6 text-sm text-foreground/70">
        No games found. Try adjusting your search or filters.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <ResultItem
          key={item.steamAppId}
          item={item}
          addStatus={addStatusById[item.steamAppId] ?? "idle"}
          capState={capState}
          onAddBacklog={onAddBacklog}
          onAddInProgress={onAddInProgress}
        />
      ))}
    </div>
  );
};

export default ResultsList;
