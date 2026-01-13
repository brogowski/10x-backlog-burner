import { useCallback, useState } from "react";

import { buildAuthHeaders, defaultJsonHeaders, parseRateLimitHeaders } from "@/lib/in-progress/inProgressApi";

import type { AddStatus, CapState, RateLimitState } from "./types";

interface UseAddUserGameResult {
  addStatusById: Record<number, AddStatus>;
  error: string | null;
  rateLimit: RateLimitState | null;
  addToBacklog: (steamAppId: number) => Promise<void>;
  addToInProgress: (steamAppId: number) => Promise<void>;
}

export const useAddUserGame = (capState: CapState): UseAddUserGameResult => {
  const [addStatusById, setAddStatusById] = useState<Record<number, AddStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  const updateStatus = useCallback((id: number, status: AddStatus) => {
    setAddStatusById((prev) => ({ ...prev, [id]: status }));
  }, []);

  const addToBacklog = useCallback(
    async (steamAppId: number) => {
      setError(null);
      updateStatus(steamAppId, "pending");

      try {
        const response = await fetch("/api/v1/user-games", {
          method: "POST",
          headers: buildAuthHeaders(defaultJsonHeaders),
          body: JSON.stringify({
            steamAppId,
            status: "backlog",
            inProgressPosition: null,
          }),
        });

        const rateHeaders = parseRateLimitHeaders(response);
        setRateLimit({
          isRateLimited: response.status === 429,
          limit: rateHeaders.limit,
          remaining: rateHeaders.remaining,
          reset: rateHeaders.reset,
          retryAfter: rateHeaders.retryAfter,
        });

        if (response.status === 409) {
          updateStatus(steamAppId, "success");
          return;
        }

        if (!response.ok) {
          const payload = await safeParseJson<{ error?: { message?: string } }>(response);
          throw new Error(payload?.error?.message ?? "Unable to add to backlog.");
        }

        updateStatus(steamAppId, "success");
      } catch (err) {
        updateStatus(steamAppId, "error");
        setError(err instanceof Error ? err.message : "Unable to add to backlog.");
      }
    },
    [updateStatus]
  );

  const addToInProgress = useCallback(
    async (steamAppId: number) => {
      setError(null);

      if (!capState.canAdd) {
        updateStatus(steamAppId, "error");
        setError(capState.notice ?? "Your in-progress queue is full.");
        return;
      }

      updateStatus(steamAppId, "pending");

      try {
        const nextPosition = Math.min(capState.current + 1, capState.max);

        const response = await fetch(`/api/v1/user-games/${steamAppId}`, {
          method: "PATCH",
          headers: buildAuthHeaders(defaultJsonHeaders),
          body: JSON.stringify({
            status: "in_progress",
            inProgressPosition: nextPosition,
          }),
        });

        const rateHeaders = parseRateLimitHeaders(response);
        setRateLimit({
          isRateLimited: response.status === 429,
          limit: rateHeaders.limit,
          remaining: rateHeaders.remaining,
          reset: rateHeaders.reset,
          retryAfter: rateHeaders.retryAfter,
        });

        if (response.status === 409) {
          updateStatus(steamAppId, "success");
          return;
        }

        if (!response.ok) {
          const payload = await safeParseJson<{ error?: { message?: string } }>(response);
          throw new Error(payload?.error?.message ?? "Unable to add to in-progress.");
        }

        updateStatus(steamAppId, "success");
      } catch (err) {
        updateStatus(steamAppId, "error");
        setError(err instanceof Error ? err.message : "Unable to add to in-progress.");
      }
    },
    [capState.canAdd, capState.current, capState.max, capState.notice, updateStatus]
  );

  return {
    addStatusById,
    error,
    rateLimit,
    addToBacklog,
    addToInProgress,
  };
};

const safeParseJson = async <T>(response: Response): Promise<T | null> => {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
};
