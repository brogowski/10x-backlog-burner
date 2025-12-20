import { useCallback } from "react"

import BacklogEmptyState from "@/components/backlog/BacklogEmptyState"
import BacklogList from "@/components/backlog/BacklogList"
import PaginationControl from "@/components/backlog/PaginationControl"
import AddGamesButton from "@/components/in-progress/AddGamesButton"
import InlineErrorBanner from "@/components/in-progress/InlineErrorBanner"
import { useBacklog } from "@/components/backlog/useBacklog"

const ADD_GAMES_PATH = "/backlog/add"

const BacklogPageView = () => {
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
  } = useBacklog()

  const handleAddGames = useCallback(() => {
    window.location.assign(ADD_GAMES_PATH)
  }, [])

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
          Review everything you own and move games into your in-progress queue when you’re ready to
          play.
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
    </section>
  )
}

export default BacklogPageView

