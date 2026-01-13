import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, buildAuthHeaders, handleResponse } from "@/lib/in-progress/inProgressApi";
import type { RateLimitMetadata } from "@/lib/in-progress/types";
import type { GamePlayStatus, UserGamesListDTO } from "@/types";

interface MembershipResult {
  statusById: Record<number, GamePlayStatus>;
  loading: boolean;
  error: string | null;
  rateLimit: RateLimitMetadata | null;
  refetch: () => void;
}

const PAGE_SIZE = 100;

export const useUserGameMembership = (isEnabled: boolean): MembershipResult => {
  const [statusById, setStatusById] = useState<Record<number, GamePlayStatus>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitMetadata | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const fetchMembershipPage = useCallback(async (page: number, signal?: AbortSignal) => {
    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: PAGE_SIZE.toString(),
      orderBy: "updated_at",
      orderDirection: "desc",
    });
    params.append("status", "backlog");
    params.append("status", "in_progress");

    const response = await fetch(`/api/v1/user-games?${params.toString()}`, {
      method: "GET",
      headers: buildAuthHeaders(),
      signal,
    });

    const { data, rateLimit: nextRateLimit } = await handleResponse<UserGamesListDTO>(response);
    return { page: data, rateLimit: nextRateLimit };
  }, []);

  const loadMembership = useCallback(async () => {
    if (!isEnabled) {
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const collected: Record<number, GamePlayStatus> = {};
      let nextPage = 1;

      while (true) {
        const { page, rateLimit: nextRateLimit } = await fetchMembershipPage(nextPage, controller.signal);
        if (controller.signal.aborted) return;

        setRateLimit(nextRateLimit);

        for (const entry of page.results) {
          if (entry.status === "backlog" || entry.status === "in_progress") {
            collected[entry.gameId] = entry.status;
          }
        }

        const fetchedCount = nextPage * page.pageSize;
        const total = page.total ?? fetchedCount;
        const hasMore = page.results.length === PAGE_SIZE && fetchedCount < total;
        if (!hasMore) {
          break;
        }
        nextPage += 1;
      }

      setStatusById(collected);
    } catch (err) {
      if (controller.signal.aborted) return;

      if (err instanceof ApiError) {
        setRateLimit(err.rateLimit ?? null);
        setError(err.message);
      } else {
        setError("Unable to check which games are already in your library.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [fetchMembershipPage, isEnabled]);

  useEffect(() => {
    if (!isEnabled) return;

    loadMembership();
    return () => abortRef.current?.abort();
  }, [isEnabled, loadMembership]);

  return {
    statusById,
    loading,
    error,
    rateLimit,
    refetch: loadMembership,
  };
};
