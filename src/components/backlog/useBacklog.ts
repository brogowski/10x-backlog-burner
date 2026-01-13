import { useCallback, useEffect, useMemo, useState } from "react";

import { addToInProgress, fetchBacklogPageVM, removeFromBacklog } from "@/lib/backlog/backlogApi";
import type { BacklogGameItemVM, BacklogPageVM, UseBacklogResult } from "@/lib/backlog/types";
import { ApiError } from "@/lib/in-progress/inProgressApi";
import type { RateLimitMetadata } from "@/lib/in-progress/types";

type ActiveItemState = Record<number, "addToInProgress" | "remove" | "idle">;

const buildBacklogMeta = (
  items: BacklogGameItemVM[],
  total: number,
  page: number,
  pageSize: number
): BacklogPageVM => ({
  items,
  total,
  page,
  pageSize,
  hasMore: items.length < total,
});

export const useBacklog = (): UseBacklogResult => {
  const [backlog, setBacklog] = useState<BacklogPageVM | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitMetadata | null>(null);
  const [activeItemMutations, setActiveItemMutations] = useState<ActiveItemState>({});

  const setItemState = useCallback((steamAppId: number, state: ActiveItemState[number]) => {
    setActiveItemMutations((prev) => ({ ...prev, [steamAppId]: state }));
  }, []);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { backlog: pageVm, rateLimit: nextRateLimit } = await fetchBacklogPageVM(1);
      setBacklog(pageVm);
      setRateLimit(nextRateLimit);
    } catch (err) {
      if (err instanceof ApiError) {
        setRateLimit(err.rateLimit ?? null);
        setError(err.message);
      } else {
        setError("Unable to load your backlog. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    await loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (loadingMore) return;
    if (!backlog || !backlog.hasMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = backlog.page + 1;
      const { backlog: merged, rateLimit: nextRateLimit } = await fetchBacklogPageVM(nextPage, backlog);
      setBacklog(merged);
      setRateLimit(nextRateLimit);
    } catch (err) {
      if (err instanceof ApiError) {
        setRateLimit(err.rateLimit ?? null);
        setError(err.message);
      } else {
        setError("We couldn’t load more games. Please try again.");
      }
    } finally {
      setLoadingMore(false);
    }
  }, [backlog, loadingMore]);

  const addToInProgressHandler = useCallback(
    async (item: BacklogGameItemVM) => {
      if (!backlog) return;

      setItemState(item.steamAppId, "addToInProgress");
      setError(null);

      const previous = backlog;
      const filtered = backlog.items.filter((candidate) => candidate.steamAppId !== item.steamAppId);
      const nextTotal = Math.max(backlog.total - 1, filtered.length);
      setBacklog(buildBacklogMeta(filtered, nextTotal, backlog.page, backlog.pageSize));

      try {
        await addToInProgress(item.steamAppId);
      } catch (err) {
        setBacklog(previous);

        if (err instanceof ApiError) {
          setRateLimit(err.rateLimit ?? null);
          if (err.status === 409) {
            setError("Your in-progress queue is full. Remove a game there to add new ones.");
          } else {
            setError(err.message);
          }
        } else {
          setError("We couldn’t move that game. Please try again.");
        }
      } finally {
        setItemState(item.steamAppId, "idle");
      }
    },
    [backlog, setItemState]
  );

  const removeFromBacklogHandler = useCallback(
    async (item: BacklogGameItemVM) => {
      if (!backlog) return;

      setItemState(item.steamAppId, "remove");
      setError(null);

      const previous = backlog;
      const filtered = backlog.items.filter((candidate) => candidate.steamAppId !== item.steamAppId);
      const nextTotal = Math.max(backlog.total - 1, filtered.length);
      setBacklog(buildBacklogMeta(filtered, nextTotal, backlog.page, backlog.pageSize));

      try {
        await removeFromBacklog(item.steamAppId);
      } catch (err) {
        setBacklog(previous);

        if (err instanceof ApiError) {
          setRateLimit(err.rateLimit ?? null);
          setError(err.message);
        } else {
          setError("We couldn’t remove that game. Please try again.");
        }
      } finally {
        setItemState(item.steamAppId, "idle");
      }
    },
    [backlog, setItemState]
  );

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const value: UseBacklogResult = useMemo(
    () => ({
      backlog,
      loading,
      loadingMore,
      error,
      rateLimit,
      activeItemMutations,
      refetch,
      loadMore,
      addToInProgress: addToInProgressHandler,
      removeFromBacklog: removeFromBacklogHandler,
    }),
    [
      activeItemMutations,
      addToInProgressHandler,
      backlog,
      error,
      loading,
      loadingMore,
      rateLimit,
      refetch,
      loadMore,
      removeFromBacklogHandler,
    ]
  );

  return value;
};
