import { useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";

import AppliedFiltersBar from "./AppliedFiltersBar";
import GenresMultiSelect from "./GenresMultiSelect";
import PaginationControls from "./PaginationControls";
import ResultsList from "./ResultsList";
import ReleaseRangeFilter from "./ReleaseRangeFilter";
import SearchInput from "./SearchInput";
import SortSelect from "./SortSelect";
import type { CapState, SearchFiltersVM, SortOption } from "./types";
import { useAddUserGame } from "./useAddUserGame";
import { useCatalogSearch } from "./useCatalogSearch";
import { useUserGameMembership } from "./useUserGameMembership";
import { DEFAULT_FILTERS, useUrlFiltersSync } from "./useUrlFiltersSync";
import { Button } from "@/components/ui/button";

interface SearchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  capState: CapState;
  initialFilters?: Partial<SearchFiltersVM>;
  genreOptions?: string[];
}

const FALLBACK_GENRES = ["Action", "Adventure", "RPG", "Strategy", "Indie", "Simulation", "Sports", "Puzzle"] as const;

const SearchAddModal = ({ isOpen, onClose, capState, initialFilters, genreOptions }: SearchAddModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { filters, updateFilters, resetFilters } = useUrlFiltersSync(initialFilters);
  const { results, loading, error, rateLimit, refetch } = useCatalogSearch(filters);
  const { addStatusById, addToBacklog, addToInProgress, error: addError } = useAddUserGame(capState);
  const {
    statusById: membershipStatusById,
    loading: membershipLoading,
    error: membershipError,
  } = useUserGameMembership(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      searchInputRef.current?.focus();
    }
  }, [isOpen]);

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateFilters({ search: value, page: 1 }, { resetPage: true });
    },
    [updateFilters]
  );

  const handleSearchSubmit = useCallback(() => {
    updateFilters((prev) => ({ search: prev.search, page: 1 }), { resetPage: true });
    refetch();
  }, [refetch, updateFilters]);

  const handleGenresChange = useCallback(
    (next: string[]) => {
      updateFilters({ genres: next, page: 1 }, { resetPage: true });
    },
    [updateFilters]
  );

  const handleReleaseChange = useCallback(
    (value: { releasedAfter?: string; releasedBefore?: string }) => {
      updateFilters({ ...value, page: 1 }, { resetPage: true });
    },
    [updateFilters]
  );

  const handleSortChange = useCallback(
    (next: SortOption) => updateFilters({ sort: next, page: 1 }, { resetPage: true }),
    [updateFilters]
  );

  const handleRemoveFilter = useCallback(
    (key: keyof SearchFiltersVM, value?: string) => {
      if (key === "genres" && value) {
        updateFilters(
          (prev) => ({
            genres: prev.genres.filter((genre) => genre !== value),
            page: 1,
          }),
          { resetPage: true }
        );
        return;
      }

      const resetMap: Partial<SearchFiltersVM> = {
        search: "",
        releasedAfter: undefined,
        releasedBefore: undefined,
        sort: DEFAULT_FILTERS.sort,
        genres: [],
      };

      updateFilters(
        (prev) => ({
          ...prev,
          [key]: resetMap[key as keyof typeof resetMap],
          page: 1,
        }),
        { resetPage: true }
      );
    },
    [updateFilters]
  );

  const handleResetFilters = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  const genresList = useMemo(() => genreOptions ?? Array.from(FALLBACK_GENRES), [genreOptions]);

  const resultItems = useMemo(
    () =>
      results?.results.map((item) => {
        const membershipStatus = membershipStatusById[item.steamAppId];
        const isInProgress = membershipStatus === "in_progress";
        const isInBacklog = membershipStatus === "backlog";

        return {
          ...item,
          isInBacklog,
          isInProgress,
          addDisabledReason: isInProgress
            ? "This game is already in your in-progress queue."
            : isInBacklog
              ? "This game is already in your backlog."
              : undefined,
        };
      }) ?? [],
    [membershipStatusById, results?.results]
  );

  if (!isOpen) {
    return null;
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 sm:py-10"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search and add games"
        className="flex w-full max-w-5xl max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-border"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6 sm:py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">Catalog search</p>
            <h2 className="text-xl font-semibold text-foreground">Add games</h2>
            <p className="text-sm text-foreground/80">
              Find games to move into your backlog or in-progress queue. In-progress cap:{" "}
              <strong>{capState.current}</strong> / <strong>{capState.max}</strong>
            </p>
          </div>
          <Button variant="outline" onClick={onClose} aria-label="Close search modal">
            Close
          </Button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
          <SearchInput
            value={filters.search}
            onChange={handleSearchChange}
            onSubmit={handleSearchSubmit}
            inputRef={searchInputRef}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <GenresMultiSelect selected={filters.genres} options={genresList} onChange={handleGenresChange} />
            </div>
            <div className="lg:col-span-2 grid gap-4">
              <ReleaseRangeFilter
                value={{
                  releasedAfter: filters.releasedAfter,
                  releasedBefore: filters.releasedBefore,
                }}
                onChange={handleReleaseChange}
              />
              <SortSelect value={filters.sort} onChange={handleSortChange} />
            </div>
          </div>

          <AppliedFiltersBar filters={filters} onRemove={handleRemoveFilter} onReset={handleResetFilters} />

          {(rateLimit?.isRateLimited || addError || membershipError) && (
            <div className="rounded-lg border border-amber-200/70 bg-amber-100/60 px-4 py-3 text-sm text-amber-900">
              {rateLimit?.isRateLimited
                ? "You have hit the request limit. Please wait before trying again."
                : (addError ?? membershipError)}
            </div>
          )}

          <ResultsList
            items={resultItems}
            isLoading={loading || membershipLoading}
            error={error}
            addStatusById={addStatusById}
            capState={capState}
            onRetry={refetch}
            onAddBacklog={addToBacklog}
            onAddInProgress={addToInProgress}
          />

          {results?.total ? (
            <PaginationControls
              page={filters.page}
              pageSize={filters.pageSize}
              total={results.total}
              onPageChange={(nextPage) => {
                const safePage = Math.max(1, Math.min(nextPage, Math.ceil(results.total / filters.pageSize)));
                updateFilters({ page: safePage });
              }}
              onPageSizeChange={(nextSize) => {
                const clamped = Math.min(Math.max(nextSize, 1), 100);
                updateFilters({ pageSize: clamped }, { resetPage: true });
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default SearchAddModal;
