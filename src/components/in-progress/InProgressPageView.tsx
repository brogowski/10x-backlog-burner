import { useCallback, useMemo } from "react"

import AddGamesButton from "@/components/in-progress/AddGamesButton"
import EmptyState from "@/components/in-progress/EmptyState"
import HeaderCapBadge from "@/components/in-progress/HeaderCapBadge"
import InlineErrorBanner from "@/components/in-progress/InlineErrorBanner"
import InProgressList from "@/components/in-progress/InProgressList"
import { useInProgressQueue } from "@/components/in-progress/useInProgressQueue"
import type { InProgressGameItemVM } from "@/lib/in-progress/types"

const InProgressPageView = () => {
  const {
    queue,
    loading,
    error,
    rateLimit,
    refetch,
    reorderQueue,
    isReordering,
    completeGame,
    removeToBacklog,
    activeItemMutations,
  } = useInProgressQueue()

  const headerCopy = useMemo(() => {
    if (!queue) {
      return "Track the games you’re actively playing."
    }

    return queue.isAtCap
      ? "You’ve reached the in-progress cap. Finish a game to add another."
      : "Keep your active games organized and finish faster."
  }, [queue])

  const handleAddGames = useCallback(() => {
    window.location.assign("/")
  }, [])

  const handleReorder = useCallback(
    (items: InProgressGameItemVM[]) => {
      reorderQueue(items)
    },
    [reorderQueue],
  )

  const handleComplete = useCallback(
    (item: InProgressGameItemVM, payload: { achievementsUnlocked?: number }) => {
      completeGame(item, payload)
    },
    [completeGame],
  )

  const handleRemove = useCallback(
    (item: InProgressGameItemVM) => {
      removeToBacklog(item)
    },
    [removeToBacklog],
  )

  return (
    <section className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-10">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-foreground/70">
              In-progress queue
            </p>
            <h1 className="text-2xl font-semibold md:text-3xl">Currently playing</h1>
          </div>
          <HeaderCapBadge currentCount={queue?.total ?? 0} cap={queue?.cap ?? 5} />
        </div>
        <p className="max-w-2xl text-base text-foreground/80">{headerCopy}</p>

        <div className="flex flex-wrap gap-3">
          <AddGamesButton onClick={handleAddGames} disabled={Boolean(queue?.isAtCap)} />
        </div>
      </header>

      {loading ? (
        <div className="rounded-lg border border-border bg-muted/50 p-6 text-sm text-foreground/80">
          Loading your in-progress games...
        </div>
      ) : error ? (
        <InlineErrorBanner message={error} rateLimit={rateLimit} onRetry={refetch} />
      ) : queue && queue.items.length > 0 ? (
        <InProgressList
          items={queue.items}
          isReordering={isReordering}
          onReorder={handleReorder}
          onComplete={handleComplete}
          onRemove={handleRemove}
          activeItemMutations={activeItemMutations}
        />
      ) : (
        <EmptyState onAddClick={handleAddGames} isAtCap={Boolean(queue?.isAtCap)} />
      )}
    </section>
  )
}

export default InProgressPageView

