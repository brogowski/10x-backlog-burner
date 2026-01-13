import { useCallback, useEffect, useState } from "react";

import BacklogEmptyState from "@/components/backlog/BacklogEmptyState";
import BacklogList from "@/components/backlog/BacklogList";
import PaginationControl from "@/components/backlog/PaginationControl";
import AddGamesButton from "@/components/in-progress/AddGamesButton";
import InlineErrorBanner from "@/components/in-progress/InlineErrorBanner";
import SearchAddModal from "@/components/search-add/SearchAddModal";
import { useBacklog } from "@/components/backlog/useBacklog";
import { fetchInProgressCount } from "@/lib/backlog/backlogApi";
import { IN_PROGRESS_CAP } from "@/lib/in-progress/types";
import type { CapState } from "@/components/search-add/types";

const BacklogPageView = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [capState, setCapState] = useState<CapState>({
    max: IN_PROGRESS_CAP,
    current: 0,
    canAdd: true,
    notice: undefined,
  });

  const {
    backlog,
    loading,
    loadingMore,
    error,
    rateLimit,
    refetch,
    loadMore,
    addToInProgress,
    removeFromBacklog,
    activeItemMutations,
  } = useBacklog();

  const handleAddGames = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchOpen(false);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!isSearchOpen) return;
    const controller = new AbortController();

    const loadCap = async () => {
      try {
        const { count } = await fetchInProgressCount(controller.signal);
        const next = {
          max: IN_PROGRESS_CAP,
          current: count,
          canAdd: count < IN_PROGRESS_CAP,
          notice:
            count >= IN_PROGRESS_CAP ? "Your in-progress queue is full. Finish a game to add another." : undefined,
        };
        setCapState(next);
      } catch {
        // Keep default cap state; errors are non-blocking.
      }
    };

    loadCap();
    return () => controller.abort();
  }, [isSearchOpen]);

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-foreground/70">Backlog</p>
            <h1 className="text-2xl font-semibold md:text-3xl">Your backlog</h1>
          </div>
          <AddGamesButton onClick={handleAddGames} disabled={false} />
        </div>
        <p className="max-w-2xl text-base text-foreground/80">
          Review everything you own and move games into your in-progress queue when you’re ready to play.
        </p>
      </header>

      {loading && !backlog ? (
        <div
          className="rounded-lg border border-border bg-muted/50 p-6 text-sm text-foreground/80"
          role="status"
          aria-live="polite"
        >
          Loading your backlog...
        </div>
      ) : (
        <>
          {error ? (
            <div aria-live="polite">
              <InlineErrorBanner message={error} rateLimit={rateLimit} onRetry={refetch} />
            </div>
          ) : null}

          {backlog && backlog.items.length > 0 ? (
            <div className="space-y-4">
              <BacklogList
                items={backlog.items}
                onAddToInProgress={addToInProgress}
                onRemove={removeFromBacklog}
                activeItemMutations={activeItemMutations}
              />
              <PaginationControl
                hasMore={backlog.hasMore}
                isLoadingMore={loadingMore}
                loadedCount={backlog.items.length}
                total={backlog.total}
                onLoadMore={loadMore}
              />
            </div>
          ) : backlog ? (
            <BacklogEmptyState onAddClick={handleAddGames} />
          ) : null}
        </>
      )}

      <SearchAddModal isOpen={isSearchOpen} onClose={handleCloseSearch} capState={capState} />
    </section>
  );
};

export default BacklogPageView;
