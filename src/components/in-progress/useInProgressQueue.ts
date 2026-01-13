import { useCallback, useEffect, useMemo, useState } from "react";

import {
  IN_PROGRESS_CAP,
  type InProgressGameItemVM,
  type InProgressQueueVM,
  type RateLimitMetadata,
} from "@/lib/in-progress/types";
import {
  ApiError,
  completeUserGame,
  fetchInProgressQueue,
  reorderInProgress,
  updateUserGameStatus,
} from "@/lib/in-progress/inProgressApi";

type ActiveItemState = Record<number, "complete" | "remove" | "idle">;

interface UseInProgressQueueResult {
  queue: InProgressQueueVM | null;
  loading: boolean;
  error: string | null;
  rateLimit: RateLimitMetadata | null;
  isReordering: boolean;
  activeItemMutations: ActiveItemState;
  refetch: () => Promise<void>;
  reorderQueue: (items: InProgressGameItemVM[]) => Promise<void>;
  completeGame: (item: InProgressGameItemVM, payload: { achievementsUnlocked?: number }) => Promise<void>;
  removeToBacklog: (item: InProgressGameItemVM) => Promise<void>;
}

export const useInProgressQueue = (): UseInProgressQueueResult => {
  const [queue, setQueue] = useState<InProgressQueueVM | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitMetadata | null>(null);
  const [isReordering, setIsReordering] = useState<boolean>(false);
  const [activeItemMutations, setActiveItemMutations] = useState<ActiveItemState>({});

  const updateQueueMetadata = useCallback((items: InProgressGameItemVM[]): InProgressQueueVM => {
    const total = items.length;
    return {
      items,
      total,
      cap: IN_PROGRESS_CAP,
      isAtCap: total >= IN_PROGRESS_CAP,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    try {
      const { queue: nextQueue, rateLimit: nextRateLimit } = await fetchInProgressQueue(controller.signal);
      setQueue(nextQueue);
      setRateLimit(nextRateLimit);
    } catch (err) {
      if (err instanceof ApiError) {
        setRateLimit(err.rateLimit ?? null);
        setError(err.message);
        return;
      }

      setError("Unable to load your in-progress queue. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const reorderQueue = useCallback(
    async (items: InProgressGameItemVM[]) => {
      if (!items.length) {
        return;
      }

      setIsReordering(true);
      setError(null);

      const previousQueue = queue;
      const normalizedItems = items.map((item, index) => ({
        ...item,
        position: index + 1,
      }));

      setQueue(updateQueueMetadata(normalizedItems));

      try {
        await reorderInProgress({
          items: normalizedItems.map((item) => ({
            steamAppId: item.steamAppId,
            position: item.position,
          })),
        });
      } catch (err) {
        if (previousQueue) {
          setQueue(previousQueue);
        }

        if (err instanceof ApiError) {
          setRateLimit(err.rateLimit ?? null);
          setError(err.message);
          return;
        }

        setError("We couldn’t update the queue. Please try again.");
      } finally {
        setIsReordering(false);
      }
    },
    [queue, updateQueueMetadata]
  );

  const setItemState = useCallback((steamAppId: number, state: ActiveItemState[number]) => {
    setActiveItemMutations((prev) => ({ ...prev, [steamAppId]: state }));
  }, []);

  const completeGame = useCallback(
    async (item: InProgressGameItemVM, payload: { achievementsUnlocked?: number }) => {
      if (!queue) return;

      setItemState(item.steamAppId, "complete");
      setError(null);

      const nextItems = queue.items.filter((candidate) => candidate.steamAppId !== item.steamAppId);
      const previousQueue = queue;
      setQueue(updateQueueMetadata(nextItems.map((candidate, idx) => ({ ...candidate, position: idx + 1 }))));

      try {
        await completeUserGame({ steamAppId: item.steamAppId, achievementsUnlocked: payload.achievementsUnlocked });
      } catch (err) {
        setQueue(previousQueue);
        if (err instanceof ApiError) {
          setRateLimit(err.rateLimit ?? null);
          setError(err.message);
        } else {
          setError("We couldn’t complete the game. Please try again.");
        }
      } finally {
        setItemState(item.steamAppId, "idle");
      }
    },
    [queue, setItemState, updateQueueMetadata]
  );

  const removeToBacklog = useCallback(
    async (item: InProgressGameItemVM) => {
      if (!queue) return;

      setItemState(item.steamAppId, "remove");
      setError(null);

      const nextItems = queue.items.filter((candidate) => candidate.steamAppId !== item.steamAppId);
      const previousQueue = queue;
      setQueue(updateQueueMetadata(nextItems.map((candidate, idx) => ({ ...candidate, position: idx + 1 }))));

      try {
        await updateUserGameStatus(item.steamAppId, {
          status: "backlog",
          inProgressPosition: null,
        });
      } catch (err) {
        setQueue(previousQueue);
        if (err instanceof ApiError) {
          setRateLimit(err.rateLimit ?? null);
          setError(err.message);
        } else {
          setError("We couldn’t update the game. Please try again.");
        }
      } finally {
        setItemState(item.steamAppId, "idle");
      }
    },
    [queue, setItemState, updateQueueMetadata]
  );

  useEffect(() => {
    load();
  }, [load]);

  const value: UseInProgressQueueResult = useMemo(
    () => ({
      queue,
      loading,
      error,
      rateLimit,
      isReordering,
      activeItemMutations,
      refetch: load,
      reorderQueue,
      completeGame,
      removeToBacklog,
    }),
    [
      activeItemMutations,
      completeGame,
      error,
      isReordering,
      load,
      loading,
      queue,
      rateLimit,
      removeToBacklog,
      reorderQueue,
    ]
  );

  return value;
};
